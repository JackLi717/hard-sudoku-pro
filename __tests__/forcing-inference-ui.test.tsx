import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  OfflineGameSnapshot,
} from '../src/application';
import {
  Digit,
  GameDefinition,
  InferenceConclusion,
  addCandidate,
  boardFromFingerprint,
  createGameSession,
  createSolverCandidates,
  removeCandidate,
} from '../src/domain';
import { LocalizationProvider } from '../src/localization';
import { GameScreen } from '../src/ui/screens/GameScreen';
import { ThemeProvider } from '../src/ui/theme';
import { warmPaperTheme } from '../src/ui/themes/warm-paper';
import * as AdaptiveLayout from '../src/ui/layout/adaptive-layout';

const definition: GameDefinition = {
  puzzleId: 'forcing-ui',
  contentVersion: 4,
  difficultyLevel: 5,
  puzzleFingerprint:
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  solutionFingerprint:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
};

function snapshot(gameDefinition = definition): OfflineGameSnapshot {
  return {
    screen: 'game',
    session: createGameSession({
      sessionId: 'forcing-ui-session',
      definition: gameDefinition,
      startedAtEpochMs: 1,
    }),
    puzzle: null,
    resumable: false,
    busy: false,
    message: null,
    replacementRequest: null,
    quickDraftConfirmation: false,
    wallet: {
      quick_pencil: {
        resource: 'quick_pencil',
        balance: 0,
        earnedTotal: 0,
        spentTotal: 0,
      },
      smart_hint: {
        resource: 'smart_hint',
        balance: 0,
        earnedTotal: 0,
        spentTotal: 0,
      },
    },
    statistics: {
      attempts: 0,
      completions: 0,
      failures: 0,
      abandonments: 0,
      totalElapsedMs: 0,
      totalHintsUsed: 0,
      totalQuickPencilsUsed: 0,
    },
    completedByLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    completionStreak: { current: 0, best: 0 },
    reward: null,
    completionResult: null,
  };
}

const noOp = () => undefined;

function screen(
  current: OfflineGameSnapshot,
  onApplyInferenceConclusions: (
    conclusions: readonly InferenceConclusion[],
  ) => void | Promise<void>,
  onReplayFocusChange?: (cell: number | null, digit: Digit | null) => void,
  onValidateInferenceAction: () => Promise<boolean> = async () => true,
) {
  return (
    <LocalizationProvider locale="zh-Hans">
      <ThemeProvider preference="light">
        <GameScreen
          onAbandon={noOp}
          onApplyHint={noOp}
          onApplyInferenceConclusions={onApplyInferenceConclusions}
          onBack={noOp}
          onDigit={noOp}
          onDismissHint={noOp}
          onErase={noOp}
          onHint={noOp}
          onOneTapFill={noOp}
          onPause={noOp}
          onPencil={noOp}
          onQuickPencil={noOp}
          onRemoveCandidateFromCells={noOp}
          onReplayFocusChange={onReplayFocusChange}
          onValidateInferenceAction={onValidateInferenceAction}
          onResume={noOp}
          onSelectCell={noOp}
          onUndo={noOp}
          preferences={{
            ...DEFAULT_PRODUCT_PREFERENCES,
            hintAnimations: false,
            showTimer: false,
          }}
          snapshot={current}
        />
      </ThemeProvider>
    </LocalizationProvider>
  );
}

test('prompts for the other path when the current path can be completed', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  const completionDefinition: GameDefinition = {
    ...definition,
    puzzleId: 'forcing-complete-path',
    puzzleFingerprint:
      '534678912672195348198342567859760420426850790713924856961537284287419635345286179',
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        screen(snapshot(completionDefinition), jest.fn()),
      );
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-32' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-1' }).props.onPress();
    });
    for (const cell of [35, 41]) {
      await ReactTestRenderer.act(async () => {
        renderer.root
          .findByProps({ testID: `sudoku-cell-index-${cell}` })
          .props.onPress();
      });
      await ReactTestRenderer.act(async () => {
        renderer.root.findByProps({ testID: 'number-key-3' }).props.onPress();
      });
    }

    expect(
      renderer.root.findByProps({ testID: 'inference-path-complete' }).props
        .children,
    ).toBe('路径 A 可完成，尝试路径 B');
    expect(
      renderer.root.findByProps({ testID: 'inference-apply' }).props.disabled,
    ).toBe(true);
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

describe.each([
  ['phone', false],
  ['Android landscape tablet', true],
] as const)('forcing inference on %s', (_label, tablet) => {
  test('keeps the board geometry and replaces only the controls', async () => {
    const adaptiveLayout = jest
      .spyOn(AdaptiveLayout, 'useAdaptiveLayout')
      .mockReturnValue({
        isAndroidTablet: tablet,
        isLandscape: tablet,
        useLandscapeTabletLayout: tablet,
        widthClass: tablet ? 'expanded' : 'compact',
      });
    const apply = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(screen(snapshot(), apply));
      });
      const originalBoardStyle = StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'sudoku-board' }).props.style,
      );
      const originalHeaderStyle = StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'game-header' }).props.style,
      );
      const inferenceEntryStyle = StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'inference-start' }).props.style,
      );
      expect(inferenceEntryStyle).toMatchObject({
        borderWidth: 1,
        position: 'absolute',
        right: 0,
      });
      expect(
        renderer.root.findByProps({ testID: 'game-toolbar' }),
      ).toBeTruthy();

      await ReactTestRenderer.act(async () => {
        renderer.root
          .findByProps({ testID: 'inference-start' })
          .props.onPress();
      });
      const forcingBoardStyle = StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'sudoku-board' }).props.style,
      );
      expect(forcingBoardStyle.width).toBe(originalBoardStyle.width);
      expect(forcingBoardStyle.height).toBe(originalBoardStyle.height);
      expect(
        renderer.root.findAllByProps({ testID: 'game-meta' }),
      ).toHaveLength(0);
      expect(
        StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'game-header' }).props.style,
        ),
      ).toEqual(originalHeaderStyle);
      expect(
        renderer.root.findAllByProps({ testID: 'game-toolbar' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findByProps({ testID: 'inference-controls' }),
      ).toBeTruthy();
      expect(
        renderer.root.findByProps({ testID: 'inference-assume' }).props
          .accessibilityLabel,
      ).toBe('请选择一个候选数建立假设');
      expect(
        renderer.root.findByProps({ testID: 'inference-assume' }).props
          .accessibilityRole,
      ).toBeUndefined();
      expect(
        renderer.root.findAllByProps({ testID: 'inference-truth-true' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({ testID: 'inference-truth-false' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({ testID: 'inference-multi-select' }),
      ).toHaveLength(0);
      expect(
        React.Children.toArray(
          renderer.root.findByProps({ testID: 'inference-edit-controls' }).props
            .children,
        ).map(child =>
          React.isValidElement<{ testID?: string }>(child)
            ? child.props.testID
            : undefined,
        ),
      ).toEqual([
        'inference-path-a',
        'inference-path-b',
        'inference-display-toggle',
      ]);
      expect(
        renderer.root.findByProps({ testID: 'inference-display-toggle' }).props
          .accessibilityState.checked,
      ).toBe(false);
      expect(
        renderer.root.findByProps({ testID: 'inference-display-toggle' }).props
          .accessibilityState.disabled,
      ).toBe(true);
      expect(
        React.Children.toArray(
          renderer.root.findByProps({ testID: 'inference-utility-controls' })
            .props.children,
        ).map(child =>
          React.isValidElement<{ testID?: string }>(child)
            ? child.props.testID
            : undefined,
        ),
      ).toEqual([undefined, 'inference-undo', 'inference-clear']);
      expect(
        StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'inference-path-swatch-a' }).props
            .style,
        ).backgroundColor,
      ).toBe(warmPaperTheme.appearances.light.boardTheme.colors.reasoningPathA);
      expect(
        StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'inference-path-swatch-b' }).props
            .style,
        ).backgroundColor,
      ).toBe(warmPaperTheme.appearances.light.palette.muted);
      expect(
        renderer.root.findByProps({
          testID: tablet ? 'game-landscape-layout' : 'game-portrait-layout',
        }),
      ).toBeTruthy();
      if (tablet) {
        const numberKeyColumns = StyleSheet.flatten(
          renderer.root
            .findByProps({ testID: 'number-key-1' })
            .props.style({ pressed: false }),
        );
        for (const testID of [
          'inference-path-a',
          'inference-display-toggle',
          'inference-undo',
          'inference-clear',
        ]) {
          expect(
            StyleSheet.flatten(
              renderer.root.findByProps({ testID }).props.style,
            ),
          ).toMatchObject({
            flexBasis: numberKeyColumns.flexBasis,
            flexGrow: numberKeyColumns.flexGrow,
            flexShrink: numberKeyColumns.flexShrink,
          });
        }
      }
    } finally {
      ReactTestRenderer.act(() => renderer?.unmount());
      adaptiveLayout.mockRestore();
    }
  });
});

test('builds A/B paths with cell selection plus number keys and applies a shared result', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  const apply = jest.fn();
  const changeReplayFocus = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        screen(snapshot(), apply, changeReplayFocus),
      );
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'sudoku-selection-2' }).props.style,
      ).borderColor,
    ).toBe(
      warmPaperTheme.appearances.light.boardTheme.colors.reasoningSelection,
    );
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress();
    });
    expect(
      renderer.root.findAllByProps({ testID: 'inference-assume' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'inference-truth-true' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'inference-truth-false' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'inference-truth-false' }).props
        .disabled,
    ).toBeFalsy();
    expect(
      renderer.root.findByProps({ testID: 'inference-multi-select' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'inference-multi-select' }).props
        .disabled,
    ).toBeFalsy();
    expect(
      renderer.root.findByProps({ testID: 'inference-path-b' }).props.disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-true-a-2-4' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({
        testID: 'sudoku-reasoning-false-b-2-4',
      }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'inference-display-toggle' }).props
        .accessibilityState.disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({ testID: 'inference-undo' }).props.disabled,
    ).toBe(false);

    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-undo' }).props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'inference-path-b' }).props.disabled,
    ).toBe(true);
    expect(
      renderer.root.findByProps({ testID: 'inference-assume' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({
        testID: 'sudoku-reasoning-true-a-2-4',
      }),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress();
    });

    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-clear' }).props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'inference-path-b' }).props.disabled,
    ).toBe(true);
    expect(
      renderer.root.findByProps({ testID: 'inference-assume' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({
        testID: 'sudoku-reasoning-true-a-2-4',
      }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({
        testID: 'sudoku-reasoning-false-b-2-4',
      }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'inference-controls' }),
    ).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress();
    });

    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-5' })
        .props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'number-key-8' }).props
        .accessibilityState.disabled,
    ).toBe(false);
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-8' }).props.onPress();
    });

    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-path-b' }).props.onPress();
    });
    expect(
      renderer.root.findAllByProps({
        testID: 'sudoku-reasoning-true-a-2-4',
      }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-false-b-2-4' }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'inference-path-swatch-a' }).props
          .style,
      ).backgroundColor,
    ).toBe(warmPaperTheme.appearances.light.palette.muted);
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'inference-path-swatch-b' }).props
          .style,
      ).backgroundColor,
    ).toBe(warmPaperTheme.appearances.light.boardTheme.colors.reasoningPathB);
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-5' })
        .props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'number-key-8' }).props
        .accessibilityState.disabled,
    ).toBe(false);
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-8' }).props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'inference-conclusion' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'inference-conclusion' }).props
        .children,
    ).toBe('两路一致 · 填入数字');
    expect(
      renderer.root.findByProps({ testID: 'inference-conclusion' }).props
        .numberOfLines,
    ).toBe(2);
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'sudoku-cell-index-5' }).props
          .style,
      ).backgroundColor,
    ).toBe(
      warmPaperTheme.appearances.light.boardTheme.colors
        .reasoningConclusionSoft,
    );
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'inference-display-toggle' })
        .props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-true-a-2-4' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'inference-conclusion' }),
    ).toBeTruthy();
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'inference-display-toggle' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-apply' }).props.onPress();
    });
    expect(apply).toHaveBeenCalledWith([
      {
        cell: 5,
        digit: 8,
        action: 'place',
        reason: 'shared_result',
      },
    ]);
    expect(changeReplayFocus).toHaveBeenLastCalledWith(5, 8);
    expect(
      renderer.root.findAllByProps({ testID: 'inference-controls' }),
    ).toHaveLength(0);
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

test('carries the current filled cell and digit focus into inference and restores them on exit', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  const current = snapshot();
  current.session!.state.selectedCell = 0;
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(screen(current, jest.fn()));
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });

    expect(
      renderer.root.findByProps({ testID: 'sudoku-selection-0' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'number-key-5' }).props
        .accessibilityState.selected,
    ).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-exit' }).props.onPress();
    });
    expect(
      renderer.root.findAllByProps({ testID: 'inference-controls' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'sudoku-selection-0' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'number-key-5' }).props
        .accessibilityState.selected,
    ).toBe(true);
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

test('keeps focus on the cell used by the latest inference step', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(screen(snapshot(), jest.fn()));
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress();
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-5' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-8' }).props.onPress();
    });

    expect(
      renderer.root.findByProps({ testID: 'sudoku-selection-5' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'number-key-8' }).props
        .accessibilityState.selected,
    ).toBe(true);
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

test('filters A/B marks independently from the active edit path', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(screen(snapshot(), jest.fn()));
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-1' }).props.onPress();
    });

    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-true-a-2-1' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({
        testID: 'sudoku-reasoning-false-b-2-1',
      }),
    ).toHaveLength(0);
    expect(
      StyleSheet.flatten(
        renderer.root.findAllByProps({
          testID: 'sudoku-candidate-digit-2-1',
        })[0].props.style,
      ).color,
    ).toBe(warmPaperTheme.appearances.light.boardTheme.colors.reasoningPathA);
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'inference-display-toggle' })
        .props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-true-a-2-1' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-false-b-2-1' }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        renderer.root.findAllByProps({
          testID: 'sudoku-candidate-digit-2-1',
        })[0].props.style,
      ).color,
    ).toBe(warmPaperTheme.appearances.light.boardTheme.colors.reasoningPathA);

    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-path-b' }).props.onPress();
    });
    expect(
      renderer.root.findAll(
        node =>
          typeof node.props.testID === 'string' &&
          node.props.testID.includes('sudoku-reasoning-') &&
          node.props.testID.includes('-a-'),
      ),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-false-b-2-1' }),
    ).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'inference-display-toggle' })
        .props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'inference-display-toggle' }).props
        .accessibilityState.checked,
    ).toBe(true);
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-true-a-2-1' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-false-b-2-1' }),
    ).toBeTruthy();
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

test('allows user-directed deductions inside path B', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(screen(snapshot(), jest.fn()));
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-path-b' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });

    expect(
      renderer.root.findByProps({ testID: 'number-key-1' }).props
        .accessibilityState.disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({ testID: 'number-key-2' }).props
        .accessibilityState.disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({ testID: 'inference-truth-false' }).props
        .disabled,
    ).toBeFalsy();
    expect(
      renderer.root.findByProps({ testID: 'inference-multi-select' }).props
        .disabled,
    ).toBeFalsy();
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-3' })
        .props.onPress();
      renderer.root
        .findByProps({ testID: 'inference-truth-false' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-2' }).props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-false-b-2-4' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-false-b-3-2' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({ testID: 'inference-conclusion' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'inference-apply' }).props.disabled,
    ).toBe(true);
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

test('locks Apply when free-form deductions produce an incorrect result', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  const current = snapshot();
  current.puzzle = {
    id: definition.puzzleId,
    puzzle: definition.puzzleFingerprint,
    solution: definition.solutionFingerprint,
    difficultyLevel: definition.difficultyLevel,
    difficultyScore: 0,
    hardestTechnique: 'fullHouse',
    ratingVersion: 'test',
    source: 'test',
    contentVersion: definition.contentVersion,
    checksum: 'test',
    enabled: true,
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(screen(current, jest.fn()));
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-3' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-2' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-path-b' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-3' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-2' }).props.onPress();
    });

    expect(
      renderer.root.findByProps({ testID: 'inference-conclusion' }).props
        .children,
    ).toBe('推演有误 · 无法应用');
    expect(
      renderer.root.findByProps({ testID: 'inference-apply' }).props.disabled,
    ).toBe(true);
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

test('locks a correct conclusion when the contradiction proof contains an unverified step', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  const validate = jest.fn(async () => false);
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        screen(snapshot(), jest.fn(), undefined, validate),
      );
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-path-b' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-6' })
        .props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'number-key-4' }).props
        .accessibilityState.disabled,
    ).toBe(false);
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress();
      await Promise.resolve();
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(validate).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findByProps({ testID: 'inference-conclusion' }).props
        .children,
    ).toBe('推理未成立 · 无法应用');
    expect(
      renderer.root.findByProps({ testID: 'inference-apply' }).props.disabled,
    ).toBe(true);
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-5' })
        .props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'number-key-8' }).props
        .accessibilityState.disabled,
    ).toBe(false);
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

test('enables Apply when the root assumption immediately contradicts the path', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(screen(snapshot(), jest.fn()));
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-1' }).props.onPress();
    });

    expect(
      renderer.root.findByProps({ testID: 'inference-conclusion' }).props
        .children,
    ).toBe('路径矛盾 · 移除候选');
    expect(
      renderer.root.findByProps({ testID: 'inference-apply' }).props.disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-true-a-2-1' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'sudoku-cell-index-2' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-slot-1' }),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'inference-path-a' }).props
        .accessibilityState.selected,
    ).toBe(true);
    expect(
      renderer.root.findByProps({ testID: 'inference-display-toggle' }).props
        .accessibilityState.checked,
    ).toBe(false);
    expect(
      renderer.root.findByProps({ testID: 'inference-conclusion' }).props
        .numberOfLines,
    ).toBe(2);
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-5' })
        .props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'number-key-8' }).props
        .accessibilityState.disabled,
    ).toBe(false);
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'number-key-8' }).props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'sudoku-reasoning-true-a-5-8' }),
    ).toBeTruthy();
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

test('rejects illegal visible candidates before opening forcing mode', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  const current = snapshot();
  current.session!.state.candidates.manualCandidates =
    current.session!.state.candidates.manualCandidates.map((mask, cell) =>
      cell === 2 ? addCandidate(mask, 5) : mask,
    );
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(screen(current, jest.fn()));
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    expect(
      renderer.root.findAllByProps({ testID: 'inference-controls' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'sudoku-cell-feedback-2' }),
    ).toBeTruthy();
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

test('keeps an applied inference elimination out of the next inference session', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  const current = snapshot();
  current.session!.state.candidates.inferenceEliminations = [
    { cell: 2, digit: 4 },
  ];
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(screen(current, jest.fn()));
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress();
    });
    expect(
      renderer.root.findByProps({ testID: 'number-key-4' }).props.disabled,
    ).toBe(true);
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});

test('does not restore candidates deleted from the visible Quick draft', async () => {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: false,
    isLandscape: false,
    useLandscapeTabletLayout: false,
    widthClass: 'compact',
  });
  const current = snapshot();
  const candidates = current.session!.state.candidates;
  candidates.quickDraftGenerated = true;
  candidates.activeCandidateSource = 'quick';
  candidates.quickCandidates = createSolverCandidates(
    boardFromFingerprint(definition.puzzleFingerprint),
  ).map((mask, cell) =>
    cell === 2 || cell === 6 || cell === 7 ? removeCandidate(mask, 4) : mask,
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(screen(current, jest.fn()));
    });
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'inference-start' }).props.onPress();
    });
    for (const cell of [2, 6, 7]) {
      await ReactTestRenderer.act(async () => {
        renderer.root
          .findByProps({ testID: `sudoku-cell-index-${cell}` })
          .props.onPress();
      });
      expect(
        renderer.root.findByProps({ testID: 'number-key-4' }).props.disabled,
      ).toBe(true);
    }
  } finally {
    ReactTestRenderer.act(() => renderer?.unmount());
    jest.restoreAllMocks();
  }
});
