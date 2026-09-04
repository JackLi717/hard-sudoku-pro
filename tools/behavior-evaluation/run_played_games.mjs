import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { solveIndependently, outcomeIsSound } from './independent-solver.mjs';
import { comparePlayedBaseline } from './played-game-baseline.mjs';
import {
  effectKey,
  fingerprint,
  sourceId,
  moveEffects,
  expectedHintEffects,
  auditReasoningStages,
} from './played-game-oracle.mjs';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const args = process.argv.slice(2);
let input,
  baseline,
  reasoningPaths = false,
  output = path.join(root, '.local/behavior-regression');
const pathBudget = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--corpus') input = args[++i];
  else if (args[i] === '--baseline') baseline = args[++i];
  else if (args[i] === '--out') output = args[++i];
  else if (args[i] === '--reasoning-paths') reasoningPaths = true;
  else if (args[i] === '--path-depth') pathBudget.maxDepth = Number(args[++i]);
  else if (args[i] === '--path-expanded')
    pathBudget.maxExpanded = Number(args[++i]);
  else throw Error(`Unknown argument ${args[i]}`);
}
if (!input)
  throw Error(
    'usage: npm run behavior:regression -- --corpus <played-games.json.gz> [--out <directory>]',
  );
const bytes = fs.readFileSync(input),
  corpus = JSON.parse(gunzipSync(bytes));
fs.mkdirSync(output, { recursive: true });
const directory = fs.mkdtempSync(path.join(path.resolve(output), 'run-'));
const require = createRequire(import.meta.url),
  ts = require('typescript');
require.extensions['.ts'] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    f,
  );
const adapter = require('../../src/application/technique-recognition/behavior-adapter.ts');
const {
  rebuildHintAssistance,
} = require('../../src/application/technique-recognition/hint-assistance.ts');
const {
  buildOpportunityProcesses,
  verifyOpportunityProcesses,
} = require('../../src/application/technique-recognition/opportunity-processes.ts');
const {
  verifyReasoningStages,
} = require('../../src/application/technique-recognition/reasoning-stages.ts');
const {
  searchReasoningPaths,
} = require('../../src/application/technique-recognition/reasoning-paths.ts');
const executable = path.join(directory, 'native_replay');
const build = spawnSync(
  process.env.CXX ?? 'c++',
  [
    '-O2',
    '-std=c++20',
    '-Wall',
    '-Wextra',
    '-Wpedantic',
    '-Werror',
    '-Inative/hsp-hint-core/include',
    'native/hsp-hint-core/src/bridge.cpp',
    'native/hsp-hint-core/src/engine.cpp',
    'native/hsp-hint-core/src/techniques.cpp',
    'tools/behavior-evaluation/native_replay.cpp',
    '-o',
    executable,
  ],
  { cwd: root, encoding: 'utf8', timeout: 180000 },
);
if (build.status !== 0) throw Error(build.error?.message || build.stderr);
async function enumerateReasoning(snapshot) {
  const run = spawnSync(
    executable,
    [
      snapshot.board,
      snapshot.candidates.join(','),
      snapshot.givens.map(v => (v ? '1' : '0')).join(''),
      '--opportunities',
    ],
    { encoding: 'utf8', timeout: 10000, maxBuffer: 32 * 1024 * 1024 },
  );
  if (run.status !== 0)
    throw Error(run.error?.message || run.stderr || 'enumeration_failed');
  const result = JSON.parse(run.stdout);
  return { ...result, steps: result.steps.map(s => s.step) };
}
const cache = new Map();
function analyze(q) {
  const args = [
    q.startingBoardFingerprint,
    q.growthCandidates.join(','),
    q.givenCells.map(v => (v ? '1' : '0')).join(''),
    q.observedEffects
      .map(e => `${e.kind === 'placement' ? 'p' : 'e'}:${e.cell}:${e.digit}`)
      .join(','),
  ];
  const key = JSON.stringify(args);
  if (!cache.has(key)) {
    const run = spawnSync(executable, args, {
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 32 * 1024 * 1024,
    });
    if (run.status !== 0) throw Error(run.error?.message || run.stderr);
    cache.set(key, JSON.parse(run.stdout));
  }
  return { ...q, ...cache.get(key) };
}
const report = {
  corpusSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  gitHead: spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).stdout.trim(),
  sourceDiffSha256: crypto
    .createHash('sha256')
    .update(spawnSync('git', ['diff', 'HEAD'], { cwd: root }).stdout)
    .digest('hex'),
  scope:
    'Historical accepted-move projection and saved-request replay, not exact UI/timer replay or human technique ground truth. Missing hint exposure/command timing is explicitly incomplete.',
  unavailable: corpus.unavailable,
  sessions: [],
  failures: [],
};
const sourceHash = crypto.createHash('sha256');
const sourcePaths = spawnSync(
  'rg',
  [
    '--files',
    'src',
    'native/hsp-hint-core',
    'tools/behavior-evaluation',
    'scripts',
  ],
  { cwd: root, encoding: 'utf8' },
);
if (sourcePaths.status !== 0)
  throw Error('Cannot fingerprint current regression sources');
for (const file of sourcePaths.stdout
  .trim()
  .split('\n')
  .filter(f => /\.(ts|tsx|cpp|hpp|h|mjs)$/.test(f))
  .sort())
  sourceHash.update(file + '\0').update(fs.readFileSync(path.join(root, file)));
report.sourceFilesSha256 = sourceHash.digest('hex');
const seen = new Set();
for (const source of corpus.sources)
  for (const game of source.sessions) {
    const identity = crypto
      .createHash('sha256')
      .update(JSON.stringify(game))
      .digest('hex');
    if (seen.has(identity)) continue;
    seen.add(identity);
    const summary = {
      platform: source.platform,
      device: source.device,
      sessionId: game.id,
      status: game.state.status,
      moves: game.moves.length,
      savedRecords: game.records.length,
      requests: [],
      failures: [],
      incomplete: [],
    };
    report.sessions.push(summary);
    console.log(
      `Replay ${source.platform} ${game.id} (${game.moves.length} moves)`,
    );
    try {
      const solve = solveIndependently(fingerprint(game.state.givens));
      summary.solutionStatus = solve.status;
      const solution = solve.status === 'unique' ? solve.solutions[0] : null;
      if (!solution) summary.incomplete.push(`solution_${solve.status}`);
      if (
        solution &&
        game.state.status === 'completed' &&
        fingerprint(game.state.values) !== solution
      )
        summary.failures.push({ kind: 'invalid_completed_board' });
      if (!game.records.length) summary.incomplete.push('no_shadow_records');
      if (!game.state.hintExposures)
        summary.incomplete.push('missing_hint_exposure');
      // A database stores accepted moves, not every neutral UI/timer command.
      summary.incomplete.push('projected_ui_and_timer_boundaries');
      const moves = game.moves.map(m => ({
        id: m.id,
        sessionId: m.session_id,
        sequence: m.sequence,
        kind: m.move_kind,
        cell: m.cell_index,
        digit: m.digit,
        techniqueCode: m.technique_code,
        appliedHint: m.applied_hint_json
          ? JSON.parse(m.applied_hint_json)
          : null,
        before: JSON.parse(m.before_snapshot_json),
        after: JSON.parse(m.after_snapshot_json),
        createdAtEpochMs: m.created_at_ms,
        active: Boolean(m.active),
      }));
      let history = [],
        state,
        previous,
        previousSession,
        exposures = [],
        clock = 0;
      const projectedRecords = [];
      function record(phase, q, diagnostic, response) {
        projectedRecords.push({
          recordId: `projected-${projectedRecords.length}`,
          recordedAtEpochMs: ++clock,
          phase,
          sessionId: game.id,
          segmentId: q?.segmentId ?? diagnostic?.segmentId ?? null,
          sourceCommandType: null,
          request: q ?? null,
          responseStatus: response?.status ?? null,
          analysisDiagnostics: response?.diagnostics ?? null,
          diagnostic: diagnostic ?? null,
        });
      }
      for (const move of moves) {
        // An inactive branch is replayed too. Divergent snapshots delimit undo /
        // restore; no invented deletion facts are carried across that boundary.
        const discontinuity =
          previous &&
          fingerprint(previous.after.values) !==
            fingerprint(move.before.values);
        if (discontinuity) history = history.filter(m => m.active);
        const newlyExposed = (game.state.hintExposures ?? []).filter(
          e =>
            !exposures.includes(e) &&
            (e.nextMoveSequence !== undefined
              ? e.nextMoveSequence <= move.sequence
              : move.appliedHint &&
                sourceId(move.appliedHint) === sourceId(e.step)),
        );
        exposures = [...exposures, ...newlyExposed];
        const session = {
          state: {
            ...game.state,
            ...move.before,
            status: 'active',
            sessionId: game.id,
            revision: move.sequence * 2,
            nextMoveSequence: move.sequence,
            selectedCell: move.cell,
            hintExposures: game.state.hintExposures ? exposures : null,
            hintUseCount: exposures.length,
            activeHint: move.appliedHint,
            candidates: {
              ...move.before.candidates,
              pencilMode: move.kind.startsWith('edit_'),
              activeCandidateSource:
                move.kind === 'edit_quick_candidate'
                  ? 'quick'
                  : move.before.candidates.activeCandidateSource,
            },
          },
          history,
        };
        if (!state) {
          state = adapter.createBehaviorRecognitionState(
            session,
            state?.knownHintSources,
          );
        } else if (discontinuity) {
          const restored = adapter.observeAcceptedGameCommand(
            state,
            previousSession,
            { type: 'undo', atEpochMs: move.createdAtEpochMs },
            { accepted: true, session },
          );
          state = restored.state;
          for (const d of restored.diagnostics) record('invalidation', null, d);
          summary.incomplete.push(`projected_undo_boundary:${move.sequence}`);
        }
        if (
          previous &&
          (move.createdAtEpochMs - previous.createdAtEpochMs >= 750 ||
            newlyExposed.length)
        ) {
          const closed = adapter.finalizeBehaviorSegment(state);
          state = closed.state;
          if (closed.diagnostic)
            record('segment_finalized', null, closed.diagnostic);
        }
        // Exposures do not themselves become candidate deletions.
        const hints = rebuildHintAssistance(session, state.knownHintSources);
        state = {
          ...state,
          knownHintSources: hints.knownHintSources,
          hintExposureComplete: hints.hintExposureComplete,
        };
        let type;
        if (move.kind === 'apply_hint') type = 'apply_hint';
        else if (
          move.kind === 'place_value' &&
          move.techniqueCode === 'fullHouse'
        )
          type = 'complete_full_house';
        else if (move.kind === 'place_value' || move.kind.startsWith('edit_'))
          type = 'input_digit';
        else if (move.kind === 'erase_value') type = 'erase';
        else {
          summary.incomplete.push(`unsupported_move:${move.kind}`);
          previous = move;
          continue;
        }
        const command = {
          type,
          cell: move.cell,
          digit: move.digit,
          moveId: move.id,
          atEpochMs: move.createdAtEpochMs,
        };
        const after = {
          state: {
            ...session.state,
            ...move.after,
            revision: session.state.revision + 1,
            nextMoveSequence: move.sequence + 1,
          },
          history: [...history, move],
        };
        const observation = adapter.observeAcceptedGameCommand(
          state,
          session,
          command,
          { accepted: true, session: after },
        );
        state = observation.state;
        for (const d of observation.diagnostics)
          record('invalidation', null, d);
        const q = observation.analysisRequest;
        if (q) {
          const response = analyze(q);
          const accepted = adapter.acceptBehaviorAnalysisResult(
            state,
            response,
            after,
          );
          state = accepted.state;
          record('result', q, accepted.diagnostic, response);
          const entry = {
            requestId: q.requestId,
            segmentId: q.segmentId,
            sequence: move.sequence,
            effects: q.observedEffects,
            status: response.status,
            complete: response.diagnostics.opportunitySetComplete,
            attribution: accepted.diagnostic.attribution,
            affected: q.hintAssistance.affectedEffects,
          };
          summary.requests.push(entry);
          const expected = expectedHintEffects(exposures, history, solution);
          for (const e of moveEffects(move))
            if (
              expected.has(effectKey(e)) &&
              !q.hintAssistance.affectedEffects.some(
                a => effectKey(a) === effectKey(e),
              )
            )
              summary.failures.push({
                kind: 'missed_hint_dependency',
                sequence: move.sequence,
                effect: e,
              });
          if (!response.diagnostics.opportunitySetComplete)
            summary.incomplete.push(`enumeration:${move.sequence}`);
          if (
            solution &&
            q.observedEffects.some(e => !outcomeIsSound(solution, e)) &&
            accepted.diagnostic.attribution.attributionEligibility.status ===
              'eligible'
          ) {
            // Candidate errors can be detected only later by a correction; assess
            // their final invalidation below, not their provisional result.
            entry.unsoundOutcome = true;
          }
        }
        history = after.history;
        previousSession = after;
        previous = move;
      }
      if (state) {
        const closed = adapter.finalizeBehaviorSegment(state);
        if (closed.diagnostic)
          record('segment_finalized', null, closed.diagnostic);
      }
      const finalBySegment = new Map(),
        lastRequestBySegment = new Map();
      for (const r of projectedRecords) {
        if (r.request)
          lastRequestBySegment.set(r.segmentId, r.request.requestId);
        if (r.diagnostic?.finality !== 'final') continue;
        if (
          r.phase === 'invalidation' ||
          finalBySegment.get(r.segmentId)?.phase !== 'invalidation'
        )
          finalBySegment.set(r.segmentId, r);
      }
      for (const r of summary.requests) {
        r.finalAttribution =
          finalBySegment.get(r.segmentId)?.diagnostic?.attribution ?? null;
        r.superseded = lastRequestBySegment.get(r.segmentId) !== r.requestId;
      }
      if (reasoningPaths) {
        summary.reasoningPaths = [];
        for (const r of summary.requests.filter(
          r =>
            !r.superseded &&
            r.status === 'no_match' &&
            r.finalAttribution?.attributionEligibility.status === 'eligible',
        )) {
          const q = projectedRecords.find(
            p => p.request?.requestId === r.requestId,
          )?.request;
          if (!q) throw Error('missing_reasoning_request');
          const paths = await searchReasoningPaths(
            q,
            enumerateReasoning,
            pathBudget,
          );
          for (const reason of paths.limits.filter(
            reason =>
              ![
                'depth_limit',
                'expansion_limit',
                'frontier_limit',
                'time_budget',
                'path_limit',
                'incomplete_enumeration',
              ].includes(reason),
          )) {
            summary.failures.push({
              kind: 'reasoning_search_failure',
              sequence: r.sequence,
              reason,
            });
          }
          for (const p of paths.paths) {
            for (const stage of p.stages) {
              for (const e of [
                ...stage.step.placements.map(e => ({
                  ...e,
                  kind: 'placement',
                })),
                ...stage.step.eliminations.map(e => ({
                  ...e,
                  kind: 'elimination',
                })),
              ]) {
                if (solution && !outcomeIsSound(solution, e))
                  summary.failures.push({
                    kind: 'unsound_reasoning_stage',
                    sequence: r.sequence,
                    effect: e,
                  });
              }
            }
            if (p.independentUse !== false)
              summary.failures.push({
                kind: 'hypothetical_mastery',
                sequence: r.sequence,
              });
          }
          summary.reasoningPaths.push({
            sequence: r.sequence,
            requestId: r.requestId,
            ...paths,
          });
          console.log(
            `Reasoning ${game.id} move ${r.sequence}: ${
              paths.paths.length
            } paths, ${paths.expanded} states, ${paths.limits.join(',')}`,
          );
        }
      }
      for (const r of summary.requests.filter(r => r.unsoundOutcome)) {
        const final = finalBySegment.get(r.segmentId)?.diagnostic?.attribution;
        if (
          final?.attributionEligibility.status === 'eligible' &&
          final.automaticTechnique !== null
        )
          summary.failures.push({
            kind: 'unsound_final_attribution',
            sequence: r.sequence,
          });
      }
      const graph = await verifyOpportunityProcesses(
        buildOpportunityProcesses(projectedRecords, game.id),
        { analyze: async q => analyze(q) },
      );
      summary.projectedProcesses = {
        count: graph.processes.length,
        ...graph.verification,
        diagnostics: graph.diagnostics,
      };
      summary.reasoningStages = await verifyReasoningStages(graph, {
        analyze: async q => analyze(q),
      });
      summary.failures.push(
        ...auditReasoningStages(summary.reasoningStages, solution),
      );
      const stageFailures = summary.reasoningStages.diagnostics.filter(
        d => d.reason !== 'ineligible_source',
      );
      summary.failures.push(
        ...stageFailures.map(d => ({
          kind: 'reasoning_stage_verification',
          ...d,
        })),
      );
      summary.reasoningSummary = {
        sources: summary.reasoningStages.processes.length,
        eliminationSources: summary.reasoningStages.processes.filter(
          p => p.source.actionKind === 'elimination',
        ).length,
        placementSources: summary.reasoningStages.processes.filter(
          p => p.source.actionKind === 'placement',
        ).length,
        observedFinishes: summary.reasoningStages.processes
          .flatMap(p => p.finishes)
          .filter(f => f.dependency === 'observed').length,
        possibleFinishes: summary.reasoningStages.processes
          .flatMap(p => p.finishes)
          .filter(f => f.dependency === 'possible').length,
      };
      if (graph.verification.attributed !== graph.verification.attempted)
        summary.incomplete.push('projected_process_verification_unavailable');
      // Saved logs remain immutable. This second lane catches changes to source
      // evidence association independently of newly projected segmentation.
      summary.savedRequests = [];
      const requestIds = new Set();
      for (const record of game.records) {
        const q = record.request;
        if (!q || requestIds.has(q.requestId)) continue;
        requestIds.add(q.requestId);
        if (
          q.growthCandidates?.length !== 81 ||
          q.givenCells?.length !== 81 ||
          !q.observedEffects?.length
        ) {
          summary.incomplete.push('missing_saved_request_fields');
          continue;
        }
        const response = analyze(q);
        summary.savedRequests.push({
          requestId: q.requestId,
          revision: q.startingRevision,
          status: response.status,
          complete: response.diagnostics.opportunitySetComplete,
          candidateTechniques: response.candidateTechniques.map(
            c => c.technique,
          ),
        });
      }
      const saved = await verifyOpportunityProcesses(
        buildOpportunityProcesses(game.records, game.id),
        { analyze: async q => analyze(q) },
      );
      summary.savedProcesses = {
        count: saved.processes.length,
        ...saved.verification,
        diagnostics: saved.diagnostics,
      };
      if (saved.verification.attributed !== saved.verification.attempted)
        summary.incomplete.push('saved_process_verification_unavailable');
      // Fixed real-world repros are expectations, never automatically blessed output.
      const restored =
        {
          'session-1788465458808-lb9cn13y': [43, 44, 47],
          'session-1788469759940-anbvqz8h': [53],
        }[game.id] ?? [];
      for (const sequence of restored) {
        const r = summary.requests.find(r => r.sequence === sequence);
        if (!r || r.status !== 'matched' || !r.complete)
          summary.failures.push({
            kind: 'candidate_restoration_regression',
            sequence,
          });
      }
      if (
        game.id === 'session-1788465458808-lb9cn13y' &&
        saved.verification?.attributed !== saved.verification?.attempted
      )
        summary.failures.push({ kind: 'cost_identity_regression' });
      summary.rawNoMatch = summary.requests.filter(
        r => r.status === 'no_match',
      ).length;
      summary.noMatch = summary.requests.filter(
        r =>
          r.status === 'no_match' &&
          !r.superseded &&
          r.finalAttribution?.attributionEligibility.status === 'eligible' &&
          r.finalAttribution.automaticTechnique === null,
      ).length;
      if (summary.noMatch)
        summary.incomplete.push('unresolved_technique_explanations');
    } catch (error) {
      summary.failures.push({ kind: 'replay_error', message: error.stack });
    }
    report.failures.push(
      ...summary.failures.map(f => ({
        platform: source.platform,
        sessionId: game.id,
        ...f,
      })),
    );
  }
if (!report.sessions.length) report.failures.push({ kind: 'empty_corpus' });
if (baseline) {
  report.baseline = comparePlayedBaseline(
    report,
    JSON.parse(fs.readFileSync(baseline, 'utf8')),
  );
  report.failures.push(...report.baseline.failures);
}
report.status =
  report.failures.length || report.unavailable?.length
    ? 'failed'
    : report.sessions.some(s => s.incomplete.length)
    ? 'checks_passed_with_incomplete_evidence'
    : 'passed';
report.totals = {
  sessions: report.sessions.length,
  moves: report.sessions.reduce((n, s) => n + s.moves, 0),
  requests: report.sessions.reduce((n, s) => n + s.requests.length, 0),
  failures: report.failures.length,
};
const file = path.join(directory, 'report.json');
fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(
  JSON.stringify({ file, status: report.status, ...report.totals }, null, 2),
);
if (report.status === 'failed') process.exitCode = 1;
