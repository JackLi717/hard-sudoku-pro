import assert from 'node:assert/strict';
import test from 'node:test';
import { solveIndependently, outcomeIsSound } from './independent-solver.mjs';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
test('independent oracle distinguishes unique, conflicting, multiple and bounded search', () => {
  assert.deepEqual(solveIndependently(puzzle).solutions, [solution]);
  assert.equal(
    solveIndependently('55' + puzzle.slice(2)).status,
    'unsatisfiable',
  );
  assert.equal(solveIndependently('0'.repeat(81)).status, 'multiple');
  assert.equal(solveIndependently(puzzle, 0).status, 'inconclusive');
  assert.throws(() => solveIndependently('bad'));
});
test('oracle rejects deliberately wrong placements and deletion of the answer', () => {
  assert.equal(
    outcomeIsSound(solution, { kind: 'placement', cell: 2, digit: 4 }),
    true,
  );
  assert.equal(
    outcomeIsSound(solution, { kind: 'placement', cell: 2, digit: 1 }),
    false,
  );
  assert.equal(
    outcomeIsSound(solution, { kind: 'elimination', cell: 2, digit: 4 }),
    false,
  );
  assert.equal(
    outcomeIsSound(solution, { kind: 'elimination', cell: 2, digit: 1 }),
    true,
  );
  assert.equal(
    outcomeIsSound(solution, { kind: 'elimination', cell: 82, digit: 1 }),
    false,
  );
});
