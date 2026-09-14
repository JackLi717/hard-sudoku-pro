import type { GameState } from '../src/domain/game/contracts';
import type { Board } from '../src/domain/sudoku/contracts';
import { boardFromFingerprint } from '../src/domain/sudoku/board';
import {
  formatShareTime,
  shareCardFactsFromCompletedGame,
  shareCardFactsFromReplayFrame,
  shareCardLine,
} from '../src/ui/screens/share-card-presentation';

const solved = boardFromFingerprint(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
);
const givens = solved.map((value, cell) =>
  cell % 3 === 0 ? value : null,
) as Board;

function completedGame(patch: Partial<GameState> = {}): GameState {
  return {
    status: 'completed',
    values: solved,
    givens,
    difficultyLevel: 3,
    timer: { elapsedMs: 1_122_000, runningSinceEpochMs: null },
    errorCount: 0,
    hintUseCount: 0,
    ...patch,
  } as GameState;
}

describe('share card presentation', () => {
  test.each([
    [0, 0, 'perfect'],
    [2, 0, 'no_hints'],
    [0, 1, 'no_mistakes'],
    [2, 1, 'completed'],
  ] as const)(
    'uses recorded %i mistakes and %i hints for %s copy',
    (mistakes, hints, line) => {
      const facts = shareCardFactsFromCompletedGame(
        completedGame({ errorCount: mistakes, hintUseCount: hints }),
      );
      expect(facts).not.toBeNull();
      expect(shareCardLine(facts!)).toBe(line);
    },
  );

  test('takes the final board and measurements from the completed session', () => {
    const state = completedGame();
    const facts = shareCardFactsFromCompletedGame(state);
    expect(facts?.boardSnapshot.values).toBe(state.values);
    expect(facts?.boardSnapshot.givens).toBe(state.givens);
    expect(facts).toMatchObject({
      difficultyLevel: 3,
      elapsedMs: 1_122_000,
      mistakes: 0,
      hints: 0,
    });
    expect(formatShareTime(facts!.elapsedMs)).toBe('18:42');
  });

  test('never creates a final-board card for an unfinished or incomplete session', () => {
    expect(
      shareCardFactsFromCompletedGame(completedGame({ status: 'active' })),
    ).toBeNull();
    expect(
      shareCardFactsFromCompletedGame(
        completedGame({ values: [...solved.slice(0, 80), null] as Board }),
      ),
    ).toBeNull();
  });

  test('uses the selected replay snapshot without attributing final result metrics to it', () => {
    const state = completedGame();
    const values = [...solved];
    values[1] = null;
    const facts = shareCardFactsFromReplayFrame(
      state,
      { ...state, values },
      7,
      20,
    );
    expect(facts).toEqual({
      kind: 'current_board',
      boardSnapshot: { givens, values },
      difficultyLevel: 3,
      step: 7,
      totalSteps: 20,
    });
    expect(
      shareCardFactsFromReplayFrame(
        completedGame({ status: 'failed' }),
        { ...state, values },
        7,
        20,
      ),
    ).toBeNull();
  });
});
