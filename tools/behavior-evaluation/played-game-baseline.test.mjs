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
