import {
  GameCommand,
  GameCommandResult,
  GameSession,
} from '../../domain/game/contracts';
import {
  AttributionIneligibilityReason,
  GrowthAnalysisDiagnostics,
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
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
  private settleDeadlineEpochMs: number | null = null;
  private nextRecordSequence = 1;
  private readonly segmentByMoveId = new Map<string, string>();
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
    this.state = createBehaviorRecognitionState(
      session,
      this.state?.sessionId === session.state.sessionId
        ? this.state.knownHintSources
        : [],
    );
    this.segmentByMoveId.clear();
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
    if (
      this.settleDeadlineEpochMs !== null &&
      this.now() >= this.settleDeadlineEpochMs &&
      this.state?.segment?.requestId
    ) {
      // JS timer delivery can itself be delayed. Check the deadline before
      // considering new evidence, rather than relying only on setTimeout.
      this.finishIdleSegment(this.state.segment.requestId);
    }
    this.currentSession = result.session;

    const observation = observeAcceptedGameCommand(
      this.state!,
      before,
      command,
      result,
    );
    this.state = observation.state;
    if (observation.analysisRequest || this.state.segment === null) {
      this.clearSettleTimer();
    }
    for (const diagnostic of observation.diagnostics) {
      this.persist('invalidation', command.type, null, null, diagnostic);
    }
    const retractedSegmentId = this.retractedMoveSegment(before, command);
    if (
      retractedSegmentId &&
      !observation.diagnostics.some(
        diagnostic => diagnostic.segmentId === retractedSegmentId,
      )
    ) {
      const reason =
        command.type === 'undo' ? 'undo_polluted' : 'restore_polluted';
      this.persist(
        'invalidation',
        command.type,
        null,
        null,
        this.ineligibleDiagnostic(retractedSegmentId, reason),
      );
    }
    if (!observation.analysisRequest) {
      if (this.state.segment === null) {
        this.activeAnalysis?.abort();
        this.activeAnalysis = null;
      }
      return;
    }

    this.activeAnalysis?.abort();
    const abortController = new AbortController();
    this.activeAnalysis = abortController;
    const request = observation.analysisRequest;
    if (command.type === 'input_digit') {
      this.segmentByMoveId.set(command.moveId, request.segmentId);
    }
    this.persist('request', command.type, request, null, null);
    if (!this.state.segment?.closed) {
      this.scheduleSettlement(request.requestId);
    }
    const receive = (response: GrowthAnalysisResponse) => {
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
      if (this.state.segment === null) {
        this.clearSettleTimer();
      }
    };
    this.analyzer
      .analyze(request, { signal: abortController.signal })
      .then(receive)
      .catch(() =>
        receive({
          ...request,
          status: 'failed',
          candidateTechniques: [],
          diagnostics: {
            opportunityCount: 0,
            opportunitySetComplete: false,
            usedExpandedSearch: false,
            reachedEnumerationLimitTechniques: [],
          },
        }),
      )
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

  private scheduleSettlement(requestId: string): void {
    this.clearSettleTimer();
    this.settleDeadlineEpochMs = this.now() + this.settleDelayMs;
    this.settleTimer = setTimeout(
      () => this.finishIdleSegment(requestId),
      this.settleDelayMs,
    );
  }

  private finishIdleSegment(requestId: string): void {
    if (
      !this.state ||
      this.closed ||
      this.state.segment?.requestId !== requestId
    ) {
      return;
    }
    this.clearSettleTimer();
    if (!this.state.segment.provisionalAttribution) {
      // Seal the evidence at the idle deadline even if native is still busy.
      // Its eventual response may finish this segment, never append to it.
      this.state = {
        ...this.state,
        segment: { ...this.state.segment, closed: true },
      };
      return;
    }
    const finalized = finalizeBehaviorSegment(this.state);
    this.state = finalized.state;
    if (finalized.diagnostic) {
      this.persist('segment_finalized', null, null, null, finalized.diagnostic);
    }
  }

  private retractedMoveSegment(
    before: GameSession,
    command: GameCommand,
  ): string | null {
    if (command.type === 'undo') {
      const move = before.history.at(-1);
      return move ? this.segmentByMoveId.get(move.id) ?? null : null;
    }
    const cell = before.state.selectedCell;
    if (
      command.type !== 'erase' ||
      cell === null ||
      before.state.values[cell] === null
    ) {
      return null;
    }
    // Follow the last value-changing move for THIS cell, including unrecognized
    // wrong inputs and hint placements. Never fall back to another cell's result.
    const move = [...before.history]
      .reverse()
      .find(
        candidate =>
          candidate.before.values[cell] !== candidate.after.values[cell],
      );
    return move ? this.segmentByMoveId.get(move.id) ?? null : null;
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
    this.settleDeadlineEpochMs = null;
    if (this.settleTimer !== null) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }
}
