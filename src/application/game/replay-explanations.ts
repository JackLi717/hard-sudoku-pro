import { GameMove, GameSession } from '../../domain/game/contracts';
import {
  createBoardFingerprint,
  createSolverCandidates,
  hasCandidate,
} from '../../domain/sudoku/board';
import {
  GrowthAnalysisRequest,
  NormalizedPlayerEffect,
} from '../../domain/technique-recognition/contracts';
import { digitsFromMask } from '../../domain/sudoku/board';

/** Only explicit player edits are targets; peer cleanup is never a deletion. */
export function replayActionEffects(move: GameMove): NormalizedPlayerEffect[] {
  if (move.kind === 'apply_hint' && move.appliedHint)
    return [
      ...move.appliedHint.placements.map(e => ({
        ...e,
        kind: 'placement' as const,
      })),
      ...move.appliedHint.eliminations.map(e => ({
        ...e,
        kind: 'elimination' as const,
      })),
    ];
  const { cell, digit } = move;
  if (cell === null || digit === null) return [];
  if (
    move.kind === 'place_value' &&
    move.before.values[cell] === null &&
    move.after.values[cell] === digit
  )
    return [{ kind: 'placement', cell, digit }];
  if (
    move.kind === 'edit_manual_candidate' ||
    move.kind === 'edit_quick_candidate'
  ) {
    const key =
      move.kind === 'edit_manual_candidate'
        ? 'manualCandidates'
        : 'quickCandidates';
    if (
      hasCandidate(move.before.candidates[key][cell], digit) &&
      !hasCandidate(move.after.candidates[key][cell], digit)
    )
      return [{ kind: 'elimination', cell, digit }];
  }
  return [];
}

export function replayExplanationRequest(
  session: GameSession,
  move: GameMove,
): GrowthAnalysisRequest {
  // Use legal candidates, not sparse pencil notes as proof premises. Prior
  // unverified pencil removals are deliberately not assumed to be sound.
  const board = createBoardFingerprint(move.before.values);
  return {
    requestId: `replay:${session.state.sessionId}:${move.id}`,
    sessionId: session.state.sessionId,
    segmentId: move.id,
    startingRevision: move.sequence,
    issuedRevision: move.sequence,
    startingBoardFingerprint: board,
    expectedBoardFingerprint: createBoardFingerprint(move.after.values),
    growthCandidates: createSolverCandidates(move.before.values),
    givenCells: session.state.givens.map(v => v !== null),
    observedEffects: replayActionEffects(move),
    // Read-only hypotheses never assert independent use, even without hints.
  };
}

export type ReplayChange = {
  cell: number;
  digit: number;
  kind: 'place' | 'erase' | 'remove' | 'add';
};
export function replayChanges(move: GameMove | null): ReplayChange[] {
  if (!move) return [];
  const changes: ReplayChange[] = [];
  move.after.values.forEach((value, cell) => {
    if (value !== move.before.values[cell]) {
      if (move.before.values[cell] !== null)
        changes.push({ cell, digit: move.before.values[cell]!, kind: 'erase' });
      if (value !== null) changes.push({ cell, digit: value, kind: 'place' });
    }
  });
  if (move.kind === 'apply_hint') {
    move.appliedHint?.eliminations.forEach(e =>
      changes.push({ ...e, kind: 'remove' }),
    );
  } else if (
    move.cell !== null &&
    (move.kind === 'edit_manual_candidate' ||
      move.kind === 'edit_quick_candidate')
  ) {
    const key =
      move.kind === 'edit_manual_candidate'
        ? 'manualCandidates'
        : 'quickCandidates';
    const cell = move.cell;
    const before = digitsFromMask(move.before.candidates[key][cell]);
    const after = digitsFromMask(move.after.candidates[key][cell]);
    before
      .filter(d => !after.includes(d))
      .forEach(digit => changes.push({ cell, digit, kind: 'remove' }));
    after
      .filter(d => !before.includes(d))
      .forEach(digit => changes.push({ cell, digit, kind: 'add' }));
  }
  return changes;
}
