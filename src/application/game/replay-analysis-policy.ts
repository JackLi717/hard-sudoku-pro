import {
  PathSearchOptions,
  ReasoningPathsReport,
} from '../technique-recognition/reasoning-paths';

export type ReplayAnalysisLevel = 'basic' | 'advanced' | 'expert';
export const REPLAY_ANALYSIS_LEVELS = ['basic', 'advanced', 'expert'] as const;
export const REPLAY_ANALYSIS_BUDGETS: Record<
  ReplayAnalysisLevel,
  PathSearchOptions
> = {
  basic: {
    maxMs: 5000,
    maxDepth: 5,
    maxExpanded: 128,
    maxFrontier: 2048,
    maxPaths: 128,
  },
  advanced: {
    maxMs: 15000,
    maxDepth: 7,
    maxExpanded: 512,
    maxFrontier: 4096,
    maxPaths: 256,
  },
  expert: {
    maxMs: 30000,
    maxDepth: 9,
    maxExpanded: 1024,
    maxFrontier: 8192,
    maxPaths: 512,
  },
};
// Speculation and playback never silently spend a higher resource tier.
export const REPLAY_PREVIEW_BUDGET: PathSearchOptions = {
  ...REPLAY_ANALYSIS_BUDGETS.basic,
  maxMs: 750,
  maxDepth: 1,
  maxExpanded: 1,
};
export type ReplayAnalysisOptions = {
  level?: ReplayAnalysisLevel;
  preview?: boolean;
  onVerified?: (report: ReasoningPathsReport) => void;
};
export function replayAnalysisOutcome(report: ReasoningPathsReport) {
  if (report.limits.includes('cancelled')) return 'cancelled';
  const budgets = [
    'depth_limit',
    'time_budget',
    'frontier_limit',
    'expansion_limit',
    'path_limit',
    'incomplete_enumeration',
  ];
  if (report.limits.some(limit => !budgets.includes(limit))) return 'failed';
  return report.limits.length ? 'budget' : 'complete';
}
