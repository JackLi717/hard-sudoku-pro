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
import {
  processReviewRecords,
  processResponse,
} from './helpers/process-review';
import {
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  TechniqueOpportunityAnalyzer,
} from '../src/domain/technique-recognition/contracts';

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

async function render(
  source?: SessionReviewSource,
  onClose = jest.fn(),
  analyzer?: TechniqueOpportunityAnalyzer,
) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <LocalizationProvider locale="zh-Hans">
        <ThemeProvider preference="light">
          <SessionTechniqueReview
            source={source}
            analyzer={analyzer}
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
  test('shows executed hint dependency without restoring a default attribution', async () => {
    const source = new Source();
    const record = reviewRecord();
    const effect = { kind: 'placement' as const, cell: 49, digit: 5 as const };
    record.request!.observedEffects = [effect];
    record.request!.hintAssistance = {
      exposureComplete: true,
      appliedSources: [],
      affectedEffects: [effect],
      knownSources: [
        {
          sourceId: 'bug',
          boardFingerprint: record.request!.startingBoardFingerprint,
          technique: 'bugPlusOne',
          placements: [{ cell: 3, digit: 6 }],
          eliminations: [],
          assistedEffects: [],
          dependentEffects: [
            {
              effect,
              via: [{ kind: 'placement', cell: 30, digit: 2 }],
              moveId: 'parent',
              beforeBoardFingerprint: record.request!.startingBoardFingerprint,
              afterBoardFingerprint: record.request!.expectedBoardFingerprint,
            },
          ],
        },
      ],
    };
    record.diagnostic!.attribution.automaticTechnique = null;
    record.diagnostic!.attribution.attributionEligibility = {
      status: 'ineligible',
      reason: 'hint_polluted',
    };
    source.records = [record];
    const renderer = await render(source);
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'review-entry-review-request' })
        .props.onPress(),
    );
    expect(text(renderer)).toContain('提示后的依赖性收尾');
    expect(text(renderer)).toContain('填入 R4C4 = 2');
    expect(text(renderer)).toContain('填入 R6C5 = 5');
    expect(text(renderer)).toContain('不作为独立发现的证据');
    expect(button(renderer, '复验完整过程')).toBeUndefined();
    await act(async () => renderer.unmount());
  });
  test('verifies prerequisites on demand, retains local explanation and opens the source candidate snapshot', async () => {
    const source = new Source();
    source.records = processReviewRecords();
    const analyze = jest.fn(async q => processResponse(q));
    const renderer = await render(source, jest.fn(), { analyze });
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'review-entry-review-3' })
        .props.onPress(),
    );
    expect(text(renderer)).toContain('本步解释 · 不代表完整过程');
    expect(analyze).not.toHaveBeenCalled();
    await act(async () => button(renderer, '复验完整过程').props.onPress());
    expect(text(renderer)).toContain('依赖性收尾');
    expect(text(renderer)).toContain('隐性数对');
    expect(text(renderer)).toContain('存在多条合理前置路径');
    await act(async () => button(renderer, '查看过程起始盘面').props.onPress());
    expect(text(renderer)).toContain('完整过程的起始盘面');
    const board = () =>
      renderer.root.find(node => node.props.state && node.props.onSelectCell);
    expect(board().props.state.candidates.manualCandidates).toEqual(
      source.records[0].request!.growthCandidates,
    );
    expect(board().props.disabled).toBe(true);
    await act(async () => button(renderer, '返回本步盘面').props.onPress());
    expect(board().props.state.candidates.manualCandidates).toEqual(
      source.records.at(-1)!.request!.growthCandidates,
    );
    await act(async () => renderer.unmount());
  });

  test('cancelled or invalidated verification cannot later republish a source explanation', async () => {
    const source = new Source();
    source.records = processReviewRecords();
    let pending!: {
      request: GrowthAnalysisRequest;
      resolve(response: GrowthAnalysisResponse): void;
      signal?: AbortSignal;
    };
    const analyze: TechniqueOpportunityAnalyzer['analyze'] = (
      request,
      options,
    ) =>
      new Promise(resolve => {
        pending = { request, resolve, signal: options?.signal };
      });
    const renderer = await render(source, jest.fn(), { analyze });
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'review-entry-review-3' })
        .props.onPress(),
    );
    await act(async () => button(renderer, '复验完整过程').props.onPress());
    await act(async () => button(renderer, '取消复验').props.onPress());
    expect(pending.signal?.aborted).toBe(true);
    await act(async () => pending.resolve(processResponse(pending.request)));
    expect(text(renderer)).not.toContain('依赖性收尾');
    await act(async () => button(renderer, '复验完整过程').props.onPress());
    const record = source.records.at(-1)!;
    source.records = [
      ...source.records,
      {
        ...record,
        recordId: 'invalidated-finish',
        phase: 'invalidation',
        request: null,
        recordedAtEpochMs: 20_000,
        diagnostic: {
          ...record.diagnostic!,
          attribution: {
            candidateTechniques: [],
            automaticTechnique: null,
            selectedTechnique: null,
            attributionEligibility: {
              status: 'ineligible',
              reason: 'undo_polluted',
            },
          },
        },
      },
    ];
    await act(async () => source.notify());
    expect(pending.signal?.aborted).toBe(true);
    await act(async () => pending.resolve(processResponse(pending.request)));
    expect(text(renderer)).toContain('过程复验不能恢复归因');
    expect(text(renderer)).not.toContain('依赖性收尾');
    await act(async () => renderer.unmount());
  });

  test('native failure is explicit and unmount aborts a pending run', async () => {
    const source = new Source();
    source.records = processReviewRecords();
    let signal: AbortSignal | undefined;
    let stall = false;
    const analyze: TechniqueOpportunityAnalyzer['analyze'] = async (
      _q,
      options,
    ) => {
      signal = options?.signal;
      if (stall) return new Promise<never>(() => undefined);
      throw new Error('native failed');
    };
    const renderer = await render(source, jest.fn(), { analyze });
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'review-entry-review-3' })
        .props.onPress(),
    );
    await act(async () => button(renderer, '复验完整过程').props.onPress());
    expect(text(renderer)).toContain('过程复验失败或证据不完整');
    expect(text(renderer)).not.toContain('依赖性收尾');
    stall = true;
    await act(async () => button(renderer, '复验完整过程').props.onPress());
    await act(async () => renderer.unmount());
    expect(signal?.aborted).toBe(true);
  });
  test('displays the same opportunity number for related records without hiding actions', async () => {
    const source = new Source();
    const first = reviewRecord();
    first.analysisDiagnostics = {
      opportunityCount: 1,
      opportunitySetComplete: true,
      usedExpandedSearch: false,
      reachedEnumerationLimitTechniques: [],
    };
    first.diagnostic!.attribution.candidateTechniques = [
      {
        technique: 'nakedPair',
        humanCost: 1,
        directPlacementMatch: false,
        oneHopPlacementMatch: false,
        matchingOpportunityCount: 1,
        matchingOpportunities: [
          { placements: [], eliminations: [{ cell: 2, digit: 1 }] },
        ],
      },
    ];
    const second = {
      ...first,
      recordId: 'second',
      segmentId: 'second',
      recordedAtEpochMs: 2,
      request: {
        ...first.request!,
        requestId: 'second',
        segmentId: 'second',
        startingRevision: 2,
        issuedRevision: 3,
      },
      diagnostic: { ...first.diagnostic!, segmentId: 'second' },
    };
    source.records = [first, second];
    const renderer = await render(source);
    expect(text(renderer).match(/关联技巧机会/g)).toHaveLength(2);
    expect(text(renderer)).not.toContain('# 2');
    expect(text(renderer).match(/查看盘面与动作/g)).toHaveLength(2);
    await act(async () => renderer.unmount());
  });
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
