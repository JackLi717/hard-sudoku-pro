import { TechniqueCode } from '../../domain/hints/techniques';

export type GrowthReference = {
  sessionId: string;
  moveIds: readonly string[];
  eventId?: string;
  processId?: string;
  recordId?: string;
};
export type GrowthRecord = {
  id: string;
  technique: TechniqueCode | null;
  kind:
    | 'hint_viewed'
    | 'hint_applied'
    | 'walkthrough'
    | 'application'
    | 'possible'
    | 'related_finish'
    | 'unknown';
  occurredAt: number | null;
  reference: GrowthReference;
  alternatives: readonly TechniqueCode[];
  reason:
    | 'learning'
    | 'verified_process'
    | 'possible_path'
    | 'dependent_finish'
    | 'hint_assisted'
    | 'missing_evidence'
    | 'ineligible';
};
export type LearningCompletion = {
  id: string;
  technique: TechniqueCode;
  occurredAt: number;
  reference: GrowthReference;
  explanationId: string;
};
export type GrowthSession = {
  sessionId: string;
  puzzleIdentity: string;
  difficulty: number;
  status: string;
  endedAt: number;
  revision: number;
  inputFingerprint: string;
  updatedAt: number;
  coverage: 'pending' | 'complete' | 'incomplete' | 'failed';
  records: readonly GrowthRecord[];
};
export type GrowthProfile = {
  technique: TechniqueCode;
  learningSessions: number;
  applications: number;
  puzzles: number;
  latestAt: number | null;
  status:
    | 'empty'
    | 'learning'
    | 'applying'
    | 'multiple'
    | 'possible'
    | 'unknown';
  records: readonly GrowthRecord[];
  milestones: readonly {
    kind: 'contact' | 'walkthrough' | 'diversity';
    record: GrowthRecord;
  }[];
};
export type GrowthWindow = {
  sessions: number;
  covered: number;
  applications: number;
  puzzles: number;
  from: number | null;
  to: number | null;
  levels: readonly number[];
};
export type GrowthViewModel = {
  profiles: readonly GrowthProfile[];
  sessions: readonly GrowthSession[];
  followed: readonly TechniqueCode[];
  loading: boolean;
  updating: boolean;
  failed: boolean;
  updatedAt: number | null;
  recentCount: number;
  recentLearning: number;
  recentApplications: number;
};
// Descriptive accumulation only. These are calibratable, never mastery gates.
export const GROWTH_POLICY = {
  windowSize: 10,
  diversityPuzzles: 3,
  diversityProcesses: 5,
  feedbackMs: 3000,
} as const;
export const GROWTH_ANALYSIS_FINGERPRINT =
  'facts-process-verification-observed-finish-proof-status-20260904';
