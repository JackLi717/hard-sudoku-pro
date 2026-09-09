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

export type RecordDetails = {
  start: number;
  end: number;
  total: number;
  preview: RecordPreview | null;
};
export type SessionRecordDetails = Partial<Record<string, RecordDetails>>;

/** Read-only presentation adapter. Never searches, repairs or writes evidence. */
export async function readRecordPreview(
  source: SessionReplaySource,
  record: GrowthRecord,
): Promise<RecordPreview | null> {
  const details = await readSessionRecordDetails(
    source,
    record.reference.sessionId,
    [record],
  );
  return details[record.id]?.preview ?? null;
}

/** Resolve all rows against the same timeline used by the replay screen. */
export async function readSessionRecordDetails(
  source: SessionReplaySource,
  sessionId: string,
  records: readonly GrowthRecord[],
): Promise<SessionRecordDetails> {
  const session = await source.readReplaySession(sessionId);
  if (
    !session ||
    session.state.sessionId !== sessionId ||
    ['active', 'paused'].includes(session.state.status)
  )
    return {};
  const replay = buildSessionReplay(session);
  const details: SessionRecordDetails = {};
  for (const record of records) {
    if (record.reference.sessionId !== sessionId) continue;
    const position = locateGrowthReference(replay, record.reference);
    if (!position) continue;
    const frame = replay.frames[position.start];
    const before = frame.before ?? frame.move?.before;
    details[record.id] = {
      ...position,
      total: replay.frames.length - 1,
      preview: before
        ? {
            record,
            values: before.values,
            givens: session.state.givens,
            focus:
              frame.move?.cell ??
              frame.event?.hint?.placements[0]?.cell ??
              null,
            step: position.start,
          }
        : null,
    };
  }
  return details;
}
