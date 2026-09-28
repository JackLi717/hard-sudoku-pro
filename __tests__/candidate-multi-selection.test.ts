import {
  addSelectedCandidateCells,
  candidateBatchRemoval,
  toggleSelectedCandidateCell,
  toggleSelectedCandidateDigit,
} from '../src/ui/candidate-multi-selection';

test('cell-first and digit-first selections build the same candidate edit', () => {
  let cells = toggleSelectedCandidateCell([], 12);
  cells = toggleSelectedCandidateCell(cells, 11);
  let digits = toggleSelectedCandidateDigit([], 7);
  digits = toggleSelectedCandidateDigit(digits, 4);

  expect(cells).toEqual([12, 11]);
  expect(digits).toEqual([7, 4]);
  expect(candidateBatchRemoval(cells, [4, 7])).toEqual({
    cells: [11, 12],
    digits: [4, 7],
  });
  expect(candidateBatchRemoval([12, 11, 12], [7, 4, 7])).toEqual({
    cells: [11, 12],
    digits: [4, 7],
  });
});

test('selection changes never silently change a candidate edit into placement', () => {
  const cells = toggleSelectedCandidateCell([11, 12], 12);
  const digits = toggleSelectedCandidateDigit([4, 7], 7);
  expect(candidateBatchRemoval(cells, [4])).toEqual({
    cells: [11],
    digits: [4],
  });
  expect(candidateBatchRemoval([11], digits)).toEqual({
    cells: [11],
    digits: [4],
  });
  expect(candidateBatchRemoval([], digits)).toBeNull();
  expect(candidateBatchRemoval(cells, [])).toBeNull();
});

test('dragging adds cells while restarting replaces the previous selection', () => {
  expect(addSelectedCandidateCells([11, 12], [12, 13])).toEqual([11, 12, 13]);
  expect(addSelectedCandidateCells([11, 12], [13], true)).toEqual([13]);
  expect(toggleSelectedCandidateCell([11, 12], 12, true)).toEqual([12]);
  expect(toggleSelectedCandidateDigit([4, 7], 5, true)).toEqual([5]);
});
