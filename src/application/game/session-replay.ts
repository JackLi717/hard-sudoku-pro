import {
  GameMove,
  GameSession,
  UndoSnapshot,
  ReplayEvent,
  ReplayView,
} from '../../domain/game/contracts';
import { hasCandidate } from '../../domain/sudoku/board';

export type ReplayCoverage =
  | 'complete_event_history'
  | 'complete_active_history'
  | 'final_snapshot_only'
  | 'inconsistent_history';

export type ReplayFrame = {
  index: number;
  snapshot: UndoSnapshot;
  move: GameMove | null;
  event?: ReplayEvent;
  view?: ReplayEvent['view'];
  focusChange?: ReplayView;
  candidateUpdate?: boolean;
  /** Consecutive candidate removals represented by this single replay step. */
  moves?: readonly GameMove[];
  before?: UndoSnapshot;
};

export type SessionReplay = {
  coverage: ReplayCoverage;
  frames: readonly ReplayFrame[];
  /** Undo clicks and automatic candidate cleanup were not separately persisted. */
  note: string;
};

// Candidate modes, drafts and lifecycle changes are not board moves. Their
// exact before/after snapshots remain available, but do not break the active path.
const sameBoard = (left: UndoSnapshot, right: UndoSnapshot) =>
  JSON.stringify(left.values) === JSON.stringify(right.values);

function removedCandidate(
  move: GameMove,
): { cell: number; digit: NonNullable<GameMove['digit']> } | null {
  if (
    move.cell === null ||
    move.digit === null ||
    !['edit_manual_candidate', 'edit_quick_candidate'].includes(move.kind)
  )
    return null;
  const key =
    move.kind === 'edit_manual_candidate'
      ? 'manualCandidates'
      : 'quickCandidates';
  return hasCandidate(move.before.candidates[key][move.cell], move.digit) &&
    !hasCandidate(move.after.candidates[key][move.cell], move.digit)
    ? { cell: move.cell, digit: move.digit }
    : null;
}

function regionsFor(cell: number): Set<string> {
  return new Set([
    `row:${Math.floor(cell / 9)}`,
    `column:${cell % 9}`,
    `box:${Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3)}`,
  ]);
}

function compressCandidateEliminations(
  frames: readonly ReplayFrame[],
): ReplayFrame[] {
  const compressed: ReplayFrame[] = [];
  for (let index = 0; index < frames.length; index += 1) {
    const first = frames[index];
    const firstRemoval = first.move && removedCandidate(first.move);
    if (!firstRemoval) {
      compressed.push({ ...first, index: compressed.length });
      continue;
    }
    const moves = [first.move!];
    const actionFrames = [first];
    const focusFrames: ReplayFrame[] = [];
    let sharedRegions = regionsFor(firstRemoval.cell);
    let cursor = index + 1;
    let last = first;
    while (cursor < frames.length) {
      const candidate = frames[cursor];
      // Focus-only frames are click-level detail and should not split one
      // uninterrupted elimination thought.
      if (candidate.focusChange) {
        focusFrames.push(candidate);
        cursor += 1;
        continue;
      }
      const removal = candidate.move && removedCandidate(candidate.move);
      if (
        !removal ||
        candidate.move!.kind !== first.move!.kind ||
        removal.digit !== firstRemoval.digit
      )
        break;
      const overlap = new Set(
        [...sharedRegions].filter(region =>
          regionsFor(removal.cell).has(region),
        ),
      );
      if (!overlap.size) break;
      sharedRegions = overlap;
      moves.push(candidate.move!);
      actionFrames.push(candidate);
      last = candidate;
      cursor += 1;
    }
    if (moves.length === 1) {
      compressed.push({ ...first, index: compressed.length });
      continue;
    }
    const leadingFocus = compressed.at(-1);
    if (
      leadingFocus?.focusChange &&
      JSON.stringify(leadingFocus.snapshot) === JSON.stringify(first.before)
    ) {
      focusFrames.unshift(leadingFocus);
      compressed.pop();
    }
    const hasRecordedFocus =
      focusFrames.length > 0 ||
      actionFrames.every(
        (frame, moveIndex) =>
          frame.view?.selectedCell === moves[moveIndex].cell &&
          frame.view.highlightDigit === firstRemoval.digit,
      );
    if (hasRecordedFocus && first.before) {
      const focusChange: ReplayView = {
        selectedCell: null,
        highlightDigit: firstRemoval.digit,
      };
      compressed.push({
        index: compressed.length,
        snapshot: first.before,
        move: null,
        view: focusChange,
        focusChange,
        moves,
      });
    }
    compressed.push({
      ...last,
      index: compressed.length,
      before: first.before,
      moves,
    });
    index = cursor - 1;
  }
  return compressed;
}

function finalSnapshot(session: GameSession): ReplayFrame[] {
  const {
    values,
    candidates,
    incorrectCells,
    errorCount,
    status,
    completionKind,
  } = session.state;
  return [
    {
      index: 0,
      move: null,
      snapshot: {
        values,
        candidates,
        incorrectCells,
        errorCount,
        status,
        completionKind,
      },
    },
  ];
}

export function replayRecoverability(session: GameSession | null) {
  if (!session) return 'unavailable' as const;
  return ['complete_active_history', 'complete_event_history'].includes(
    buildSessionReplay(session).coverage,
  )
    ? ('action_history' as const)
    : ('final_snapshot' as const);
}

/**
 * Builds a read-only timeline from durable active moves. This deliberately does
 * not infer inactive moves as undo events: older records only prove the final
 * active path, not when an undo button was pressed.
 */
export function buildSessionReplay(session: GameSession): SessionReplay {
  const events = session.replayEvents;
  if (session.state.replayRecordingSinceRevision === 0 && events?.length) {
    let prior = events[0].before;
    const ids = new Set<string>();
    const active = new Map<string, GameMove>();
    const frames: ReplayFrame[] = [{ index: 0, snapshot: prior, move: null }];
    let valid =
      JSON.stringify(prior.values) === JSON.stringify(session.state.givens);
    for (const event of events) {
      valid &&=
        event.sessionId === session.state.sessionId &&
        !ids.has(event.id) &&
        event.revision > event.previousRevision &&
        JSON.stringify(event.before) === JSON.stringify(prior);
      ids.add(event.id);
      if (event.move) {
        valid &&=
          event.move.sessionId === event.sessionId &&
          !active.has(event.move.id) &&
          JSON.stringify(event.move.before) === JSON.stringify(event.before) &&
          JSON.stringify(event.move.after) === JSON.stringify(event.after);
        active.set(event.move.id, event.move);
      }
      if (event.kind === 'undo') {
        valid &&= event.targetMoveId !== null && active.has(event.targetMoveId);
        if (event.targetMoveId) active.delete(event.targetMoveId);
      }
      const isTimingEvent = event.kind === 'pause' || event.kind === 'resume';
      if (!isTimingEvent)
        for (const view of event.views ?? []) {
          frames.push({
            index: frames.length,
            snapshot: event.before,
            move: null,
            view,
            focusChange: view,
          });
        }
      if (!isTimingEvent) {
        frames.push({
          index: frames.length,
          snapshot: event.after,
          before: event.before,
          move: event.move,
          event,
          view: event.view,
        });
      }
      prior = event.after;
    }
    valid &&=
      JSON.stringify(prior) ===
        JSON.stringify(finalSnapshot(session)[0].snapshot) &&
      JSON.stringify([...active.keys()]) ===
        JSON.stringify(session.history.map(move => move.id));
    if (valid)
      return {
        coverage: 'complete_event_history',
        frames: compressCandidateEliminations(frames),
        note: 'Recorded effective actions with their board focus, candidate modes and hint exposure. Reverted actions are omitted.',
      };
  }
  const moves = [...session.history].sort((a, b) => a.sequence - b.sequence);
  if (!moves.length) {
    return {
      coverage: 'final_snapshot_only',
      // A saved session still gives us one truthful state. Do not make up the
      // preceding actions, but let people inspect the retained board instead
      // of treating an untouched/legacy game as corrupt.
      frames: finalSnapshot(session),
      note: 'Only the final saved board is available for this game; no action-by-action history was retained.',
    };
  }
  if (
    JSON.stringify(moves[0].before.values) !==
    JSON.stringify(session.state.givens)
  ) {
    return {
      coverage: 'inconsistent_history',
      frames: finalSnapshot(session),
      note: 'The beginning of the game was not retained.',
    };
  }
  const frames: ReplayFrame[] = [
    { index: 0, snapshot: moves[0].before, move: null },
  ];
  let prior = moves[0].before;
  for (const [offset, move] of moves.entries()) {
    if (
      move.sessionId !== session.state.sessionId ||
      move.sequence <= (moves[offset - 1]?.sequence ?? 0) ||
      !sameBoard(move.before, prior)
    ) {
      return {
        coverage: 'inconsistent_history',
        frames: finalSnapshot(session),
        note: 'Saved action snapshots are inconsistent; only the final saved board is available.',
      };
    }
    if (
      JSON.stringify(prior.candidates) !==
      JSON.stringify(move.before.candidates)
    ) {
      frames.push({
        index: frames.length,
        snapshot: move.before,
        before: prior,
        move: null,
        candidateUpdate: true,
      });
    }
    frames.push({
      index: frames.length,
      snapshot: move.after,
      before: move.before,
      move,
    });
    prior = move.after;
  }
  if (!sameBoard(prior, session.state)) {
    return {
      coverage: 'inconsistent_history',
      frames: finalSnapshot(session),
      note: 'The retained actions do not reach the saved board.',
    };
  }
  if (
    JSON.stringify(prior.candidates) !==
    JSON.stringify(session.state.candidates)
  ) {
    frames.push({
      index: frames.length,
      snapshot: finalSnapshot(session)[0].snapshot,
      before: prior,
      move: null,
      candidateUpdate: true,
    });
  }
  return {
    coverage: 'complete_active_history',
    frames: compressCandidateEliminations(frames),
    note: 'Replays saved effective board actions and candidate snapshots. It cannot reconstruct unrecorded selections, automatic cleanup, or historical undo clicks.',
  };
}
