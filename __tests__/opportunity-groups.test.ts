import { spawnSync } from 'node:child_process';
import { buildTechniqueOpportunityGroups } from '../src/application/technique-recognition/opportunity-groups';
import { buildSessionReview } from '../src/application/technique-recognition/session-review';
import { BehaviorShadowRecord } from '../src/application/technique-recognition/shadow-controller';
import {
  GrowthAnalysisRequest,
  TechniqueOpportunityEvidence,
  attributionFromAnalysis,
} from '../src/domain/technique-recognition/contracts';
import { removeCandidate } from '../src/domain/sudoku/board';
import { HINT_LAB_FIXTURES } from '../src/debug/hint-lab';
import { reviewRecord, reviewRequest } from './helpers/session-review';

const pair: TechniqueOpportunityEvidence = {
  placements: [],
  eliminations: [
    { cell: 2, digit: 1 },
    { cell: 3, digit: 2 },
  ],
};
const other: TechniqueOpportunityEvidence = {
  placements: [],
  eliminations: [{ cell: 5, digit: 4 }],
};

function record(
  index: number,
  outcomes = [pair],
  requestPatch: Partial<GrowthAnalysisRequest> = {},
): BehaviorShadowRecord {
  const request = reviewRequest({
    segmentId: `segment-${index}`,
    requestId: `request-${index}`,
    startingRevision: index,
    issuedRevision: index + 1,
    ...requestPatch,
  });
  return reviewRecord({
    recordId: `record-${index}`,
    segmentId: request.segmentId,
    request,
    recordedAtEpochMs: index,
    analysisDiagnostics: {
      opportunityCount: outcomes.length,
      opportunitySetComplete: true,
      usedExpandedSearch: false,
      reachedEnumerationLimitTechniques: [],
    },
    diagnostic: {
      segmentId: request.segmentId,
      finality: 'final',
      attribution: {
        automaticTechnique: 'nakedPair',
        selectedTechnique: null,
        attributionEligibility: { status: 'eligible' },
        candidateTechniques: [
          {
            technique: 'nakedPair',
            humanCost: 1,
            directPlacementMatch: false,
            oneHopPlacementMatch: false,
            matchingOpportunityCount: outcomes.length,
            matchingOpportunities: outcomes,
          },
        ],
      },
    },
  });
}

const project = (records: BehaviorShadowRecord[]) =>
  buildTechniqueOpportunityGroups(records, 'review-game');

test('split deletions share one opportunity; original records and review actions remain intact', () => {
  const first = record(1);
  const masks = [...first.request!.growthCandidates];
  masks[2] = removeCandidate(masks[2], 1);
  const second = record(
    2,
    [{ placements: [], eliminations: [pair.eliminations[1]] }],
    {
      growthCandidates: masks,
      observedEffects: [{ kind: 'elimination', ...pair.eliminations[1] }],
    },
  );
  const before = JSON.stringify([first, second]);
  const grouped = project([first, second]);
  expect(grouped.groups).toHaveLength(1);
  expect(grouped.groups[0].sampleIds).toHaveLength(2);
  expect(grouped.groups.filter(g => g.representativeSampleId)).toHaveLength(1);
  const review = buildSessionReview([first, second], 'review-game');
  expect(review).toHaveLength(2);
  expect(review[0].opportunity?.opportunityIds).toEqual(
    review[1].opportunity?.opportunityIds,
  );
  expect(JSON.stringify([first, second])).toBe(before);
});

test('same technique in different cells remains separate', () => {
  expect(
    project([record(1), record(2, [other])]).groups.filter(
      g => g.representativeSampleId,
    ),
  ).toHaveLength(2);
});

test('duplicate proof outcomes and ordering do not create extra opportunities', () => {
  const reverse = { ...pair, eliminations: [...pair.eliminations].reverse() };
  expect(project([record(1, [pair, reverse])]).groups).toHaveLength(1);
});

test('ambiguous intersections never transitively merge two existing opportunities', () => {
  const grouped = project([
    record(1, [pair]),
    record(2, [other]),
    record(3, [pair, other]),
  ]);
  expect(grouped.groups).toHaveLength(2);
  expect(grouped.memberships[2].status).toBe('ambiguous');
  expect(grouped.groups.map(g => g.representativeSampleId)).toEqual([
    'shadow-record-1',
    'shadow-record-2',
  ]);
  expect(
    project([record(1, [pair, other])]).groups.every(
      g => g.representativeSampleId === null,
    ),
  ).toBe(true);
});

test('the default explanation can change without recounting an identical outcome', () => {
  const second = record(2);
  second.diagnostic!.attribution = {
    ...second.diagnostic!.attribution,
    automaticTechnique: 'hiddenPair',
    candidateTechniques: second.diagnostic!.attribution.candidateTechniques.map(
      c => ({ ...c, technique: 'hiddenPair' }),
    ),
  };
  expect(project([record(1), second]).groups).toHaveLength(1);
});

test('fresh observer IDs and neutral revisions do not recount the same opportunity', () => {
  expect(
    project([record(1), record(99, [pair], { segmentId: 'new-observation:1' })])
      .groups,
  ).toHaveLength(1);
});

test('unknown opportunity evidence and incomplete enumeration never count', () => {
  const missing = record(1);
  delete missing.diagnostic!.attribution.candidateTechniques[0]
    .matchingOpportunities;
  const incomplete = record(2);
  incomplete.analysisDiagnostics = {
    ...incomplete.analysisDiagnostics!,
    opportunitySetComplete: false,
  };
  const grouped = project([missing, incomplete]);
  expect(grouped.groups).toEqual([]);
  expect(grouped.memberships.map(m => m.status)).toEqual([
    'missing_evidence',
    'missing_evidence',
  ]);
});

test('hint and undo invalidation suppress the shared opportunity, not just its last fragment', () => {
  const first = record(1);
  const second = record(2);
  const invalidation = reviewRecord({
    ...second,
    recordId: 'undo',
    phase: 'invalidation',
    request: null,
    recordedAtEpochMs: 3,
    diagnostic: {
      segmentId: second.segmentId,
      finality: 'final',
      attribution: {
        candidateTechniques: [],
        automaticTechnique: null,
        selectedTechnique: null,
        attributionEligibility: {
          status: 'ineligible',
          reason: 'undo_polluted',
        },
      },
    },
  });
  expect(
    project([first, second, invalidation]).groups[0].representativeSampleId,
  ).toBeNull();
  second.request!.hintAssistance = {
    appliedSources: [],
    knownSources: [],
    affectedEffects: [],
    exposureComplete: false,
  };
  expect(project([first, second]).groups[0].representativeSampleId).toBeNull();
});

test('sessions do not share opportunity identities', () => {
  const foreign = record(2, [pair], { sessionId: 'foreign' });
  foreign.sessionId = 'foreign';
  expect(project([record(1), foreign]).memberships).toHaveLength(1);
});

test('one-hop single after an elimination is linked to the original opportunity', () => {
  const first = record(1, [
    { placements: [], eliminations: [{ cell: 2, digit: 1 }] },
  ]);
  const masks = [...first.request!.growthCandidates];
  masks[2] = 9; // 1,4 -> eliminate 1 -> naked single 4.
  first.request!.growthCandidates = masks;
  const after = [...masks];
  after[2] = 8;
  const placed = record(
    2,
    [{ placements: [{ cell: 2, digit: 4 }], eliminations: [] }],
    {
      growthCandidates: after,
      observedEffects: [{ kind: 'placement', cell: 2, digit: 4 }],
    },
  );
  const grouped = project([first, placed]);
  expect(grouped.groups).toHaveLength(1);
  expect(grouped.groups[0].sampleIds).toHaveLength(2);
});

const native = process.env.BEHAVIOR_NATIVE_REPLAY;
(native ? test : test.skip)(
  'real C++ evidence supports partial pair outcomes and survives JSON export',
  () => {
    const fixture = HINT_LAB_FIXTURES.find(
      f => f.techniqueCode === 'nakedPair',
    )!;
    expect(fixture.step.eliminations.length).toBeGreaterThan(1);
    const masks = [...fixture.candidateMasks];
    const records: BehaviorShadowRecord[] = [];
    for (const [i, effect] of fixture.step.eliminations.entries()) {
      const request = reviewRequest({
        requestId: `native-${i}`,
        segmentId: `native-${i}`,
        startingRevision: i,
        issuedRevision: i + 1,
        startingBoardFingerprint: fixture.boardFingerprint,
        expectedBoardFingerprint: fixture.boardFingerprint,
        givenCells: fixture.givenCells,
        growthCandidates: [...masks],
        observedEffects: [{ kind: 'elimination', ...effect }],
      });
      const run = spawnSync(
        native!,
        [
          request.startingBoardFingerprint,
          masks.join(','),
          fixture.givenCells.map(v => (v ? '1' : '0')).join(''),
          `e:${effect.cell}:${effect.digit}`,
        ],
        { encoding: 'utf8', timeout: 30_000 },
      );
      expect(run.status).toBe(0);
      const response = { ...request, ...JSON.parse(run.stdout) };
      expect(response.status).toBe('matched');
      expect(
        response.candidateTechniques.every(
          (c: { matchingOpportunities: unknown[] }) =>
            c.matchingOpportunities.length > 0,
        ),
      ).toBe(true);
      records.push(
        reviewRecord({
          recordId: `native-${i}`,
          recordedAtEpochMs: i,
          request,
          segmentId: request.segmentId,
          analysisDiagnostics: response.diagnostics,
          diagnostic: {
            segmentId: request.segmentId,
            finality: 'final',
            attribution: attributionFromAnalysis(response, request),
          },
        }),
      );
      masks[effect.cell] = removeCandidate(masks[effect.cell], effect.digit);
    }
    const grouped = project(JSON.parse(JSON.stringify(records)));
    expect(grouped.groups.filter(g => g.representativeSampleId)).toHaveLength(
      1,
    );
    expect(grouped.memberships.every(m => m.status === 'resolved')).toBe(true);
  },
);
