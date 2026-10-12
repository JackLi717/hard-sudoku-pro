import {
  arePeers,
  boardFromFingerprint,
  hasCandidate,
  isCellIndex,
  isDigit,
  removeCandidate,
} from '../sudoku/board';
import type {
  ChallengeAttempt,
  ChallengeCheckResult,
  ChallengeLevel,
  ChallengeOperation,
  ChallengeProgress,
} from './contracts';

export function createChallengeProgress(
  levelId: string,
  contentKey: string,
  id: string,
): ChallengeProgress {
  return {
    levelId,
    contentKey,
    revision: 0,
    everPassed: false,
    solutionViewed: false,
    passedAfterExplanation: false,
    attempt: {
      id,
      accepted: [],
      batchEnds: [],
      passed: false,
      ended: false,
      errors: 0,
      submissions: 0,
      elapsedMs: 0,
    },
  };
}

/** Rebuild from the source, so overwriting, erasing and undo restore peer marks. */
export function challengeState(
  level: ChallengeLevel,
  operations: readonly ChallengeOperation[],
  autoRemoveCandidates = true,
) {
  const values = [...boardFromFingerprint(level.source.board_fingerprint)];
  const candidates = [...level.source.candidate_masks];
  // Apply all values before pruning: no overwritten draft value leaves residue.
  for (const op of operations) {
    if (op.kind === 'placement') values[op.cell] = op.digit;
    else candidates[op.cell] = removeCandidate(candidates[op.cell], op.digit);
  }
  values.forEach((value, cell) => {
    if (value === null) return;
    candidates[cell] = 0;
    if (autoRemoveCandidates)
      candidates.forEach((mask, peer) => {
        if (arePeers(cell, peer))
          candidates[peer] = removeCandidate(mask, value);
      });
  });
  return { values, candidates };
}

/** Correctness depends on the unique solution, never on a technique or click path. */
export function checkChallenge(
  level: ChallengeLevel,
  attempt: ChallengeAttempt,
  operations: readonly ChallengeOperation[],
): ChallengeCheckResult {
  const unchanged = (status: ChallengeCheckResult['status']) => ({
    status,
    attempt,
  });
  if (attempt.passed || attempt.ended || !operations.length)
    return unchanged('enter');
  if (!/^[1-9]{81}$/.test(level.source.solution_fingerprint))
    return unchanged('unavailable');
  if (
    operations.some(
      op =>
        !isCellIndex(op.cell) ||
        !isDigit(op.digit) ||
        !['placement', 'elimination'].includes(op.kind),
    ) ||
    new Set(operations.map(op => `${op.kind}:${op.cell}:${op.digit}`)).size !==
      operations.length ||
    new Set(operations.filter(op => op.kind === 'placement').map(op => op.cell))
      .size !== operations.filter(op => op.kind === 'placement').length
  )
    return unchanged('enter');
  const state = challengeState(
    level,
    attempt.accepted.map(item => item.operation),
  );
  if (
    operations.some(
      op =>
        state.values[op.cell] !== null ||
        (op.kind === 'elimination' &&
          !hasCandidate(state.candidates[op.cell], op.digit)),
    )
  )
    return unchanged('enter');
  if (
    operations.some(
      op =>
        (level.source.solution_fingerprint[op.cell] === String(op.digit)) !==
        (op.kind === 'placement'),
    )
  ) {
    return {
      status: 'rejected',
      attempt: {
        ...attempt,
        errors: attempt.errors + 1,
        submissions: attempt.submissions + 1,
      },
    };
  }
  const accepted = [
    ...attempt.accepted,
    ...operations.map(operation => ({ operation })),
  ];
  return {
    status: 'accepted',
    attempt: {
      ...attempt,
      accepted,
      batchEnds: [...attempt.batchEnds, accepted.length],
      submissions: attempt.submissions + 1,
      passed:
        operations.some(op => op.kind === 'placement') ||
        (level.technique_code !== null &&
          level.technique_code !== 'hiddenSingle'),
    },
  };
}

export function undoChallenge(attempt: ChallengeAttempt): ChallengeAttempt {
  if (!attempt.batchEnds.length || attempt.ended) return attempt;
  const batchEnds = attempt.batchEnds.slice(0, -1);
  return {
    ...attempt,
    accepted: attempt.accepted.slice(0, batchEnds.at(-1) ?? 0),
    batchEnds,
    passed: false,
  };
}

export function restartChallenge(
  progress: ChallengeProgress,
  id: string,
): ChallengeProgress {
  return {
    ...progress,
    attempt: createChallengeProgress(progress.levelId, progress.contentKey, id)
      .attempt,
  };
}

/** Replay user results against the current unique solution before trusting a save. */
export function restoreChallenge(
  level: ChallengeLevel,
  progress: ChallengeProgress,
): ChallengeProgress {
  let replay = createChallengeProgress(
    progress.levelId,
    progress.contentKey,
    progress.attempt.id,
  ).attempt;
  let offset = 0;
  for (const end of progress.attempt.batchEnds) {
    if (
      !Number.isInteger(end) ||
      end <= offset ||
      end > progress.attempt.accepted.length
    )
      throw new Error('Invalid challenge history');
    const result = checkChallenge(
      level,
      replay,
      progress.attempt.accepted.slice(offset, end).map(item => item.operation),
    );
    if (result.status !== 'accepted')
      throw new Error('Invalid challenge replay');
    replay = result.attempt;
    offset = end;
  }
  if (
    offset !== progress.attempt.accepted.length ||
    replay.passed !== progress.attempt.passed ||
    typeof progress.attempt.ended !== 'boolean' ||
    !Number.isFinite(progress.attempt.elapsedMs) ||
    progress.attempt.elapsedMs < 0 ||
    !Number.isSafeInteger(progress.attempt.errors) ||
    progress.attempt.errors < 0 ||
    !Number.isSafeInteger(progress.attempt.submissions) ||
    progress.attempt.submissions < replay.submissions
  )
    throw new Error('Invalid challenge state');
  return {
    ...progress,
    attempt: {
      ...replay,
      errors: progress.attempt.errors,
      submissions: progress.attempt.submissions,
      ended: progress.attempt.ended,
      elapsedMs: progress.attempt.elapsedMs,
    },
  };
}
