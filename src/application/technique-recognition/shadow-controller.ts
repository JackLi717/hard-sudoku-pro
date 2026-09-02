import {
  GameCommand,
  GameCommandResult,
  GameSession,
} from '../../domain/game/contracts';
import {
  AttributionIneligibilityReason,
  GrowthAnalysisDiagnostics,
  GrowthAnalysisRequest,
  TechniqueOpportunityAnalyzer,
} from '../../domain/technique-recognition/contracts';
import {
  BehaviorDiagnostic,
  BehaviorRecognitionState,
  acceptBehaviorAnalysisResult,
  createBehaviorRecognitionState,
  finalizeBehaviorSegment,
  invalidateForRestore,
  observeAcceptedGameCommand,
} from './behavior-adapter';

export type BehaviorShadowRecord = {
  recordId: string;
  recordedAtEpochMs: number;
  phase: 'request' | 'result' | 'segment_finalized' | 'invalidation';
  sessionId: string;
  segmentId: string | null;
  sourceCommandType: GameCommand['type'] | null;
  request: GrowthAnalysisRequest | null;
  responseStatus: string | null;
  analysisDiagnostics: GrowthAnalysisDiagnostics | null;
  diagnostic: BehaviorDiagnostic | null;
};

export interface BehaviorShadowSink {
  save(record: BehaviorShadowRecord): Promise<void>;
}

export interface AcceptedGameCommandObserver {
  attach(session: GameSession): void;
  restore(session: GameSession): void;
  observeAcceptedCommand(
    before: GameSession,
    command: GameCommand,
    result: GameCommandResult,
  ): void;
  close(): void;
}

type TimerHandle = ReturnType<typeof setTimeout>;

export class BehaviorShadowController implements AcceptedGameCommandObserver {
  private state: BehaviorRecognitionState | null = null;
  private currentSession: GameSession | null = null;
  private activeAnalysis: AbortController | null = null;
  private settleTimer: TimerHandle | null = null;
  private nextRecordSequence = 1;
  private lastFinalizedSegmentId: string | null = null;
  private closed = false;

  constructor(
    private readonly analyzer: TechniqueOpportunityAnalyzer,
    private readonly sink: BehaviorShadowSink,
    private readonly now: () => number = Date.now,
    private readonly settleDelayMs = 750,
    private readonly createRecordId: () => string = () =>
      `shadow-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  ) {}

  attach(session: GameSession): void {
    this.cancelPendingWork();
    this.currentSession = session;
    this.state = createBehaviorRecognitionState(session);
    this.lastFinalizedSegmentId = null;
  }

  restore(session: GameSession): void {
    if (this.state) {
      const invalidated = invalidateForRestore(this.state, session);
      for (const diagnostic of invalidated.diagnostics) {
        this.persist('invalidation', null, null, null, diagnostic);
      }
    }
    this.attach(session);
  }

  observeAcceptedCommand(
    before: GameSession,
    command: GameCommand,
    result: GameCommandResult,
  ): void {
    if (this.closed || !result.accepted) {
      return;
    }
    if (!this.state || this.state.sessionId !== before.state.sessionId) {
      this.attach(before);
    }
    this.currentSession = result.session;
    this.clearSettleTimer();

    const observation = observeAcceptedGameCommand(
      this.state!,
      before,
      command,
      result,
    );
    this.state = observation.state;
    for (const diagnostic of observation.diagnostics) {
      this.persist('invalidation', command.type, null, null, diagnostic);
    }
    if (
      observation.diagnostics.length === 0 &&
      this.lastFinalizedSegmentId &&
      (command.type === 'undo' || command.type === 'erase')
    ) {
      const reason =
        command.type === 'undo' ? 'undo_polluted' : 'restore_polluted';
      this.persist(
        'invalidation',
        command.type,
        null,
        null,
        this.ineligibleDiagnostic(this.lastFinalizedSegmentId, reason),
      );
      this.lastFinalizedSegmentId = null;
    }
    if (!observation.analysisRequest) {
      return;
    }

    this.activeAnalysis?.abort();
    const abortController = new AbortController();
    this.activeAnalysis = abortController;
    const request = observation.analysisRequest;
    this.persist('request', command.type, request, null, null);
    this.analyzer
      .analyze(request, { signal: abortController.signal })
      .then(response => {
        if (this.closed || !this.state || !this.currentSession) {
          return;
        }
        const accepted = acceptBehaviorAnalysisResult(
          this.state,
          response,
          this.currentSession,
        );
        this.state = accepted.state;
        this.persist(
          'result',
          command.type,
          request,
          response.status,
          accepted.diagnostic,
          response.diagnostics,
        );
        if (accepted.diagnostic.finality === 'provisional') {
          this.scheduleSettlement();
        } else if (
          accepted.diagnostic.attribution.attributionEligibility.status ===
          'eligible'
        ) {
          this.lastFinalizedSegmentId = accepted.diagnostic.segmentId;
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (this.activeAnalysis === abortController) {
          this.activeAnalysis = null;
        }
      });
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.cancelPendingWork();
  }

  private scheduleSettlement(): void {
    this.clearSettleTimer();
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      if (!this.state || this.closed) {
        return;
      }
      const finalized = finalizeBehaviorSegment(this.state);
      this.state = finalized.state;
      if (finalized.diagnostic) {
        this.persist(
          'segment_finalized',
          null,
          null,
          null,
          finalized.diagnostic,
        );
        if (
          finalized.diagnostic.attribution.attributionEligibility.status ===
          'eligible'
        ) {
          this.lastFinalizedSegmentId = finalized.diagnostic.segmentId;
        }
      }
    }, this.settleDelayMs);
  }

  private persist(
    phase: BehaviorShadowRecord['phase'],
    sourceCommandType: GameCommand['type'] | null,
    request: GrowthAnalysisRequest | null,
    responseStatus: string | null,
    diagnostic: BehaviorDiagnostic | null,
    analysisDiagnostics: GrowthAnalysisDiagnostics | null = null,
  ): void {
    const sessionId =
      request?.sessionId ??
      this.state?.sessionId ??
      this.currentSession?.state.sessionId;
    if (!sessionId) {
      return;
    }
    const sequence = this.nextRecordSequence++;
    this.sink
      .save({
        recordId: `${this.createRecordId()}:${sequence}`,
        recordedAtEpochMs: this.now(),
        phase,
        sessionId,
        segmentId: request?.segmentId ?? diagnostic?.segmentId ?? null,
        sourceCommandType,
        request,
        responseStatus,
        analysisDiagnostics,
        diagnostic,
      })
      .catch(() => undefined);
  }

  private cancelPendingWork(): void {
    this.activeAnalysis?.abort();
    this.activeAnalysis = null;
    this.clearSettleTimer();
  }

  private ineligibleDiagnostic(
    segmentId: string,
    reason: AttributionIneligibilityReason,
  ): BehaviorDiagnostic {
    return {
      segmentId,
      finality: 'final',
      attribution: {
        candidateTechniques: [],
        automaticTechnique: null,
        selectedTechnique: null,
        attributionEligibility: { status: 'ineligible', reason },
      },
    };
  }

  private clearSettleTimer(): void {
    if (this.settleTimer !== null) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }
}
