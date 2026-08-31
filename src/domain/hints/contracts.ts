import {
  BoardFingerprint,
  CandidateRef,
  CellIndex,
  Placement,
  RegionRef,
} from '../sudoku/contracts';
import { DifficultyLevel, TechniqueCode } from './techniques';

export const HINT_STEP_CONTRACT_VERSION = 1 as const;

export type ExplanationValue = string | number;

export type HintStep = {
  contractVersion: typeof HINT_STEP_CONTRACT_VERSION;
  boardFingerprint: BoardFingerprint;
  techniqueCode: TechniqueCode;
  difficultyLevel: DifficultyLevel;
  focusCells: readonly CellIndex[];
  focusRegions: readonly RegionRef[];
  premiseCandidates: readonly CandidateRef[];
  eliminations: readonly CandidateRef[];
  placements: readonly Placement[];
  explanationKey: `hint.${TechniqueCode}`;
  explanationParams: Readonly<Record<string, ExplanationValue>>;
};

export type HintEngineRequest = {
  contractVersion: typeof HINT_STEP_CONTRACT_VERSION;
  boardFingerprint: BoardFingerprint;
  hintCandidates: readonly number[];
};

export type HintEngineResult =
  | { status: 'step'; step: HintStep }
  | {
      status: 'invalid_board' | 'no_supported_step' | 'solved';
      reasonKey: string;
    };

export function validateHintStep(step: HintStep): readonly string[] {
  const errors: string[] = [];
  const resultCount = step.eliminations.length + step.placements.length;

  if (step.boardFingerprint.length !== 81) {
    errors.push('boardFingerprint must contain 81 cells');
  }
  if (resultCount === 0) {
    errors.push('a hint must contain an elimination or placement');
  }
  if (step.eliminations.length > 0 && step.placements.length > 0) {
    errors.push('an atomic hint cannot mix eliminations and placements');
  }
  if (step.placements.length > 1) {
    errors.push('an atomic placement hint can fill only one cell');
  }
  if (step.explanationKey !== `hint.${step.techniqueCode}`) {
    errors.push('explanationKey must match techniqueCode');
  }

  return errors;
}
