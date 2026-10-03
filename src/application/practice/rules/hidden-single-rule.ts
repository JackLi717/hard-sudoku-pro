import { practiceReferenceSnapshot } from '../../../data/practice/practice-catalog';
import { submitHiddenSingle } from '../../../domain/practice/hidden-single-submission';
import type { PracticeTechniqueRule } from '../practice-evaluator';

export const hiddenSingleRule: PracticeTechniqueRule = {
  initialCandidates: 'empty',
  answerKind: 'placement',
  evaluate(scene, _session, actions) {
    const last = actions.filter(action => action.kind === 'placement').at(-1);
    if (!last || last.kind !== 'placement') return { status: 'enter' };
    const beforeValues = [...last.beforeValues];
    beforeValues[last.target.cell] = null;
    const result = submitHiddenSingle(
      practiceReferenceSnapshot(scene),
      scene.board.solutionFingerprint,
      beforeValues,
      last.target,
    );
    return result.status === 'correct'
      ? result
      : { status: result.status === 'incorrect' ? 'incorrect' : 'other' };
  },
};
