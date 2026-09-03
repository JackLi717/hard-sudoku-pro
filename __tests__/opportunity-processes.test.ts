import { spawnSync } from 'node:child_process';
import {
  buildOpportunityProcesses,
  verifyOpportunityProcesses,
} from '../src/application/technique-recognition/opportunity-processes';
import { BehaviorShadowRecord } from '../src/application/technique-recognition/shadow-controller';
import { singles } from '../src/application/technique-recognition/hint-assistance';
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

function withFinish(
  board: string,
  candidates: readonly number[],
  effects: readonly NormalizedPlayerEffect[],
  finish: NormalizedPlayerEffect,
  technique: TechniqueCode,
  givens?: readonly boolean[],
) {
  const records = sequence(board, candidates, effects, technique, givens);
  const last = sequence(
    board,
    candidates,
    [...effects, finish],
    technique,
    givens,
  ).at(-1)!;
  const q = last.request!;
  const response = native(q, 'hiddenSingle', refs([finish]));
  last.diagnostic!.attribution = attributionFromAnalysis(response, q);
  last.analysisDiagnostics = response.diagnostics;
  last.responseStatus = response.status;
  return [...records, last];
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
    test('a newly enabled single keeps its verified source rather than replacing it', async () => {
      const board = [...boardFromFingerprint(fixture.boardFingerprint)];
      for (const e of effects)
        if (e.kind === 'placement') board[e.cell] = e.digit;
      const legal = createSolverCandidates(board);
      const narrowed = fixture.candidateMasks.map((mask, cell) =>
        intersectCandidateMasks(mask, legal[cell]),
      );
      for (const e of effects)
        if (e.kind === 'elimination')
          narrowed[e.cell] = removeCandidate(narrowed[e.cell], e.digit);
      const before = singles(fixture.candidateMasks);
      const enabled = singles(narrowed).filter(
        e => !before.some(b => b.cell === e.cell && b.digit === e.digit),
      );
      // Not every directory fixture creates a one-hop single; do not invent one.
      if (!enabled.length) {
        expect(
          singles(narrowed).every(e =>
            before.some(b => b.cell === e.cell && b.digit === e.digit),
          ),
        ).toBe(true);
        return;
      }
      const finish = enabled[0];
      const records = withFinish(
        fixture.boardFingerprint,
        fixture.candidateMasks,
        effects,
        finish,
        fixture.techniqueCode,
        fixture.givenCells,
      );
      const graph = buildOpportunityProcesses(records, 'process-test');
      const seed = graph.processes.find(
        p =>
          p.anchor.startingRevision === 0 &&
          p.seedTechniques.includes(fixture.techniqueCode) &&
          keyForTest(p.evidence) === keyForTest(refs(effects)),
      )!;
      expect(seed).toBeDefined();
      expect(seed.followUps[0].prerequisite).toEqual({
        basis: 'observed_effects',
        effects,
      });
      const checked = await verifyOpportunityProcesses(
        { ...graph, processes: [seed] },
        { analyze: async q => native(q, fixture.techniqueCode, refs(effects)) },
      );
      const entry = checked.placementExplanations!.find(
        e => e.effect.cell === finish.cell && e.effect.digit === finish.digit,
      )!;
      expect(entry.dependencyStatus).toBe('observed');
      expect(entry.independentUse).toBe(false);
      expect(
        entry.paths[0].attribution.candidateTechniques.map(c => c.technique),
      ).toContain(fixture.techniqueCode);
      expect(entry.localAttribution).toEqual(
        records.at(-1)!.diagnostic!.attribution,
      );
    }, 30_000);
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

function keyForTest(e: TechniqueOpportunityEvidence) {
  return JSON.stringify([
    e.placements.map(p => `${p.cell}:${p.digit}`).sort(),
    e.eliminations.map(p => `${p.cell}:${p.digit}`).sort(),
  ]);
}

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

test('truncated graphs never publish defaults or invoke native verification', async () => {
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
  expect(verified.verification?.attempted).toBe(0);
});

test.each([0, 1, 128, 129, 257])(
  'verifies all %i processes in bounded batches without mutating input',
  async count => {
    const seed = buildOpportunityProcesses(pairRecords(), 'process-test')
      .processes[0];
    const report = {
      processes: Array.from({ length: count }, (_, i) => ({
        ...seed,
        id: `batch-${i}`,
      })),
      enumerationComplete: true,
      diagnostics: [],
    };
    const original = JSON.stringify(report);
    const analyze = jest.fn(async (q: GrowthAnalysisRequest) =>
      native(q, seed.seedTechniques[0], seed.evidence),
    );
    const checked = await verifyOpportunityProcesses(report, { analyze });
    expect(analyze).toHaveBeenCalledTimes(count);
    expect(checked.enumerationComplete).toBe(true);
    expect(checked.diagnostics).toEqual([]);
    expect(checked.processes.every(p => p.attribution !== null)).toBe(true);
    expect(checked.verification).toEqual({
      batchSize: 128,
      completedBatchSizes: Array.from(
        { length: Math.ceil(count / 128) },
        (_, i) => Math.min(128, count - i * 128),
      ),
      attempted: count,
      attributed: count,
    });
    expect(JSON.stringify(report)).toBe(original);
  },
);

test('a failed batch member does not prevent later batches from being verified', async () => {
  const seed = buildOpportunityProcesses(pairRecords(), 'process-test')
    .processes[0];
  const report = {
    processes: [seed, { ...seed, id: 'next-batch' }],
    enumerationComplete: true,
    diagnostics: [],
  };
  const analyze = jest.fn(async (q: GrowthAnalysisRequest) =>
    native(q, seed.seedTechniques[0], seed.evidence),
  );
  analyze.mockRejectedValueOnce(new Error('native timeout'));
  const checked = await verifyOpportunityProcesses(report, { analyze }, 1);
  expect(checked.processes[0].attribution).toBeNull();
  expect(checked.processes[1].attribution).not.toBeNull();
  expect(checked.verification).toMatchObject({
    completedBatchSizes: [1, 1],
    attempted: 2,
    attributed: 1,
  });
  expect(checked.diagnostics).toEqual([
    { sampleId: null, reason: 'verification_failed' },
  ]);
});

test('same source survives different per-request minimum costs', async () => {
  const seed = buildOpportunityProcesses(pairRecords(), 'process-test')
    .processes[0];
  const p = {
    ...seed,
    members: [
      {
        ...seed.members[0],
        effects: [
          { kind: 'placement' as const, cell: 65, digit: 8 as const },
          { kind: 'placement' as const, cell: 10, digit: 4 as const },
        ],
      },
    ],
    followUps: [],
  };
  let calls = 0;
  const checked = await verifyOpportunityProcesses(
    { processes: [p], diagnostics: [], enumerationComplete: true },
    {
      analyze: async q => ({
        ...q,
        status: 'matched',
        candidateTechniques: [
          {
            technique: seed.seedTechniques[0],
            humanCost: ++calls === 1 ? 2047 : 2048,
            matchingOpportunityCount: 1,
            matchingOpportunities: [seed.evidence],
            directPlacementMatch: false,
            oneHopPlacementMatch: true,
          },
        ],
        diagnostics: {
          opportunityCount: 1,
          opportunitySetComplete: true,
          usedExpandedSearch: false,
          reachedEnumerationLimitTechniques: [],
        },
      }),
    },
  );
  expect(calls).toBe(2);
  expect(checked.verification?.attributed).toBe(1);
  expect(
    checked.processes[0].attribution?.candidateTechniques[0].humanCost,
  ).toBe(2048);
});

test.each([0, -1, 129, 1.5, NaN])(
  'rejects invalid batch size %s',
  async size => {
    const analyze = jest.fn();
    await expect(
      verifyOpportunityProcesses(
        { processes: [], enumerationComplete: true, diagnostics: [] },
        { analyze },
        size,
      ),
    ).rejects.toThrow('batchSize');
    expect(analyze).not.toHaveBeenCalled();
  },
);

const nativeTest = process.env.BEHAVIOR_NATIVE_REPLAY ? test : test.skip;
test.each([false, true])(
  'every newly derived finish must pass verification, failLast=%s',
  async failLast => {
    const fixture = HINT_LAB_FIXTURES.find(
      f => f.techniqueCode === 'remotePair',
    )!;
    const effects: NormalizedPlayerEffect[] = fixture.step.eliminations.map(
      e => ({ kind: 'elimination', ...e }),
    );
    const finishes: NormalizedPlayerEffect[] = [
      { kind: 'placement', cell: 59, digit: 3 },
      { kind: 'placement', cell: 77, digit: 4 },
    ];
    const records = withFinish(
      fixture.boardFingerprint,
      fixture.candidateMasks,
      effects,
      finishes[0],
      fixture.techniqueCode,
      fixture.givenCells,
    );
    const last = sequence(
      fixture.boardFingerprint,
      fixture.candidateMasks,
      [...effects, ...finishes],
      fixture.techniqueCode,
      fixture.givenCells,
    ).at(-1)!;
    const response = native(last.request!, 'hiddenSingle', refs([finishes[1]]));
    last.diagnostic!.attribution = attributionFromAnalysis(
      response,
      last.request!,
    );
    last.analysisDiagnostics = response.diagnostics;
    last.responseStatus = response.status;
    records.push(last);
    const graph = buildOpportunityProcesses(records, 'process-test');
    const seed = graph.processes.find(
      p =>
        p.anchor.startingRevision === 0 &&
        p.seedTechniques.includes('remotePair'),
    )!;
    expect(seed.followUps).toHaveLength(2);
    const analyze = jest.fn(async (q: GrowthAnalysisRequest) => {
      expect(q.startingBoardFingerprint).toBe(fixture.boardFingerprint);
      expect(q.growthCandidates).toEqual(fixture.candidateMasks);
      expect(q.observedEffects.filter(e => e.kind === 'elimination')).toEqual(
        effects,
      );
      expect(
        q.observedEffects.filter(e => e.kind === 'placement'),
      ).toHaveLength(1);
      if (failLast && q.observedEffects.at(-1)!.cell === 77)
        throw new Error('last finish failed');
      return native(q, 'remotePair', refs(effects));
    });
    const checked = await verifyOpportunityProcesses(
      { ...graph, processes: [seed] },
      { analyze },
    );
    expect(analyze).toHaveBeenCalledTimes(2);
    if (failLast) {
      expect(checked.processes[0].attribution).toBeNull();
      expect(
        checked.placementExplanations!.every(
          e => e.dependencyStatus === 'unverified' && e.independentUse === null,
        ),
      ).toBe(true);
    } else {
      expect(checked.placementExplanations).toHaveLength(2);
      expect(
        checked.placementExplanations!.every(
          e => e.dependencyStatus === 'observed' && e.independentUse === false,
        ),
      ).toBe(true);
    }
  },
);

const dependencyBoard =
  '001800045005700902003060000800000000004300500057986204000290000500600021302107800';
function dependencyCandidates() {
  const masks = [
    ...createSolverCandidates(boardFromFingerprint(dependencyBoard)),
  ];
  for (const cell of [55, 64, 23, 14, 5])
    masks[cell] = removeCandidate(masks[cell], 8);
  masks[73] = removeCandidate(masks[73], 9);
  return masks;
}
const dependencyEffects: NormalizedPlayerEffect[] = [
  { kind: 'elimination', cell: 16, digit: 1 },
  { kind: 'elimination', cell: 16, digit: 8 },
  { kind: 'elimination', cell: 6, digit: 7 },
];
const dependencyFinish: NormalizedPlayerEffect = {
  kind: 'placement',
  cell: 10,
  digit: 8,
};
function dependencyRecords() {
  return withFinish(
    dependencyBoard,
    dependencyCandidates(),
    dependencyEffects,
    dependencyFinish,
    'hiddenPair',
  );
}

nativeTest(
  'real R2C2 =8 retains its observed hidden-pair source and local hidden single',
  async () => {
    const records = dependencyRecords();
    const original = JSON.stringify(records);
    const graph = buildOpportunityProcesses(records, 'process-test');
    const checked = await verifyOpportunityProcesses(graph, {
      analyze: async q => native(q, 'hiddenPair', refs(dependencyEffects)),
    });
    const entry = checked.placementExplanations!.find(
      e => e.effect.cell === 10,
    )!;
    expect(entry.localAttribution.automaticTechnique).toBe('hiddenSingle');
    expect(entry.dependencyStatus).toBe('observed');
    expect(entry.independentUse).toBe(false);
    const source = entry.paths.find(p => p.startingRevision === 0)!;
    expect(source.attribution.automaticTechnique).toBe('hiddenPair');
    expect(source.prerequisite).toEqual({
      basis: 'observed_effects',
      effects: dependencyEffects,
    });
    expect(entry.paths.length).toBeGreaterThan(1); // Competing source opportunities are not merged.
    expect(
      entry.paths.some(p => p.attribution.automaticTechnique === 'nakedQuad'),
    ).toBe(false);
    const quad = checked.processes.find(p =>
      p.seedTechniques.includes('nakedQuad'),
    )!;
    expect(quad.followUps[0].prerequisite.basis).toBe('already_available');
    expect(JSON.stringify(records)).toBe(original);
  },
);

nativeTest(
  'a skipped elimination remains possible mental work, not observed source evidence',
  async () => {
    const records = withFinish(
      dependencyBoard,
      dependencyCandidates(),
      dependencyEffects.slice(0, 1),
      dependencyFinish,
      'hiddenPair',
    );
    const graph = buildOpportunityProcesses(records, 'process-test');
    const source = graph.processes.find(
      p =>
        p.anchor.startingRevision === 0 &&
        p.seedTechniques.includes('hiddenPair'),
    )!;
    expect(source.followUps[0].prerequisite).toEqual({
      basis: 'unobserved_effects',
      effects: [],
    });
    const checked = await verifyOpportunityProcesses(
      { ...graph, processes: [source] },
      { analyze: async q => native(q, 'hiddenPair', refs(dependencyEffects)) },
    );
    expect(checked.placementExplanations![0]).toMatchObject({
      dependencyStatus: 'possible',
      independentUse: null,
    });
    expect(source.observedEffects).toHaveLength(1);
  },
);

nativeTest.each(['hint', 'undo', 'missing', 'native_failure'] as const)(
  '%s cannot promote a prerequisite into verified independent attribution',
  async kind => {
    const records = dependencyRecords();
    if (kind === 'missing') records.splice(1, 1);
    if (kind === 'hint')
      records.at(-1)!.request!.hintAssistance!.affectedEffects = [
        dependencyFinish,
      ];
    if (kind === 'undo')
      records.push({
        recordId: 'undo-boundary',
        phase: 'invalidation',
        recordedAtEpochMs: 12_000,
        sessionId: 'process-test',
        segmentId: records[0].segmentId,
        request: null,
        sourceCommandType: 'undo',
        responseStatus: null,
        analysisDiagnostics: null,
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
    const graph = buildOpportunityProcesses(records, 'process-test');
    const checked = await verifyOpportunityProcesses(graph, {
      analyze: async q => {
        if (kind === 'native_failure') throw new Error('native timeout');
        return native(q, 'hiddenPair', refs(dependencyEffects));
      },
    });
    expect(
      checked.placementExplanations!.every(e => e.independentUse === null),
    ).toBe(true);
    if (kind === 'native_failure')
      expect(checked.placementExplanations![0].dependencyStatus).toBe(
        'unverified',
      );
  },
);

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
