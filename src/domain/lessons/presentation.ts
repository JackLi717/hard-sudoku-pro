import { validateHintStepForState } from '../hints/candidate-state';
import {
  buildHintPresentation,
  ENGLISH_HINT_PRESENTATION_COPY,
  HintPresentationCopy,
  HintPresentation,
} from '../hints/presentation';
import type { HintWalkthroughSnapshot } from '../hints/walkthrough';
import { createBoardFingerprint } from '../sudoku/board';
import type { CandidateRef } from '../sudoku/contracts';
import { LessonContentError } from './content-source';

/** Reading describes a conclusion; it never offers to apply a game command. */
export function buildLessonPresentation(
  example: HintWalkthroughSnapshot,
  copy: HintPresentationCopy = ENGLISH_HINT_PRESENTATION_COPY,
  selectedTarget?: CandidateRef,
): HintPresentation {
  try {
    const errors = validateHintStepForState(
      {
        contractVersion: 1,
        boardFingerprint: createBoardFingerprint(example.values),
        hintCandidates: example.candidateMasks,
        givenCells: example.givens.map(value => value !== null),
      },
      example.step,
    );
    if (
      errors.length ||
      !example.step.proofSteps ||
      example.step.proofSteps.length < 2
    ) {
      throw new LessonContentError(
        `incomplete lesson proof: ${errors.join('; ')}`,
      );
    }
    if (
      selectedTarget &&
      !example.step.eliminations.some(
        target =>
          target.cell === selectedTarget.cell &&
          target.digit === selectedTarget.digit,
      )
    )
      throw new LessonContentError(
        'selected target is not part of the lesson proof',
      );
    const presentation = buildHintPresentation(
      example.step,
      copy,
      'replay',
      example.candidateMasks,
      selectedTarget,
      undefined,
      true,
    );
    if (
      presentation.pages.length < 2 ||
      presentation.pages.some(
        page =>
          !page.title.trim() ||
          !page.body.trim() ||
          !page.accessibilitySummary.trim() ||
          page.body === copy.teaching.legacy,
      )
    )
      throw new LessonContentError(
        'lesson proof cannot produce a complete walkthrough',
      );
    return presentation;
  } catch (error) {
    if (error instanceof LessonContentError) throw error;
    throw new LessonContentError(`invalid lesson proof: ${String(error)}`);
  }
}
