import { useEffect, useMemo, useState } from 'react';
import { GameMove, GameSession } from '../../domain/game/contracts';
import { SessionReplaySource } from '../../application/game/session-replay-source';
import { replayActionEffects } from '../../application/game/replay-explanations';
import {
  ReasoningPath,
  ReasoningPathsReport,
} from '../../application/technique-recognition/reasoning-paths';

type Result = { report: ReasoningPathsReport; complete: boolean };
const pathKey = (path: ReasoningPath) =>
  path.stages
    .map(
      ({ step }) =>
        `${step.techniqueCode}:${JSON.stringify(
          step.placements,
        )}:${JSON.stringify(step.eliminations)}`,
    )
    .join('|');

/** Keep session-scoped results; playback searches shallowly, pausing extends. */
export function useReplayExplanations(
  session: GameSession | null,
  move: GameMove | null,
  source: SessionReplaySource,
  enabled: boolean,
  allowDeep = true,
  nextMove: GameMove | null = null,
) {
  // Session and source identity bind all cached board/candidate/given inputs.
  const cacheScope = useMemo(
    () => ({ session, source, entries: new Map<GameMove, Result>() }),
    [session, source],
  );
  const cache = cacheScope.entries;
  const [state, setState] = useState<{
    move: GameMove | null;
    cache: typeof cache;
    status: 'loading' | 'ready' | 'failed';
    report?: ReasoningPathsReport;
  }>({ move: null, cache, status: 'ready' });
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
    if (cached?.complete) {
      setState({ move, cache, status: 'ready', report: cached.report });
      return;
    }
    const controller = new AbortController();
    setState({ move, cache, status: 'loading', report: cached?.report });
    // Scrubbing does not queue native work for every crossed action.
    const timer = setTimeout(() => {
      const run = async () => {
        let report =
          (cached?.report.paths.length ? cached.report : undefined) ??
          (await source.explainReplayMove!(
            session,
            move,
            controller.signal,
            false,
          ));
        if (controller.signal.aborted) return;
        const needsMore = report.limits.some(limit =>
          ['depth_limit', 'time_budget'].includes(limit),
        );
        cache.set(move, { report, complete: !needsMore });
        setState({
          move,
          cache,
          status: needsMore && allowDeep ? 'loading' : 'ready',
          report,
        });
        if (needsMore && allowDeep) {
          const expanded = await source.explainReplayMove!(
            session,
            move,
            controller.signal,
            true,
          );
          if (controller.signal.aborted) return;
          const paths = new Map<string, ReasoningPath>();
          [...report.paths, ...expanded.paths].forEach(path =>
            paths.set(pathKey(path), path),
          );
          const ordered = [...paths.values()].sort(
            (a, b) => a.totalHumanCost - b.totalHumanCost,
          );
          const capacity = expanded.budget.maxPaths;
          report = {
            ...expanded,
            paths: ordered.slice(0, capacity),
            limits: [
              ...new Set([
                ...expanded.limits,
                ...(ordered.length > capacity ? ['path_limit'] : []),
              ]),
            ],
          };
        }
        const allowed = [
          'depth_limit',
          'time_budget',
          'frontier_limit',
          'expansion_limit',
          'path_limit',
          'incomplete_enumeration',
        ];
        const failed = report.limits.some(limit => !allowed.includes(limit));
        cache.set(move, {
          report:
            failed && report.paths.length
              ? {
                  ...report,
                  limits: [...new Set([...report.limits, 'depth_limit'])],
                }
              : report,
          complete: !failed && (!needsMore || allowDeep),
        });
        setState({ move, cache, status: failed ? 'failed' : 'ready', report });
      };
      run().catch(() => {
        if (!controller.signal.aborted)
          setState({
            move,
            cache,
            status: 'failed',
            report: cache.get(move)?.report,
          });
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [session, move, source, enabled, allowDeep, cache, retry]);
  const current = state.move === move && state.cache === cache ? state : null;
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
    // One shallow look-ahead only, after the visible action is ready.
    const timer = setTimeout(() => {
      source.explainReplayMove!(session, nextMove, controller.signal, false)
        .then(report => {
          if (controller.signal.aborted) return;
          cache.set(nextMove, { report, complete: report.limits.length === 0 });
        })
        .catch(() => {
          /* Visible action will retry failed speculation. */
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, idle, session, source, nextMove, move, cache, allowDeep]);
  return {
    report: current?.report ?? (move ? cache.get(move)?.report : undefined),
    status: current?.status ?? 'loading',
    retry: () => {
      if (move) {
        const previous = cache.get(move);
        if (previous) cache.set(move, { ...previous, complete: false });
      }
      setRetry(value => value + 1);
    },
  };
}
