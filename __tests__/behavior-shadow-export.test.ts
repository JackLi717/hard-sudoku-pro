import { behaviorShadowRecordsToReviewSamples } from '../src/application/technique-recognition/shadow-export';
import { BehaviorShadowRecord } from '../src/application/technique-recognition/shadow-controller';
import {
  GrowthAnalysisRequest,
  createSolverCandidates,
  boardFromFingerprint,
} from '../src/domain';
import { ipadCandidateRestorations } from './helpers/ipad-shadow-restoration';

function request(
  sessionId: string,
  startingRevision: number,
): GrowthAnalysisRequest {
  const fixture = ipadCandidateRestorations[0];
  return {
    sessionId,
    segmentId: 'segment-1',
    requestId: 'growth-1',
    startingRevision,
    issuedRevision: startingRevision + 1,
    startingBoardFingerprint: fixture.board,
    expectedBoardFingerprint: fixture.board,
    growthCandidates: createSolverCandidates(
      boardFromFingerprint(fixture.board),
    ),
    givenCells: Array(81).fill(false),
    observedEffects: [
      { kind: 'elimination', cell: fixture.cell, digit: fixture.digit },
    ],
  };
}

function event(
  r: GrowthAnalysisRequest,
  phase: BehaviorShadowRecord['phase'],
  sequence: number,
): BehaviorShadowRecord {
  return {
    recordId: `record-${sequence}`,
    recordedAtEpochMs: sequence,
    phase,
    sessionId: r.sessionId,
    segmentId: r.segmentId,
    sourceCommandType: phase === 'invalidation' ? 'undo' : 'input_digit',
    request: phase === 'request' || phase === 'result' ? r : null,
    responseStatus: phase === 'result' ? 'no_match' : null,
    analysisDiagnostics: null,
    diagnostic:
      phase === 'request'
        ? null
        : {
            segmentId: r.segmentId,
            finality: 'final',
            attribution: {
              candidateTechniques: [],
              automaticTechnique: null,
              selectedTechnique: null,
              attributionEligibility:
                phase === 'invalidation'
                  ? { status: 'ineligible', reason: 'undo_polluted' }
                  : { status: 'eligible' },
            },
          },
  };
}

describe('shadow export identity and response ordering', () => {
  test('keeps identical segment counters from different sessions separate', () => {
    const a = request('a', 0),
      b = request('b', 0);
    const samples = behaviorShadowRecordsToReviewSamples([
      event(a, 'request', 1),
      event(a, 'result', 2),
      event(b, 'request', 3),
      event(b, 'result', 4),
      event(b, 'invalidation', 5),
    ]);
    expect(samples).toHaveLength(2);
    expect(samples.map(s => s.analysisRequest?.sessionId)).toEqual(['a', 'b']);
    expect(
      samples.map(s => s.systemAttribution.attributionEligibility.status),
    ).toEqual(['eligible', 'ineligible']);
  });

  test('recovers three retained incarnations and does not let a late old response redirect undo', () => {
    const a = request('same-session', 0),
      b = request('same-session', 35),
      c = request('same-session', 50);
    const samples = behaviorShadowRecordsToReviewSamples([
      event(a, 'request', 1),
      event(a, 'result', 2),
      event(b, 'request', 3),
      event(b, 'result', 4),
      event(c, 'request', 5),
      event(c, 'result', 6),
      event(a, 'result', 7),
      event(c, 'invalidation', 8),
      event(c, 'result', 9),
    ]);
    expect(samples).toHaveLength(3);
    expect(samples.map(s => s.analysisRequest?.startingRevision)).toEqual([
      0, 35, 50,
    ]);
    expect(
      samples.map(s => s.systemAttribution.attributionEligibility.status),
    ).toEqual(['eligible', 'eligible', 'ineligible']);
    expect(samples[2].analysisRequest).toEqual(c);
  });

  test('uses the latest cumulative request for settlement even if an older response arrives last', () => {
    const first = request('a', 0);
    const latest = {
      ...first,
      requestId: 'growth-2',
      issuedRevision: 2,
      observedEffects: [
        ...first.observedEffects,
        { kind: 'elimination' as const, cell: 49, digit: 6 as const },
      ],
    };
    const samples = behaviorShadowRecordsToReviewSamples([
      event(first, 'request', 1),
      event(latest, 'request', 2),
      event(latest, 'result', 3),
      event(latest, 'segment_finalized', 4),
      event(first, 'result', 5),
    ]);
    expect(samples).toHaveLength(1);
    expect(samples[0].analysisRequest).toEqual(latest);
  });

  test('preserves diagnostics without any segment or request evidence', () => {
    const record = {
      ...event(request('a', 0), 'invalidation', 1),
      segmentId: null,
    };
    const samples = behaviorShadowRecordsToReviewSamples([record]);
    expect(samples).toHaveLength(1);
    expect(samples[0].analysisRequest).toBeNull();
  });
});
