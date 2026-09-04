import { SessionReplay } from '../game/session-replay';
import { GrowthReference } from './contracts';
/** A missing stable reference is an explicit error, never an implicit frame 0. */
export function locateGrowthReference(
  replay: SessionReplay,
  reference: GrowthReference,
): { start: number; end: number } | null {
  const indices = reference.moveIds.map(id =>
    replay.frames.findIndex(f => f.move?.id === id),
  );
  if (reference.eventId)
    indices.push(
      replay.frames.findIndex(f => f.event?.id === reference.eventId),
    );
  if (!indices.length || indices.some(i => i < 0)) return null;
  return { start: Math.min(...indices), end: Math.max(...indices) };
}
