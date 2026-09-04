import { TECHNIQUE_CATALOG } from '../src/domain/hints/techniques';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { ActivityIndicator, AppState, BackHandler, Text } from 'react-native';
import {
  SessionReplayScreen,
  ReplayLibraryScreen,
} from '../src/ui/screens/SessionReplayScreen';
import { SessionReplaySource } from '../src/application/game/session-replay-source';
import { LocalizationProvider } from '../src/localization';
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
const closeInfo = (r: Renderer.ReactTestRenderer) =>
  r.root
    .findAll(n => n.props.testID === 'replay-info-close')[0]
    .props.onPress();
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
  expect(contents(r)).toContain('R1C1 填入 5');
  expect(
    r.root.find(n => !!n.props.state?.givens && n.props.disabled === true).props
      .hintVisuals.cellMarks,
  ).toEqual([{ cell: 0, role: 'result' }]);
  await act(async () => button(r, '操作前').props.onPress());
  expect(
    r.root.find(n => !!n.props.state?.givens && n.props.disabled === true).props
      .state.values[0],
  ).toBe(null);
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
  expect(contents(r)).toContain('第 1 / 1 步');
  expect(
    r.root.find(n => !!n.props.state?.givens && n.props.disabled === true).props
      .state.values[0],
  ).toBe(null);
  expect(JSON.stringify(session)).toBe(saved);
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
  expect(contents(r)).toContain('第 0 / 1 步');
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
  expect(contents(r)).toContain('第 1 / 1 步');
  await act(async () => toStart(r));
  await act(async () => button(r, '复盘说明').props.onPress());
  await act(async () => button(r, '2×').props.onPress());
  await act(async () => closeInfo(r));
  await act(async () => button(r, '播放').props.onPress());
  await act(async () =>
    spy.mock.calls[spy.mock.calls.length - 1][1]('background'),
  );
  await act(async () => jest.advanceTimersByTime(2000));
  expect(contents(r)).toContain('第 0 / 1 步');
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
  expect(contents(final)).toContain('最终');
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
  expect(contents(r)).toContain('第 1 / 1 步');
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
  ).toBe(true);
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
  await act(async () => button(r, '复盘说明').props.onPress());
  expect(contents(r)).toContain('已达到时间预算');
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
  await act(async () => statusButton(r).props.onPress());
  expect(contents(r)).toContain('已达到本轮搜索预算');
  expect(
    r.root.findAll(n => n.props.testID === 'replay-explanation-list')[0],
  ).toBe(restoredList);
  expect(button(r, '满宫唯一数')).toBeDefined();
  await act(async () => closeInfo(r));
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
  expect(contents(r)).toContain('第 1 / 1 步');
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
  expect(contents(r)).toContain('第 1 / 1 步');
  expect(r.root.findAll(n => n.props.testID === 'replay-context')).toHaveLength(
    0,
  );
  expect(r.root.find(n => !!n.props.state?.givens).props.maxSize).toBe(
    boardSize,
  );
  await act(async () => button(r, '复盘分析强度').props.onPress());
  expect(contents(r)).toContain('专家分析');
  expect(
    r.root
      .findAll(
        n =>
          n.props.accessibilityRole === 'radio' &&
          n.props.accessibilityState.checked,
      )[0]
      .findAllByType(Text)[0].props.children[0],
  ).toBe('专家分析');
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
  expect(statusButton(r).findAllByType(ActivityIndicator)).toHaveLength(0);
  await act(async () => r.unmount());
});
