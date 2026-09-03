import { spawnSync } from 'node:child_process';
import {
  BehaviorShadowController,
  BehaviorShadowRecord,
} from '../src/application/technique-recognition/shadow-controller';
import {
  acceptBehaviorAnalysisResult,
  createBehaviorRecognitionState,
  observeAcceptedGameCommand,
} from '../src/application/technique-recognition/behavior-adapter';
import { behaviorShadowRecordsToReviewSamples } from '../src/application/technique-recognition/shadow-export';
import {
  createGameSession,
  dispatchGameCommand,
  GameCommand,
  GameDefinition,
  GameSession,
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
} from '../src/domain';

// Actual board before R1C6 -7 then R1C1 =9 in the 2026-09-03 game.
const definition: GameDefinition = {
  puzzleId: 'ipad-idle-segment',
  contentVersion: 4,
  difficultyLevel: 3,
  puzzleFingerprint:
    '004030000072419006000000940297350004040700200000000507020600005050002009416805000',
  solutionFingerprint:
    '964538172872419356135267948297351684543786291681924537729643815358172469416895723',
};

function response(request: GrowthAnalysisRequest): GrowthAnalysisResponse {
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
      { encoding: 'utf8', timeout: 30_000 },
    );
    if (run.status !== 0) throw new Error(run.error?.message ?? run.stderr);
    return { ...request, ...JSON.parse(run.stdout) };
  }
  return {
    ...request,
    status: 'matched',
    candidateTechniques: [
      {
        technique:
          request.observedEffects[0].kind === 'elimination'
            ? 'lockedCandidates.pointing'
            : 'hiddenSingle',
        humanCost: 100,
        directPlacementMatch: true,
        oneHopPlacementMatch: false,
        matchingOpportunityCount: 1,
      },
    ],
    diagnostics: {
      opportunityCount: 1,
      opportunitySetComplete: true,
      usedExpandedSearch: false,
      reachedEnumerationLimitTechniques: [],
    },
  };
}

function initial() {
  return createGameSession({
    sessionId: 'idle-regression',
    definition,
    startedAtEpochMs: 1_000,
  });
}

function harness() {
  let session = initial();
  const records: BehaviorShadowRecord[] = [];
  const pending: {
    request: GrowthAnalysisRequest;
    resolve: (r: GrowthAnalysisResponse) => void;
    reject: (e: Error) => void;
  }[] = [];
  const controller = new BehaviorShadowController(
    {
      analyze: request =>
        new Promise((resolve, reject) => {
          pending.push({ request, resolve, reject });
        }),
    },
    {
      save: async record => {
        records.push(record);
      },
    },
  );
  controller.attach(session);
  function act(command: GameCommand) {
    const before = session;
    const result = dispatchGameCommand(before, definition, command);
    expect(result.accepted).toBe(true);
    controller.observeAcceptedCommand(before, command, result);
    session = result.session;
  }
  const select = (cell: number) =>
    act({ type: 'select_cell', cell, atEpochMs: Date.now() });
  const pencil = (enabled: boolean) =>
    act({ type: 'set_pencil_mode', enabled, atEpochMs: Date.now() });
  const digit = (value: 7 | 6 | 9) =>
    act({
      type: 'input_digit',
      digit: value,
      moveId: `move-${Date.now()}-${pending.length}`,
      atEpochMs: Date.now(),
    });
  act({
    type: 'generate_quick_draft',
    confirmed: false,
    availableCredits: 1,
    atEpochMs: Date.now(),
  });
  return {
    act,
    select,
    pencil,
    digit,
    records,
    pending,
    controller,
    get session() {
      return session;
    },
    samples: () => behaviorShadowRecordsToReviewSamples(records),
    async resolve(index: number) {
      pending[index].resolve(response(pending[index].request));
      await flush();
    },
  };
}
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => jest.useFakeTimers({ now: 10_000 }));
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('real slow result survives pencil/selection changes and a 30-second-later placement starts separately', async () => {
  const h = harness();
  h.select(5);
  h.digit(7);
  const original = { ...h.pending[0].request };
  jest.advanceTimersByTime(885);
  h.pencil(false);
  h.select(0);
  jest.advanceTimersByTime(1_780);
  await h.resolve(0);
  expect(h.pending[0].request).toEqual(original);
  expect(h.records.at(-1)?.diagnostic).toMatchObject({
    finality: 'final',
    attribution: {
      automaticTechnique: 'lockedCandidates.pointing',
      attributionEligibility: { status: 'eligible' },
    },
  });
  jest.advanceTimersByTime(30_000);
  h.digit(9);
  await h.resolve(1);
  expect(h.pending[1].request.segmentId).not.toBe(original.segmentId);
  expect(h.pending[1].request.observedEffects).toEqual([
    { kind: 'placement', cell: 0, digit: 9 },
  ]);
  expect(h.samples().map(s => s.systemAttribution.automaticTechnique)).toEqual([
    'lockedCandidates.pointing',
    'hiddenSingle',
  ]);
  expect(h.records.some(r => r.phase === 'invalidation')).toBe(false);
  h.controller.close();
});

test('neutral UI changes do not cancel or extend a provisional segment deadline', async () => {
  const h = harness();
  h.select(5);
  h.digit(7);
  await h.resolve(0);
  jest.advanceTimersByTime(400);
  h.pencil(false);
  h.select(0);
  jest.advanceTimersByTime(300);
  h.select(1);
  jest.advanceTimersByTime(50);
  expect(h.records.at(-1)?.phase).toBe('segment_finalized');
  expect(
    h.records.at(-1)?.diagnostic?.attribution.attributionEligibility.status,
  ).toBe('eligible');
  h.controller.close();
});

test.each(['source', 'quick-draft', 'note-addition'] as const)(
  'observed neutral %s transition retains the pending request',
  async transition => {
    const h = harness();
    h.select(5);
    h.digit(7);
    if (transition === 'quick-draft') {
      h.act({
        type: 'generate_quick_draft',
        confirmed: true,
        availableCredits: 1,
        atEpochMs: Date.now(),
      });
    } else {
      h.act({
        type: 'set_candidate_source',
        source: 'manual',
        atEpochMs: Date.now(),
      });
      if (transition === 'note-addition') h.digit(9);
    }
    expect(h.pending).toHaveLength(1);
    await h.resolve(0);
    jest.advanceTimersByTime(750);
    expect(h.samples()[0].systemAttribution.attributionEligibility.status).toBe(
      'eligible',
    );
    h.controller.close();
  },
);

test('a delayed JS timer cannot extend the evidence window', async () => {
  const h = harness();
  h.select(5);
  h.digit(7);
  // Advance the clock without delivering queued timer callbacks.
  jest.setSystemTime(Date.now() + 30_000);
  h.pencil(false);
  h.select(0);
  await h.resolve(0);
  expect(h.records.at(-1)?.diagnostic?.finality).toBe('final');
  h.digit(9);
  expect(h.pending[1].request.observedEffects).toEqual([
    { kind: 'placement', cell: 0, digit: 9 },
  ]);
  h.controller.close();
});

test('hint interruption still isolates a sealed pending segment with unchanged values', async () => {
  const h = harness();
  h.select(5);
  h.digit(7);
  jest.advanceTimersByTime(800);
  h.act({ type: 'prepare_hint', atEpochMs: Date.now() });
  await h.resolve(0);
  expect(h.samples()[0].systemAttribution.attributionEligibility).toEqual({
    status: 'ineligible',
    reason: 'hint_polluted',
  });
  h.controller.close();
});

test('continuous effects supersede old results without destroying the newer request or its timer', async () => {
  const h = harness();
  h.select(5);
  h.digit(7);
  jest.advanceTimersByTime(200);
  h.digit(6);
  expect(h.pending[1].request.segmentId).toBe(h.pending[0].request.segmentId);
  expect(h.pending[1].request.observedEffects).toHaveLength(2);
  await h.resolve(0);
  await h.resolve(1);
  jest.advanceTimersByTime(750);
  expect(h.samples()).toHaveLength(1);
  expect(h.samples()[0].analysisRequest?.requestId).toBe(
    h.pending[1].request.requestId,
  );
  expect(h.samples()[0].systemAttribution.attributionEligibility.status).toBe(
    'eligible',
  );
  h.controller.close();
});

test('a stalled result cannot keep an idle segment open indefinitely or erase a later placement', async () => {
  const h = harness();
  h.select(5);
  h.digit(7);
  jest.advanceTimersByTime(30_000);
  h.pencil(false);
  h.select(0);
  h.digit(9);
  expect(h.pending[1].request.observedEffects).toEqual([
    { kind: 'placement', cell: 0, digit: 9 },
  ]);
  expect(
    h.records.find(r => r.phase === 'invalidation')?.diagnostic?.attribution
      .attributionEligibility,
  ).toEqual({ status: 'ineligible', reason: 'analysis_cancelled' });
  await h.resolve(0);
  await h.resolve(1);
  expect(
    h
      .samples()
      .find(
        s => s.analysisRequest?.requestId === h.pending[1].request.requestId,
      )?.systemAttribution.automaticTechnique,
  ).toBe('hiddenSingle');
  h.controller.close();
});

test('a rejected analysis closes its segment instead of leaving invisible pending evidence', async () => {
  const h = harness();
  h.select(5);
  h.digit(7);
  h.pending[0].reject(new Error('native unavailable'));
  await flush();
  expect(h.records.at(-1)?.diagnostic).toMatchObject({
    finality: 'final',
    attribution: {
      attributionEligibility: {
        status: 'ineligible',
        reason: 'analysis_failed',
      },
    },
  });
  h.pencil(false);
  h.select(0);
  h.digit(9);
  expect(h.pending[1].request.observedEffects).toHaveLength(1);
  h.controller.close();
});

test.each(['revision', 'fingerprint', 'cancelled'] as const)(
  'latest %s failure removes its open segment',
  failure => {
    let session = initial();
    session = dispatchGameCommand(session, definition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 2_000,
    }).session;
    session = dispatchGameCommand(session, definition, {
      type: 'select_cell',
      cell: 5,
      atEpochMs: 2_001,
    }).session;
    const command: GameCommand = {
      type: 'input_digit',
      digit: 7,
      moveId: 'delete',
      atEpochMs: 2_002,
    };
    const result = dispatchGameCommand(session, definition, command);
    const observed = observeAcceptedGameCommand(
      createBehaviorRecognitionState(session),
      session,
      command,
      result,
    );
    let current: GameSession = result.session;
    const reply = response(observed.analysisRequest!);
    if (failure === 'revision')
      current = {
        ...current,
        state: { ...current.state, revision: current.state.revision + 1 },
      };
    if (failure === 'fingerprint') {
      const values = [...current.state.values];
      values[0] = 9;
      current = { ...current, state: { ...current.state, values } };
    }
    if (failure === 'cancelled') reply.status = 'cancelled';
    const accepted = acceptBehaviorAnalysisResult(
      observed.state,
      reply,
      current,
    );
    expect(accepted.state.segment).toBeNull();
    expect(accepted.diagnostic.finality).toBe('final');
    expect(accepted.diagnostic.attribution.attributionEligibility.status).toBe(
      'ineligible',
    );
  },
);
