import { DifficultyLevel, TechniqueCode } from '../hints/techniques';

export type PuzzleRecord = {
  id: string;
  puzzle: string;
  solution: string;
  difficultyLevel: DifficultyLevel;
  difficultyScore: number;
  hardestTechnique: TechniqueCode;
  ratingVersion: string;
  source: string;
  contentVersion: number;
  checksum: string;
  enabled: boolean;
};

export type TechniqueUsageRecord = {
  puzzleId: string;
  ratingVersion: string;
  techniqueCode: TechniqueCode;
  useCount: number;
};

export type PuzzleTechniqueQuery = {
  techniqueCodes: readonly TechniqueCode[];
  match?: 'all' | 'any';
  difficultyLevel?: DifficultyLevel;
  minimumUseCount?: number;
  limit?: number;
};
