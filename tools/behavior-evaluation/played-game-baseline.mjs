import { effectKey } from './played-game-oracle.mjs';

// Baselines are explicitly supplied reports, never overwritten by the runner.
export function comparePlayedBaseline(report, baseline) {
  const failures = [],
    changes = [];
  for (const old of baseline.sessions) {
    const now = report.sessions.find(
      s => s.platform === old.platform && s.sessionId === old.sessionId,
    );
    if (!now) {
      failures.push({
        kind: 'baseline_session_missing',
        sessionId: old.sessionId,
      });
      continue;
    }
    for (const before of old.requests) {
      const after = now.requests.find(r => r.sequence === before.sequence);
      if (!after) {
        failures.push({
          kind: 'baseline_request_missing',
          sessionId: old.sessionId,
          sequence: before.sequence,
        });
        continue;
      }
      const missingHints = before.affected.filter(
        e => !after.affected.some(a => effectKey(e) === effectKey(a)),
      );
      const lostMatch =
        before.status === 'matched' && after.status !== 'matched';
      if (
        missingHints.length ||
        lostMatch ||
        (before.complete && !after.complete)
      )
        failures.push({
          kind: 'baseline_evidence_regression',
          sessionId: old.sessionId,
          sequence: before.sequence,
          missingHints,
          lostMatch,
        });
      const previousCodes = before.attribution.candidateTechniques.map(
        c => c.technique,
      );
      const currentCodes = after.attribution.candidateTechniques.map(
        c => c.technique,
      );
      if (
        JSON.stringify(previousCodes) !== JSON.stringify(currentCodes) ||
        before.attribution.automaticTechnique !==
          after.attribution.automaticTechnique
      )
        changes.push({
          sessionId: old.sessionId,
          sequence: before.sequence,
          previousCodes,
          currentCodes,
          before: before.attribution.automaticTechnique,
          after: after.attribution.automaticTechnique,
        });
    }
    for (const lane of ['savedProcesses', 'projectedProcesses'])
      if (old[lane]?.attributed > (now[lane]?.attributed ?? 0))
        failures.push({
          kind: 'baseline_process_regression',
          sessionId: old.sessionId,
          lane,
        });
  }
  return { failures, changes };
}
