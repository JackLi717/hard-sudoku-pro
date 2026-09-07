import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { addCandidate, ALL_CANDIDATES_MASK, Board, Digit } from '../src/domain';
import { uniqueCandidateNotes } from '../src/ui/components/candidate-note-assistance';
import {
  SudokuBoard,
  SudokuBoardState,
} from '../src/ui/components/SudokuBoard';
import { ThemeProvider } from '../src/ui/theme';
import { warmPaperTheme } from '../src/ui/themes/warm-paper';

const two = addCandidate(0, 2);
const empty: Board = Array(81).fill(null);

// Outside the selected region all notes are present, so the test cannot pass
// accidentally because the target is also unique in another region.
test.each([
  ['row', [0, 1, 2, 3, 4, 5, 6, 7, 8]],
  ['column', [0, 9, 18, 27, 36, 45, 54, 63, 72]],
  ['box', [0, 1, 2, 9, 10, 11, 18, 19, 20]],
] as const)(
  'counts unique notes in a %s without proving an answer',
  (_, region) => {
    const notes = Array(81).fill(two);
    region.slice(1).forEach(cell => {
      notes[cell] = 0;
    });
    expect([...uniqueCandidateNotes(empty, notes, 2)]).toEqual([0]);
    notes[region[1]] = two;
    expect(uniqueCandidateNotes(empty, notes, 2).size).toBe(0);
    notes[region[1]] = 0;
    const values = [...empty];
    values[region[1]] = 2;
    expect(uniqueCandidateNotes(values, notes, 2).size).toBe(0);
  },
);

function boardState(): SudokuBoardState {
  const notes = Array(81).fill(0);
  notes[0] = addCandidate(two, 3);
  return {
    values: empty,
    givens: Array(81).fill(false),
    selectedCell: null,
    incorrectCells: [],
    activeHint: null,
    status: 'active',
    candidates: {
      pencilMode: true,
      quickDraftGenerated: false,
      quickDraftBoardFingerprint: null,
      hintBoardFingerprint: null,
      activeCandidateSource: 'manual',
      manualCandidates: notes,
      quickCandidates: Array(81).fill(ALL_CANDIDATES_MASK),
      hintCandidates: null,
    },
  };
}

test.each(['light', 'dark'] as const)(
  'provides reversible note-only emphasis in %s with normal cell interaction',
  async appearance => {
    const state = boardState();
    const before = JSON.stringify(state);
    const onSelect = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const render = (
      overrides: Partial<React.ComponentProps<typeof SudokuBoard>> = {},
    ) => (
      <ThemeProvider preference={appearance}>
        <SudokuBoard
          state={state}
          highlightDigit={2}
          highlightSameDigit={false}
          candidateNoteAssist
          onSelectCell={onSelect}
          {...overrides}
        />
      </ThemeProvider>
    );
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(render());
    });
    const colors = warmPaperTheme.appearances[appearance].boardTheme.colors;
    const badge = () =>
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-unique-2' });
    expect(badge().length).toBeGreaterThan(0);
    expect(StyleSheet.flatten(badge()[0].props.style).borderColor).toBe(
      colors.focusText,
    );
    const cell = renderer.root.findByProps({ testID: 'sudoku-cell-index-0' });
    expect(cell.props.accessibilityLabel).toContain('not a confirmed answer');
    expect(
      StyleSheet.flatten(
        cell.findByProps({ testID: 'sudoku-candidate-slot-2' }).props.style,
      ).backgroundColor,
    ).toBe(colors.focus);
    expect(onSelect).not.toHaveBeenCalled();
    await ReactTestRenderer.act(() => cell.props.onPress());
    expect(onSelect).toHaveBeenCalledWith(0);
    expect(JSON.stringify(state)).toBe(before);

    for (const overrides of [
      { candidateNoteAssist: false },
      { highlightDigit: null },
      { highlightDigit: 4 as Digit },
      { disabled: true },
      { showCandidates: false },
      {
        hintVisuals: {
          showFocusCells: false,
          showFocusRegions: false,
          showPremises: false,
          showEliminations: false,
          showPlacements: false,
        },
      },
      {
        state: {
          ...state,
          candidates: { ...state.candidates, pencilMode: false },
        },
      },
      {
        state: {
          ...state,
          candidates: {
            ...state.candidates,
            activeCandidateSource: 'quick' as const,
          },
        },
      },
    ]) {
      await ReactTestRenderer.act(() => renderer.update(render(overrides)));
      expect(badge()).toHaveLength(0);
    }
    await ReactTestRenderer.act(() =>
      renderer.update(render({ candidateNoteAssist: false })),
    );
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'sudoku-candidate-slot-2' }).props
          .style,
      ).backgroundColor,
    ).toBeUndefined();
    await ReactTestRenderer.act(() => renderer.unmount());
  },
);
