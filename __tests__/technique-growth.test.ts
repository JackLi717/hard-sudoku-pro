import { GameMove, GameSession } from '../src/domain/game/contracts';
import { boardFromFingerprint } from '../src/domain/sudoku/board';
import {
  buildOpportunityProcesses,
  verifyOpportunityProcesses,
} from '../src/application/technique-recognition/opportunity-processes';
import { projectGrowthSession } from '../src/application/technique-growth/projector';
import {
  buildGrowthViewModel,
  growthWindows,
} from '../src/application/technique-growth/view-model';
import { locateGrowthReference } from '../src/application/technique-growth/replay-reference';
import { buildSessionReplay } from '../src/application/game/session-replay';
import { GrowthSession } from '../src/application/technique-growth/contracts';
import { TechniqueGrowthController } from '../src/application/technique-growth/controller';
import { GrowthStore } from '../src/data/user/technique-growth-repository';
import { teachingFixture } from './helpers/replay';
import {
  processReviewRecords,
  processResponse,
} from './helpers/process-review';

function processFixture() {
  const shadow = processReviewRecords();
  // Exclude a distinct overlapping candidate in this unambiguous fixture.
  shadow.forEach(r => {
    r.diagnostic!.attribution.candidateTechniques =
      r.diagnostic!.attribution.candidateTechniques.slice(0, 1);
  });
  const base = teachingFixture().session;
  const history: GameMove[] = shadow.map((r, i) => {
    const e = r.request!.observedEffects[0];
    return {
      ...base.history[0],
      id: `m${i}`,
      sessionId: 'review-game',
      sequence: i + 1,
      kind: e.kind === 'placement' ? 'place_value' : 'edit_manual_candidate',
      cell: e.cell,
      digit: e.digit,
      createdAtEpochMs: 100 + i,
      before: {
        ...base.history[0].before,
        values: boardFromFingerprint(r.request!.startingBoardFingerprint),
      },
      after: {
        ...base.history[0].after,
        values: boardFromFingerprint(r.request!.expectedBoardFingerprint),
      },
    };
  });
  const session: GameSession = {
    state: {
      ...base.state,
      sessionId: 'review-game',
      givens: boardFromFingerprint(shadow[0].request!.startingBoardFingerprint),
      hintExposures: [],
      hintUseCount: 0,
    },
    history,
    replayEvents: history.map((m, i) => ({
      id: `e${i}`,
      sessionId: 'review-game',
      previousRevision: i * 2,
      revision: i * 2 + 1,
      kind: 'input_digit',
      move: m,
      targetMoveId: null,
      hint: null,
      before: m.before,
      after: m.after,
      createdAtEpochMs: m.createdAtEpochMs,
    })),
  };
  return { session, shadow };
}
async function projected() {
  const { session, shadow } = processFixture();
  const report = await verifyOpportunityProcesses(
    buildOpportunityProcesses(shadow, 'review-game'),
    { analyze: async r => processResponse(r) },
  );
  return {
    session,
    shadow,
    report,
    projection: projectGrowthSession(session, shadow, [], report, 200),
  };
}

test('complete process deduplicates repeated deletions and dependent single finishes', async () => {
  const { projection } = await projected();
  expect(projection.records.filter(r => r.kind === 'application')).toHaveLength(
    1,
  );
  expect(
    projection.records.find(r => r.kind === 'application')?.technique,
  ).toBe('hiddenPair');
  expect(
    projection.records.filter(
      r => r.kind === 'application' && r.technique === 'hiddenSingle',
    ),
  ).toHaveLength(0);
});
test('recalculation is deterministic, repeat puzzle does not increase diversity', async () => {
  const { session, shadow, report, projection } = await projected();
  expect(
    projectGrowthSession(session, shadow, [], report, 999).records,
  ).toEqual(projection.records);
  const second = {
    ...projection,
    sessionId: 'repeat',
    records: projection.records.map(r => ({
      ...r,
      id: `repeat:${r.id}`,
      reference: { ...r.reference, sessionId: 'repeat' },
    })),
  };
  const profile = buildGrowthViewModel([projection, second]).profiles.find(
    p => p.technique === 'hiddenPair',
  )!;
  expect(profile.applications).toBe(2);
  expect(profile.puzzles).toBe(1);
  expect(profile.milestones.some(m => m.kind === 'diversity')).toBe(false);
});
test('hint pollution, ambiguous overlap, missing evidence and undo cannot grant applications', async () => {
  const { session, shadow, report } = await projected();
  for (const variant of ['hint', 'overlap', 'incomplete', 'undo']) {
    const altered = structuredClone(report);
    if (variant === 'hint')
      altered.processes.forEach(p => {
        p.attribution = {
          ...p.attribution!,
          automaticTechnique: null,
          selectedTechnique: null,
          attributionEligibility: {
            status: 'ineligible',
            reason: 'hint_polluted',
          },
        };
      });
    if (variant === 'overlap')
      altered.processes.forEach(p => p.overlaps.push('other'));
    if (variant === 'incomplete') altered.enumerationComplete = false;
    const source = variant === 'undo' ? { ...session, history: [] } : session;
    expect(
      projectGrowthSession(source, shadow, [], altered, 200).records.filter(
        r => r.kind === 'application',
      ),
    ).toHaveLength(0);
  }
});
test('hints survive undo and missing timestamps are not backfilled; later learning uses its real date', () => {
  const { session, step } = teachingFixture();
  const source = {
    ...session,
    history: [],
    state: {
      ...session.state,
      hintUseCount: 1,
      hintExposures: [{ step, candidates: Array(81).fill(0) }],
    },
  };
  const completion = {
    id: 'learning',
    technique: step.techniqueCode,
    occurredAt: 9999,
    reference: { sessionId: session.state.sessionId, moveIds: ['m'] },
    explanationId: 'proof',
  };
  const p = projectGrowthSession(source, [], [completion], null, 20000);
  expect(p.records.find(r => r.kind === 'hint_viewed')?.occurredAt).toBeNull();
  expect(p.records.find(r => r.kind === 'walkthrough')?.occurredAt).toBe(9999);
  expect(
    buildGrowthViewModel([p]).profiles.find(t => t.technique === 'fullHouse')
      ?.learningSessions,
  ).toBe(1);
  expect(p.records.some(r => r.kind === 'unknown')).toBe(true);
});
test('20-game windows retain missing games and exclude failed/abandoned games', async () => {
  const { projection } = await projected();
  const sessions: GrowthSession[] = Array.from({ length: 23 }, (_, i) => ({
    ...projection,
    sessionId: `s${i}`,
    endedAt: i,
    status: i >= 20 ? 'abandoned' : 'completed',
    coverage: i === 19 ? 'incomplete' : 'complete',
  }));
  const vm = buildGrowthViewModel(sessions);
  const windows = growthWindows(vm, 'hiddenPair');
  expect(windows.map(w => w.sessions)).toEqual([10, 10]);
  expect(windows.map(w => w.covered)).toEqual([9, 10]);
  expect(windows[0].to).toBe(19);
  expect(
    growthWindows(buildGrowthViewModel(sessions.slice(0, 8)), 'hiddenPair').map(
      w => w.sessions,
    ),
  ).toEqual([8, 0]);
});
test('stable links resolve move/event identities and fail explicitly when absent', () => {
  const { session } = teachingFixture();
  const replay = buildSessionReplay(session);
  expect(
    locateGrowthReference(replay, { sessionId: 's', moveIds: ['m'] }),
  ).toEqual({ start: 1, end: 1 });
  expect(
    locateGrowthReference(replay, { sessionId: 's', moveIds: ['missing'] }),
  ).toBeNull();
});
function memoryStore(): GrowthStore {
  const projections = new Map();
  const completions = new Map();
  const receipts = new Set();
  return {
    listSessions: async () => [
      {
        sessionId: 's',
        status: 'completed',
        difficulty: 1,
        endedAt: 1,
        revision: 1,
      },
    ],
    readProjections: async () => [...projections.values()],
    saveProjection: async v => {
      projections.set(v.sessionId, v);
    },
    readCompletions: async () => [...completions.values()],
    saveCompletion: async v => {
      if (!completions.has(v.id)) completions.set(v.id, v);
    },
    claimReceipt: async id => {
      if (receipts.has(id)) return false;
      receipts.add(id);
      return true;
    },
  };
}
test('real completion is persisted once across restarts; merely opening does not record; expert budget is not an input', async () => {
  const { session } = teachingFixture();
  const store = memoryStore();
  const prefs = {
    getSetting: async () => null,
    setSetting: async () => undefined,
  };
  const replay = {
    readReplaySession: async () => session,
    listReplaySessions: async () => [],
  };
  const analyzer = { analyze: jest.fn() };
  let controller = new TechniqueGrowthController(
    store,
    prefs,
    replay,
    undefined,
    analyzer,
    () => 1000,
  );
  controller.setBlocked(true);
  await controller.initialize();
  expect(await store.readCompletions()).toHaveLength(0);
  const ref = { sessionId: 's', moveIds: ['m'] };
  const steps = [{ technique: 'fullHouse' as const, explanationId: 'proof' }];
  await controller.completeWalkthrough(ref, steps);
  expect(await controller.claimFeedback('s')).toBe(true);
  controller.close();
  controller = new TechniqueGrowthController(
    store,
    prefs,
    replay,
    undefined,
    analyzer,
    () => 2000,
  );
  controller.setBlocked(true);
  await controller.initialize();
  await controller.completeWalkthrough(ref, steps);
  expect(await store.readCompletions()).toHaveLength(1);
  expect((await store.readCompletions())[0].occurredAt).toBe(1000);
  expect(await controller.claimFeedback('s')).toBe(false);
  expect(analyzer.analyze).not.toHaveBeenCalled();
  controller.close();
});
test('missing source cannot create a completion', async () => {
  const store = memoryStore();
  const controller = new TechniqueGrowthController(
    store,
    { getSetting: async () => null, setSetting: async () => undefined },
    { readReplaySession: async () => null, listReplaySessions: async () => [] },
    undefined,
    { analyze: jest.fn() },
  );
  controller.setBlocked(true);
  await controller.initialize();
  await expect(
    controller.completeWalkthrough({ sessionId: 'missing', moveIds: ['m'] }, [
      { technique: 'fullHouse', explanationId: 'proof' },
    ]),
  ).rejects.toThrow();
  expect(await store.readCompletions()).toHaveLength(0);
  controller.close();
});

test('unprocessed sessions stay in the completed window before background analysis', async () => {
  const store = memoryStore();
  store.listSessions = async () =>
    Array.from({ length: 20 }, (_, i) => ({
      sessionId: `s${i}`,
      status: 'completed',
      difficulty: 1,
      endedAt: i,
      revision: 1,
    }));
  const controller = new TechniqueGrowthController(
    store,
    { getSetting: async () => null, setSetting: async () => undefined },
    { readReplaySession: async () => null, listReplaySessions: async () => [] },
    undefined,
    { analyze: jest.fn() },
  );
  controller.setBlocked(true);
  await controller.initialize();
  expect(controller.snapshot.recentCount).toBe(10);
  expect(
    growthWindows(controller.snapshot, 'fullHouse').map(w => [
      w.sessions,
      w.covered,
    ]),
  ).toEqual([
    [10, 0],
    [10, 0],
  ]);
  controller.close();
});
test('three alternative techniques never create three application successes', async () => {
  const { session, shadow, report } = await projected();
  const source = report.processes.find(
    p => p.attribution?.automaticTechnique === 'hiddenPair',
  )!;
  const original = source.attribution!.candidateTechniques[0];
  source.attribution!.candidateTechniques = [
    original,
    { ...original, technique: 'forcingChain' },
    { ...original, technique: 'forcingNet' },
  ];
  const p = projectGrowthSession(session, shadow, [], report, 200);
  expect(p.records.filter(r => r.kind === 'application')).toHaveLength(1);
  expect(
    p.records.find(r => r.kind === 'application')!.alternatives,
  ).toHaveLength(3);
});

test('foreground work aborts projection and independent blockers must all clear before retry', async () => {
  jest.useFakeTimers();
  const { session, shadow } = processFixture();
  session.state.status = 'completed';
  const store = memoryStore();
  store.listSessions = async () => [
    {
      sessionId: session.state.sessionId,
      status: 'completed',
      difficulty: 1,
      endedAt: 1,
      revision: 1,
    },
  ];
  const save = jest.spyOn(store, 'saveProjection');
  let finish: (() => void) | undefined;
  let signal: AbortSignal | undefined;
  const analyze = jest.fn((request, options) => {
    signal = options?.signal;
    return new Promise<ReturnType<typeof processResponse>>(resolve => {
      finish = () => resolve(processResponse(request));
    });
  });
  const controller = new TechniqueGrowthController(
    store,
    { getSetting: async () => null, setSetting: async () => undefined },
    {
      readReplaySession: async () => session,
      listReplaySessions: async () => [],
    },
    { readSession: async () => shadow, subscribe: () => () => undefined },
    { analyze },
  );
  try {
    controller.setBlocked(true, 'screen');
    controller.setBlocked(true, 'background');
    await controller.initialize();
    controller.setBlocked(false, 'screen');
    await jest.advanceTimersByTimeAsync(500);
    expect(analyze).not.toHaveBeenCalled();
    controller.setBlocked(false, 'background');
    await jest.advanceTimersByTimeAsync(410);
    expect(analyze).toHaveBeenCalledTimes(1);
    controller.setBlocked(true, 'screen');
    expect(signal?.aborted).toBe(true);
    finish!();
    await jest.advanceTimersByTimeAsync(500);
    expect(save).not.toHaveBeenCalled();
    expect(controller.snapshot.profiles.some(p => p.applications > 0)).toBe(
      false,
    );
    controller.setBlocked(false, 'screen');
    await jest.advanceTimersByTimeAsync(410);
    expect(analyze).toHaveBeenCalledTimes(2);
  } finally {
    controller.close();
    finish?.();
    jest.useRealTimers();
  }
});
