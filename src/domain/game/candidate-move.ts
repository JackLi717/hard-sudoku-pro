import { digitsFromMask } from '../sudoku/board';
import { CellIndex, Digit } from '../sudoku/contracts';
import { GameMove } from './contracts';

export type CandidateMoveChange = {
  cell: CellIndex;
  digit: Digit;
  action: 'add' | 'remove';
};

/** Read actual player edits from the saved before/after drafts, including batches. */
export function candidateMoveChanges(move: GameMove): CandidateMoveChange[] {
  if (
    move.kind !== 'edit_manual_candidate' &&
    move.kind !== 'edit_quick_candidate'
  )
    return [];
  const field =
    move.kind === 'edit_manual_candidate'
      ? 'manualCandidates'
      : 'quickCandidates';
  const changes: CandidateMoveChange[] = [];
  for (let cell = 0; cell < 81; cell += 1) {
    const before = move.before.candidates[field][cell];
    const after = move.after.candidates[field][cell];
    if (before === after) continue;
    for (const digit of digitsFromMask(before & ~after)) {
      changes.push({ cell, digit, action: 'remove' });
    }
    for (const digit of digitsFromMask(after & ~before)) {
      changes.push({ cell, digit, action: 'add' });
    }
  }
  return changes;
}
