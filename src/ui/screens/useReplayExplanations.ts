import { useEffect, useMemo, useState } from 'react';
import { GameMove, GameSession } from '../../domain/game/contracts';
import { SessionReplaySource } from '../../application/game/session-replay-source';
import { replayActionEffects } from '../../application/game/replay-explanations';
import {
  ReplayAnalysisLevel,
  replayAnalysisOutcome,
} from '../../application/game/replay-analysis-policy';
import {
  ReasoningPath,
  ReasoningPathsReport,
} from '../../application/technique-recognition/reasoning-paths';

type Run = Pick<
  ReasoningPathsReport,
  'budget' | 'limits' | 'expanded' | 'elapsedMs'
> & { outcome: ReturnType<typeof replayAnalysisOutcome> };
const completedRun = (report: ReasoningPathsReport): Run => ({
  budget: report.budget,
  limits: report.limits,
  expanded: report.expanded,
  elapsedMs: report.elapsedMs,
  outcome: replayAnalysisOutcome(report),
});
type Result = {
  report: ReasoningPathsReport;
  runs: Map<string, Run>;
  origins: Set<ReplayAnalysisLevel>;
  bytes: number;
};
export const replayPathKey = (path: ReasoningPath) =>
  path.stages
    .map(
      ({ step }) =>
        `${step.techniqueCode}:${[
          ...step.placements.map(e => `p:${e.cell}:${e.digit}`),
          ...step.eliminations.map(e => `e:${e.cell}:${e.digit}`),
        ]
          .sort()
          .join(',')}`,
    )
    .sort()
    .join('|');

function merge(
  previous: Result | undefined,
  report: ReasoningPathsReport,
  level: ReplayAnalysisLevel,
): Result {
  const paths = new Map<string, ReasoningPath>();
  [...(previous?.report.paths ?? []), ...report.paths].forEach(path => {
    const key = replayPathKey(path);
    if (!paths.has(key)) paths.set(key, path);
  });
  const merged = { ...report, paths: [...paths.values()] };
  return {
    report: merged,
    bytes: JSON.stringify(merged).length * 2,
    runs: new Map(previous?.runs),
    origins: new Set([
      ...(previous?.origins ?? []),
      ...(report.paths.length ? [level] : []),
    ]),
  };
}

// Bounded page cache. Oversized active reports remain in React state only.
function cacheResult(
  cache: Map<GameMove, Result>,
  move: GameMove,
  result: Result,
) {
  const maxBytes = 16 * 1024 * 1024;
  cache.delete(move);
  if (result.bytes > maxBytes) return;
  cache.set(move, result);
  let bytes = [...cache.values()].reduce((sum, entry) => sum + entry.bytes, 0);
  while (bytes > maxBytes || cache.size > 128) {
    const oldest = cache.keys().next().value!;
    bytes -= cache.get(oldest)!.bytes;
    cache.delete(oldest);
  }
}

/** Verified results are session-scoped; a budget stop completes only that run key. */
export function useReplayExplanations(
  session: GameSession | null,
  move: GameMove | null,
  source: SessionReplaySource,
  enabled: boolean,
  allowDeep = true,
  nextMove: GameMove | null = null,
  level: ReplayAnalysisLevel = 'basic',
) {
  const scope = useMemo(
    () => ({ session, source, cache: new Map<GameMove, Result>() }),
    [session, source],
  );
  const cache = scope.cache;
  const runKey = allowDeep ? level : 'preview';
  const [state, setState] = useState<{
    move: GameMove | null;
    cache: typeof cache;
    runKey: string;
    status: 'loading' | 'ready' | 'failed' | 'cancelled';
    result?: Result;
    started?: number;
  }>({ move: null, cache, runKey, status: 'ready' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (
      !session ||
      !move ||
      !enabled ||
      !source.explainReplayMove ||
      !replayActionEffects(move).length
    )
      return;
    const cached = cache.get(move);
    const done = cached?.runs.get(runKey)?.outcome;
    if (done === 'complete' || done === 'budget') {
      setState({ move, cache, runKey, status: 'ready', result: cached });
      return;
    }
    const controller = new AbortController();
    setState({ move, cache, runKey, status: 'loading', result: cached });
    const started = Date.now();
    let first = true;
    let retained = cached;
    const publish = (report: ReasoningPathsReport, finished: boolean) => {
      if (controller.signal.aborted) return;
      const result = merge(retained, report, allowDeep ? level : 'basic');
      const outcome = replayAnalysisOutcome(report);
      if (finished) result.runs.set(runKey, completedRun(report));
      retained = result;
      cacheResult(cache, move, result);
      setState({
        move,
        cache,
        runKey,
        result,
        started,
        status: !finished
          ? 'loading'
          : outcome === 'failed' || outcome === 'cancelled'
          ? outcome
          : 'ready',
      });
      if (first && result.report.paths.length) {
        first = false;
        if (__DEV__)
          console.info(
            '[replay-publication]',
            JSON.stringify({
              level,
              elapsedMs: Date.now() - started,
              cached: !!cached?.report.paths.length,
            }),
          );
      }
    };
    // Crossed slider positions never dispatch; cleanup preempts look-ahead first.
    const timer = setTimeout(() => {
      source.explainReplayMove!(session, move, controller.signal, {
        level,
        preview: !allowDeep,
        onVerified: report => publish(report, false),
      })
        .then(report => publish(report, true))
        .catch(() => {
          if (!controller.signal.aborted)
            setState({
              move,
              cache,
              runKey,
              status: 'failed',
              result: retained,
            });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [session, move, source, enabled, allowDeep, level, runKey, cache, retry]);
  const current =
    state.move === move && state.cache === cache && state.runKey === runKey
      ? state
      : null;
  const idle = current?.status === 'ready';
  useEffect(() => {
    if (
      !enabled ||
      !idle ||
      !session ||
      !nextMove ||
      cache.has(nextMove) ||
      !source.explainReplayMove ||
      !replayActionEffects(nextMove).length
    )
      return;
    const controller = new AbortController();
    const save = (report: ReasoningPathsReport, finished: boolean) => {
      if (controller.signal.aborted) return;
      const result = merge(cache.get(nextMove), report, 'basic');
      if (finished) result.runs.set('preview', completedRun(report));
      cacheResult(cache, nextMove, result);
    };
    const timer = setTimeout(() => {
      source.explainReplayMove!(session, nextMove, controller.signal, {
        level: 'basic',
        preview: true,
        onVerified: report => save(report, false),
      })
        .then(report => save(report, true))
        .catch(() => {
          /* Visible action retries. */
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, idle, session, source, nextMove, move, cache, allowDeep, level]);
  const result = current?.result ?? (move ? cache.get(move) : undefined);
  const status = !enabled ? 'cancelled' : current?.status ?? 'loading';
  // Commit-side metric: first explanation available to the mounted UI. Actual
  // display scan-out may follow; this is deliberately separate from search time.
  const visible = !!result?.report.paths.length;
  useEffect(() => {
    if (visible && __DEV__)
      console.info(
        '[replay-visible]',
        JSON.stringify({
          level,
          elapsedMs: current?.started ? Date.now() - current.started : 0,
          cached: !current?.started,
        }),
      );
    // Timing is sampled on the first visible commit, not on subsequent results.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, move, cache, level]);
  const run = status === 'ready' ? result?.runs.get(runKey) : undefined;
  return {
    report: result ? { ...result.report, ...(run ?? {}) } : undefined,
    origins: [...(result?.origins ?? [])],
    status,
    outcome: run?.outcome,
    retry: () => {
      if (move) cache.get(move)?.runs.delete(runKey);
      setRetry(value => value + 1);
    },
  };
}
