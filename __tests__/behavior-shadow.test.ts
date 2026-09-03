import {
  BehaviorShadowController,
  BehaviorShadowRecord,
  BehaviorShadowSink,
  behaviorShadowRecordsToReviewSamples,
} from '../src/application';
import { BehaviorShadowStore } from '../src/data/diagnostics/behavior-shadow-store';
import {
  GameCommand,
  GameDefinition,
  GameSession,
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  TechniqueOpportunityAnalyzer,
  createGameSession,
  dispatchGameCommand,
} from '../src/domain';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const definition: GameDefinition = {
  puzzleId: 'shadow-puzzle',
  contentVersion: 4,
  difficultyLevel: 3,
  puzzleFingerprint: puzzle,
  solutionFingerprint: solution,
};

function game(): GameSession {
  return createGameSession({
    sessionId: 'shadow-session',
    definition,
    startedAtEpochMs: 1_000,
  });
}

function dispatch(session: GameSession, command: GameCommand) {
  const result = dispatchGameCommand(session, definition, command);
  expect(result.accepted).toBe(true);
  return result;
}

function response(request: GrowthAnalysisRequest): GrowthAnalysisResponse {
  return {
    ...request,
    status: 'matched',
    candidateTechniques: [
      {
        technique: 'nakedSingle',
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

class ImmediateAnalyzer implements TechniqueOpportunityAnalyzer {
  requests: GrowthAnalysisRequest[] = [];

  async analyze(request: GrowthAnalysisRequest) {
    this.requests.push(request);
    return response(request);
  }
}

class DeferredAnalyzer implements TechniqueOpportunityAnalyzer {
  request: GrowthAnalysisRequest | null = null;
  resolve: ((value: GrowthAnalysisResponse) => void) | null = null;

  analyze(request: GrowthAnalysisRequest): Promise<GrowthAnalysisResponse> {
    this.request = request;
    return new Promise(resolve => {
      this.resolve = resolve;
    });
  }
}

class MemorySink implements BehaviorShadowSink {
  records: BehaviorShadowRecord[] = [];

  async save(record: BehaviorShadowRecord): Promise<void> {
    this.records.push(record);
  }
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('behavior shadow diagnostics', () => {
  function harness() {
    const sink = new MemorySink();
    const analyzer = new ImmediateAnalyzer();
    const controller = new BehaviorShadowController(analyzer, sink);
    let session = game();
    let time = 2_000;
    controller.attach(session);
    return {
      sink,
      controller,
      async act(command: GameCommand) {
        const result = dispatch(session, command);
        controller.observeAcceptedCommand(session, command, result);
        session = result.session;
        await flushPromises();
      },
      async place(cell: number, digit: 4 | 5 | 6) {
        await this.act({ type: 'select_cell', cell, atEpochMs: time++ });
        await this.act({
          type: 'input_digit',
          digit,
          moveId: `move-${time}`,
          atEpochMs: time++,
        });
      },
      async erase(cell: number) {
        await this.act({ type: 'select_cell', cell, atEpochMs: time++ });
        await this.act({
          type: 'erase',
          moveId: `erase-${time}`,
          atEpochMs: time++,
        });
      },
      samples: () => behaviorShadowRecordsToReviewSamples(sink.records),
    };
  }

  test("erasing a wrong overwrite never invalidates a different cell's latest placement", async () => {
    const h = harness();
    await h.place(3, 6);
    await h.place(2, 4);
    await h.place(3, 5); // Wrong replacement, no attributed move.
    await h.erase(3);
    expect(h.sink.records.filter(r => r.sourceCommandType === 'erase')).toEqual(
      [],
    );
    expect(
      h
        .samples()
        .slice(0, 2)
        .map(s => s.systemAttribution.attributionEligibility.status),
    ).toEqual(['eligible', 'eligible']);
    h.controller.close();
  });

  test('erasing an earlier correct placement targets its move, not the most recent other cell', async () => {
    const h = harness();
    await h.place(2, 4);
    await h.place(3, 6);
    await h.erase(2);
    expect(
      h.samples().map(s => s.systemAttribution.attributionEligibility.status),
    ).toEqual(['ineligible', 'eligible']);
    expect(h.samples()[0].analysisRequest!.observedEffects).toEqual([
      { kind: 'placement', cell: 2, digit: 4 },
    ]);
    h.controller.close();
  });

  test('successive undo commands each invalidate the move actually undone', async () => {
    const h = harness();
    await h.place(2, 4);
    await h.place(3, 6);
    await h.act({ type: 'undo', atEpochMs: 4_000 });
    await h.act({ type: 'undo', atEpochMs: 4_100 });
    expect(
      h.samples().map(s => s.systemAttribution.attributionEligibility),
    ).toEqual([
      { status: 'ineligible', reason: 'undo_polluted' },
      { status: 'ineligible', reason: 'undo_polluted' },
    ]);
    h.controller.close();
  });

  test('undoing an unrecognized wrong input does not invalidate the preceding correct move', async () => {
    const h = harness();
    await h.place(2, 4);
    await h.place(3, 5);
    await h.act({ type: 'undo', atEpochMs: 4_000 });
    expect(h.samples()[0].systemAttribution.attributionEligibility.status).toBe(
      'eligible',
    );
    expect(h.sink.records.filter(r => r.sourceCommandType === 'undo')).toEqual(
      [],
    );
    h.controller.close();
  });

  test('restoring one settled deletion does not forget another deletion that is later restored', async () => {
    jest.useFakeTimers();
    const sink = new MemorySink();
    const controller = new BehaviorShadowController(
      new ImmediateAnalyzer(),
      sink,
    );
    let session = game();
    controller.attach(session);
    const act = (command: GameCommand) => {
      const result = dispatch(session, command);
      controller.observeAcceptedCommand(session, command, result);
      session = result.session;
    };
    act({
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    });
    act({ type: 'select_cell', cell: 2, atEpochMs: 1_200 });
    for (const digit of [1, 4] as const) {
      act({
        type: 'input_digit',
        digit,
        moveId: `remove-${digit}`,
        atEpochMs: 2_000 + digit,
      });
      await flushPromises();
      jest.advanceTimersByTime(750);
    }
    for (const digit of [1, 4] as const) {
      act({
        type: 'input_digit',
        digit,
        moveId: `restore-${digit}`,
        atEpochMs: 3_000 + digit,
      });
    }
    const samples = behaviorShadowRecordsToReviewSamples(sink.records);
    expect(samples).toHaveLength(2);
    expect(
      samples.map(s => s.systemAttribution.attributionEligibility),
    ).toEqual([
      { status: 'ineligible', reason: 'restore_polluted' },
      { status: 'ineligible', reason: 'restore_polluted' },
    ]);
    controller.close();
  });

  test.each(['attach', 'restore', 'recreate'] as const)(
    'keeps results separate after %s at the same revision',
    async action => {
      const analyzer = new ImmediateAnalyzer();
      const sink = new MemorySink();
      let controller = new BehaviorShadowController(analyzer, sink);
      const session = dispatch(game(), {
        type: 'select_cell',
        cell: 2,
        atEpochMs: 1_100,
      }).session;
      const command: GameCommand = {
        type: 'input_digit',
        digit: 4,
        moveId: 'place',
        atEpochMs: 1_200,
      };
      const result = dispatch(session, command);
      controller.attach(session);
      controller.observeAcceptedCommand(session, command, result);
      await flushPromises();
      if (action === 'recreate') {
        controller.close();
        controller = new BehaviorShadowController(analyzer, sink);
        controller.attach(session);
      } else {
        controller[action](session);
      }
      controller.observeAcceptedCommand(session, command, result);
      await flushPromises();
      expect(new Set(analyzer.requests.map(r => r.segmentId)).size).toBe(2);
      expect(new Set(analyzer.requests.map(r => r.requestId)).size).toBe(2);
      expect(behaviorShadowRecordsToReviewSamples(sink.records)).toHaveLength(
        2,
      );
      controller.close();
    },
  );

  test.each([false, true])(
    'candidate restoration retracts deletion evidence (settled=%s)',
    async settled => {
      jest.useFakeTimers();
      const analyzer = new ImmediateAnalyzer();
      const sink = new MemorySink();
      const controller = new BehaviorShadowController(analyzer, sink);
      let session = game();
      controller.attach(session);
      const act = (command: GameCommand) => {
        const result = dispatch(session, command);
        controller.observeAcceptedCommand(session, command, result);
        session = result.session;
      };
      act({
        type: 'generate_quick_draft',
        confirmed: false,
        availableCredits: 1,
        atEpochMs: 1_100,
      });
      act({ type: 'select_cell', cell: 2, atEpochMs: 1_200 });
      act({
        type: 'input_digit',
        digit: 4,
        moveId: 'remove-4',
        atEpochMs: 1_300,
      });
      await flushPromises();
      if (settled) {
        jest.advanceTimersByTime(750);
      }
      act({
        type: 'input_digit',
        digit: 4,
        moveId: 'restore-4',
        atEpochMs: 2_100,
      });
      act({ type: 'set_pencil_mode', enabled: false, atEpochMs: 2_200 });
      act({
        type: 'input_digit',
        digit: 4,
        moveId: 'place-4',
        atEpochMs: 2_300,
      });
      await flushPromises();
      const samples = behaviorShadowRecordsToReviewSamples(sink.records);
      expect(samples).toHaveLength(2);
      expect(samples[0].systemAttribution.attributionEligibility).toEqual({
        status: 'ineligible',
        reason: 'restore_polluted',
      });
      expect(samples[1].analysisRequest?.observedEffects).toEqual([
        { kind: 'placement', cell: 2, digit: 4 },
      ]);
      expect(samples[1].systemAttribution.attributionEligibility.status).toBe(
        'eligible',
      );
      expect(analyzer.requests).toHaveLength(2);
      controller.close();
    },
  );

  afterEach(() => {
    jest.useRealTimers();
  });

  test('records a final placement attribution without affecting the game result', async () => {
    const analyzer = new ImmediateAnalyzer();
    const sink = new MemorySink();
    let recordId = 0;
    const controller = new BehaviorShadowController(
      analyzer,
      sink,
      () => 2_000,
      750,
      () => `record-${++recordId}`,
    );
    let session = game();
    controller.attach(session);
    session = dispatch(session, {
      type: 'select_cell',
      cell: 2,
      atEpochMs: 1_100,
    }).session;
    const command: GameCommand = {
      type: 'input_digit',
      digit: 4,
      moveId: 'place-4',
      atEpochMs: 1_200,
    };
    const result = dispatch(session, command);

    controller.observeAcceptedCommand(session, command, result);
    await flushPromises();

    expect(analyzer.requests[0].observedEffects).toEqual([
      { kind: 'placement', cell: 2, digit: 4 },
    ]);
    expect(sink.records.map(record => record.phase)).toEqual([
      'request',
      'result',
    ]);
    expect(sink.records[1].diagnostic).toMatchObject({
      finality: 'final',
      attribution: {
        automaticTechnique: 'nakedSingle',
        attributionEligibility: { status: 'eligible' },
      },
    });
    expect(behaviorShadowRecordsToReviewSamples(sink.records)).toMatchObject([
      {
        scenarioFamily: 'shadow_gameplay',
        sourceCommands: ['input_digit:placement:2:4'],
        analysisRequest: analyzer.requests[0],
        humanReview: { status: 'pending' },
      },
    ]);
    expect(result.session.state.values[2]).toBe(4);

    const undoCommand: GameCommand = { type: 'undo', atEpochMs: 2_100 };
    const undone = dispatch(result.session, undoCommand);
    controller.observeAcceptedCommand(result.session, undoCommand, undone);
    expect(behaviorShadowRecordsToReviewSamples(sink.records)).toMatchObject([
      {
        scenarioFamily: 'undo_counterexample',
        systemAttribution: {
          automaticTechnique: null,
          attributionEligibility: {
            status: 'ineligible',
            reason: 'undo_polluted',
          },
        },
      },
    ]);
  });

  test('settles a candidate-elimination segment after an idle interval', async () => {
    jest.useFakeTimers();
    const analyzer = new ImmediateAnalyzer();
    const sink = new MemorySink();
    const controller = new BehaviorShadowController(
      analyzer,
      sink,
      () => 2_000,
      750,
      () => 'record',
    );
    let session = game();
    controller.attach(session);
    const quick = dispatch(session, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    });
    controller.observeAcceptedCommand(
      session,
      {
        type: 'generate_quick_draft',
        confirmed: false,
        availableCredits: 1,
        atEpochMs: 1_100,
      },
      quick,
    );
    session = dispatch(quick.session, {
      type: 'select_cell',
      cell: 2,
      atEpochMs: 1_200,
    }).session;
    const command: GameCommand = {
      type: 'input_digit',
      digit: 1,
      moveId: 'remove-1',
      atEpochMs: 1_300,
    };
    const result = dispatch(session, command);

    controller.observeAcceptedCommand(session, command, result);
    await flushPromises();
    expect(sink.records.at(-1)?.diagnostic?.finality).toBe('provisional');

    jest.advanceTimersByTime(750);
    await flushPromises();
    expect(sink.records.at(-1)).toMatchObject({
      phase: 'segment_finalized',
      diagnostic: { finality: 'final' },
    });
    expect(behaviorShadowRecordsToReviewSamples(sink.records)).toHaveLength(1);
  });

  test('keeps the diagnostic database independent and deletable', async () => {
    const database = new NodeSqliteDatabase();
    const store = new BehaviorShadowStore(database);
    const record: BehaviorShadowRecord = {
      recordId: 'record-1',
      recordedAtEpochMs: 2_000,
      phase: 'invalidation',
      sessionId: 'session-1',
      segmentId: null,
      sourceCommandType: 'undo',
      request: null,
      responseStatus: null,
      analysisDiagnostics: null,
      diagnostic: null,
    };

    await store.save(record);
    await store.save(record);
    expect(await store.readAll()).toEqual([record]);
    await store.clear();
    expect(await store.readAll()).toEqual([]);
    store.close();
  });

  test('invalidates an open segment on restore and rejects its late response', async () => {
    const analyzer = new DeferredAnalyzer();
    const sink = new MemorySink();
    const controller = new BehaviorShadowController(analyzer, sink);
    let session = game();
    controller.attach(session);
    session = dispatch(session, {
      type: 'select_cell',
      cell: 2,
      atEpochMs: 1_100,
    }).session;
    const command: GameCommand = {
      type: 'input_digit',
      digit: 4,
      moveId: 'place-before-restore',
      atEpochMs: 1_200,
    };
    const result = dispatch(session, command);
    controller.observeAcceptedCommand(session, command, result);

    controller.restore(result.session);
    analyzer.resolve?.(response(analyzer.request!));
    await flushPromises();

    expect(
      sink.records.find(record => record.phase === 'invalidation')?.diagnostic
        ?.attribution.attributionEligibility,
    ).toEqual({ status: 'ineligible', reason: 'restore_polluted' });
    expect(
      sink.records.find(record => record.phase === 'result')?.diagnostic
        ?.attribution.attributionEligibility,
    ).toEqual({ status: 'ineligible', reason: 'revision_expired' });
    expect(behaviorShadowRecordsToReviewSamples(sink.records)).toMatchObject([
      { scenarioFamily: 'restore_counterexample' },
    ]);
  });

  test('swallows diagnostic persistence failures', async () => {
    const controller = new BehaviorShadowController(
      new ImmediateAnalyzer(),
      { save: async () => Promise.reject(new Error('diagnostic failure')) },
      () => 2_000,
    );
    let session = game();
    controller.attach(session);
    session = dispatch(session, {
      type: 'select_cell',
      cell: 2,
      atEpochMs: 1_100,
    }).session;
    const command: GameCommand = {
      type: 'input_digit',
      digit: 4,
      moveId: 'place-4',
      atEpochMs: 1_200,
    };
    const result = dispatch(session, command);

    expect(() =>
      controller.observeAcceptedCommand(session, command, result),
    ).not.toThrow();
    await flushPromises();
    expect(result.accepted).toBe(true);
  });
});
