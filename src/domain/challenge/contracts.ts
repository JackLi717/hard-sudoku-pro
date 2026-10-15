import type { TechniqueCode } from '../hints/techniques';
import type { CandidateRef } from '../sudoku/contracts';

export const CHALLENGE_TECHNIQUES = [
  'hiddenSingle',
  'lockedCandidates.pointing',
  'lockedCandidates.claiming',
  'nakedPair',
  'hiddenPair',
] as const satisfies readonly TechniqueCode[];

export const CHALLENGE_EPISODES = [
  { id: 'discovery', techniques: CHALLENGE_TECHNIQUES },
  {
    id: 'combinations',
    techniques: [
      'nakedTriple',
      'hiddenTriple',
      'xWing',
      'skyscraper',
      'twoStringKite',
    ],
  },
  {
    id: 'connections',
    techniques: ['swordfish', 'xyWing', 'xyzWing', 'wWing', 'emptyRectangle'],
  },
] as const satisfies readonly {
  id: string;
  techniques: readonly TechniqueCode[];
}[];
export type ChallengeEpisodeId = (typeof CHALLENGE_EPISODES)[number]['id'];
export const CHALLENGE_LEVELS_PER_EPISODE = 6;

export interface ChallengeAccessStore {
  read(
    episodeId: ChallengeEpisodeId,
  ): Promise<{ unlocked: boolean; eligible: boolean }>;
  grant(
    episodeId: ChallengeEpisodeId,
    eventId: string,
    now: number,
  ): Promise<void>;
}

export type ChallengeOperation = CandidateRef & {
  kind: 'placement' | 'elimination';
};
export type ChallengeLevel = {
  id: string;
  episode_id: ChallengeEpisodeId;
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
