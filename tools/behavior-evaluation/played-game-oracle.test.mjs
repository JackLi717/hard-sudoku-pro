import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { expectedHintEffects, effectKey } from './played-game-oracle.mjs';

const fixtures = JSON.parse(
  fs.readFileSync(
    new URL(
      '../../__tests__/helpers/played-hint-regressions.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
const board = s => [...s].map(v => Number(v) || null);
for (const f of fixtures) {
  const history = f.moves.map(m => ({
    ...m,
    before: {
      values: board(m.before),
      candidates: { quickCandidates: m.beforeQuick },
    },
    after: {
      values: board(m.after),
      incorrectCells: [],
      candidates: { quickCandidates: m.afterQuick },
    },
  }));
  test(`independent oracle detects known omitted assistance: ${f.sessionId}`, () => {
    const expected = expectedHintEffects([f.exposure], history);
    assert.ok(expected.has(effectKey(f.effect)));
    // Negative control: no exposed source must not manufacture assistance.
    assert.equal(expectedHintEffects([], history).size, 0);
    assert.equal(expectedHintEffects([f.exposure], []).size, 0);
  });
  test(`unrelated and contradictory histories cannot extend hint proof: ${f.sessionId}`, () => {
    const broken = [
      ...history,
      {
        ...history.at(-1),
        sequence: 1000,
        before: { ...history.at(-1).before, values: Array(81).fill(null) },
      },
    ];
    assert.equal(expectedHintEffects([f.exposure], broken).size, 0);
  });
}
