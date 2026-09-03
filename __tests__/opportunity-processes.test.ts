import { spawnSync } from 'node:child_process';
import {
  buildOpportunityProcesses,
  verifyOpportunityProcesses,
} from '../src/application/technique-recognition/opportunity-processes';
import { BehaviorShadowRecord } from '../src/application/technique-recognition/shadow-controller';
import { HINT_LAB_FIXTURES } from '../src/debug/hint-lab';
import { TECHNIQUES, TechniqueCode } from '../src/domain/hints/techniques';
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
  TechniqueOpportunityEvidence,
  attributionFromAnalysis,
} from '../src/domain/technique-recognition/contracts';

const cache = new Map<
  string,
  Omit<GrowthAnalysisResponse, keyof GrowthAnalysisRequest>
>();
function native(
  q: GrowthAnalysisRequest,
  technique: TechniqueCode,
  evidence: TechniqueOpportunityEvidence,
): GrowthAnalysisResponse {
  const executable = process.env.BEHAVIOR_NATIVE_REPLAY;
  if (!executable)
    return {
      ...q,
      status: 'matched',
      candidateTechniques: [
        {
          technique,
          humanCost: 10,
          matchingOpportunityCount: 1,
          matchingOpportunities: [evidence],
          directPlacementMatch: false,
          oneHopPlacementMatch: false,
        },
      ],
      diagnostics: {
        opportunityCount: 1,
        opportunitySetComplete: true,
        usedExpandedSearch: false,
        reachedEnumerationLimitTechniques: [],
      },
    };
  const args = [
    q.startingBoardFingerprint,
    q.growthCandidates.join(','),
    q.givenCells.map(v => (v ? '1' : '0')).join(''),
    q.observedEffects
      .map(e => `${e.kind === 'placement' ? 'p' : 'e'}:${e.cell}:${e.digit}`)
      .join(','),
  ];
  const k = JSON.stringify(args);
  if (!cache.has(k)) {
    const run = spawnSync(executable, args, {
      encoding: 'utf8',
      timeout: 30_000,
    });
    if (run.status !== 0) throw new Error(run.stderr || run.error?.message);
    cache.set(k, JSON.parse(run.stdout));
  }
  return { ...q, ...cache.get(k)! };
}

const refs = (
  effects: readonly NormalizedPlayerEffect[],
): TechniqueOpportunityEvidence => ({
  placements: effects
    .filter(e => e.kind === 'placement')
    .map(({ cell, digit }) => ({ cell, digit })),
  eliminations: effects
    .filter(e => e.kind === 'elimination')
    .map(({ cell, digit }) => ({ cell, digit })),
});

function sequence(
  boardFingerprint: string,
  masks: readonly number[],
  effects: readonly NormalizedPlayerEffect[],
  technique: TechniqueCode,
  givens?: readonly boolean[],
) {
  const board = [...boardFromFingerprint(boardFingerprint)];
  const givenCells = givens ?? board.map(v => v !== null);
  let candidates = [...masks];
  return effects.map((effect, index): BehaviorShadowRecord => {
    const startingBoardFingerprint = createBoardFingerprint(board);
    const growthCandidates = [...candidates];
    if (effect.kind === 'placement') board[effect.cell] = effect.digit;
    const legal = createSolverCandidates(board);
    candidates = candidates.map((m, cell) =>
      intersectCandidateMasks(m, legal[cell]),
    );
    if (effect.kind === 'elimination')
      candidates[effect.cell] = removeCandidate(
        candidates[effect.cell],
        effect.digit,
      );
    const request: GrowthAnalysisRequest = {
      sessionId: 'process-test',
      segmentId: `run:segment-${index}`,
      requestId: `request-${index}`,
      startingRevision: index * 3,
      issuedRevision: index * 3 + 1,
      startingBoardFingerprint,
      expectedBoardFingerprint: createBoardFingerprint(board),
      growthCandidates,
      givenCells,
      observedEffects: [effect],
      hintAssistance: {
        exposureComplete: true,
        appliedSources: [],
        knownSources: [],
        affectedEffects: [],
      },
    };
    const response = native(request, technique, refs(effects.slice(index)));
    return {
      recordId: `record-${index}`,
      recordedAtEpochMs: index * 5000,
      phase: 'result',
      sessionId: request.sessionId,
      segmentId: request.segmentId,
      sourceCommandType: 'input_digit',
      request,
      responseStatus: response.status,
      analysisDiagnostics: response.diagnostics,
      diagnostic: {
        segmentId: request.segmentId,
        finality: 'final',
        attribution: attributionFromAnalysis(response, request),
      },
    };
  });
}

test('the acceptance matrix exactly covers the current 39-technique catalog', () => {
  expect(HINT_LAB_FIXTURES.map(f => f.techniqueCode)).toEqual(
    TECHNIQUES.map(t => t.code),
  );
  expect(TECHNIQUES).toHaveLength(39);
});

describe.each(HINT_LAB_FIXTURES)(
  '$techniqueCode generic process association',
  fixture => {
    const effects: NormalizedPlayerEffect[] = [
      ...fixture.step.eliminations.map(e => ({
        kind: 'elimination' as const,
        ...e,
      })),
      ...fixture.step.placements.map(e => ({
        kind: 'placement' as const,
        ...e,
      })),
    ];
    test('a partial execution never invents the unperformed eliminations', () => {
      const records = sequence(
        fixture.boardFingerprint,
        fixture.candidateMasks,
        effects,
        fixture.techniqueCode,
        fixture.givenCells,
      ).slice(0, 1);
      const report = buildOpportunityProcesses(records, 'process-test');
      const seed = report.processes.find(
        p =>
          p.seedTechniques.includes(fixture.techniqueCode) &&
          p.evidence.eliminations.length + p.evidence.placements.length ===
            effects.length,
      )!;
      expect(seed).toBeDefined();
      expect(seed.observedEffects).toHaveLength(1);
      expect(seed.remainingEffects).toHaveLength(effects.length - 1);
      expect(seed.completion).toBe(
        effects.length === 1 ? 'complete' : 'partial',
      );
    });
    test.each(['forward', 'reverse', 'rotate'] as const)(
      '%s preserves the complete seed opportunity',
      async order => {
        const ordered =
          order === 'forward'
            ? effects
            : order === 'reverse'
            ? [...effects].reverse()
            : [...effects.slice(1), effects[0]];
        const records = sequence(
          fixture.boardFingerprint,
          fixture.candidateMasks,
          ordered,
          fixture.techniqueCode,
          fixture.givenCells,
        );
        const original = JSON.stringify(records);
        const report = buildOpportunityProcesses(records, 'process-test');
        expect(report.diagnostics).toEqual([]);
        const seed = report.processes.find(
          p =>
            p.seedTechniques.includes(fixture.techniqueCode) &&
            p.evidence.eliminations.length ===
              effects.filter(e => e.kind === 'elimination').length &&
            p.evidence.placements.length ===
              effects.filter(e => e.kind === 'placement').length &&
            p.completion === 'complete',
        );
        expect(seed).toBeDefined();
        expect(seed!.members).toHaveLength(effects.length);
        expect(seed!.observedEffects).toHaveLength(effects.length);
        const verified = await verifyOpportunityProcesses(
          { ...report, processes: [seed!] },
          {
            analyze: async q => native(q, fixture.techniqueCode, refs(effects)),
          },
        );
        expect(
          verified.processes[0].attribution?.candidateTechniques.map(
            c => c.technique,
          ),
        ).toContain(fixture.techniqueCode);
        expect(
          verified.processes[0].attribution?.attributionEligibility.status,
        ).toBe('eligible');
        expect(JSON.stringify(records)).toBe(original);
      },
      30_000,
    );
  },
);

const pairFixture = HINT_LAB_FIXTURES.find(
  f => f.techniqueCode === 'nakedPair',
)!;
const pairEffects = pairFixture.step.eliminations.map(e => ({
  kind: 'elimination' as const,
  ...e,
}));
const pairRecords = () =>
  sequence(
    pairFixture.boardFingerprint,
    pairFixture.candidateMasks,
    pairEffects,
    'nakedPair',
  );

test.each([
  'observer',
  'restored_candidate',
  'hint',
  'unfinished',
  'incomplete',
  'undo',
] as const)(
  '%s boundary prevents association across unreliable evidence',
  kind => {
    const records = pairRecords();
    const second = records[1];
    if (kind === 'observer')
      second.request!.segmentId = second.segmentId = 'other-run:segment-1';
    if (kind === 'restored_candidate')
      second.request!.growthCandidates = records[0].request!.growthCandidates;
    if (kind === 'hint')
      second.request!.hintAssistance!.exposureComplete = false;
    if (kind === 'unfinished') second.diagnostic = null;
    if (kind === 'incomplete')
      second.analysisDiagnostics!.opportunitySetComplete = false;
    if (kind === 'undo')
      records.push({
        ...records[0],
        recordId: 'undo',
        recordedAtEpochMs: 2500,
        phase: 'invalidation',
        request: null,
        diagnostic: {
          segmentId: records[0].segmentId,
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
    const report = buildOpportunityProcesses(records, 'process-test');
    expect(report.processes.every(p => p.members.length < 2)).toBe(true);
    expect(report.diagnostics.length).toBeGreaterThan(0);
  },
);

test('process and native limits never publish defaults from a truncated graph', async () => {
  const records = pairRecords();
  const another = JSON.parse(
    JSON.stringify(records[0]),
  ) as BehaviorShadowRecord;
  another.request = {
    ...another.request!,
    requestId: 'other',
    segmentId: 'another:segment-1',
    startingRevision: 100,
    issuedRevision: 101,
  };
  another.segmentId = another.request.segmentId;
  another.recordId = 'another';
  another.recordedAtEpochMs = 100_000;
  another.diagnostic!.segmentId = another.segmentId;
  records.push(another);
  const report = buildOpportunityProcesses(records, 'process-test', 1);
  expect(report.enumerationComplete).toBe(false);
  const analyze = jest.fn();
  const verified = await verifyOpportunityProcesses(report, { analyze });
  expect(analyze).not.toHaveBeenCalled();
  expect(verified.processes.every(p => p.attribution === null)).toBe(true);
  const nativeLimited = await verifyOpportunityProcesses(
    buildOpportunityProcesses(records, 'process-test'),
    { analyze },
    1,
  );
  expect(nativeLimited.enumerationComplete).toBe(false);
  expect(analyze).not.toHaveBeenCalled();
});

const nativeTest = process.env.BEHAVIOR_NATIVE_REPLAY ? test : test.skip;
nativeTest.each(['eliminate_then_fill', 'fill_then_eliminate'] as const)(
  'real column-eight %s retains the complete opportunity without a technique special case',
  async order => {
    const board =
      '008002049060310000000000030300074000007001900106020500000000405920000000000000607';
    const candidates = [...createSolverCandidates(boardFromFingerprint(board))];
    for (const cell of [16, 34, 43])
      candidates[cell] = removeCandidate(candidates[cell], 2);
    const deletions: NormalizedPlayerEffect[] = [
      { kind: 'elimination', cell: 16, digit: 8 },
      { kind: 'elimination', cell: 52, digit: 8 },
      { kind: 'elimination', cell: 61, digit: 8 },
      { kind: 'elimination', cell: 61, digit: 1 },
      { kind: 'elimination', cell: 79, digit: 8 },
      { kind: 'elimination', cell: 79, digit: 1 },
    ];
    const placements: NormalizedPlayerEffect[] = [
      { kind: 'placement', cell: 52, digit: 7 },
      { kind: 'placement', cell: 16, digit: 5 },
    ];
    const effects =
      order === 'eliminate_then_fill'
        ? [...deletions, ...placements]
        : [...placements, ...deletions.slice(2)];
    const records = sequence(board, candidates, effects, 'nakedTriple');
    const graph = buildOpportunityProcesses(records, 'process-test');
    expect(graph.diagnostics).toEqual([]);
    const seed = graph.processes.find(
      p =>
        p.anchor.startingRevision === 0 &&
        p.seedTechniques.includes('nakedTriple') &&
        p.evidence.eliminations.length === 6,
    )!;
    expect(seed).toBeDefined();
    expect(seed.members).toHaveLength(effects.length);
    expect(seed.followUps.map(f => f.effect)).toEqual(placements);
    expect(
      seed.followUps.every(f => f.relation === 'already_available_single'),
    ).toBe(true);
    expect(seed.observedEffects).toHaveLength(
      order === 'eliminate_then_fill' ? 6 : 4,
    );
    expect(seed.completion).toBe(
      order === 'eliminate_then_fill' ? 'complete' : 'partial',
    );
    const checked = await verifyOpportunityProcesses(
      { ...graph, processes: [seed] },
      { analyze: async q => native(q, 'nakedTriple', refs(deletions)) },
    );
    expect(
      checked.processes[0].attribution?.candidateTechniques.map(
        c => c.technique,
      ),
    ).toContain('nakedTriple');
    if (order === 'eliminate_then_fill') {
      expect(checked.processes[0].attribution?.automaticTechnique).toBe(
        'hiddenQuad',
      );
      // Smaller competing explanations stay separate, even though they overlap.
      expect(seed.overlaps.length).toBeGreaterThan(0);
      expect(
        graph.processes.filter(
          p =>
            p.seedTechniques.includes('hiddenPair') &&
            p.evidence.eliminations.length < 6,
        ).length,
      ).toBeGreaterThan(0);
    }
  },
  30_000,
);

test.each(['wrong_identity', 'incomplete', 'failed'] as const)(
  'native %s cannot publish an overall explanation',
  async kind => {
    const records = pairRecords();
    const report = buildOpportunityProcesses(records, 'process-test');
    const verified = await verifyOpportunityProcesses(report, {
      analyze: async q => {
        const response = native(q, 'nakedPair', refs(pairEffects));
        if (kind === 'wrong_identity') response.requestId = 'foreign';
        if (kind === 'incomplete')
          response.diagnostics = {
            ...response.diagnostics,
            opportunitySetComplete: false,
          };
        if (kind === 'failed') throw new Error('unavailable');
        return response;
      },
    });
    expect(verified.processes.every(p => p.attribution === null)).toBe(true);
    expect(verified.diagnostics.length).toBeGreaterThan(0);
  },
);
