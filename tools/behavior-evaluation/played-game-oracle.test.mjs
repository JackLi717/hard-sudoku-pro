import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {
  expectedHintEffects,
  effectKey,
  auditReasoningStages,
} from './played-game-oracle.mjs';

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

function stagedControl() {
  const before = Array(81).fill(511);
  before[0] = 3;
  const narrowed = [...before];
  narrowed[0] = 2;
  const placed = narrowed.map((m, c) =>
    c === 0
      ? 0
      : Math.floor(c / 9) === 0 ||
        c % 9 === 0 ||
        (Math.floor(c / 27) === 0 && c % 9 < 3)
      ? m & ~2
      : m,
  );
  const effect = { kind: 'elimination', cell: 0, digit: 1 };
  return {
    processes: [
      {
        processId: 'test',
        source: {
          effects: [effect],
          observedEffects: [],
          unobservedEffects: [effect],
          beforeBoardFingerprint: '0'.repeat(81),
          beforeCandidates: before,
          afterBoardFingerprint: '0'.repeat(81),
          afterCandidates: narrowed,
        },
        finishes: [
          {
            sampleId: 'placed',
            dependency: 'possible',
            independentUse: null,
            prerequisiteEffects: [effect],
            stage: {
              effects: [{ kind: 'placement', cell: 0, digit: 2 }],
              beforeBoardFingerprint: '0'.repeat(81),
              beforeCandidates: narrowed,
              afterBoardFingerprint: '2' + '0'.repeat(80),
              afterCandidates: placed,
            },
          },
        ],
      },
    ],
  };
}
test('independent stage control verifies elimination then single placement', () => {
  assert.deepEqual(auditReasoningStages(stagedControl()), []);
});
test('independent stage control rejects fabricated observed elimination and wrong transition', () => {
  const changed = stagedControl();
  changed.processes[0].finishes[0].dependency = 'observed';
  changed.processes[0].finishes[0].independentUse = false;
  changed.processes[0].finishes[0].stage.afterCandidates[1] = 511;
  const faults = auditReasoningStages(changed).map(f => f.kind);
  assert.ok(faults.includes('fabricated_observation'));
  assert.ok(faults.includes('finish_transition'));
});
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
