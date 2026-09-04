import { spawnSync } from 'node:child_process';
import { verifyReasoningStages } from '../src/application/technique-recognition/reasoning-stages';
import { OpportunityProcessReport } from '../src/application/technique-recognition/opportunity-processes';
import { singles } from '../src/application/technique-recognition/hint-assistance';
import { HINT_LAB_FIXTURES, HintLabFixture } from '../src/debug/hint-lab';
import {
  boardFromFingerprint,
  createBoardFingerprint,
  createSolverCandidates,
  intersectCandidateMasks,
  removeCandidate,
} from '../src/domain/sudoku/board';
import {
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  NormalizedPlayerEffect,
  attributionFromAnalysis,
} from '../src/domain/technique-recognition/contracts';

function scenario(fixture: HintLabFixture, observed = true) {
  const effects: NormalizedPlayerEffect[] = [
    ...fixture.step.placements.map(e => ({ ...e, kind: 'placement' as const })),
    ...fixture.step.eliminations.map(e => ({
      ...e,
      kind: 'elimination' as const,
    })),
  ];
  const board = [...boardFromFingerprint(fixture.boardFingerprint)];
  for (const e of fixture.step.placements) board[e.cell] = e.digit;
  const legal = createSolverCandidates(board);
  const masks = fixture.candidateMasks.map((m, c) =>
    intersectCandidateMasks(m, legal[c]),
  );
  for (const e of fixture.step.eliminations)
    masks[e.cell] = removeCandidate(masks[e.cell], e.digit);
  const before = singles(fixture.candidateMasks);
  const finishes = singles(masks).filter(
    e => !before.some(b => b.cell === e.cell && b.digit === e.digit),
  );
  const q: GrowthAnalysisRequest = {
    sessionId: 'stages',
    segmentId: 'stages:segment-1',
    requestId: 'root',
    startingRevision: 1,
    issuedRevision: 2,
    startingBoardFingerprint: fixture.boardFingerprint,
    expectedBoardFingerprint: createBoardFingerprint(board),
    growthCandidates: fixture.candidateMasks,
    givenCells: fixture.givenCells,
    observedEffects: effects,
    hintAssistance: {
      exposureComplete: true,
      appliedSources: [],
      knownSources: [],
      affectedEffects: [],
    },
  };
  const analyze = async (
    request: GrowthAnalysisRequest,
  ): Promise<GrowthAnalysisResponse> => {
    const executable = process.env.BEHAVIOR_NATIVE_REPLAY;
    if (executable) {
      const run = spawnSync(
        executable,
        [
          request.startingBoardFingerprint,
          request.growthCandidates.join(','),
          request.givenCells.map(v => (v ? '1' : '0')).join(''),
          request.observedEffects
            .map(
              e => `${e.kind === 'placement' ? 'p' : 'e'}:${e.cell}:${e.digit}`,
            )
            .join(','),
        ],
        { encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024 },
      );
      if (run.status !== 0) throw Error(run.stderr || run.error?.message);
      return { ...request, ...JSON.parse(run.stdout) };
    }
    const finish = request.requestId.includes(':finish-');
    return {
      ...request,
      status: 'matched',
      candidateTechniques: [
        {
          technique: finish ? 'hiddenSingle' : fixture.techniqueCode,
          humanCost: finish ? 100 : 2000,
          directPlacementMatch: finish || fixture.step.placements.length > 0,
          oneHopPlacementMatch: false,
          matchingOpportunityCount: 1,
          matchingOpportunities: [
            {
              placements: fixture.step.placements,
              eliminations: fixture.step.eliminations,
            },
          ],
        },
      ],
      diagnostics: {
        opportunityCount: 1,
        opportunitySetComplete: true,
        usedExpandedSearch: false,
        reachedEnumerationLimitTechniques: [],
      },
    };
  };
  const report = async (): Promise<OpportunityProcessReport> => {
    const attribution = attributionFromAnalysis(await analyze(q), q);
    return {
      enumerationComplete: true,
      diagnostics: [],
      verification: {
        attempted: 1,
        attributed: 1,
        batchSize: 128,
        completedBatchSizes: [1],
      },
      processes: [
        {
          id: fixture.id,
          anchor: q,
          evidence: {
            placements: fixture.step.placements,
            eliminations: fixture.step.eliminations,
          },
          seedTechniques: [fixture.techniqueCode],
          members: [
            {
              sampleId: 'move',
              effects: [...(observed ? effects : []), ...finishes],
              locallyMatched: true,
              localAttribution: attribution,
            },
          ],
          followUps: finishes.map(effect => ({
            sampleId: 'move',
            effect,
            relation: 'new_single',
            prerequisite: {
              basis: observed ? 'observed_effects' : 'unobserved_effects',
              effects: observed ? effects : [],
            },
          })),
          observedEffects: observed ? effects : [],
          remainingEffects: observed ? [] : effects,
          completion: observed ? 'complete' : 'partial',
          endedBy: null,
          overlaps: [],
          attribution,
        },
      ],
    };
  };
  return { report, analyze, finishes };
}

test.each(HINT_LAB_FIXTURES)(
  'separates direct source and finishes without technique-specific branches: $techniqueCode',
  async fixture => {
    const s = scenario(fixture),
      report = await s.report(),
      original = JSON.stringify(report);
    const result = await verifyReasoningStages(report, { analyze: s.analyze });
    expect(result.diagnostics).toEqual([]);
    const p = result.processes[0];
    expect(
      p.source.attribution.candidateTechniques.map(c => c.technique),
    ).toContain(fixture.techniqueCode);
    expect(p.source.unobservedEffects).toEqual([]);
    expect(p.finishes).toHaveLength(s.finishes.length);
    for (const f of p.finishes) {
      expect(f.stage.actionKind).toBe('placement');
      expect(['fullHouse', 'nakedSingle', 'hiddenSingle']).toContain(
        f.stage.attribution.automaticTechnique,
      );
      expect(f.dependency).toBe('observed');
      expect(f.independentUse).toBe(false);
    }
    expect(JSON.stringify(report)).toBe(original);
  },
  30000,
);

const withFinish = HINT_LAB_FIXTURES.find(
  f => f.step.eliminations.length && scenario(f).finishes.length,
)!;
test('omitted eliminations remain hypothetical, not fabricated observed actions', async () => {
  const s = scenario(withFinish, false),
    result = await verifyReasoningStages(await s.report(), {
      analyze: s.analyze,
    });
  expect(result.processes[0].source.observedEffects).toEqual([]);
  expect(result.processes[0].source.unobservedEffects.length).toBeGreaterThan(
    0,
  );
  expect(result.processes[0].finishes.length).toBeGreaterThan(0);
  expect(
    result.processes[0].finishes.every(
      f => f.dependency === 'possible' && f.independentUse === null,
    ),
  ).toBe(true);
});

test.each(['hint', 'incomplete', 'unverified'] as const)(
  '%s cannot publish independent staged reasoning',
  async reason => {
    const s = scenario(withFinish),
      report = await s.report();
    if (reason === 'hint')
      report.processes[0].anchor.hintAssistance!.affectedEffects =
        report.processes[0].anchor.observedEffects;
    if (reason === 'incomplete') report.enumerationComplete = false;
    if (reason === 'unverified') delete report.verification;
    const analyze = jest.fn(s.analyze);
    expect(
      (await verifyReasoningStages(report, { analyze })).processes,
    ).toEqual([]);
    expect(analyze).not.toHaveBeenCalled();
  },
);

test.each(['identity', 'enumeration', 'wrong_source', 'wrong_finish'])(
  'fails closed on %s',
  async fault => {
    const s = scenario(withFinish),
      report = await s.report();
    const result = await verifyReasoningStages(report, {
      analyze: async q => {
        const r = await s.analyze(q);
        if (fault === 'identity') r.requestId = 'foreign';
        if (fault === 'enumeration')
          r.diagnostics.opportunitySetComplete = false;
        if (fault === 'wrong_source')
          r.candidateTechniques = r.candidateTechniques.map(c => ({
            ...c,
            matchingOpportunities: [],
          }));
        if (fault === 'wrong_finish' && q.requestId.includes(':finish-'))
          r.candidateTechniques = r.candidateTechniques.map(c => ({
            ...c,
            directPlacementMatch: false,
          }));
        return r;
      },
    });
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.processes.flatMap(p => p.finishes)).toEqual([]);
  },
);
