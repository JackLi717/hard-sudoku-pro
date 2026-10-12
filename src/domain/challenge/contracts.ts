import type { TechniqueCode } from '../hints/techniques';
import type { CandidateRef } from '../sudoku/contracts';

export const CHALLENGE_TECHNIQUES = [
  'hiddenSingle',
  'lockedCandidates.pointing',
  'lockedCandidates.claiming',
  'nakedPair',
  'hiddenPair',
] as const satisfies readonly TechniqueCode[];

export type ChallengeOperation = CandidateRef & {
  kind: 'placement' | 'elimination';
};
export type ChallengeLevel = {
  id: string;
  technique_code: TechniqueCode | null;
  source: {
    source_puzzle_id: string;
    puzzle_fingerprint: string;
    board_fingerprint: string;
    candidate_masks: readonly number[];
    solution_fingerprint: string;
  };
};
export type ChallengeCatalog = {
  content_usage: 'challenge';
  content_key: string;
  set_id: string;
  levels: readonly ChallengeLevel[];
};
export type AcceptedChallengeOperation = { operation: ChallengeOperation };
export type ChallengeAttempt = {
  id: string;
  accepted: readonly AcceptedChallengeOperation[];
  batchEnds: readonly number[];
  passed: boolean;
  ended: boolean;
  errors: number;
  submissions: number;
  elapsedMs: number;
};
export type ChallengeProgress = {
  levelId: string;
  contentKey: string;
  revision: number;
  everPassed: boolean;
  solutionViewed: boolean;
  passedAfterExplanation: boolean;
  attempt: ChallengeAttempt;
};
export interface ChallengeProgressStore {
  list(): Promise<readonly ChallengeProgress[]>;
  save(record: ChallengeProgress, expectedRevision: number): Promise<void>;
}
export type ChallengeCheckResult = {
  status: 'accepted' | 'rejected' | 'unavailable' | 'enter';
  attempt: ChallengeAttempt;
};
