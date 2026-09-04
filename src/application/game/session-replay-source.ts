import { ReplayAnalysisOptions } from './replay-analysis-policy';
import { ReasoningPathsReport } from '../technique-recognition/reasoning-paths';
import { GameMove, GameSession } from '../../domain/game/contracts';

export type ReplaySessionSummary = {
  sessionId: string;
  difficultyLevel: number;
  status: string;
  updatedAtEpochMs: number;
  elapsedMs: number | null;
  hintUseCount: number | null;
  recoverability: 'action_history' | 'final_snapshot' | 'unavailable';
};

export interface SessionReplaySource {
  explainReplayMove?(
    session: GameSession,
    move: GameMove,
    signal: AbortSignal,
    options?: ReplayAnalysisOptions,
  ): Promise<ReasoningPathsReport>;
  readReplaySession(sessionId: string): Promise<GameSession | null>;
  listReplaySessions(limit?: number): Promise<readonly ReplaySessionSummary[]>;
}
