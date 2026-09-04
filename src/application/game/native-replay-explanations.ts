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
  const cancel = () => NativeHintEngine.cancel(requestId);
  signal.addEventListener('abort', cancel);
  const enumerate: ReasoningEnumerator = async snapshot => {
    if (signal.aborted) throw Error('cancelled');
    const result = JSON.parse(
      await NativeHintEngine.enumerateSteps(
        requestId,
        snapshot.board,
        snapshot.candidates.join(','),
        snapshot.givens.map(g => (g ? '1' : '0')).join(''),
      ),
    );
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
    return await searchReasoningPaths(
      request,
      enumerate,
      deep ? {} : { maxDepth: 1 },
      () => signal.aborted,
    );
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
