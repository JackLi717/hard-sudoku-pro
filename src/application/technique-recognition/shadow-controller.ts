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
  pollutionReason,
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

type PendingAnalysis = {
  request: GrowthAnalysisRequest;
  abort: AbortController;
  timer: TimerHandle;
  expiresAtEpochMs: number;
  sealed: { state: BehaviorRecognitionState; session: GameSession } | null;
};

export class BehaviorShadowController implements AcceptedGameCommandObserver {
  private state: BehaviorRecognitionState | null = null;
  private currentSession: GameSession | null = null;
  private readonly pending = new Map<string, PendingAnalysis>();
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
    this.cancelPendingAnalyses('restore_polluted');
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
    if (
      !this.state ||
      this.state.sessionId !== before.state.sessionId ||
      this.currentSession?.state.revision !== before.state.revision
    ) {
      this.attach(before);
    }
    for (const job of this.pending.values()) {
      if (this.now() >= job.expiresAtEpochMs)
        this.cancelAnalysis(job, 'analysis_cancelled');
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
    const diagnosticEligibility = observation.diagnostics.find(
      diagnostic =>
        diagnostic.attribution.attributionEligibility.status === 'ineligible',
    )?.attribution.attributionEligibility;
    const interruption =
      pollutionReason(command) ??
      (command.type === 'erase' ? 'restore_polluted' : null) ??
      (diagnosticEligibility?.status === 'ineligible'
        ? diagnosticEligibility.reason
        : null);
    if (interruption) {
      this.cancelPendingAnalyses(interruption);
    }
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
      return;
    }

    const abortController = new AbortController();
    const request = observation.analysisRequest;
    // Only a newer cumulative request for the SAME open segment supersedes work.
    for (const job of this.pending.values()) {
      if (job.request.segmentId === request.segmentId) this.removePending(job);
    }
    if (this.pending.size >= 32) {
      this.cancelAnalysis(
        this.pending.values().next().value!,
        'analysis_cancelled',
      );
    }
    const job: PendingAnalysis = {
      request,
      abort: abortController,
      timer: setTimeout(
        () => this.cancelAnalysis(job, 'analysis_cancelled'),
        30_000,
      ),
      sealed: null,
      expiresAtEpochMs: this.now() + 30_000,
    };
    this.pending.set(request.requestId, job);
    if (command.type === 'input_digit') {
      this.segmentByMoveId.set(command.moveId, request.segmentId);
    }
    this.persist('request', command.type, request, null, null);
    if (!this.state.segment?.closed) {
      this.scheduleSettlement(request.requestId);
    } else {
      this.sealPendingSegment();
    }
    const receive = (response: GrowthAnalysisResponse) => {
      if (this.now() >= job.expiresAtEpochMs)
        this.cancelAnalysis(job, 'analysis_cancelled');
      if (
        this.closed ||
        !this.state ||
        !this.currentSession ||
        !this.pending.has(request.requestId)
      ) {
        return;
      }
      const accepted = acceptBehaviorAnalysisResult(
        job.sealed?.state ?? this.state,
        response,
        job.sealed?.session ?? this.currentSession,
      );
      // Historical validation never replaces the live board/candidate state.
      if (!job.sealed) this.state = accepted.state;
      this.pending.delete(request.requestId);
      clearTimeout(job.timer);
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
    const failed = () =>
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
      });
    try {
      this.analyzer
        .analyze(request, { signal: abortController.signal })
        .then(receive, failed);
    } catch {
      failed();
    }
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
      this.sealPendingSegment();
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
    this.cancelPendingAnalyses('revision_expired');
    this.clearSettleTimer();
  }

  private sealPendingSegment(): void {
    const segment = this.state?.segment;
    const job = segment?.requestId ? this.pending.get(segment.requestId) : null;
    if (!job || !this.state || !this.currentSession) return;
    job.sealed = { state: this.state, session: this.currentSession };
    this.state = { ...this.state, segment: null };
  }

  private removePending(job: PendingAnalysis): void {
    this.pending.delete(job.request.requestId);
    clearTimeout(job.timer);
    job.abort.abort();
  }

  private cancelAnalysis(
    job: PendingAnalysis,
    reason: AttributionIneligibilityReason,
  ): void {
    if (!this.pending.has(job.request.requestId)) return;
    this.removePending(job);
    if (this.state?.segment?.requestId === job.request.requestId) {
      this.state = { ...this.state, segment: null };
      this.clearSettleTimer();
    }
    this.persist(
      'invalidation',
      null,
      job.request,
      null,
      this.ineligibleDiagnostic(job.request.segmentId, reason),
    );
  }

  private cancelPendingAnalyses(reason: AttributionIneligibilityReason): void {
    for (const job of this.pending.values()) this.cancelAnalysis(job, reason);
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
