import { challengeState } from '../../domain/challenge/engine';
import type {
  ChallengeAttempt,
  ChallengeLevel,
  ChallengeOperation,
} from '../../domain/challenge/contracts';
import type { GameSession } from '../../domain/game/contracts';
import {
  boardFromFingerprint,
  createBoardFingerprint,
  hasCandidate,
  isCellIndex,
  isDigit,
} from '../../domain/sudoku/board';

/** Presentation adapter only: never runs ordinary game rewards or answer checks. */
export function challengeBoardSession(
  level: ChallengeLevel,
  attempt: ChallengeAttempt,
  draft: readonly ChallengeOperation[],
  selectedCell: number | null,
  pencilMode: boolean,
  showCandidates = true,
  autoRemoveCandidates = true,
): GameSession {
  const { values, candidates: masks } = challengeState(
    level,
    [...attempt.accepted.map(item => item.operation), ...draft],
    autoRemoveCandidates,
  );
  const empty = Array<number>(81).fill(0);
  return {
    history: [],
    state: {
      schemaVersion: 1,
      sessionId: attempt.id,
      puzzleId: level.id,
      contentVersion: 1,
      difficultyLevel: level.technique_code === 'hiddenSingle' ? 1 : 2,
      attemptNumber: 1,
      revision: attempt.accepted.length + draft.length,
      nextMoveSequence: 1,
      status: 'active',
      givens: boardFromFingerprint(level.source.board_fingerprint),
      values,
      selectedCell,
      annotations: [],
      incorrectCells: [],
      candidates: {
        manualCandidates: empty,
        quickCandidates: showCandidates ? masks : empty,
        hintCandidates: null,
        activeCandidateSource: 'quick',
        pencilMode,
        quickDraftGenerated: true,
        quickDraftBoardFingerprint: createBoardFingerprint(values),
        hintBoardFingerprint: null,
      },
      activeHint: null,
      hintExposures: [],
      settings: {
        autoCheckErrors: false,
        errorLimit: null,
        undoRestoresMistakes: false,
        autoRemoveCandidates,
      },
      timer: { elapsedMs: 0, runningSinceEpochMs: null },
      errorCount: 0,
      hintUseCount: 0,
      quickPencilUseCount: 0,
      usedSmartHint: false,
      completionKind: null,
      startedAtEpochMs: 0,
      updatedAtEpochMs: 0,
    },
  };
}

export function editChallengeCandidates(
  level: ChallengeLevel,
  attempt: ChallengeAttempt,
  draft: readonly ChallengeOperation[],
  cells: readonly number[],
  digits: readonly (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)[],
  action: 'add' | 'remove',
): readonly ChallengeOperation[] {
  let next = [...draft];
  for (const cell of cells)
    for (const digit of digits) {
      if (
        !isCellIndex(cell) ||
        !isDigit(digit) ||
        level.source.board_fingerprint[cell] !== '0' ||
        draft.some(op => op.kind === 'placement' && op.cell === cell) ||
        !hasCandidate(
          challengeState(
            level,
            attempt.accepted.map(item => item.operation),
          ).candidates[cell],
          digit,
        )
      )
        continue;
      const existing = next.findIndex(
        op =>
          op.kind === 'elimination' && op.cell === cell && op.digit === digit,
      );
      if (action === 'add')
        next = next.filter(
          op =>
            op.kind !== 'elimination' || op.cell !== cell || op.digit !== digit,
        );
      else if (existing < 0) next.push({ kind: 'elimination', cell, digit });
    }
  return next;
}

/** Keep independent draft values; edits never consult the answer or proofs. */
export function placeChallengeDigit(
  draft: readonly ChallengeOperation[],
  cell: number,
  digit: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
): readonly ChallengeOperation[] {
  return [
    ...draft.filter(op => op.kind !== 'placement' || op.cell !== cell),
    { kind: 'placement', cell, digit },
  ];
}

/** Normalize the submission while keeping each user edit independent. */
export function challengeSubmission(draft: readonly ChallengeOperation[]) {
  return [
    ...draft.filter(op => op.kind === 'elimination'),
    ...draft.filter(op => op.kind === 'placement'),
  ];
}
