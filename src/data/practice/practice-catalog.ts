import catalog from './generated/practice-catalog.json';
import type { HintStep } from '../../domain/hints/contracts';
import { validateHintStepForState } from '../../domain/hints/candidate-state';
import type { HintWalkthroughSnapshot } from '../../domain/hints/walkthrough';
import type { TechniqueCode } from '../../domain/hints/techniques';
import { boardFromFingerprint } from '../../domain/sudoku/board';
import type { CandidateGrid } from '../../domain/sudoku/contracts';
import { validateContentSource } from '../../domain/lessons/content-source';

export type PracticeScene = Readonly<{
  id: string;
  techniqueCode: TechniqueCode;
  role: 'demo' | 'exercise';
  snapshot: HintWalkthroughSnapshot;
  solutionFingerprint: string;
}>;

function decode(): readonly PracticeScene[] {
  if (catalog.content_usage !== 'practice' || catalog.exercises.length !== 8)
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
      solutionFingerprint: raw.solution_fingerprint,
      snapshot: {
        id: raw.id,
        values: boardFromFingerprint(raw.board_fingerprint),
        givens: boardFromFingerprint(raw.puzzle_fingerprint),
        candidateMasks,
        step,
      },
    };
  });
}

const scenes = decode();

export function practiceScenesFor(
  technique: TechniqueCode,
): readonly PracticeScene[] {
  return scenes.filter(scene => scene.techniqueCode === technique);
}
