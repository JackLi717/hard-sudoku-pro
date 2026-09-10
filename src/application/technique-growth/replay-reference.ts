import { replayFrameSteps, SessionReplay } from '../game/session-replay';
import { GrowthReference } from './contracts';

function referencedFrameIndices(
  replay: SessionReplay,
  reference: GrowthReference,
): number[] | null {
  const indices = reference.moveIds.map(id =>
    replay.frames.findIndex(f => f.move?.id === id),
  );
  if (reference.eventId)
    indices.push(
      replay.frames.findIndex(f => f.event?.id === reference.eventId),
    );
  return !indices.length || indices.some(i => i < 0) ? null : indices;
}

/** Resolve stable identities to internal presentation frames. */
export function locateGrowthReferenceFrames(
  replay: SessionReplay,
  reference: GrowthReference,
): { start: number; end: number } | null {
  const indices = referencedFrameIndices(replay, reference);
  return indices
    ? { start: Math.min(...indices), end: Math.max(...indices) }
    : null;
}

/** A missing stable reference is an explicit error, never an implicit frame 0. */
export function locateGrowthReference(
  replay: SessionReplay,
  reference: GrowthReference,
): { start: number; end: number } | null {
  const indices = referencedFrameIndices(replay, reference);
  if (!indices) return null;
  const steps = replayFrameSteps(replay.frames);
  return {
    start: Math.min(...indices.map(index => steps[index])),
    end: Math.max(...indices.map(index => steps[index])),
  };
}
