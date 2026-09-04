import NativeHintEngine from '../../native/NativeHintEngine';
import { GameMove, GameSession } from '../../domain/game/contracts';
import { HintStep, validateHintStep } from '../../domain/hints/contracts';
import {
  ReasoningEnumerator,
  searchReasoningPaths,
} from '../technique-recognition/reasoning-paths';
import { replayExplanationRequest } from './replay-explanations';

let serial = 0;
export async function explainReplayMove(
  session: GameSession,
  move: GameMove,
  signal: AbortSignal,
  deep = false,
) {
  const request = replayExplanationRequest(session, move);
  const requestId = `${request.requestId}:${++serial}`;
  const started = Date.now();
  let nativeMs = 0;
  let nativeCalls = 0;
  const cancel = () => NativeHintEngine.cancel(requestId);
  signal.addEventListener('abort', cancel);
  const enumerate: ReasoningEnumerator = async snapshot => {
    if (signal.aborted) throw Error('cancelled');
    const nativeStarted = Date.now();
    nativeCalls++;
    const result = JSON.parse(
      await NativeHintEngine.enumerateSteps(
        requestId,
        snapshot.board,
        snapshot.candidates.join(','),
        snapshot.givens.map(g => (g ? '1' : '0')).join(''),
      ),
    );
    nativeMs += Date.now() - nativeStarted;
    if (signal.aborted) throw Error('cancelled');
    if (
      typeof result.complete !== 'boolean' ||
      !Array.isArray(result.steps) ||
      result.steps.some(
        (item: { step: HintStep }) => validateHintStep(item.step).length,
      )
    )
      throw Error('analysis_failed');
    return {
      ...result,
      steps: result.steps.map((item: { step: HintStep }) => item.step),
    };
  };
  try {
    const report = await searchReasoningPaths(
      request,
      enumerate,
      deep ? { maxMs: 5000 } : { maxDepth: 1, maxMs: 1500 },
      () => signal.aborted,
    );
    if (__DEV__)
      console.info(
        '[replay-analysis]',
        JSON.stringify({
          phase: deep ? 'expanded' : 'direct',
          elapsedMs: Date.now() - started,
          nativeMs,
          nativeCalls,
          paths: report.paths.length,
          limits: report.limits,
        }),
      );
    return report;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
