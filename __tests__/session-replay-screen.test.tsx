import { TECHNIQUE_CATALOG } from '../src/domain/hints/techniques';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  StyleSheet,
  Text,
} from 'react-native';
import {
  SessionReplayScreen,
  ReplayLibraryScreen,
} from '../src/ui/screens/SessionReplayScreen';
import { SessionReplaySource } from '../src/application/game/session-replay-source';
import { LocalizationProvider } from '../src/localization';
import { warmPaperTheme } from '../src/ui/themes/warm-paper';
import { ThemeProvider } from '../src/ui/theme';
import { teachingFixture } from './helpers/replay';
import { kiteHint } from './helpers/ipad-hint-assistance';
import { removeCandidate } from '../src/domain/sudoku/board';

beforeEach(() => {
  jest.useFakeTimers();
  (AppState.addEventListener as jest.Mock).mockReturnValue({
    remove: jest.fn(),
  });
});

afterEach(() => jest.useRealTimers());
const settle = () =>
  act(async () => {
    jest.advanceTimersByTime(350);
  });
const toStart = (r: Renderer.ReactTestRenderer) =>
  r.root
    .find(n => n.props.accessibilityRole === 'adjustable')
    .props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
const wrapper = (child: React.ReactNode) => (
  <LocalizationProvider locale="zh-Hans">
    <ThemeProvider preference="light">{child}</ThemeProvider>
  </LocalizationProvider>
);
const contents = (r: Renderer.ReactTestRenderer) =>
  r.root
    .findAllByType(Text)
    .map(n => n.props.children)
    .flat(Infinity)
    .join(' ');
const button = (r: Renderer.ReactTestRenderer, label: string) =>
  r.root
    .findAll(
      n =>
        n.props.accessibilityRole === 'button' &&
        typeof n.props.onPress === 'function',
    )
    .find(
      n =>
        n.props.accessibilityLabel === label ||
        n
          .findAllByType(Text)
          .some(t =>
            [t.props.children].flat(Infinity).join('').includes(label),
          ),
    )!;
const statusButton = (r: Renderer.ReactTestRenderer) =>
  r.root.findAll(n => n.props.testID === 'replay-analysis-status')[0];
async function mount(
  source: SessionReplaySource,
  props: Partial<React.ComponentProps<typeof SessionReplayScreen>> = {},
) {
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(
      wrapper(
        <SessionReplayScreen
          sessionId="s"
          source={source}
          onClose={jest.fn()}
          {...props}
        />,
      ),
    );
  });
  return r;
}
function fixtureSource() {
  const fixture = teachingFixture();
  const source: SessionReplaySource = {
    readReplaySession: jest.fn(async () => fixture.session),
    listReplaySessions: jest.fn(async () => []),
    explainReplayMove: jest.fn(async () => fixture.report),
  };
  return { ...fixture, source };
}

test('ordinary action explains, shows all results, completes and restores exact history position', async () => {
  const { source, report, session } = fixtureSource();
  report.paths = [
    'fullHouse',
    'nakedSingle',
    'hiddenSingle',
    'lockedCandidates.pointing',
    'lockedCandidates.claiming',
  ].map(techniqueCode => ({
    ...report.paths[0],
    stages: report.paths[0].stages.map(stage => ({
      ...stage,
      step: {
        ...stage.step,
        techniqueCode: techniqueCode as typeof stage.step.techniqueCode,
        difficultyLevel: TECHNIQUE_CATALOG.find(
          t => t[0] === techniqueCode,
        )![1],
        explanationKey:
          `hint.${techniqueCode}` as typeof stage.step.explanationKey,
      },
    })),
  }));
  const saved = JSON.stringify(session);
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  expect(
    r.root.find(n => !!n.props.state?.givens && n.props.disabled === true).props
      .hintVisuals.cellMarks,
  ).toEqual([{ cell: 0, role: 'result' }]);
  await settle();
  expect(button(r, '解释这一步')).toBeUndefined();
  expect(button(r, '查找多阶段解释')).toBeUndefined();
  expect(
    r.root.findAll(n => n.props.testID === 'replay-explanation-4').length,
  ).toBeGreaterThan(0);
  await act(async () =>
    r.root
      .findAll(n => n.props.testID === 'replay-explanation-0')[0]
      .props.onPress(),
  );
  expect(contents(r)).toContain('推理演示·候选由程序计算');
  expect(
    r.root.find(n => !!n.props.state?.givens && n.props.disabled === true).props
      .hintSpotlight,
  ).toBe(true);
  expect(contents(r)).not.toContain('应用这一步');
  await act(async () => button(r, '下一步').props.onPress());
  expect(contents(r)).not.toContain('撤销');
  await act(async () => button(r, '完成演练，返回第 1 步').props.onPress());
  expect(
    r.root.find(n => !!n.props.state?.givens && n.props.disabled === true).props
      .state.values[0],
  ).toBe(5);
  expect(JSON.stringify(session)).toBe(saved);
  await act(async () => r.unmount());
});

test('recorded focus stays hidden while notes are closed in replay', async () => {
  const { source, session } = fixtureSource();
  const move = session.history[0];
  source.readReplaySession = async () => ({
    ...session,
    state: { ...session.state, replayRecordingSinceRevision: 0 },
    replayEvents: [
      {
        id: 'event',
        sessionId: session.state.sessionId,
        previousRevision: 0,
        revision: 1,
        kind: 'input_digit',
        move,
        targetMoveId: null,
        hint: null,
        view: { selectedCell: 0, highlightDigit: null },
        views: [{ selectedCell: 0, highlightDigit: 5 }],
        before: move.before,
        after: move.after,
        createdAtEpochMs: move.createdAtEpochMs,
      },
    ],
  });
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  const board = r.root.find(
    n => !!n.props.state?.givens && n.props.disabled === true,
  );
  expect(board.props.state.selectedCell).toBe(0);
  expect(board.props.hintVisuals.focusDigits).toEqual([]);
  expect(board.props.showCandidates).toBe(false);
  expect(board.props.highlightRegions).toBe(true);
  await act(async () => r.unmount());
});

test('selected filled digit highlights notes while notes are open in replay', async () => {
  const { source, session } = fixtureSource();
  const original = session.history[0];
  const candidates = {
    ...original.after.candidates,
    pencilMode: true,
  };
  const move = {
    ...original,
    before: {
      ...original.before,
      candidates: { ...original.before.candidates, pencilMode: true },
    },
    after: { ...original.after, candidates },
  };
  source.readReplaySession = async () => ({
    ...session,
    state: {
      ...session.state,
      replayRecordingSinceRevision: 0,
      candidates,
    },
    history: [move],
    replayEvents: [
      {
        id: 'open-notes',
        sessionId: session.state.sessionId,
        previousRevision: 0,
        revision: 1,
        kind: 'set_pencil_mode',
        move: null,
        targetMoveId: null,
        hint: null,
        view: { selectedCell: 0, highlightDigit: null },
        views: [],
        before: original.before,
        after: move.before,
        createdAtEpochMs: original.createdAtEpochMs,
      },
      {
        id: 'event',
        sessionId: session.state.sessionId,
        previousRevision: 1,
        revision: 2,
        kind: 'input_digit',
        move,
        targetMoveId: null,
        hint: null,
        view: { selectedCell: 0, highlightDigit: null },
        views: [],
        before: move.before,
        after: move.after,
        createdAtEpochMs: move.createdAtEpochMs,
      },
    ],
  });
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  await act(async () => button(r, '下一步操作').props.onPress());
  const board = r.root.find(
    n => !!n.props.state?.givens && n.props.disabled === true,
  );
  expect(board.props.showCandidates).toBe(true);
  expect(board.props.state.selectedCell).toBe(0);
  expect(board.props.state.values[0]).toBe(5);
  expect(board.props.hintVisuals.focusDigits).toEqual([5]);
  await act(async () => r.unmount());
});

test('grouped candidate removals focus every target before applying them together', async () => {
  const { source, session } = fixtureSource();
  const original = session.history[0];
  const quickCandidates = Array(81).fill(511);
  const before = {
    ...original.before,
    candidates: {
      ...original.before.candidates,
      quickCandidates,
      pencilMode: true,
    },
  };
  const snapshots = [before];
  [0, 1, 2].forEach(cell => {
    const previous = snapshots.at(-1)!;
    snapshots.push({
      ...previous,
      candidates: {
        ...previous.candidates,
        quickCandidates: previous.candidates.quickCandidates.map(
          (mask, index) => (index === cell ? removeCandidate(mask, 2) : mask),
        ),
      },
    });
  });
  const moves = [0, 1, 2].map((cell, index) => ({
    ...original,
    id: `remove-${cell}`,
    sequence: index + 1,
    kind: 'edit_quick_candidate' as const,
    cell,
    digit: 2 as const,
    before: snapshots[index],
    after: snapshots[index + 1],
  }));
  const after = snapshots.at(-1)!;
  source.readReplaySession = async () => ({
    ...session,
    state: {
      ...session.state,
      replayRecordingSinceRevision: 0,
      values: after.values,
      candidates: after.candidates,
      incorrectCells: after.incorrectCells,
      errorCount: after.errorCount,
      status: after.status,
      completionKind: after.completionKind,
      revision: 4,
    },
    history: moves,
    replayEvents: [
      {
        id: 'open-notes',
        sessionId: session.state.sessionId,
        previousRevision: 0,
        revision: 1,
        kind: 'set_pencil_mode',
        move: null,
        targetMoveId: null,
        hint: null,
        view: { selectedCell: 0, highlightDigit: null },
        views: [],
        before: original.before,
        after: before,
        createdAtEpochMs: original.createdAtEpochMs,
      },
      ...moves.map((move, index) => ({
        id: `candidate-event-${index}`,
        sessionId: session.state.sessionId,
        previousRevision: index + 1,
        revision: index + 2,
        kind: 'input_digit' as const,
        move,
        targetMoveId: null,
        hint: null,
        view: { selectedCell: move.cell, highlightDigit: null },
        views: [],
        before: move.before,
        after: move.after,
        createdAtEpochMs: original.createdAtEpochMs + index + 1,
      })),
    ],
  });
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  await act(async () => button(r, '下一步操作').props.onPress());
  let board = r.root.find(
    n => !!n.props.state?.givens && n.props.disabled === true,
  );
  expect(board.props.hintVisuals.focusDigits).toEqual([2]);
  expect(board.props.hintVisuals.focusCells).toEqual([0, 1, 2]);
  expect(board.props.hintVisuals.eliminations).toEqual([]);
  expect(board.props.showCandidates).toBe(true);
  expect(board.props.state.candidates.quickCandidates.slice(0, 3)).toEqual([
    511, 511, 511,
  ]);

  await act(async () => button(r, '下一步操作').props.onPress());
  board = r.root.find(
    n => !!n.props.state?.givens && n.props.disabled === true,
  );
  expect(board.props.hintVisuals.eliminations).toEqual([
    { cell: 0, digit: 2 },
    { cell: 1, digit: 2 },
    { cell: 2, digit: 2 },
  ]);
  expect(board.props.state.candidates.quickCandidates.slice(0, 3)).toEqual([
    509, 509, 509,
  ]);
  await act(async () => r.unmount());
});

test('uses seconds per step, preserves analysis, and removes before/after controls', async () => {
  const { source } = fixtureSource();
  const r = await mount(source);
  expect(button(r, '‹ 返回')).toBeDefined();
  expect(button(r, '1.5 s')).toBeDefined();
  expect(button(r, '回到开局')).toBeDefined();
  expect(button(r, '上一步操作')).toBeDefined();
  expect(button(r, '播放')).toBeDefined();
  expect(button(r, '下一步操作')).toBeDefined();
  expect(button(r, '跳到结尾')).toBeDefined();
  expect(contents(r)).toContain('可能的解释');
  expect(contents(r)).toContain('第 0 / 1 步');
  expect(button(r, '操作前')).toBeUndefined();
  await act(async () => button(r, '1.5 s').props.onPress());
  expect(
    r.root.findAll(n => n.props.testID === 'replay-speed-menu').length,
  ).toBeGreaterThan(0);
  await act(async () => button(r, '2.5 s').props.onPress());
  expect(button(r, '2.5 s')).toBeDefined();
  await act(async () => r.unmount());
});

test('late result after seeking is ignored and native search is cancelled', async () => {
  const { source, report } = fixtureSource();
  let resolve!: (value: typeof report) => void;
  let signal!: AbortSignal;
  source.explainReplayMove = jest.fn(async (_s, _m, s) => {
    signal = s;
    return new Promise(r => {
      resolve = r;
    });
  });
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  await settle();
  await act(async () => toStart(r));
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(report));
  expect(contents(r)).not.toContain('已找到');
  await act(async () => r.unmount());
});

test('scrubbing, speed selection and app background stop playback', async () => {
  jest.useFakeTimers();
  const spy = jest.spyOn(AppState, 'addEventListener');
  const { source } = fixtureSource();
  const r = await mount(source);
  const track = r.root.find(n => n.props.accessibilityRole === 'adjustable');
  await act(async () =>
    track.props.onLayout({ nativeEvent: { layout: { width: 200 } } }),
  );
  await act(async () =>
    track.props.onResponderMove({ nativeEvent: { locationX: 200 } }),
  );
  await act(async () => toStart(r));
  await act(async () => button(r, '1.5 s').props.onPress());
  await act(async () => button(r, '2.5 s').props.onPress());
  await act(async () => button(r, '播放').props.onPress());
  await act(async () =>
    spy.mock.calls[spy.mock.calls.length - 1][1]('background'),
  );
  await act(async () => jest.advanceTimersByTime(2000));
  await act(async () => r.unmount());
  spy.mockRestore();
  jest.useRealTimers();
});

test('missing session ends loading and final-only record has no replay promise', async () => {
  const { source, session } = fixtureSource();
  source.readReplaySession = async () => null;
  const r = await mount(source);
  expect(contents(r)).toContain('无法根据保留的历史');
  await act(async () => r.unmount());
  source.readReplaySession = async () => ({ ...session, history: [] });
  const final = await mount(source);
  expect(contents(final)).not.toContain('第 1 / 1 步');
  expect(button(final, '播放')).toBeUndefined();
  await act(async () => final.unmount());
});

test('library displays time, duration, hints and disables unreadable records', async () => {
  const { source } = fixtureSource();
  source.listReplaySessions = async () => [
    {
      sessionId: 's',
      difficultyLevel: 1,
      status: 'completed',
      updatedAtEpochMs: 1000,
      elapsedMs: 65000,
      hintUseCount: 3,
      recoverability: 'final_snapshot',
    },
  ];
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(
      wrapper(
        <ReplayLibraryScreen
          source={source}
          onClose={jest.fn()}
          onOpen={jest.fn()}
        />,
      ),
    );
  });
  expect(contents(r)).toContain('用时 1:05 · 提示 3 次');
  expect(contents(r)).toContain('仅有最终保存棋盘');
  expect(contents(r)).not.toContain('可逐步重放');
  await act(async () => r.unmount());
});

test('library keeps native row boundaries and opens the selected session', async () => {
  const { source } = fixtureSource();
  const sessions = [
    {
      sessionId: 'first',
      difficultyLevel: 1,
      status: 'completed',
      updatedAtEpochMs: 2000,
      elapsedMs: 65000,
      hintUseCount: 1,
      recoverability: 'action_history' as const,
    },
    {
      sessionId: 'second',
      difficultyLevel: 2,
      status: 'abandoned',
      updatedAtEpochMs: 1000,
      elapsedMs: 30000,
      hintUseCount: 0,
      recoverability: 'action_history' as const,
    },
  ];
  let resolveSessions!: (value: typeof sessions) => void;
  source.listReplaySessions = () =>
    new Promise(resolve => {
      resolveSessions = resolve;
    });
  const onOpen = jest.fn();
  const onFootprint = jest.fn();
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(
      wrapper(
        <ReplayLibraryScreen
          source={source}
          onClose={jest.fn()}
          onOpen={onOpen}
          onFootprint={onFootprint}
        />,
      ),
    );
  });
  expect(r.root.findByProps({ testID: 'replay-library-items' }).props).toEqual(
    expect.objectContaining({ collapsable: false }),
  );
  await act(async () => resolveSessions(sessions));
  const first = r.root.findByProps({ testID: 'replay-session-first' });
  const second = r.root.findByProps({ testID: 'replay-session-second' });
  expect(first.props.collapsable).toBe(false);
  expect(second.props.collapsable).toBe(false);
  const firstButtons = first.findAll(
    n =>
      n.props.accessibilityRole === 'button' &&
      typeof n.props.onPress === 'function',
  );
  const secondButtons = second.findAll(
    n =>
      n.props.accessibilityRole === 'button' &&
      typeof n.props.onPress === 'function',
  );
  await act(async () => firstButtons[0].props.onPress());
  await act(async () => secondButtons[0].props.onPress());
  await act(async () => firstButtons[1].props.onPress());
  expect(onOpen.mock.calls).toEqual([['first'], ['second']]);
  expect(onFootprint).toHaveBeenCalledWith('first');
  await act(async () => r.unmount());
});

test('hardware back exits the walkthrough before closing the session', async () => {
  const spy = jest.spyOn(BackHandler, 'addEventListener');
  const { source } = fixtureSource();
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  await settle();
  await act(async () =>
    r.root
      .findAll(n => n.props.testID === 'replay-explanation-0')[0]
      .props.onPress(),
  );
  const calls = spy.mock.calls;
  await act(async () =>
    expect(
      calls[calls.length - 1][1]({ type: 'hardwareBackPress', timeStamp: 0 }),
    ).toBe(true),
  );
  expect(contents(r)).toContain('可能的解释');
  await act(async () => r.unmount());
  spy.mockRestore();
});

test('playback does not hide an already verified explanation', async () => {
  const { source, session } = fixtureSource();
  const first = session.history[0];
  source.readReplaySession = async () => ({
    ...session,
    history: [
      first,
      {
        ...first,
        id: 'second',
        sequence: 2,
        kind: 'edit_manual_candidate',
        before: first.after,
        after: first.after,
      },
    ],
  });
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  await settle();
  expect(button(r, '满宫唯一数')).toBeDefined();
  await act(async () => button(r, '播放').props.onPress());
  expect(button(r, '满宫唯一数')).toBeDefined();
  await act(async () => r.unmount());
});

test('saved hint is distinguished from possible explanations and search failure is retryable', async () => {
  const { source, session, step } = fixtureSource();
  source.readReplaySession = async () => ({
    ...session,
    history: [{ ...session.history[0], kind: 'apply_hint', appliedHint: step }],
  });
  source.explainReplayMove = jest.fn(async () => {
    throw Error('unavailable');
  });
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  expect(contents(r)).toContain('当时使用');
  expect(contents(r)).toContain('可能的解释');
  await settle();
  expect(contents(r)).not.toContain('分析失败，请重试');
  expect(statusButton(r).props.accessibilityLabel).toBe('分析失败，请重试。');
  await act(async () => r.unmount());
});

test('automatically extends the simple list, keeps controls in the panel, and reuses completed explanations', async () => {
  const { source, report } = fixtureSource();
  let finish!: (value: typeof report) => void;
  source.explainReplayMove = jest.fn(async (_s, _m, _signal, options) => {
    options?.onVerified?.(report);
    return new Promise(resolve => {
      finish = resolve;
    });
  });
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  await settle();
  expect(source.explainReplayMove).toHaveBeenCalledTimes(1);
  expect(button(r, '满宫唯一数')).toBeDefined();
  expect(button(r, '解释这一步')).toBeUndefined();
  expect(button(r, '查找多阶段解释')).toBeUndefined();
  const panel = r.root.findAll(n => n.props.testID === 'replay-panel')[0];
  expect(
    panel.findAllByType(Text).some(n => n.props.children === '操作前'),
  ).toBe(false);
  const originalSize = r.root.find(
    n => !!n.props.state?.givens && n.props.disabled === true,
  ).props.maxSize;
  const second = {
    ...report.paths[0],
    stages: report.paths[0].stages.map(stage => ({
      ...stage,
      step: {
        ...stage.step,
        techniqueCode: 'nakedSingle' as const,
        explanationKey: 'hint.nakedSingle' as const,
      },
    })),
  };
  await act(async () =>
    finish({
      ...report,
      paths: [...report.paths, second],
      limits: ['time_budget'],
    }),
  );
  expect(button(r, '唯一候选数')).toBeDefined();
  expect(contents(r)).not.toContain('已达到时间预算');
  expect(
    r.root.find(n => !!n.props.state?.givens && n.props.disabled === true).props
      .maxSize,
  ).toBe(originalSize);
  await act(async () => button(r, '满宫唯一数').props.onPress());
  await act(async () => button(r, '退出演练').props.onPress());
  await settle();
  expect(source.explainReplayMove).toHaveBeenCalledTimes(1);
  await act(async () => r.unmount());
});

test('failed automatic search can actually retry, and scrubbing past an action does not start work', async () => {
  const { source, report } = fixtureSource();
  source.explainReplayMove = jest
    .fn()
    .mockRejectedValueOnce(Error('failed'))
    .mockResolvedValue(report);
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  await act(async () => toStart(r));
  await settle();
  expect(source.explainReplayMove).not.toHaveBeenCalled();
  await act(async () => button(r, '下一步操作').props.onPress());
  await settle();
  await act(async () => statusButton(r).props.onPress());
  await settle();
  expect(source.explainReplayMove).toHaveBeenCalledTimes(2);
  expect(button(r, '满宫唯一数')).toBeDefined();
  await act(async () => r.unmount());
});

test('verified explanation opens during ongoing search and status remains outside the scrolling list', async () => {
  const { source, report } = fixtureSource();
  let finish!: (value: typeof report) => void;
  let signal!: AbortSignal;
  source.explainReplayMove = jest.fn(async (_s, _m, s, options) => {
    signal = s;
    options?.onVerified?.(report);
    return new Promise(resolve => {
      finish = resolve;
    });
  });
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  await settle();
  expect(contents(r)).not.toContain('正在寻找更多');
  expect(statusButton(r).props.accessibilityValue.text).toContain(
    '已找到1种解释，正在寻找更多',
  );
  expect(statusButton(r).findAllByType(ActivityIndicator)).toHaveLength(1);
  const list = r.root.findAll(
    n => n.props.testID === 'replay-explanation-list',
  )[0];
  expect(
    list
      .findAllByType(Text)
      .some(n => String(n.props.children).includes('正在寻找更多')),
  ).toBe(false);
  await act(async () => button(r, '满宫唯一数').props.onPress());
  expect(contents(r)).toContain('推理演示·候选由程序计算');
  expect(signal.aborted).toBe(false);
  await act(async () => finish({ ...report, limits: ['time_budget'] }));
  await act(async () => button(r, '退出演练').props.onPress());
  expect(contents(r)).not.toContain('已达到本轮搜索预算');
  expect(statusButton(r).props.accessibilityValue.text).toContain(
    '已达到本轮搜索预算',
  );
  expect(statusButton(r).findAllByType(ActivityIndicator)).toHaveLength(0);
  const restoredList = r.root.findAll(
    n => n.props.testID === 'replay-explanation-list',
  )[0];
  expect(
    r.root.findAll(n => n.props.testID === 'replay-explanation-list')[0],
  ).toBe(restoredList);
  expect(button(r, '满宫唯一数')).toBeDefined();
  expect(source.explainReplayMove).toHaveBeenCalledTimes(1);
  await act(async () => r.unmount());
});

test('saved kite walkthrough retains earlier candidate eliminations', async () => {
  const { source, session } = fixtureSource();
  const step = { ...kiteHint, boardFingerprint: '0'.repeat(81) };
  const values = Array(81).fill(null);
  const hintCandidates = Array.from({ length: 81 }, (_, cell) =>
    (Math.floor(cell / 9) === 8 || cell % 9 === 8) &&
    ![77, 79, 35, 62].includes(cell)
      ? removeCandidate(511, 3)
      : 511,
  );
  const before = {
    ...session.history[0].before,
    values,
    candidates: { ...session.history[0].before.candidates, hintCandidates },
  };
  source.readReplaySession = async () => ({
    ...session,
    state: { ...session.state, values, givens: values },
    history: [
      {
        ...session.history[0],
        kind: 'apply_hint',
        appliedHint: step,
        before,
        after: before,
      },
    ],
  });
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  await act(async () => button(r, 'Two-String Kite').props.onPress());
  expect(contents(r)).toContain('先看整个风筝');
  expect(contents(r)).toMatch(/1\s*\/\s*8/);
  const board = r.root.find(
    n => !!n.props.state?.givens && n.props.disabled === true,
  );
  expect(board.props.state.candidates.hintCandidates).toEqual(hintCandidates);
  expect(
    board.props.hintVisuals.links.filter(
      (link: { kind: string }) => link.kind === 'pair',
    ),
  ).toHaveLength(2);
  await act(async () => r.unmount());
});

test('growth entry opens its referenced step without process controls or permanent notices', async () => {
  const { source } = fixtureSource();
  const onWalkthroughComplete = jest.fn(async () => undefined);
  const r = await mount(source, {
    initialReference: { sessionId: 's', moveIds: ['m'] },
    onWalkthroughComplete,
    analysisLevel: 'expert',
  });
  expect(contents(r)).not.toContain('过程起点');
  expect(contents(r)).not.toContain('过程收尾');
  expect(contents(r)).not.toContain('历史有效操作路径');
  expect(contents(r)).not.toContain('专家分析');
  await settle();
  const boardSize = r.root.find(n => !!n.props.state?.givens).props.maxSize;
  await act(async () => button(r, '满宫唯一数').props.onPress());
  await act(async () => button(r, '下一步').props.onPress());
  await act(async () => button(r, '完成演练，返回第 1 步').props.onPress());
  expect(onWalkthroughComplete).toHaveBeenCalledTimes(1);
  expect(r.root.findAll(n => n.props.testID === 'replay-context')).toHaveLength(
    0,
  );
  expect(r.root.find(n => !!n.props.state?.givens).props.maxSize).toBe(
    boardSize,
  );
  await act(async () => r.unmount());
});

test('an empty completed search has one readable empty state and compact status', async () => {
  const { source, report } = fixtureSource();
  source.explainReplayMove = jest.fn(async () => ({
    ...report,
    paths: [],
    limits: ['time_budget'],
  }));
  const r = await mount(source);
  await act(async () => button(r, '下一步操作').props.onPress());
  await settle();
  expect(contents(r).split('本轮预算内未找到解释。')).toHaveLength(2);
  expect(statusButton(r).props.accessibilityValue.text).toBe(
    '本轮预算内未找到解释。',
  );
  expect(statusButton(r).props.accessibilityRole).toBe('button');
  expect(statusButton(r).findAllByType(ActivityIndicator)).toHaveLength(0);
  await act(async () => r.unmount());
});

test('history follows the current appearance without reloading or changing recorded data', async () => {
  const { source, session } = fixtureSource();
  const before = JSON.stringify(session);
  const render = (mode: 'light' | 'dark') => (
    <ThemeProvider preference={mode}>
      <LocalizationProvider locale="zh-Hans">
        <SessionReplayScreen
          sessionId="s"
          source={source}
          onClose={jest.fn()}
        />
      </LocalizationProvider>
    </ThemeProvider>
  );
  let r!: Renderer.ReactTestRenderer;
  await act(async () => {
    r = Renderer.create(render('light'));
  });
  await settle();
  const calls = jest.mocked(source.readReplaySession).mock.calls.length;
  await act(async () => {
    r.update(render('dark'));
  });
  const line = r.root.findByProps({ testID: 'sudoku-grid-vertical-1' });
  expect(StyleSheet.flatten(line.props.style).backgroundColor).toBe(
    warmPaperTheme.appearances.dark.boardTheme.colors.lineStrong,
  );
  expect(source.readReplaySession).toHaveBeenCalledTimes(calls);
  expect(JSON.stringify(session)).toBe(before);
  act(() => {
    r.unmount();
  });
});
