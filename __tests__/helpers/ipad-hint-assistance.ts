import {
  boardFromFingerprint,
  createGameSession,
  createSolverCandidates,
  GameDefinition,
  GameSession,
  HintStep,
} from '../../src/domain';

// Real game session-1788399054523-36auwajj, moves 61 -> 62.
export const kiteDefinition: GameDefinition = {
  puzzleId: 'ipad-kite-regression',
  contentVersion: 4,
  difficultyLevel: 4,
  puzzleFingerprint:
    '000000001000600872800072000060000500300001000080029006040056020005417060100000000',
  solutionFingerprint:
    '627894351419635872853172694962348517374561289581729436748956123235417968196283745',
};
export const kiteBoard =
  '627004351419635872853172694062040510304561280581029006048056120235417968106200005';
export const kiteHint: HintStep = {
  contractVersion: 1,
  boardFingerprint: kiteBoard,
  techniqueCode: 'twoStringKite',
  difficultyLevel: 4,
  focusCells: [35, 62, 77, 79],
  focusRegions: [],
  premiseCandidates: [35, 62, 77, 79].map(cell => ({ cell, digit: 3 })),
  eliminations: [{ cell: 32, digit: 3 }],
  placements: [],
  explanationKey: 'hint.twoStringKite',
  explanationParams: {},
};

export function kiteGame(): GameSession {
  const session = createGameSession({
    sessionId: 'ipad-kite-regression',
    definition: kiteDefinition,
    startedAtEpochMs: 1_000,
  });
  const values = boardFromFingerprint(kiteBoard);
  return {
    ...session,
    state: {
      ...session.state,
      values,
      candidates: {
        ...session.state.candidates,
        quickCandidates: createSolverCandidates(values),
      },
    },
  };
}
