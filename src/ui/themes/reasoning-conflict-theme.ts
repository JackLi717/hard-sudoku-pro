import type { ReasoningConflictKind } from '../../domain/reasoning/contracts';

export type ReasoningConflictPresentation = {
  scope: 'candidate' | 'cell' | 'region';
  evidence: 'true' | 'false' | 'mixed';
  frame: 'cell' | 'region';
};

/**
 * One visual grammar for contradictions in lessons and interactive reasoning.
 * The domain reports facts; this table decides how their scope is displayed.
 */
export const REASONING_CONFLICT_PRESENTATIONS: Readonly<
  Record<ReasoningConflictKind, ReasoningConflictPresentation>
> = {
  empty_cell: { scope: 'cell', evidence: 'false', frame: 'cell' },
  missing_house_digit: {
    scope: 'region',
    evidence: 'false',
    frame: 'region',
  },
  multiple_values: { scope: 'cell', evidence: 'true', frame: 'cell' },
  opposite_truth: { scope: 'candidate', evidence: 'mixed', frame: 'cell' },
  peer_values: { scope: 'region', evidence: 'true', frame: 'region' },
};

export function reasoningConflictPresentation(
  kind: ReasoningConflictKind,
): ReasoningConflictPresentation {
  return REASONING_CONFLICT_PRESENTATIONS[kind];
}
