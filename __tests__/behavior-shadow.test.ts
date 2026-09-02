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
