import { addCandidate } from '../src/domain/sudoku/board';
import {
  addSelectedCandidateCells,
  candidateBatchEdit,
  toggleSelectedCandidateCell,
  toggleSelectedCandidateDigit,
} from '../src/ui/candidate-multi-selection';

const grid = Array.from({ length: 81 }, () => 0);
grid[11] = addCandidate(0, 4);
grid[12] = addCandidate(addCandidate(0, 4), 7);

test('manual batches first complete missing notes, then remove all present notes', () => {
  let cells = toggleSelectedCandidateCell([], 12);
  cells = toggleSelectedCandidateCell(cells, 11);
  let digits = toggleSelectedCandidateDigit([], 7);
  digits = toggleSelectedCandidateDigit(digits, 4);

  expect(cells).toEqual([12, 11]);
  expect(digits).toEqual([7, 4]);
  expect(candidateBatchEdit(cells, digits, grid, 'manual')).toEqual({
    cells: [11, 12],
    digits: [4, 7],
    action: 'add',
    count: 1,
  });
  expect(candidateBatchEdit([12, 11, 12], [4, 4], grid, 'manual')).toEqual({
    cells: [11, 12],
    digits: [4],
    action: 'remove',
    count: 2,
  });
});

test('quick batches remove only visible notes', () => {
  expect(candidateBatchEdit([11, 12], [7], grid, 'quick')).toEqual({
    cells: [11, 12],
    digits: [7],
    action: 'remove',
    count: 1,
  });
  expect(candidateBatchEdit([11], [7], grid, 'quick')).toBeNull();
});

test('empty batches never turn candidate edits into placements', () => {
  expect(candidateBatchEdit([], [4], grid, 'manual')).toBeNull();
  expect(candidateBatchEdit([11], [], grid, 'manual')).toBeNull();
});

test('dragging adds cells while restarting replaces the previous selection', () => {
  expect(addSelectedCandidateCells([11, 12], [12, 13])).toEqual([11, 12, 13]);
  expect(addSelectedCandidateCells([11, 12], [13], true)).toEqual([13]);
  expect(toggleSelectedCandidateCell([11, 12], 12, true)).toEqual([12]);
  expect(toggleSelectedCandidateDigit([4, 7], 5, true)).toEqual([5]);
});
