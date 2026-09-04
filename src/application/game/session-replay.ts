import {
  GameMove,
  GameSession,
  UndoSnapshot,
  ReplayEvent,
} from '../../domain/game/contracts';

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
  candidateUpdate?: boolean;
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
    let revision = 0;
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
        event.previousRevision === revision &&
        event.revision > revision &&
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
      frames.push({
        index: frames.length,
        snapshot: event.after,
        before: event.before,
        move: event.move,
        event,
      });
      revision = event.revision;
      prior = event.after;
    }
    valid &&=
      revision === session.state.revision &&
      JSON.stringify(prior) ===
        JSON.stringify(finalSnapshot(session)[0].snapshot) &&
      JSON.stringify([...active.keys()]) ===
        JSON.stringify(session.history.map(move => move.id));
    if (valid)
      return {
        coverage: 'complete_event_history',
        frames,
        note: 'Recorded command timeline, including undo targets, candidate modes and hint exposure. Selections and animation timing are not recorded.',
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
    frames,
    note: 'Replays saved effective board actions and candidate snapshots. It cannot reconstruct unrecorded selections, automatic cleanup, or historical undo clicks.',
  };
}
