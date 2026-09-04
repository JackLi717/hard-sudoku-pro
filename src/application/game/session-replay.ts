import { GameMove, GameSession, UndoSnapshot } from '../../domain/game/contracts';

export type ReplayCoverage =
  | 'complete_active_history'
  | 'final_snapshot_only'
  | 'inconsistent_history';

export type ReplayFrame = {
  index: number;
  snapshot: UndoSnapshot;
  move: GameMove | null;
};

export type SessionReplay = {
  coverage: ReplayCoverage;
  frames: readonly ReplayFrame[];
  /** Undo clicks and automatic candidate cleanup were not separately persisted. */
  note: string;
};

const sameSnapshot = (left: UndoSnapshot, right: UndoSnapshot) =>
  JSON.stringify(left) === JSON.stringify(right);

/**
 * Builds a read-only timeline from durable active moves. This deliberately does
 * not infer inactive moves as undo events: older records only prove the final
 * active path, not when an undo button was pressed.
 */
export function buildSessionReplay(session: GameSession): SessionReplay {
  const moves = [...session.history].sort((a, b) => a.sequence - b.sequence);
  if (!moves.length) {
    return {
      coverage: 'final_snapshot_only',
      // A saved session still gives us one truthful state. Do not make up the
      // preceding actions, but let people inspect the retained board instead
      // of treating an untouched/legacy game as corrupt.
      frames: [
        {
          index: 0,
          move: null,
          snapshot: {
            values: session.state.values,
            candidates: session.state.candidates,
            incorrectCells: session.state.incorrectCells,
            errorCount: session.state.errorCount,
            status: session.state.status,
            completionKind: session.state.completionKind,
          },
        },
      ],
      note:
        'Only the final saved board is available for this game; no action-by-action history was retained.',
    };
  }
  const frames: ReplayFrame[] = [{ index: 0, snapshot: moves[0].before, move: null }];
  let prior = moves[0].before;
  for (const [offset, move] of moves.entries()) {
    if (move.sequence !== offset + 1 || !sameSnapshot(move.before, prior)) {
      return {
        coverage: 'inconsistent_history',
        frames: [],
        note: 'Saved action snapshots are incomplete or inconsistent, so replay is unavailable.',
      };
    }
    frames.push({ index: offset + 1, snapshot: move.after, move });
    prior = move.after;
  }
  return {
    coverage: 'complete_active_history',
    frames,
    note:
      'Replays saved effective board actions and candidate snapshots. It cannot reconstruct unrecorded selections, automatic cleanup, or historical undo clicks.',
  };
}
