import type { OfflineGameSnapshot } from '../app/offline-game-coordinator';
import type { PracticeScene } from '../../data/practice/practice-catalog';
import type { ProductPreferences } from '../app/product-preferences';
import type { GameDefinition, GameSession } from '../../domain/game/contracts';
import { createGameSession } from '../../domain/game/engine';
import { createBoardFingerprint } from '../../domain/sudoku/board';
import { practiceInitialCandidates } from './practice-evaluator';

export function practiceDefinition(scene: PracticeScene): GameDefinition {
  return {
    puzzleId: `practice:${scene.id}`,
    contentVersion: 1,
    difficultyLevel: scene.explanation.difficultyLevel,
    difficultyScore: 1,
    puzzleFingerprint: createBoardFingerprint(scene.board.values),
    solutionFingerprint: scene.board.solutionFingerprint,
  };
}

export function createPracticeGameSession(
  scene: PracticeScene,
  preferences: ProductPreferences,
  now: number,
): GameSession {
  const initial = createGameSession({
    sessionId: `lesson:${scene.id}`,
    definition: practiceDefinition(scene),
    startedAtEpochMs: now,
    settings: {
      autoCheckErrors: false,
      errorLimit: null,
      autoRemoveCandidates: preferences.autoRemoveCandidates,
    },
  });
  const candidates = initial.state.candidates;
  return {
    ...initial,
    state: {
      ...initial.state,
      selectedCell: null,
      candidates:
        practiceInitialCandidates(scene) === 'verified'
          ? {
              ...candidates,
              quickCandidates: [...scene.board.candidateMasks],
              activeCandidateSource: 'quick',
              pencilMode: true,
              quickDraftGenerated: true,
              quickDraftBoardFingerprint: createBoardFingerprint(
                scene.board.values,
              ),
            }
          : candidates,
    },
  };
}

/** Local exercise state adapts to the existing game board without game persistence. */
export function practiceGameSnapshot(
  session: GameSession,
): OfflineGameSnapshot {
  return {
    screen: 'game',
    session,
    puzzle: null,
    resumable: false,
    busy: false,
    message: null,
    replacementRequest: null,
    quickDraftConfirmation: false,
    wallet: {
      quick_pencil: {
        resource: 'quick_pencil',
        balance: 0,
        earnedTotal: 0,
        spentTotal: 0,
      },
      smart_hint: {
        resource: 'smart_hint',
        balance: 0,
        earnedTotal: 0,
        spentTotal: 0,
      },
    },
    statistics: {
      attempts: 0,
      completions: 0,
      failures: 0,
      abandonments: 0,
      totalElapsedMs: 0,
      totalHintsUsed: 0,
      totalQuickPencilsUsed: 0,
    },
    completedByLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    completionStreak: { current: 0, best: 0 },
    reward: null,
    completionResult: null,
  };
}
