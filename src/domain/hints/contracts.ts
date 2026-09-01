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

export type HintProofKind = 'observe' | 'reason' | 'conclusion';

export type HintProofReason =
  | 'scan_region'
  | 'single_candidate'
  | 'value_blocks_cells'
  | 'pattern_constraint'
  | 'chain_inference'
  | 'forced_placement'
  | 'valid_elimination';

export type HintProofStep = {
  kind: HintProofKind;
  reason: HintProofReason;
  focusCells: readonly CellIndex[];
  focusRegions: readonly RegionRef[];
  premiseCandidates: readonly CandidateRef[];
  valueEvidence: readonly CandidateRef[];
  eliminations: readonly CandidateRef[];
  placements: readonly Placement[];
};

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
  /** Optional for backward compatibility with saved version-one hints. */
  proofSteps?: readonly HintProofStep[];
  /** Stable relative score; lower means less visual/reasoning effort. */
  humanCost?: number;
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
  if (
    step.humanCost !== undefined &&
    (!Number.isInteger(step.humanCost) || step.humanCost <= 0)
  ) {
    errors.push('humanCost must be a positive integer');
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

  if (step.proofSteps !== undefined) {
    if (step.proofSteps.length < 2) {
      errors.push('proofSteps must contain observation and conclusion');
    } else {
      if (step.proofSteps[0].kind !== 'observe') {
        errors.push('proofSteps must start with an observation');
      }
      if (step.proofSteps[step.proofSteps.length - 1]?.kind !== 'conclusion') {
        errors.push('proofSteps must end with a conclusion');
      }
    }
    const reasons: readonly HintProofReason[] = [
      'scan_region',
      'single_candidate',
      'value_blocks_cells',
      'pattern_constraint',
      'chain_inference',
      'forced_placement',
      'valid_elimination',
    ];
    step.proofSteps.forEach((proof, index) => {
      if (!['observe', 'reason', 'conclusion'].includes(proof.kind)) {
        errors.push(`invalid proof kind at ${index}`);
      }
      if (!reasons.includes(proof.reason)) {
        errors.push(`invalid proof reason at ${index}`);
      }
      for (const cell of proof.focusCells) {
        if (!isCellIndex(cell)) {
          errors.push(`invalid proof focus cell ${cell}`);
        }
      }
      for (const region of proof.focusRegions) {
        if (
          !['row', 'column', 'box'].includes(region.kind) ||
          !Number.isInteger(region.index) ||
          region.index < 0 ||
          region.index > 8
        ) {
          errors.push(`invalid proof region ${region.kind}:${region.index}`);
        }
      }
      for (const candidate of [
        ...proof.premiseCandidates,
        ...proof.valueEvidence,
        ...proof.eliminations,
        ...proof.placements,
      ]) {
        if (!isCellIndex(candidate.cell) || !isDigit(candidate.digit)) {
          errors.push(
            `invalid proof candidate ${candidate.cell}:${candidate.digit}`,
          );
        }
      }
      for (const evidence of proof.valueEvidence) {
        if (step.boardFingerprint[evidence.cell] !== String(evidence.digit)) {
          errors.push(
            `proof value evidence does not match board at ${evidence.cell}`,
          );
        }
      }
    });
    const conclusion = step.proofSteps[step.proofSteps.length - 1];
    if (
      conclusion &&
      (JSON.stringify(conclusion.eliminations) !==
        JSON.stringify(step.eliminations) ||
        JSON.stringify(conclusion.placements) !==
          JSON.stringify(step.placements))
    ) {
      errors.push('proof conclusion must match the atomic hint result');
    }
  }

  return errors;
}
