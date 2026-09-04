import { effectKey } from './played-game-oracle.mjs';
const stageKey = s =>
  JSON.stringify([
    s.beforeBoardFingerprint,
    s.beforeCandidates,
    s.effects.map(effectKey).sort(),
  ]);

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
    for (const before of old.reasoningPaths ?? []) {
      if (!before.paths.length) continue;
      const after = now.reasoningPaths?.find(
        p => p.sequence === before.sequence,
      );
      if (!after?.paths.length) {
        failures.push({
          kind: 'baseline_reasoning_path_lost',
          sessionId: old.sessionId,
          sequence: before.sequence,
        });
        continue;
      }
      if (
        after.automaticTechnique !== null ||
        after.selectedTechnique !== null ||
        after.paths.some(
          p => p.independentUse !== false || p.evidence !== 'possible',
        )
      )
        failures.push({
          kind: 'baseline_hypothetical_attribution',
          sessionId: old.sessionId,
          sequence: before.sequence,
        });
      if (
        before.paths.every(p => p.hintStatus !== 'no_recorded_hint') &&
        after.paths.some(p => p.hintStatus === 'no_recorded_hint')
      )
        failures.push({
          kind: 'baseline_reasoning_hint_lost',
          sessionId: old.sessionId,
          sequence: before.sequence,
        });
    }
    for (const before of old.reasoningStages?.processes ?? []) {
      const after = now.reasoningStages?.processes.find(
        p => stageKey(p.source) === stageKey(before.source),
      );
      if (!after) {
        failures.push({
          kind: 'baseline_reasoning_source_missing',
          sessionId: old.sessionId,
        });
        continue;
      }
      for (const finish of before.finishes) {
        const match = after.finishes.find(
          f => stageKey(f.stage) === stageKey(finish.stage),
        );
        if (
          !match ||
          (finish.dependency === 'observed' &&
            (match.dependency !== 'observed' || match.independentUse !== false))
        )
          failures.push({
            kind: 'baseline_reasoning_dependency_missing',
            sessionId: old.sessionId,
            effects: finish.stage.effects,
          });
      }
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
