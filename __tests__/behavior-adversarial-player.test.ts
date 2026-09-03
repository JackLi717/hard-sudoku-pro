jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));

import fs from 'node:fs';
import path from 'node:path';

import {
  AcceptedGameCommandObserver,
  BehaviorShadowController,
  BehaviorShadowRecord,
  BehaviorShadowSink,
  GameAccessAdapter,
  OfflineContentStore,
  OfflineGameCoordinator,
  behaviorShadowRecordsToReviewSamples,
} from '../src/application';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { UserRepository } from '../src/data/user/user-repository';
import {
  GameCommand,
  GameCommandResult,
  GameSession,
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  HintEngine,
  HintEngineRequest,
  PuzzleRecord,
  TechniqueOpportunityAnalyzer,
} from '../src/domain';
import {
  ADVERSARIAL_STRATEGIES,
  AdversarialGameDriver,
  AdversarialRun,
  auditAdversarialRun,
  runAdversarialPlayer,
} from '../src/debug/behavior-adversarial-player';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

class SimulationContent implements OfflineContentStore {
  readonly metadata = { contentVersion: 4 };
  readonly record: PuzzleRecord = {
    id: 'adversarial-puzzle',
    puzzle,
    solution,
    difficultyLevel: 3,
    difficultyScore: 300,
    hardestTechnique: 'nakedSingle',
    ratingVersion: 'adversarial',
    source: 'simulation',
    contentVersion: 4,
    checksum: 'adversarial-checksum',
    enabled: true,
  };

  async getPuzzle(id: string): Promise<PuzzleRecord | null> {
    return id === this.record.id ? this.record : null;
  }

  async listPuzzles(level: number): Promise<readonly PuzzleRecord[]> {
    return level === 3 ? [this.record] : [];
  }
}

class FreeAccess implements GameAccessAdapter {
  async isPremium(): Promise<boolean> {
    return true;
  }

  async showStartOpportunity(): Promise<void> {}
}

class SimulationHintEngine implements HintEngine {
  async nextStep(request: HintEngineRequest) {
    const cell = request.boardFingerprint.indexOf('0');
    if (cell < 0) {
      return { status: 'solved' as const, reasonKey: 'solved' };
    }
    const digit = Number(solution[cell]) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    return {
      status: 'step' as const,
      step: {
        contractVersion: 1 as const,
        boardFingerprint: request.boardFingerprint,
        techniqueCode: 'nakedSingle' as const,
        difficultyLevel: 1 as const,
        focusCells: [cell],
        focusRegions: [],
        premiseCandidates: [{ cell, digit }],
        eliminations: [],
        placements: [{ cell, digit }],
        explanationKey: 'hint.nakedSingle' as const,
        explanationParams: {},
      },
    };
  }
}

class NoMatchAnalyzer implements TechniqueOpportunityAnalyzer {
  async analyze(
    request: GrowthAnalysisRequest,
  ): Promise<GrowthAnalysisResponse> {
    return {
      requestId: request.requestId,
      sessionId: request.sessionId,
      segmentId: request.segmentId,
      startingRevision: request.startingRevision,
      issuedRevision: request.issuedRevision,
      startingBoardFingerprint: request.startingBoardFingerprint,
      expectedBoardFingerprint: request.expectedBoardFingerprint,
      status: 'no_match',
      candidateTechniques: [],
      diagnostics: {
        opportunityCount: 0,
        opportunitySetComplete: true,
        usedExpandedSearch: false,
        reachedEnumerationLimitTechniques: [],
      },
    };
  }
}

class MemorySink implements BehaviorShadowSink {
  readonly records: BehaviorShadowRecord[] = [];

  async save(record: BehaviorShadowRecord): Promise<void> {
    this.records.push(record);
  }
}

class CountingObserver implements AcceptedGameCommandObserver {
  acceptedDurableCommands = 0;

  constructor(private readonly shadow: BehaviorShadowController) {}

  attach(session: GameSession): void {
    this.shadow.attach(session);
  }

  restore(session: GameSession): void {
    this.shadow.restore(session);
  }

  observeAcceptedCommand(
    before: GameSession,
    command: GameCommand,
    result: GameCommandResult,
  ): void {
    this.acceptedDurableCommands += 1;
    this.shadow.observeAcceptedCommand(before, command, result);
  }

  close(): void {
    this.shadow.close();
  }
}

class CoordinatorDriver implements AdversarialGameDriver {
  constructor(
    private readonly coordinator: OfflineGameCoordinator,
    private readonly expectedSolution: string,
    private readonly observer: CountingObserver,
  ) {}

  view() {
    return {
      session: this.coordinator.snapshot.session,
      solutionFingerprint: this.coordinator.snapshot.puzzle
        ? this.expectedSolution
        : null,
      messageCode: this.coordinator.snapshot.message?.code ?? null,
    };
  }

  async startGame(): Promise<void> {
    await this.coordinator.requestNewGame(3);
  }

  selectCell(cell: number): Promise<void> {
    return this.coordinator.selectCell(cell);
  }

  inputDigit(digit: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): Promise<void> {
    return this.coordinator.inputDigit(digit);
  }

  erase(): Promise<void> {
    return this.coordinator.erase();
  }

  undo(): Promise<void> {
    return this.coordinator.undo();
  }

  togglePencil(): Promise<void> {
    return this.coordinator.togglePencil();
  }

  async toggleQuickPencil(): Promise<void> {
    await this.coordinator.toggleQuickPencil();
    if (this.coordinator.snapshot.quickDraftConfirmation) {
      await this.coordinator.confirmQuickDraftRegeneration();
    }
  }

  requestHint(): Promise<void> {
    return this.coordinator.requestHint();
  }

  dismissHint(): Promise<void> {
    return this.coordinator.dismissHint();
  }

  pause(): Promise<void> {
    return this.coordinator.pause();
  }

  resume(): Promise<void> {
    return this.coordinator.resumePausedGame();
  }

  acceptedDurableCommandCount(): number {
    return this.observer.acceptedDurableCommands;
  }
}

type SimulationResult = {
  run: AdversarialRun;
  records: readonly BehaviorShadowRecord[];
  acceptedDurableCommands: number;
};

async function simulate(
  seed: number,
  steps: number,
): Promise<SimulationResult> {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1_000);
  const players = new UserRepository(database);
  const sink = new MemorySink();
  let epochMs = 10_000;
  let id = 0;
  const shadow = new BehaviorShadowController(
    new NoMatchAnalyzer(),
    sink,
    () => ++epochMs,
    0,
    () => `shadow-${seed}-${++id}`,
  );
  const observer = new CountingObserver(shadow);
  const coordinator = new OfflineGameCoordinator(
    new SimulationContent(),
    players,
    new SimulationHintEngine(),
    new FreeAccess(),
    () => ++epochMs,
    kind => `${kind}-${seed}-${++id}`,
    observer,
  );
  await coordinator.initialize();
  await players.setDebugCreditBalances(999, ++epochMs, `credits-${seed}`);
  const run = await runAdversarialPlayer(
    new CoordinatorDriver(coordinator, solution, observer),
    { seed, steps },
  );
  await new Promise(resolve => setTimeout(resolve, 5));
  observer.close();
  database.close();
  return {
    run,
    records: sink.records,
    acceptedDurableCommands: observer.acceptedDurableCommands,
  };
}

describe('TG-3A adversarial simulated player', () => {
  test('drives the real coordinator reproducibly through all strategy families', async () => {
    const first = await simulate(71_717, 40);
    const second = await simulate(71_717, 40);

    expect(auditAdversarialRun(first.run)).toEqual([]);
    expect(first.run).toEqual(second.run);
    expect(first.acceptedDurableCommands).toBeGreaterThan(0);
    expect(first.records.some(record => record.phase === 'request')).toBe(true);
    expect(first.records.some(record => record.phase === 'invalidation')).toBe(
      true,
    );
  });

  test('stress-checks seeded games and emits replayable pending samples', async () => {
    const writeReport = process.env.BEHAVIOR_ADVERSARIAL_WRITE_REPORT === '1';
    const runCount = writeReport ? 20 : 4;
    const stepsPerRun = writeReport ? 100 : 30;
    const seeds = Array.from(
      { length: runCount },
      (_, index) => 90_000 + index,
    );
    const results = await Promise.all(
      seeds.map(seed => simulate(seed, stepsPerRun)),
    );
    const failedRuns = results
      .map(result => ({
        seed: result.run.seed,
        violations: auditAdversarialRun(result.run),
        trace: result.run.trace,
      }))
      .filter(result => result.violations.length > 0);
    const violations = failedRuns.flatMap(result =>
      result.violations.map(violation => `${result.seed}:${violation}`),
    );
    const allSamples = results.flatMap(result =>
      behaviorShadowRecordsToReviewSamples(result.records),
    );
    // Round-robin across seeds; taking the first 120 can cover only one run.
    const byRun = results.map(result =>
      behaviorShadowRecordsToReviewSamples(result.records),
    );
    const samples = [] as typeof allSamples;
    for (let index = 0; samples.length < 120; index += 1) {
      const round = byRun.flatMap(run => (run[index] ? [run[index]] : []));
      if (round.length === 0) break;
      samples.push(...round.slice(0, 120 - samples.length));
    }
    const strategyCounts = Object.fromEntries(
      ADVERSARIAL_STRATEGIES.map(strategy => [
        strategy,
        results.reduce(
          (total, result) => total + result.run.strategyCounts[strategy],
          0,
        ),
      ]),
    );
    const report = {
      simulator: 'TG-3A adversarial simulated player',
      seeds,
      runCount: results.length,
      stepsPerRun,
      requestedStrategySteps: results.reduce(
        (total, result) => total + result.run.requestedSteps,
        0,
      ),
      requestedCommandCount: results.reduce(
        (total, result) => total + result.run.commandCount,
        0,
      ),
      acceptedDurableCommandCount: results.reduce(
        (total, result) => total + result.acceptedDurableCommands,
        0,
      ),
      strategyCounts,
      finalDiagnosticSampleCount: allSamples.length,
      exportedPendingSampleCount: samples.length,
      replayableSampleCount: samples.filter(
        sample => sample.analysisRequest !== null,
      ).length,
      ineligibleSampleCount: samples.filter(
        sample =>
          sample.systemAttribution.attributionEligibility.status ===
          'ineligible',
      ).length,
      invariantViolations: violations,
      failedRuns,
      limitations: [
        'Simulation validates game integration and protocol invariants, not human technique intent.',
        'Native technique results are populated by the separate replay step.',
        'Automated acceptance does not establish human intent or calibrated growth scores.',
      ],
    };

    if (writeReport) {
      const root = path.resolve(__dirname, '..');
      const output = process.env.BEHAVIOR_ADVERSARIAL_OUTPUT_DIR;
      if (output) fs.mkdirSync(output, { recursive: true });
      fs.writeFileSync(
        output
          ? path.join(output, 'tg3a-adversarial-pending.json')
          : path.join(
              root,
              'tools/behavior-evaluation/samples/tg3a-adversarial-pending.json',
            ),
        `${JSON.stringify(samples, null, 2)}\n`,
      );
      fs.writeFileSync(
        output
          ? path.join(output, 'tg3a-adversarial-report.json')
          : path.join(
              root,
              'tools/behavior-evaluation/reports/tg3a-adversarial-report.json',
            ),
        `${JSON.stringify(report, null, 2)}\n`,
      );
    }

    expect(violations).toEqual([]);
    expect(samples.length).toBeGreaterThan(0);
    expect(
      samples.every(sample => sample.humanReview.status === 'pending'),
    ).toBe(true);
    expect(new Set(samples.map(sample => sample.sampleId)).size).toBe(
      samples.length,
    );
  }, 120_000);
});
