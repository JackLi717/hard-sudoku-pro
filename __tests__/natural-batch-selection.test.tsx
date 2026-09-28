import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  OfflineGameSnapshot,
} from '../src/application';
import {
  addCandidate,
  createGameSession,
  removeCandidate,
} from '../src/domain';
import { LocalizationProvider } from '../src/localization';
import { GameScreen } from '../src/ui/screens/GameScreen';
import { ScreenStateProvider } from '../src/ui/screen-state';
import { ThemeProvider } from '../src/ui/theme';
import * as AdaptiveLayout from '../src/ui/layout/adaptive-layout';

const noOp = () => undefined;
const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

let renderer: ReactTestRenderer.ReactTestRenderer;
const boardNode = () =>
  renderer.root.find(
    node =>
      Array.isArray(node.props.state?.values) &&
      typeof node.props.multiSelectActive === 'boolean',
  );
afterEach(async () => {
  await ReactTestRenderer.act(async () => renderer?.unmount());
  jest.restoreAllMocks();
});

async function setup(
  inputMode: 'cell_first' | 'digit_first',
  {
    tablet = true,
    theme = 'light',
    pencilMode = true,
    multiSelectEnabled = true,
    quick = false,
  }: {
    tablet?: boolean;
    theme?: 'light' | 'dark';
    pencilMode?: boolean;
    multiSelectEnabled?: boolean;
    quick?: boolean;
  } = {},
) {
  jest.spyOn(AdaptiveLayout, 'useAdaptiveLayout').mockReturnValue({
    isAndroidTablet: tablet,
    isLandscape: tablet,
    useLandscapeTabletLayout: tablet,
    widthClass: tablet ? 'expanded' : 'compact',
  });
  const session = createGameSession({
    sessionId: 'natural-batch',
    definition: {
      puzzleId: 'natural-batch',
      contentVersion: 4,
      difficultyLevel: 4,
      difficultyScore: 6000,
      puzzleFingerprint: puzzle,
      solutionFingerprint: solution,
    },
    startedAtEpochMs: Date.now(),
  });
  session.state.selectedCell = null;
  const candidates = session.state.candidates.manualCandidates.map(
    (mask, cell) =>
      [2, 3, 6].includes(cell)
        ? addCandidate(addCandidate(addCandidate(mask, 2), 4), 7)
        : 0,
  );
  session.state.candidates = {
    ...session.state.candidates,
    pencilMode,
    activeCandidateSource: quick ? 'quick' : 'manual',
    manualCandidates: candidates,
    quickCandidates: candidates,
  };
  // This screen only needs the active game and balances for these interactions.
  const source = {
    session,
    busy: false,
    message: null,
    wallet: {
      quick_pencil: { balance: 0 },
      smart_hint: { balance: 0 },
    },
  } as OfflineGameSnapshot;
  const onDigit = jest.fn();
  const onRemove = jest.fn();
  let update!: React.Dispatch<React.SetStateAction<OfflineGameSnapshot>>;
  let setVisible!: React.Dispatch<React.SetStateAction<boolean>>;
  function Harness() {
    const [state, setState] = React.useState(source);
    const [visible, changeVisible] = React.useState(true);
    update = setState;
    setVisible = changeVisible;
    return (
      <ScreenStateProvider>
        <LocalizationProvider locale="en">
          <ThemeProvider preference={theme}>
            {visible ? (
              <GameScreen
                snapshot={state}
                preferences={{
                  ...DEFAULT_PRODUCT_PREFERENCES,
                  inputMode,
                  multiSelectEnabled,
                  oneTapFill: true,
                }}
                onAbandon={noOp}
                onApplyHint={noOp}
                onBack={noOp}
                onDigit={onDigit}
                onOneTapFill={noOp}
                onRemoveCandidates={(cells, digits) => {
                  onRemove(cells, digits);
                  setState(current => ({
                    ...current,
                    session: {
                      ...current.session!,
                      state: {
                        ...current.session!.state,
                        candidates: {
                          ...current.session!.state.candidates,
                          [quick ? 'quickCandidates' : 'manualCandidates']:
                            current.session!.state.candidates[
                              quick ? 'quickCandidates' : 'manualCandidates'
                            ].map((mask, cell) =>
                              cells.includes(cell)
                                ? digits.reduce(removeCandidate, mask)
                                : mask,
                            ),
                        },
                      },
                    },
                  }));
                }}
                onDismissHint={noOp}
                onErase={noOp}
                onHint={noOp}
                onPause={noOp}
                onPencil={noOp}
                onQuickPencil={noOp}
                onResume={noOp}
                onSelectCell={cell =>
                  setState(current => ({
                    ...current,
                    session: {
                      ...current.session!,
                      state: { ...current.session!.state, selectedCell: cell },
                    },
                  }))
                }
                onUndo={noOp}
              />
            ) : null}
          </ThemeProvider>
        </LocalizationProvider>
      </ScreenStateProvider>
    );
  }
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  const node = (testID: string) => renderer.root.findByProps({ testID });
  const tap = async (testID: string) => {
    expect(node(testID).props.disabled).not.toBe(true);
    await ReactTestRenderer.act(async () => node(testID).props.onPress());
  };
  const cell = (index: number) => tap(`sudoku-cell-index-${index}`);
  const digit = (value: number) => tap(`number-key-${value}`);
  const batch = () =>
    node('multi-select-tool').props.accessibilityState.selected;
  const select = inputMode === 'cell_first' ? cell : digit;
  const execute = inputMode === 'cell_first' ? digit : cell;
  const selection = () => {
    if (inputMode === 'digit_first') {
      return [2, 4, 7].filter(
        value => node(`number-key-${value}`).props.accessibilityState.selected,
      );
    }
    const board = boardNode().props;
    return board.selectedCells.length > 0
      ? [...board.selectedCells].sort((a: number, b: number) => a - b)
      : board.state.selectedCell === null
      ? []
      : [board.state.selectedCell];
  };
  const background = async () => {
    await ReactTestRenderer.act(async () =>
      node(
        tablet ? 'game-landscape-layout' : 'game-portrait-layout',
      ).props.onTouchEnd({ target: 1, currentTarget: 1 }),
    );
  };
  return {
    node,
    tap,
    cell,
    digit,
    select,
    execute,
    selection,
    batch,
    background,
    onDigit,
    onRemove,
    update,
    setVisible,
    a: inputMode === 'cell_first' ? 3 : 7,
    b: inputMode === 'cell_first' ? 2 : 4,
    c: inputMode === 'cell_first' ? 6 : 2,
    x: inputMode === 'cell_first' ? 4 : 2,
    y: inputMode === 'cell_first' ? 7 : 3,
  };
}

describe.each(['cell_first', 'digit_first'] as const)(
  '%s natural batch',
  inputMode => {
    test.each([
      [true, 'light', false],
      [true, 'dark', true],
      [false, 'light', true],
      [false, 'dark', false],
    ] as const)(
      'supports selection, removal and restart (tablet %s, %s, quick %s)',
      async (tablet, theme, quick) => {
        const h = await setup(inputMode, { tablet, theme, quick });
        await h.select(h.a);
        expect(h.batch()).toBe(false);
        await h.select(h.b);
        expect(h.selection()).toEqual([h.b]);
        await h.select(h.a);
        await h.select(h.a);
        expect(h.batch()).toBe(true);
        const frameID =
          inputMode === 'cell_first'
            ? `sudoku-batch-selection-${h.a}`
            : `number-batch-selection-${h.a}`;
        expect(h.node(frameID)).toBeDefined();
        if (tablet && inputMode === 'digit_first') {
          expect(
            StyleSheet.flatten(h.node(`number-key-circle-${h.a}`).props.style),
          ).toMatchObject({ borderRadius: 999 });
          expect(StyleSheet.flatten(h.node(frameID).props.style)).toMatchObject(
            {
              borderRadius: 999,
              borderStyle: 'dashed',
            },
          );
        }
        await h.select(h.b);
        await h.select(h.a);
        expect(h.selection()).toEqual([h.b]);
        expect(h.batch()).toBe(true);
        await h.select(h.b);
        expect(h.batch()).toBe(false);
        expect(h.selection()).toEqual([h.b]);
        await h.select(h.b);
        await h.select(h.a);
        await h.execute(h.x);
        await h.execute(h.y);
        expect(h.onRemove.mock.calls).toEqual(
          inputMode === 'cell_first'
            ? [
                [[2, 3], [4]],
                [[2, 3], [7]],
              ]
            : [
                [[2], [4, 7]],
                [[3], [4, 7]],
              ],
        );
        expect(h.batch()).toBe(true);
        expect(h.onDigit).not.toHaveBeenCalled();
        await h.select(h.a);
        expect(h.batch()).toBe(false);
        expect(h.selection()).toEqual([h.a]);
        expect(renderer.root.findAllByProps({ testID: frameID })).toHaveLength(
          0,
        );
        if (inputMode === 'cell_first') {
          const frame = h.node(`sudoku-selection-${h.a}`);
          expect(StyleSheet.flatten(frame.props.style).borderWidth).toBe(2);
        } else {
          expect(h.node(`number-single-selection-${h.a}`)).toBeDefined();
          if (tablet) {
            expect(
              StyleSheet.flatten(
                h.node(`number-key-circle-${h.a}`).props.style,
              ),
            ).toMatchObject({ borderRadius: 999 });
            expect(
              StyleSheet.flatten(
                h.node(`number-single-selection-${h.a}`).props.style,
              ),
            ).toMatchObject({ borderRadius: 999 });
          }
          expect(boardNode().props.candidateBatchSelection).toBe(false);
        }
        await h.select(h.a);
        await h.select(h.b);
        await h.background();
        expect(h.batch()).toBe(false);
        expect(h.selection()).toEqual([]);
      },
    );

    test('shares state with buttons and Normal retains the last selected item', async () => {
      const h = await setup(inputMode);
      await h.select(h.a);
      await h.tap('multi-select-tool');
      expect(h.selection()).toEqual([h.a]);
      await h.tap('multi-select-tool');
      expect(h.batch()).toBe(true);
      await h.select(h.b);
      await h.tap('candidate-normal-tool');
      expect(h.batch()).toBe(false);
      expect(h.selection()).toEqual([h.b]);
      await h.tap('candidate-normal-tool');
      expect(h.selection()).toEqual([h.b]);
      await h.select(h.b);
      expect(
        h.node('candidate-normal-tool').props.accessibilityState.selected,
      ).toBe(false);
      await h.select(h.a);
      await h.select(h.b);
      await h.tap('candidate-normal-tool');
      expect(h.selection()).toEqual([h.a]);
    });

    test('preserves the post-removal boundary across navigation', async () => {
      const h = await setup(inputMode);
      await h.select(h.a);
      await h.select(h.a);
      await h.select(h.b);
      await h.execute(h.x);
      await ReactTestRenderer.act(async () => h.setVisible(false));
      await ReactTestRenderer.act(async () => h.setVisible(true));
      expect(h.batch()).toBe(true);
      await h.select(h.c);
      expect(h.batch()).toBe(false);
      expect(h.selection()).toEqual([h.c]);
    });

    test.each([
      { pencilMode: false, multiSelectEnabled: true },
      { pencilMode: true, multiSelectEnabled: false },
    ])('keeps ordinary input when unavailable: %o', async options => {
      const h = await setup(inputMode, options);
      await h.select(h.a);
      await h.select(h.a);
      expect(boardNode().props.multiSelectActive).toBe(false);
      expect(h.selection()).toEqual(inputMode === 'cell_first' ? [h.a] : []);
      expect(h.onRemove).not.toHaveBeenCalled();
    });

    test('exits on a filled cell or a cell without candidates without editing it', async () => {
      const h = await setup(inputMode);
      for (const target of [0, 5]) {
        await h.select(h.a);
        await h.tap('multi-select-tool');
        await h.select(h.b);
        await h.cell(target);
        expect(h.batch()).toBe(false);
        expect(boardNode().props.state.selectedCell).toBe(target);
        expect(h.onDigit).not.toHaveBeenCalled();
        expect(h.onRemove).not.toHaveBeenCalled();
      }
    });
  },
);

test('an unavailable removal does not finish selecting; a new drag restarts after removal', async () => {
  const h = await setup('cell_first');
  await h.select(h.a);
  await h.select(h.a);
  expect(h.node('number-key-9').props.disabled).toBe(true);
  await ReactTestRenderer.act(async () =>
    h.node('number-key-9').props.onPress(),
  );
  await h.select(h.b);
  expect(h.batch()).toBe(true);
  expect(h.selection()).toEqual([2, 3]);
  await h.execute(h.x);
  await ReactTestRenderer.act(async () =>
    boardNode().props.onDragSelectCells([6, 0, 5]),
  );
  expect(h.batch()).toBe(true);
  expect(h.selection()).toEqual([6]);
  await h.execute(h.y);
  expect(h.onRemove).toHaveBeenLastCalledWith([6], [7]);
});

test('digit-first no-op deletion keeps the selection editable', async () => {
  const h = await setup('digit_first');
  await h.digit(9);
  await h.digit(9);
  await h.cell(2);
  expect(h.onRemove).not.toHaveBeenCalled();
  await h.digit(7);
  expect(h.batch()).toBe(true);
  expect(h.node('number-key-9').props.accessibilityState.selected).toBe(true);
  expect(h.node('number-key-7').props.accessibilityState.selected).toBe(true);
});

test.each(['cell_first', 'digit_first'] as const)(
  '%s retains its completed batch across pause and clears it when Notes closes',
  async inputMode => {
    const h = await setup(inputMode);
    await h.select(h.a);
    await h.select(h.a);
    await h.select(h.b);
    await h.execute(h.x);
    const setStatus = async (status: 'paused' | 'active') => {
      await ReactTestRenderer.act(async () =>
        h.update(current => ({
          ...current,
          session: {
            ...current.session!,
            state: { ...current.session!.state, status },
          },
        })),
      );
    };
    await setStatus('paused');
    expect(h.node('multi-select-tool').props.disabled).toBe(true);
    await setStatus('active');
    expect(h.batch()).toBe(true);
    await h.select(h.c);
    expect(h.batch()).toBe(false);
    expect(h.selection()).toEqual([h.c]);
    await h.select(h.c);
    expect(h.batch()).toBe(true);
    await ReactTestRenderer.act(async () =>
      h.update(current => ({
        ...current,
        session: {
          ...current.session!,
          state: {
            ...current.session!.state,
            candidates: {
              ...current.session!.state.candidates,
              pencilMode: false,
            },
          },
        },
      })),
    );
    expect(h.batch()).toBe(false);
    expect(boardNode().props.multiSelectActive).toBe(false);
  },
);

test('a single visible candidate remains selectable while natural batch input is enabled', async () => {
  const h = await setup('cell_first');
  await ReactTestRenderer.act(async () =>
    h.update(current => ({
      ...current,
      session: {
        ...current.session!,
        state: {
          ...current.session!.state,
          candidates: {
            ...current.session!.state.candidates,
            manualCandidates:
              current.session!.state.candidates.manualCandidates.map(
                (mask, cell) => (cell === h.a ? addCandidate(0, 4) : mask),
              ),
          },
        },
      },
    })),
  );
  await h.select(h.a);
  expect(h.selection()).toEqual([h.a]);
  await h.select(h.a);
  expect(h.batch()).toBe(true);
  await h.digit(4);
  expect(h.onRemove).toHaveBeenLastCalledWith([h.a], [4]);
  expect(h.batch()).toBe(false);
});

test('entering batch from a filled focus waits for an eligible selection', async () => {
  const h = await setup('cell_first');
  await h.cell(0);
  await h.tap('multi-select-tool');
  expect(h.batch()).toBe(true);
  expect(h.selection()).toEqual([]);
  expect(
    renderer.root.findAllByProps({ testID: 'sudoku-batch-selection-0' }),
  ).toHaveLength(0);
  await h.cell(3);
  expect(h.selection()).toEqual([3]);
  expect(h.node('sudoku-batch-selection-3')).toBeDefined();
});
