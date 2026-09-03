import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { solveIndependently, outcomeIsSound } from './independent-solver.mjs';

const [executable, output] = process.argv.slice(2);
if (!executable || !output)
  throw new Error(
    'usage: check_catalog_acceptance.mjs <native_replay> <report.json>',
  );
const fixtures = JSON.parse(
  fs.readFileSync(
    new URL(
      '../../src/debug/generated/hint-lab-fixtures.json',
      import.meta.url,
    ),
    'utf8',
  ),
).fixtures;
const reports = [],
  failures = [];
const solved = new Map();
let replayCount = 0;
for (const fixture of fixtures) {
  const localFailures = [];
  const fail = reason => localFailures.push(reason);
  const board = fixture.boardFingerprint;
  let oracle = solved.get(board);
  if (!oracle) {
    oracle = solveIndependently(board);
    solved.set(board, oracle);
  }
  const step = fixture.engineResult.step;
  const effects = [
    ...step.eliminations.map(e => ({ kind: 'elimination', ...e })),
    ...step.placements.map(e => ({ kind: 'placement', ...e })),
  ];
  if (oracle.status !== 'unique') fail(`independent_solution:${oracle.status}`);
  else {
    if (oracle.solutions[0] !== fixture.solutionFingerprint)
      fail('saved_answer_mismatch');
    for (const e of effects)
      if (!outcomeIsSound(oracle.solutions[0], e))
        fail(`unsound_effect:${e.cell}:${e.digit}`);
    for (let cell = 0; cell < 81; cell++)
      if (
        board[cell] === '0' &&
        Math.floor(
          fixture.candidateMasks[cell] /
            2 ** (Number(oracle.solutions[0][cell]) - 1),
        ) %
          2 !==
          1
      )
        fail(`candidate_lost_solution:${cell}`);
  }
  const variants = [effects, effects.slice(0, 1), [...effects].reverse()];
  for (const [index, observed] of variants.entries()) {
    const run = spawnSync(
      executable,
      [
        board,
        fixture.candidateMasks.join(','),
        fixture.givenCells.map(v => (v ? '1' : '0')).join(''),
        observed
          .map(
            e => `${e.kind === 'placement' ? 'p' : 'e'}:${e.cell}:${e.digit}`,
          )
          .join(','),
      ],
      { encoding: 'utf8', timeout: 30_000 },
    );
    replayCount++;
    if (run.status !== 0) {
      fail(`native_execution:${index}`);
      continue;
    }
    const result = JSON.parse(run.stdout);
    if (
      result.status !== 'matched' ||
      !result.diagnostics.opportunitySetComplete
    )
      fail(`native_status:${index}:${result.status}`);
    if (
      !result.candidateTechniques.some(
        c => c.technique === fixture.techniqueCode,
      )
    )
      fail(`seed_candidate_missing:${index}`);
    if (
      result.candidateTechniques.some(
        (c, i, all) => i > 0 && all[i - 1].humanCost > c.humanCost,
      )
    )
      fail(`cost_order:${index}`);
  }
  reports.push({
    technique: fixture.techniqueCode,
    fixture: fixture.id,
    oracle: oracle.status,
    effectCount: effects.length,
    variants: ['complete', 'partial', 'reverse'],
    failures: localFailures,
  });
  failures.push(
    ...localFailures.map(reason => `${fixture.techniqueCode}:${reason}`),
  );
}
if (new Set(fixtures.map(f => f.techniqueCode)).size !== 39)
  failures.push('catalog_coverage_not_39');
const report = {
  passed: failures.length === 0,
  fixtureCount: fixtures.length,
  replayCount,
  reports,
  failures,
  evidence:
    'Independent exhaustive Sudoku outcome verification plus native candidate regression; not independent technique-label or human-cost truth.',
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify({
    passed: report.passed,
    fixtureCount: fixtures.length,
    replayCount,
    failures,
  }),
);
if (!report.passed) process.exitCode = 1;
