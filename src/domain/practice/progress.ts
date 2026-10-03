export type PracticeOutcome = 'correct' | 'incorrect';

export type PracticeProgress = Readonly<{
  exerciseId: string;
  contentKey: string;
  attempts: number;
  correctCount: number;
  lastOutcome: PracticeOutcome;
  updatedAt: number;
  firstCorrectAt: number | null;
}>;

export interface PracticeProgressStore {
  listProgress(): Promise<readonly PracticeProgress[]>;
  recordAttempt(
    exerciseId: string,
    contentKey: string,
    outcome: PracticeOutcome,
    now: number,
  ): Promise<PracticeProgress>;
}
