import catalog from './generated/practice-catalog.json';
import type { HintStep } from '../../domain/hints/contracts';
import { validateHintStepForState } from '../../domain/hints/candidate-state';
import type { HintWalkthroughSnapshot } from '../../domain/hints/walkthrough';
import type { TechniqueCode } from '../../domain/hints/techniques';
import {
  boardFromFingerprint,
  createBoardFingerprint,
} from '../../domain/sudoku/board';
import type { Board, CandidateGrid } from '../../domain/sudoku/contracts';
import { validateContentSource } from '../../domain/lessons/content-source';

export type PracticeScene = Readonly<{
  id: string;
  techniqueCode: TechniqueCode;
  role: 'demo' | 'exercise';
  board: Readonly<{
    values: Board;
    givens: Board;
    candidateMasks: CandidateGrid;
    solutionFingerprint: string;
  }>;
  explanation: HintStep;
}>;

export interface PracticeRepository {
  list(
    technique: TechniqueCode,
    role?: PracticeScene['role'],
  ): readonly PracticeScene[];
  get(id: string): PracticeScene | null;
}

/** A changed exercise state or expected outcome starts a fresh attempt record. */
export function practiceContentKey(scene: PracticeScene): string {
  return JSON.stringify([
    scene.techniqueCode,
    createBoardFingerprint(scene.board.values),
    scene.board.solutionFingerprint,
    scene.board.candidateMasks,
    scene.explanation.placements,
    scene.explanation.eliminations,
  ]);
}

export function practiceReferenceSnapshot(
  scene: PracticeScene,
): HintWalkthroughSnapshot {
  return {
    id: scene.id,
    values: scene.board.values,
    givens: scene.board.givens,
    candidateMasks: scene.board.candidateMasks,
    step: scene.explanation,
  };
}

function decode(): readonly PracticeScene[] {
  if (catalog.content_usage !== 'practice' || !Array.isArray(catalog.exercises))
    throw new Error('Invalid practice catalog');
  const ids = new Set<string>();
  return catalog.exercises.map(raw => {
    if (ids.has(raw.id)) throw new Error('Duplicate practice scene');
    ids.add(raw.id);
    if (
      !['hiddenSingle', 'nakedPair'].includes(raw.technique_code) ||
      !['demo', 'exercise'].includes(raw.role)
    )
      throw new Error('Invalid practice scene');
    const candidateMasks = raw.candidate_masks as CandidateGrid;
    validateContentSource({
      source_puzzle_id: raw.source_puzzle_id,
      puzzle_fingerprint: raw.puzzle_fingerprint,
      board_fingerprint: raw.board_fingerprint,
      candidate_masks: candidateMasks,
    });
    const step = raw.step as HintStep;
    if (!/^[1-9]{81}$/.test(raw.solution_fingerprint))
      throw new Error('Invalid practice solution');
    const errors = validateHintStepForState(
      {
        contractVersion: 1,
        boardFingerprint: raw.board_fingerprint,
        hintCandidates: candidateMasks,
        givenCells: [...raw.puzzle_fingerprint].map(value => value !== '0'),
      },
      step,
    );
    if (errors.length || step.techniqueCode !== raw.technique_code)
      throw new Error(`Invalid practice proof: ${errors.join('; ')}`);
    return {
      id: raw.id,
      techniqueCode: raw.technique_code as TechniqueCode,
      role: raw.role as 'demo' | 'exercise',
      board: {
        values: boardFromFingerprint(raw.board_fingerprint),
        givens: boardFromFingerprint(raw.puzzle_fingerprint),
        candidateMasks,
        solutionFingerprint: raw.solution_fingerprint,
      },
      explanation: step,
    };
  });
}

const scenes = decode();

export const bundledPracticeRepository: PracticeRepository = {
  list(technique, role) {
    return scenes.filter(
      scene =>
        scene.techniqueCode === technique && (!role || scene.role === role),
    );
  },
  get(id) {
    return scenes.find(scene => scene.id === id) ?? null;
  },
};

export function practiceScenesFor(
  technique: TechniqueCode,
): readonly PracticeScene[] {
  return bundledPracticeRepository.list(technique);
}
