export type PracticeOutcome = 'correct' | 'incorrect';

export type PracticeAttempt =
  | { outcome: 'correct'; durationMs: number }
  | { outcome: 'incorrect' };

export type PracticeProgress = Readonly<{
  exerciseId: string;
  contentKey: string;
  attempts: number;
  correctCount: number;
  lastOutcome: PracticeOutcome;
  updatedAt: number;
  firstCorrectAt: number | null;
  lastCorrectAt: number | null;
  bestDurationMs: number | null;
  lastDurationMs: number | null;
}>;

export interface PracticeProgressStore {
  listProgress(): Promise<readonly PracticeProgress[]>;
  recordAttempt(
    exerciseId: string,
    contentKey: string,
    attempt: PracticeAttempt,
    now: number,
  ): Promise<PracticeProgress>;
}
