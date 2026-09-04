import { GameSession } from '../../domain/game/contracts';

export type ReplaySessionSummary = {
  sessionId: string;
  difficultyLevel: number;
  status: string;
  updatedAtEpochMs: number;
  recoverability: 'action_history' | 'final_snapshot';
};

export interface SessionReplaySource {
  readReplaySession(sessionId: string): Promise<GameSession | null>;
  listReplaySessions(limit?: number): Promise<readonly ReplaySessionSummary[]>;
}
