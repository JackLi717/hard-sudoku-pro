import NativeHintEngine from '../../native/NativeHintEngine';
import { GameMove, GameSession } from '../../domain/game/contracts';
import { HintStep, validateHintStep } from '../../domain/hints/contracts';
import {
  ReasoningEnumerator,
  reasoningSnapshotKey,
  searchReasoningPaths,
} from '../technique-recognition/reasoning-paths';
import { replayExplanationRequest } from './replay-explanations';
import {
  ReplayAnalysisOptions,
  REPLAY_ANALYSIS_BUDGETS,
  REPLAY_PREVIEW_BUDGET,
} from './replay-analysis-policy';

// One session / native algorithm instance; no persistence across app builds.
// Store JSON to isolate consumers and measure a conservative UTF-16 payload cap.
const MAX_CACHE_BYTES = 4 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 128;
let cacheSession: GameSession | undefined;
const evidence = new Map<string, string>();
let cacheBytes = 0;
let serial = 0;
let nativePending: Promise<string> | undefined;

export async function explainReplayMove(
  session: GameSession,
  move: GameMove,
  signal: AbortSignal,
  { level = 'basic', preview = false, onVerified }: ReplayAnalysisOptions = {},
) {
  if (cacheSession !== session) {
    evidence.clear();
    cacheBytes = 0;
    cacheSession = session;
  }
  const request = replayExplanationRequest(session, move);
  const requestId = `${request.requestId}:${++serial}`;
  const started = Date.now();
  let nativeMs = 0;
  let nativeCalls = 0;
  let cacheHits = 0;
  let firstVerifiedMs: number | null = null;
  const cancel = () => NativeHintEngine.cancel(requestId);
  signal.addEventListener('abort', cancel);
  const enumerate: ReasoningEnumerator = async snapshot => {
    if (signal.aborted) throw Error('cancelled');
    const key = reasoningSnapshotKey(snapshot);
    const cached = cacheSession === session ? evidence.get(key) : undefined;
    if (cached) {
      cacheHits++;
      if (cacheHits % 4 === 0)
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (signal.aborted) throw Error('cancelled');
      evidence.delete(key);
      evidence.set(key, cached);
      return JSON.parse(cached);
    }
    // At most one replay enumeration enters the serial native queue. Superseded
    // waiters check cancellation before dispatch, including after preemption.
    while (nativePending) {
      try {
        await nativePending;
      } catch {
        /* the owning request reports errors */
      }
      if (signal.aborted) throw Error('cancelled');
    }
    const nativeStarted = Date.now();
    nativeCalls++;
    const pending = NativeHintEngine.enumerateSteps(
      requestId,
      snapshot.board,
      snapshot.candidates.join(','),
      snapshot.givens.map(g => (g ? '1' : '0')).join(''),
    );
    nativePending = pending;
    let result;
    try {
      result = JSON.parse(await pending);
    } catch {
      // Bridge/parser errors may embed payload snippets. Diagnostics use codes,
      // never raw native messages that could contain a player's board.
      throw Error(signal.aborted ? 'cancelled' : 'native_enumeration_failed');
    } finally {
      nativeMs += Date.now() - nativeStarted;
      if (nativePending === pending) nativePending = undefined;
    }
    if (signal.aborted) throw Error('cancelled');
    if (
      result.board !== snapshot.board ||
      result.snapshotKey !== key ||
      typeof result.complete !== 'boolean' ||
      !Array.isArray(result.steps) ||
      result.steps.some(
        (item: { step: HintStep }) =>
          !item?.step || validateHintStep(item.step).length,
      )
    )
      throw Error('analysis_failed');
    const unpacked = {
      ...result,
      steps: result.steps.map((item: { step: HintStep }) => item.step),
    };
    if (result.complete && cacheSession === session) {
      const json = JSON.stringify(unpacked);
      const size = (key.length + json.length) * 2;
      if (size <= MAX_CACHE_BYTES) {
        while (
          evidence.size &&
          (cacheBytes + size > MAX_CACHE_BYTES ||
            evidence.size >= MAX_CACHE_ENTRIES)
        ) {
          const oldest = evidence.keys().next().value!;
          cacheBytes -= (oldest.length + evidence.get(oldest)!.length) * 2;
          evidence.delete(oldest);
        }
        evidence.set(key, json);
        cacheBytes += size;
      }
    }
    return unpacked;
  };
  try {
    const report = await searchReasoningPaths(
      request,
      enumerate,
      preview ? REPLAY_PREVIEW_BUDGET : REPLAY_ANALYSIS_BUDGETS[level],
      () => signal.aborted,
      async progress => {
        if (signal.aborted) return;
        firstVerifiedMs ??= Date.now() - started;
        onVerified?.(progress);
        // Allow React/native paint and cancellation even on an all-cache pass.
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      },
    );
    if (__DEV__)
      console.info(
        '[replay-analysis]',
        JSON.stringify({
          level,
          preview,
          firstVerifiedMs,
          elapsedMs: Date.now() - started,
          nativeMs,
          nativeCalls,
          cacheHits,
          cacheEntries: evidence.size,
          cacheBytes,
          cancelled: signal.aborted,
          paths: report.paths.length,
          expanded: report.expanded,
          limits: report.limits,
        }),
      );
    return report;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
