import {
  BoardFingerprint,
  CandidateGrid,
  CandidateRef,
  CellIndex,
  Placement,
  RegionRef,
} from '../sudoku/contracts';
import { isCellIndex, isDigit } from '../sudoku/board';
import { DifficultyLevel, TECHNIQUES, TechniqueCode } from './techniques';

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
  hintCandidates: CandidateGrid;
  /** Immutable clue identity required by avoidable-rectangle proofs. */
  givenCells?: readonly boolean[];
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
  const technique = TECHNIQUES.find(item => item.code === step.techniqueCode);

  if (step.contractVersion !== HINT_STEP_CONTRACT_VERSION) {
    errors.push('unsupported hint contract version');
  }
  if (!/^[0-9]{81}$/.test(step.boardFingerprint)) {
    errors.push('boardFingerprint must contain exactly 81 digits');
  }
  if (!technique) {
    errors.push('techniqueCode is not in the approved catalog');
  } else if (technique.level !== step.difficultyLevel) {
    errors.push('difficultyLevel must match techniqueCode');
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
  for (const [key, value] of Object.entries(step.explanationParams)) {
    if (
      !key ||
      (typeof value !== 'string' &&
        (typeof value !== 'number' || !Number.isFinite(value)))
    ) {
      errors.push(`invalid explanation parameter ${key || '<empty>'}`);
    }
  }

  for (const cell of step.focusCells) {
    if (!isCellIndex(cell)) {
      errors.push(`invalid focus cell ${cell}`);
    }
  }
  for (const region of step.focusRegions) {
    if (
      !['row', 'column', 'box'].includes(region.kind) ||
      !Number.isInteger(region.index) ||
      region.index < 0 ||
      region.index > 8
    ) {
      errors.push(`invalid focus region ${region.kind}:${region.index}`);
    }
  }
  for (const candidate of [
    ...step.premiseCandidates,
    ...step.eliminations,
    ...step.placements,
  ]) {
    if (!isCellIndex(candidate.cell) || !isDigit(candidate.digit)) {
      errors.push(`invalid candidate ${candidate.cell}:${candidate.digit}`);
    }
  }

  return errors;
}
