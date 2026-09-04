import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePlayedBaseline } from './played-game-baseline.mjs';
const baseline = {
  sessions: [
    {
      platform: 'ios',
      sessionId: 'one',
      requests: [
        {
          sequence: 1,
          status: 'matched',
          complete: true,
          affected: [{ kind: 'placement', cell: 33, digit: 2 }],
          attribution: {
            automaticTechnique: null,
            candidateTechniques: [{ technique: 'hiddenSingle' }],
          },
        },
      ],
      savedProcesses: { attributed: 1 },
    },
  ],
};
test('baseline accepts unchanged evidence without mutation', () => {
  assert.deepEqual(comparePlayedBaseline(structuredClone(baseline), baseline), {
    failures: [],
    changes: [],
  });
});

test('stage baseline detects lost source and downgraded observed dependency', () => {
  const original = structuredClone(baseline);
  const source = {
    beforeBoardFingerprint: '0'.repeat(81),
    beforeCandidates: Array(81).fill(511),
    effects: [{ kind: 'elimination', cell: 0, digit: 1 }],
  };
  original.sessions[0].reasoningStages = {
    processes: [
      {
        source,
        finishes: [
          {
            stage: {
              ...source,
              effects: [{ kind: 'placement', cell: 0, digit: 2 }],
            },
            dependency: 'observed',
            independentUse: false,
          },
        ],
      },
    ],
  };
  const changed = structuredClone(original);
  changed.sessions[0].reasoningStages.processes[0].finishes[0].dependency =
    'possible';
  assert.equal(
    comparePlayedBaseline(changed, original).failures[0].kind,
    'baseline_reasoning_dependency_missing',
  );
  changed.sessions[0].reasoningStages.processes = [];
  assert.equal(
    comparePlayedBaseline(changed, original).failures[0].kind,
    'baseline_reasoning_source_missing',
  );
});
test('negative controls catch missing sessions, missed hints, lost matches and processes', () => {
  assert.equal(
    comparePlayedBaseline({ sessions: [] }, baseline).failures[0].kind,
    'baseline_session_missing',
  );
  const changed = structuredClone(baseline);
  changed.sessions[0].requests[0].affected = [];
  changed.sessions[0].requests[0].status = 'no_match';
  changed.sessions[0].savedProcesses.attributed = 0;
  const result = comparePlayedBaseline(changed, baseline);
  assert.equal(result.failures.length, 2);
  assert.equal(result.failures[0].lostMatch, true);
  assert.equal(result.failures[0].missingHints.length, 1);
});
