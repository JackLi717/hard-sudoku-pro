import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { SessionTechniqueReview } from '../src/debug/SessionTechniqueReview';
import { SessionReviewSource } from '../src/application/technique-recognition/session-review';
import { BehaviorShadowRecord } from '../src/application/technique-recognition/shadow-controller';
import { LocalizationProvider } from '../src/localization';
import { ThemeProvider } from '../src/ui/theme';
import { sudokuBoardLayout } from '../src/ui/components/SudokuBoard';
import { ResultScreen } from '../src/ui/screens/ResultScreen';
import { OfflineGameSnapshot } from '../src/application';
import { boardFromFingerprint } from '../src/domain/sudoku/board';
import { reviewRecord } from './helpers/session-review';

// This mounts the real 81-cell board and native accessibility mocks.
jest.setTimeout(20_000);

class Source implements SessionReviewSource {
  records: readonly BehaviorShadowRecord[] = [reviewRecord()];
  listeners = new Set<(id: string | null) => void>();
  readSession = jest.fn(async () => this.records);
  subscribe(listener: (id: string | null) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify() {
    this.listeners.forEach(listener => listener('review-game'));
  }
}

function text(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .join(' ');
}

function button(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root
    .findAll(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .find(node =>
      node.findAllByType(Text).some(child => child.props.children === label),
    )!;
}

async function render(source?: SessionReviewSource, onClose = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <LocalizationProvider locale="zh-Hans">
        <ThemeProvider preference="light">
          <SessionTechniqueReview
            source={source}
            sessionId="review-game"
            onClose={onClose}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  return renderer;
}

describe('internal session review screen', () => {
  test('opens saved board and actual effects, toggles marks, and returns without game commands', async () => {
    const source = new Source();
    const onClose = jest.fn();
    const renderer = await render(source, onClose);
    expect(source.readSession).toHaveBeenCalledWith('review-game');
    expect(text(renderer)).toContain('不代表独立发现次数');
    expect(text(renderer)).toContain('显性数对');
    await act(async () => button(renderer, '查看盘面与动作').props.onPress());
    const board = renderer.root.find(
      node => node.props.state && node.props.onSelectCell,
    );
    expect(board.props.disabled).toBe(true);
    expect(board.props.state.values).toEqual(
      boardFromFingerprint(source.records[0].request!.startingBoardFingerprint),
    );
    expect(board.props.state.candidates.manualCandidates).toEqual(
      source.records[0].request!.growthCandidates,
    );
    expect(board.props.hintVisuals).toBeUndefined();
    await act(async () => button(renderer, '动作标记').props.onPress());
    expect(
      renderer.root.find(node => node.props.state && node.props.onSelectCell)
        .props.hintVisuals.eliminations,
    ).toEqual([{ kind: 'elimination', cell: 2, digit: 1 }]);
    await act(async () => button(renderer, '起始盘面').props.onPress());
    expect(
      renderer.root.find(node => node.props.state && node.props.onSelectCell)
        .props.hintVisuals,
    ).toBeUndefined();
    await act(async () => button(renderer, '返回记录列表').props.onPress());
    await act(async () => button(renderer, '返回完成页').props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
    expect(source.listeners.size).toBe(0);
  });

  test('automatically refreshes final asynchronous writes and later invalidation', async () => {
    const source = new Source();
    const record = source.records[0];
    source.records = [{ ...record, diagnostic: null, phase: 'request' }];
    const renderer = await render(source);
    expect(text(renderer)).toContain('尚无最终分析记录');
    source.records = [record];
    await act(async () => source.notify());
    expect(text(renderer)).toContain('系统识别为');
    await act(async () => button(renderer, '查看盘面与动作').props.onPress());
    source.records = [
      record,
      {
        ...record,
        recordId: 'invalid',
        recordedAtEpochMs: 2,
        phase: 'invalidation',
        request: null,
        diagnostic: {
          ...record.diagnostic!,
          attribution: {
            ...record.diagnostic!.attribution,
            automaticTechnique: null,
            attributionEligibility: {
              status: 'ineligible',
              reason: 'undo_polluted',
            },
          },
        },
      },
    ];
    await act(async () => source.notify());
    expect(text(renderer)).toContain('关联动作已撤销');
    expect(text(renderer)).not.toContain('系统识别为');
    expect(
      renderer.root.find(node => node.props.state && node.props.onSelectCell),
    ).toBeDefined();
    await act(async () => renderer.unmount());
  });

  test('does not display historical labels as default attribution when hint sources are absent', async () => {
    const source = new Source();
    const record = reviewRecord();
    source.records = [
      { ...record, request: { ...record.request!, hintAssistance: undefined } },
    ];
    const renderer = await render(source);
    expect(text(renderer)).toContain('证据不足');
    expect(text(renderer)).not.toContain('系统识别为');
    await act(async () => button(renderer, '查看盘面与动作').props.onPress());
    expect(text(renderer)).toContain('历史记录缺少提示来源');
    expect(text(renderer)).toContain('保留的候选解释');
    await act(async () => renderer.unmount());
  });

  test('shows unavailable, empty and retry states without claiming absence of techniques', async () => {
    const unavailable = await render();
    expect(text(unavailable)).toContain('暂时无法读取本地诊断');
    await act(async () => unavailable.unmount());
    const source = new Source();
    source.readSession.mockRejectedValueOnce(new Error('read failed'));
    const renderer = await render(source);
    expect(text(renderer)).toContain('暂时无法读取本地诊断');
    source.records = [];
    await act(async () => button(renderer, '刷新').props.onPress());
    expect(text(renderer)).toContain(
      '本局没有本地诊断记录，不代表没有使用技巧',
    );
    await act(async () => renderer.unmount());
  });

  test('does not let a stale read replace newer finalized evidence', async () => {
    const source = new Source();
    let finish!: (records: readonly BehaviorShadowRecord[]) => void;
    source.readSession.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    );
    const renderer = await render(source);
    await act(async () => source.notify());
    expect(text(renderer)).toContain('系统识别为');
    await act(async () => finish([]));
    expect(text(renderer)).toContain('系统识别为');
    await act(async () => renderer.unmount());
  });

  test('keeps readable text and touch targets, with the shared board fitting phone and iPad mini', async () => {
    const renderer = await render(new Source());
    expect(
      StyleSheet.flatten(button(renderer, '刷新').props.style).minHeight,
    ).toBeGreaterThanOrEqual(44);
    for (const [width, height] of [
      [375, 667],
      [744, 1133],
      [1133, 744],
    ]) {
      expect(sudokuBoardLayout(width, height).boardSize).toBeLessThanOrEqual(
        Math.min(width, 760) - 24,
      );
    }
    await act(async () => renderer.unmount());
  });

  test.each([
    ['completed', true, true],
    ['completed', false, false],
    ['failed', true, false],
  ] as const)(
    'completion entry: status %s, development %s',
    async (status, development, visible) => {
      const previous = __DEV__;
      Object.defineProperty(globalThis, '__DEV__', {
        value: development,
        configurable: true,
      });
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      const snapshot = {
        session: {
          state: {
            status,
            difficultyLevel: 1,
            timer: { elapsedMs: 0 },
            errorCount: 0,
            hintUseCount: 0,
          },
        },
      } as OfflineGameSnapshot;
      try {
        await act(async () => {
          renderer = ReactTestRenderer.create(
            <ResultScreen
              snapshot={snapshot}
              onNewGame={jest.fn()}
              onNext={jest.fn()}
              onRetry={jest.fn()}
              onOpenReview={jest.fn()}
            />,
          );
        });
        expect(text(renderer).includes('Game technique review · Dev')).toBe(
          visible,
        );
      } finally {
        await act(async () => renderer.unmount());
        Object.defineProperty(globalThis, '__DEV__', {
          value: previous,
          configurable: true,
        });
      }
    },
  );
});
