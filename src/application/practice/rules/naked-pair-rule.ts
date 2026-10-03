import { practiceReferenceSnapshot } from '../../../data/practice/practice-catalog';
import { submitNakedPair } from '../../../domain/practice/naked-pair-submission';
import { hasCandidate } from '../../../domain/sudoku/board';
import type { PracticeTechniqueRule } from '../practice-evaluator';

export const nakedPairRule: PracticeTechniqueRule = {
  initialCandidates: 'verified',
  answerKind: 'elimination',
  evaluate(scene, session, actions) {
    const source = session.state.candidates.activeCandidateSource;
    const removals = actions.filter(
      action => action.kind === 'elimination' && action.source === source,
    );
    if (!removals.length) return { status: 'enter' };
    const reference = practiceReferenceSnapshot(scene);
    const results = removals.map(action =>
      submitNakedPair(
        reference,
        scene.board.solutionFingerprint,
        session.state.values,
        action.target,
      ),
    );
    if (
      removals.some(action =>
        hasCandidate(
          (source === 'quick'
            ? session.state.candidates.quickCandidates
            : session.state.candidates.manualCandidates)[action.target.cell],
          action.target.digit,
        ),
      ) ||
      results.some(result => result.status === 'incorrect')
    )
      return { status: 'incorrect' };
    if (results.some(result => result.status === 'not_naked_pair'))
      return { status: 'other' };
    const last = results.at(-1);
    return last?.status === 'correct' ? last : { status: 'incorrect' };
  },
};
