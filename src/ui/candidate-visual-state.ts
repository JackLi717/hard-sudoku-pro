import {
  reasoningPathOf,
  ReasoningCandidateMark,
  reasoningTruthOf,
} from '../domain/reasoning/contracts';

export type CandidateAttentionSource = 'selection' | 'hint-focus' | 'premise';

export type CandidateVisualFacts = {
  selected?: boolean;
  focused?: boolean;
  premise?: boolean;
  eliminated?: boolean;
  conflict?: boolean;
  reasoningMarks?: readonly ReasoningCandidateMark[];
};

/**
 * One semantic state shared by compact candidate notes and large projections.
 * Geometry belongs to the renderer; logical meaning and visual precedence do not.
 */
export type CandidateVisualState = {
  attentionSources: readonly CandidateAttentionSource[];
  showAttention: boolean;
  showRing: boolean;
  ringKind: 'none' | 'assumption' | 'consequence';
  showStrike: boolean;
  conflict: boolean;
  pathATrue: boolean;
  pathBTrue: boolean;
  pathAFalse: boolean;
  pathBFalse: boolean;
  singleTrue: boolean;
  singleFalse: boolean;
  sharedElimination: boolean;
};

export function resolveCandidateVisualState({
  selected = false,
  focused = false,
  premise = false,
  eliminated = false,
  conflict = false,
  reasoningMarks = [],
}: CandidateVisualFacts): CandidateVisualState {
  const attentionSources: CandidateAttentionSource[] = [];
  if (selected) attentionSources.push('selection');
  if (focused) attentionSources.push('hint-focus');
  if (premise) attentionSources.push('premise');

  const pathATrue = reasoningMarks.some(
    mark => reasoningPathOf(mark) === 'a' && reasoningTruthOf(mark) === 'true',
  );
  const pathBTrue = reasoningMarks.some(
    mark => reasoningPathOf(mark) === 'b' && reasoningTruthOf(mark) === 'true',
  );
  const pathAFalse = reasoningMarks.some(
    mark => reasoningPathOf(mark) === 'a' && reasoningTruthOf(mark) === 'false',
  );
  const pathBFalse = reasoningMarks.some(
    mark => reasoningPathOf(mark) === 'b' && reasoningTruthOf(mark) === 'false',
  );
  const singleTrue = reasoningMarks.some(
    mark =>
      reasoningPathOf(mark) === 'single' && reasoningTruthOf(mark) === 'true',
  );
  const singleFalse = reasoningMarks.some(
    mark =>
      reasoningPathOf(mark) === 'single' && reasoningTruthOf(mark) === 'false',
  );
  const trueMarked = singleTrue || pathATrue || pathBTrue;
  const falseMarked = singleFalse || pathAFalse || pathBFalse;
  const assumedTrue = reasoningMarks.some(
    mark => mark.role === 'assumption' && reasoningTruthOf(mark) === 'true',
  );

  return {
    attentionSources,
    // Attention is a neutral state. Once a logical outcome exists, the ring,
    // strike, or contradiction replaces the fill instead of stacking meanings.
    showAttention:
      attentionSources.length > 0 &&
      !trueMarked &&
      !falseMarked &&
      !eliminated &&
      !conflict,
    showRing: trueMarked,
    ringKind: trueMarked
      ? assumedTrue
        ? 'assumption'
        : 'consequence'
      : 'none',
    showStrike: eliminated || falseMarked,
    conflict,
    pathATrue,
    pathBTrue,
    pathAFalse,
    pathBFalse,
    singleTrue,
    singleFalse,
    sharedElimination: reasoningMarks.some(
      mark => reasoningTruthOf(mark) === 'false' && mark.conclusion,
    ),
  };
}
