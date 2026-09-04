import { SessionReplaySource } from '../../application/game/session-replay-source';
import { buildSessionReplay } from '../../application/game/session-replay';
import { GrowthRecord } from '../../application/technique-growth/contracts';
import { locateGrowthReference } from '../../application/technique-growth/replay-reference';
import { Board } from '../../domain/sudoku/contracts';

export type RecordPreview = {
  record: GrowthRecord;
  values: Board;
  givens: Board;
  focus: number | null;
  step: number;
};

/** Read-only presentation adapter. Never searches, repairs or writes evidence. */
export async function readRecordPreview(
  source: SessionReplaySource,
  record: GrowthRecord,
): Promise<RecordPreview | null> {
  const session = await source.readReplaySession(record.reference.sessionId);
  if (
    !session ||
    session.state.sessionId !== record.reference.sessionId ||
    ['active', 'paused'].includes(session.state.status)
  )
    return null;
  const replay = buildSessionReplay(session);
  const position = locateGrowthReference(replay, record.reference);
  if (!position) return null;
  const frame = replay.frames[position.start];
  const before = frame.before ?? frame.move?.before;
  if (!before) return null;
  return {
    record,
    values: before.values,
    givens: session.state.givens,
    focus: frame.move?.cell ?? frame.event?.hint?.placements[0]?.cell ?? null,
    step: position.start,
  };
}
