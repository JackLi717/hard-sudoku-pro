import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { REQUIRED_STAGES, allRequiredStagesPassed } from './acceptance-stages.mjs';

test('engineering acceptance requires every named stage including all 39 technique processes', () => {
  const stages = REQUIRED_STAGES.map(name => ({ name, status: 'passed' }));
  assert.equal(allRequiredStagesPassed(stages), true);
  assert.equal(allRequiredStagesPassed(stages.filter(s => s.name !== 'opportunity-processes-39')), false);
  assert.equal(allRequiredStagesPassed([...stages.slice(1), stages[1]]), false);
  assert.equal(allRequiredStagesPassed(stages.map(s => ({...s, status: s.name === 'opportunity-processes-39' ? 'failed' : 'passed'}))), false);
});

function audit(override = {}) {
  const folder = fs.mkdtempSync(
    path.join(os.tmpdir(), 'behavior-audit-control-'),
  );
  const attribution = {
    candidateTechniques: [{ technique: 'hiddenSingle', humanCost: 100 }],
    automaticTechnique: null,
    selectedTechnique: null,
    attributionEligibility: { status: 'ineligible', reason: 'hint_polluted' },
    ...override,
  };
  fs.writeFileSync(
    path.join(folder, 'samples.json'),
    JSON.stringify([
      {
        sampleId: 'control',
        humanReview: { status: 'pending' },
        analysisRequest: {},
        analysisDiagnostics: { opportunitySetComplete: true },
        systemAttribution: attribution,
        nativeReplayAttribution: attribution,
      },
    ]),
  );
  fs.writeFileSync(
    path.join(folder, 'report.json'),
    JSON.stringify({
      invariantViolations: [],
      strategyCounts: {},
    }),
  );
  const run = spawnSync(
    process.execPath,
    [
      new URL('./audit_adversarial_replay.mjs', import.meta.url).pathname,
      path.join(folder, 'samples.json'),
      path.join(folder, 'report.json'),
      path.join(folder, 'conclusion.md'),
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(run.status, null, run.error?.message);
  return {
    status: run.status,
    report: JSON.parse(
      fs.readFileSync(path.join(folder, 'report.json'), 'utf8'),
    ),
  };
}

test('audit keeps diagnostic candidates without granting hint-assisted attribution', () => {
  assert.equal(audit().status, 0);
});
test('audit rejects injected independent credit and player selection', () => {
  assert.equal(audit({ automaticTechnique: 'hiddenSingle' }).status, 1);
  assert.equal(audit({ selectedTechnique: 'hiddenSingle' }).status, 1);
});
test('audit rejects deliberately reversed cost ordering', () => {
  assert.equal(
    audit({
      candidateTechniques: [
        { technique: 'hiddenSingle', humanCost: 200 },
        { technique: 'nakedSingle', humanCost: 100 },
      ],
    }).status,
    1,
  );
});
