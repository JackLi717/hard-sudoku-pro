import type { PracticeScene } from '../../data/practice/practice-catalog';
import type { GameSession } from '../../domain/game/contracts';
import type { HintWalkthroughSnapshot } from '../../domain/hints/walkthrough';
import type { TechniqueCode } from '../../domain/hints/techniques';
import { digitsFromMask, hasCandidate } from '../../domain/sudoku/board';
import type { Board, CandidateRef } from '../../domain/sudoku/contracts';
import { hiddenSingleRule } from './rules/hidden-single-rule';
import { lockedPointingRule } from './rules/locked-pointing-rule';
import { nakedPairRule } from './rules/naked-pair-rule';
import { verifiedStepRule } from './rules/verified-step-rule';

export type PracticeEvaluation =
  | {
      status: 'correct';
      proof: HintWalkthroughSnapshot;
      target?: CandidateRef;
    }
  | { status: 'incorrect' | 'other' | 'enter' | 'unavailable' };

export type PracticeBoardAction =
  | { kind: 'placement'; target: CandidateRef; beforeValues: Board }
  | {
      kind: 'elimination';
      target: CandidateRef;
      source: 'manual' | 'quick';
    };

/** One action stream for every exercise; undo has already removed reverted moves. */
function boardActions(session: GameSession): readonly PracticeBoardAction[] {
  return session.history.flatMap<PracticeBoardAction>(move => {
    if (
      move.kind === 'place_value' &&
      move.cell !== null &&
      move.digit !== null &&
      session.state.values[move.cell] === move.digit
    ) {
      return [
        {
          kind: 'placement' as const,
          target: { cell: move.cell, digit: move.digit },
          beforeValues: move.before.values,
        },
      ];
    }
    if (
      move.kind !== 'edit_quick_candidate' &&
      move.kind !== 'edit_manual_candidate'
    )
      return [];
    const source = move.kind === 'edit_quick_candidate' ? 'quick' : 'manual';
    const before =
      source === 'quick'
        ? move.before.candidates.quickCandidates
        : move.before.candidates.manualCandidates;
    const after =
      source === 'quick'
        ? move.after.candidates.quickCandidates
        : move.after.candidates.manualCandidates;
    return before.flatMap((mask, cell) =>
      digitsFromMask(mask)
        .filter(digit => !hasCandidate(after[cell], digit))
        .map(digit => ({
          kind: 'elimination' as const,
          target: { cell, digit },
          source,
        })),
    );
  });
}

/** Technique rules supply only the parts the shared board cannot know. */
export interface PracticeTechniqueRule {
  initialCandidates: 'empty' | 'verified';
  answerKind: PracticeBoardAction['kind'];
  evaluate(
    scene: PracticeScene,
    session: GameSession,
    actions: readonly PracticeBoardAction[],
    signal?: AbortSignal,
  ): PracticeEvaluation | Promise<PracticeEvaluation>;
}

const RULES: Partial<Record<TechniqueCode, PracticeTechniqueRule>> = {
  hiddenSingle: hiddenSingleRule,
  nakedPair: nakedPairRule,
  'lockedCandidates.pointing': lockedPointingRule,
  fullHouse: verifiedStepRule('fullHouse', 'placement'),
  nakedSingle: verifiedStepRule('nakedSingle', 'placement'),
  'lockedCandidates.claiming': verifiedStepRule(
    'lockedCandidates.claiming',
    'elimination',
  ),
  lockedPair: verifiedStepRule('lockedPair', 'elimination'),
  hiddenPair: verifiedStepRule('hiddenPair', 'elimination'),
  lockedTriple: verifiedStepRule('lockedTriple', 'elimination'),
  nakedTriple: verifiedStepRule('nakedTriple', 'elimination'),
  hiddenTriple: verifiedStepRule('hiddenTriple', 'elimination'),
  nakedQuad: verifiedStepRule('nakedQuad', 'elimination'),
  hiddenQuad: verifiedStepRule('hiddenQuad', 'elimination'),
  xWing: verifiedStepRule('xWing', 'elimination'),
  swordfish: verifiedStepRule('swordfish', 'elimination'),
  finnedXWing: verifiedStepRule('finnedXWing', 'elimination'),
  sashimiXWing: verifiedStepRule('sashimiXWing', 'elimination'),
  skyscraper: verifiedStepRule('skyscraper', 'elimination'),
  twoStringKite: verifiedStepRule('twoStringKite', 'elimination'),
  emptyRectangle: verifiedStepRule('emptyRectangle', 'elimination'),
  turbotFish: verifiedStepRule('turbotFish', 'elimination'),
  xyWing: verifiedStepRule('xyWing', 'elimination'),
  xyzWing: verifiedStepRule('xyzWing', 'elimination'),
  wWing: verifiedStepRule('wWing', 'elimination'),
};

export function supportsPracticeTechnique(technique: TechniqueCode): boolean {
  return RULES[technique] !== undefined;
}

export function practiceRuleFor(
  technique: TechniqueCode,
): PracticeTechniqueRule {
  const rule = RULES[technique];
  if (!rule) throw new Error(`No practice rule for ${technique}`);
  return rule;
}

export function hasPracticeAnswer(
  scene: PracticeScene,
  session: GameSession,
): boolean {
  const rule = practiceRuleFor(scene.techniqueCode);
  return boardActions(session).some(
    action =>
      action.kind === rule.answerKind &&
      (action.kind !== 'elimination' ||
        action.source === session.state.candidates.activeCandidateSource),
  );
}

export async function evaluatePractice(
  scene: PracticeScene,
  session: GameSession,
  signal?: AbortSignal,
): Promise<PracticeEvaluation> {
  return practiceRuleFor(scene.techniqueCode).evaluate(
    scene,
    session,
    boardActions(session),
    signal,
  );
}
