import { useEffect, useMemo, useState } from 'react';
import { GameSession, UndoSnapshot } from '../../domain/game/contracts';
import { createBoardFingerprint } from '../../domain/sudoku/board';
import { SessionReplaySource } from '../../application/game/session-replay-source';
import {
  ReplayAnalysisLevel,
  replayAnalysisOutcome,
  REPLAY_ANALYSIS_BUDGETS,
} from '../../application/game/replay-analysis-policy';
import { ReasoningPathsReport } from '../../application/technique-recognition/reasoning-paths';

type Result = {
  report: ReasoningPathsReport;
  outcome?: ReturnType<typeof replayAnalysisOutcome>;
  bytes: number;
};

/** Cache by board position: note drafts and replay focus never change the search. */
export function useReplayBoardAnalysis(
  session: GameSession | null,
  snapshot: UndoSnapshot | null,
  source: SessionReplaySource,
  enabled: boolean,
  level: ReplayAnalysisLevel,
) {
  const scope = useMemo(
    () => ({ session, source, cache: new Map<string, Result>() }),
    [session, source],
  );
  const cache = scope.cache;
  const key = snapshot ? createBoardFingerprint(snapshot.values) : null;
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<{
    key: string | null;
    cache: typeof cache;
    level: ReplayAnalysisLevel;
    status: 'loading' | 'ready' | 'failed' | 'cancelled' | 'timed_out';
    result?: Result;
  }>({ key: null, cache, level, status: 'ready' });

  useEffect(() => {
    if (!enabled || !session || !snapshot || !key || !source.analyzeReplayBoard)
      return;
    const cacheKey = `${level}:${key}`;
    const cached = cache.get(cacheKey);
    if (cached?.outcome === 'complete' || cached?.outcome === 'budget') {
      setState({ key, cache, level, status: 'ready', result: cached });
      return;
    }
    const controller = new AbortController();
    let retained = cached;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    setState({ key, cache, level, status: 'loading', result: retained });
    const publish = (report: ReasoningPathsReport, finished: boolean) => {
      if (controller.signal.aborted) return;
      if (finished) clearTimeout(deadline);
      const outcome = finished ? replayAnalysisOutcome(report) : undefined;
      retained = { report, outcome, bytes: JSON.stringify(report).length * 2 };
      if (finished && outcome !== 'failed' && outcome !== 'cancelled') {
        cache.delete(cacheKey);
        if (retained.bytes <= 16 * 1024 * 1024) cache.set(cacheKey, retained);
        let bytes = [...cache.values()].reduce(
          (sum, entry) => sum + entry.bytes,
          0,
        );
        while (cache.size > 128 || bytes > 16 * 1024 * 1024) {
          const oldest = cache.keys().next().value!;
          bytes -= cache.get(oldest)!.bytes;
          cache.delete(oldest);
        }
      }
      setState({
        key,
        cache,
        level,
        result: retained,
        status: !finished
          ? 'loading'
          : outcome === 'failed' || outcome === 'cancelled'
          ? outcome
          : 'ready',
      });
    };
    const timer = setTimeout(() => {
      deadline = setTimeout(() => {
        controller.abort();
        setState({ key, cache, level, status: 'timed_out', result: retained });
      }, REPLAY_ANALYSIS_BUDGETS[level].maxMs);
      source.analyzeReplayBoard!(session, snapshot, controller.signal, {
        level,
        onVerified: report => publish(report, false),
      })
        .then(report => publish(report, true))
        .catch(() => {
          clearTimeout(deadline);
          if (!controller.signal.aborted)
            setState({ key, cache, level, status: 'failed', result: retained });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [session, snapshot, source, enabled, level, key, cache, retryCount]);

  const current =
    state.key === key && state.cache === cache && state.level === level
      ? state
      : null;
  const result =
    current?.result ?? (key ? cache.get(`${level}:${key}`) : undefined);
  return {
    report: result?.report,
    status: !enabled ? ('cancelled' as const) : current?.status ?? 'loading',
    outcome: result?.outcome,
    retry: () => {
      if (key) cache.delete(`${level}:${key}`);
      setRetryCount(count => count + 1);
    },
  };
}
