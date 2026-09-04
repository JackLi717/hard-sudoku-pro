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
    .sort()
    .join('|');

/** Auto-search only the paused action; retain verified results while exploring. */
export function useReplayExplanations(
  session: GameSession | null,
  move: GameMove | null,
  source: SessionReplaySource,
  enabled: boolean,
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
    if (!cache.has(move) && cache.size >= 8)
      cache.delete(cache.keys().next().value!);
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
          cached?.report ??
          (await source.explainReplayMove!(
            session,
            move,
            controller.signal,
            false,
          ));
        if (controller.signal.aborted) return;
        const needsMore = report.limits.includes('depth_limit');
        cache.set(move, { report, complete: !needsMore });
        setState({
          move,
          cache,
          status: needsMore ? 'loading' : 'ready',
          report,
        });
        if (needsMore) {
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
        cache.set(move, { report, complete: !failed });
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
  }, [session, move, source, enabled, cache, retry]);
  const current = state.move === move && state.cache === cache ? state : null;
  return {
    report: current?.report ?? (move ? cache.get(move)?.report : undefined),
    status: current?.status ?? 'loading',
    retry: () => {
      if (move) cache.delete(move);
      setRetry(value => value + 1);
    },
  };
}
