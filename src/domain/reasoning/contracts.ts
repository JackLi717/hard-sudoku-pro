import type {
  CandidateRef,
  CellIndex,
  Digit,
  RegionRef,
} from '../sudoku/contracts';

export type ReasoningPath = 'single' | 'a' | 'b';
export type ReasoningTruth = 'true' | 'false';
export type ReasoningRole = 'assumption' | 'consequence' | 'conclusion';

export type ReasoningConflictKind =
  | 'empty_cell'
  | 'missing_house_digit'
  | 'multiple_values'
  | 'opposite_truth'
  | 'peer_values';

/** A temporary candidate-level fact shared by lessons and interactive inference. */
export type ReasoningCandidateMark = CandidateRef & {
  role: ReasoningRole;
  /** Single-path lessons omit this; interactive branches identify A or B. */
  path?: ReasoningPath;
  /** Lesson marks are true unless explicitly represented as a false fact. */
  truth?: ReasoningTruth;
  conclusion?: boolean;
};

/** Canonical Sudoku contradiction with the exact facts that created it. */
export type ReasoningConflict = {
  kind: ReasoningConflictKind;
  cells: readonly CellIndex[];
  digit?: Digit;
  region?: RegionRef;
  evidence: readonly (CandidateRef & { truth: ReasoningTruth })[];
};

export function reasoningPathOf(mark: ReasoningCandidateMark): ReasoningPath {
  return mark.path ?? 'single';
}

export function reasoningTruthOf(mark: ReasoningCandidateMark): ReasoningTruth {
  return mark.truth ?? 'true';
}

/**
 * Collapse repeated descriptions of the same logical candidate state.
 *
 * A teaching page may describe a candidate both as a propagated reasoning
 * mark and as evidence for the resulting contradiction. Those are two roles
 * for one visual fact, not two candidate states. Keeping both entries makes a
 * single-digit projection look like a multi-candidate cell.
 *
 * Different truth values or paths remain separate because they carry distinct
 * reasoning information that the candidate-grid renderer must preserve.
 */
export function normalizeReasoningCandidateMarks(
  marks: readonly ReasoningCandidateMark[],
): readonly ReasoningCandidateMark[] {
  const normalized: ReasoningCandidateMark[] = [];
  const indices = new Map<string, number>();

  for (const mark of marks) {
    const key = [
      mark.cell,
      mark.digit,
      reasoningPathOf(mark),
      reasoningTruthOf(mark),
    ].join(':');
    const index = indices.get(key);
    if (index === undefined) {
      indices.set(key, normalized.length);
      normalized.push({ ...mark });
      continue;
    }

    const current = normalized[index];
    normalized[index] = {
      ...current,
      // Preserve the fact that this state began as an assumption even when it
      // later also becomes contradiction evidence.
      role:
        current.role === 'assumption' || mark.role === 'assumption'
          ? 'assumption'
          : current.role === 'conclusion' || mark.role === 'conclusion'
          ? 'conclusion'
          : 'consequence',
      conclusion: current.conclusion || mark.conclusion || undefined,
    };
  }

  return normalized;
}
