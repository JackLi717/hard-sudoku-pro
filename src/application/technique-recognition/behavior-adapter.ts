import {
  GameCommand,
  GameCommandResult,
  GameSession,
} from '../../domain/game/contracts';
import {
  createBoardFingerprint,
  createSolverCandidates,
  hasCandidate,
  removeCandidate,
} from '../../domain/sudoku/board';
import { BoardFingerprint, CandidateGrid } from '../../domain/sudoku/contracts';
import {
  AttributionIneligibilityReason,
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  NormalizedPlayerEffect,
  TechniqueAttribution,
  attributionFromAnalysis,
} from '../../domain/technique-recognition/contracts';

type OpenBehaviorSegment = {
  id: string;
  startingRevision: number;
  startingBoardFingerprint: BoardFingerprint;
  startingGrowthCandidates: CandidateGrid;
  effects: readonly NormalizedPlayerEffect[];
  requestId: string | null;
  issuedRevision: number | null;
  expectedBoardFingerprint: BoardFingerprint | null;
  provisionalAttribution: TechniqueAttribution | null;
  closed: boolean;
};

export type BehaviorRecognitionState = {
  sessionId: string;
  growthCandidates: CandidateGrid;
  nextSegmentSequence: number;
  nextRequestSequence: number;
  segment: OpenBehaviorSegment | null;
};

export type BehaviorDiagnostic = {
  segmentId: string | null;
  finality: 'provisional' | 'final';
  attribution: TechniqueAttribution;
};

export type BehaviorObservation = {
  state: BehaviorRecognitionState;
  analysisRequest: GrowthAnalysisRequest | null;
  diagnostics: readonly BehaviorDiagnostic[];
};

function ineligible(
  segmentId: string | null,
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

export function createBehaviorRecognitionState(
  session: GameSession,
): BehaviorRecognitionState {
  return {
    sessionId: session.state.sessionId,
    growthCandidates: createSolverCandidates(session.state.values),
    nextSegmentSequence: 1,
    nextRequestSequence: 1,
    segment: null,
  };
}

function startSegment(
  state: BehaviorRecognitionState,
  before: GameSession,
): [BehaviorRecognitionState, OpenBehaviorSegment] {
  const segment: OpenBehaviorSegment = {
    id: `segment-${state.nextSegmentSequence}`,
    startingRevision: before.state.revision,
    startingBoardFingerprint: createBoardFingerprint(before.state.values),
    startingGrowthCandidates: [...state.growthCandidates],
    effects: [],
    requestId: null,
    issuedRevision: null,
    expectedBoardFingerprint: null,
    provisionalAttribution: null,
    closed: false,
  };
  return [
    { ...state, nextSegmentSequence: state.nextSegmentSequence + 1, segment },
    segment,
  ];
}

function issueAnalysis(
  state: BehaviorRecognitionState,
  session: GameSession,
  segment: OpenBehaviorSegment,
): BehaviorObservation {
  const requestId = `growth-${state.nextRequestSequence}`;
  const expectedBoardFingerprint = createBoardFingerprint(session.state.values);
  const updatedSegment = {
    ...segment,
    requestId,
    issuedRevision: session.state.revision,
    expectedBoardFingerprint,
  };
  const request: GrowthAnalysisRequest = {
    requestId,
    sessionId: state.sessionId,
    segmentId: segment.id,
    startingRevision: segment.startingRevision,
    issuedRevision: session.state.revision,
    startingBoardFingerprint: segment.startingBoardFingerprint,
    expectedBoardFingerprint,
    growthCandidates: segment.startingGrowthCandidates,
    givenCells: session.state.givens.map(value => value !== null),
    observedEffects: segment.effects,
  };
  return {
    state: {
      ...state,
      nextRequestSequence: state.nextRequestSequence + 1,
      segment: updatedSegment,
    },
    analysisRequest: request,
    diagnostics: [],
  };
}

function pollutionReason(
  command: GameCommand,
): AttributionIneligibilityReason | null {
  switch (command.type) {
    case 'prepare_hint':
    case 'reveal_hint':
    case 'apply_hint':
      return 'hint_polluted';
    case 'undo':
      return 'undo_polluted';
    case 'pause':
    case 'resume':
    case 'abandon':
      return 'revision_expired';
    default:
      return null;
  }
}

function playerEffect(
  state: BehaviorRecognitionState,
  before: GameSession,
  command: GameCommand,
  result: GameCommandResult,
): { effect: NormalizedPlayerEffect | null; invalid: boolean } {
  if (command.type === 'input_digit') {
    const cell = before.state.selectedCell;
    if (cell === null) {
      return { effect: null, invalid: false };
    }
    if (!before.state.candidates.pencilMode) {
      return result.session.state.incorrectCells.includes(cell)
        ? { effect: null, invalid: true }
        : {
            effect: { kind: 'placement', cell, digit: command.digit },
            invalid: false,
          };
    }

    const source = before.state.candidates.activeCandidateSource;
    const candidates =
      source === 'manual'
        ? before.state.candidates.manualCandidates
        : before.state.candidates.quickCandidates;
    const removed =
      hasCandidate(candidates[cell], command.digit) &&
      !hasCandidate(
        source === 'manual'
          ? result.session.state.candidates.manualCandidates[cell]
          : result.session.state.candidates.quickCandidates[cell],
        command.digit,
      );
    if (!removed) {
      return { effect: null, invalid: false };
    }
    return hasCandidate(state.growthCandidates[cell], command.digit)
      ? {
          effect: { kind: 'elimination', cell, digit: command.digit },
          invalid: false,
        }
      : { effect: null, invalid: true };
  }
  return { effect: null, invalid: false };
}

export function observeAcceptedGameCommand(
  state: BehaviorRecognitionState,
  before: GameSession,
  command: GameCommand,
  result: GameCommandResult,
): BehaviorObservation {
  if (!result.accepted || before.state.sessionId !== state.sessionId) {
    return { state, analysisRequest: null, diagnostics: [] };
  }

  const pollution = pollutionReason(command);
  if (pollution !== null) {
    const diagnostic = state.segment
      ? [ineligible(state.segment.id, pollution)]
      : [];
    return {
      state: {
        ...state,
        growthCandidates: createSolverCandidates(result.session.state.values),
        segment: null,
      },
      analysisRequest: null,
      diagnostics: diagnostic,
    };
  }

  if (command.type === 'generate_quick_draft') {
    return { state, analysisRequest: null, diagnostics: [] };
  }
  if (command.type === 'erase') {
    const diagnostic = state.segment
      ? [ineligible(state.segment.id, 'restore_polluted')]
      : [];
    return {
      state: {
        ...state,
        growthCandidates: createSolverCandidates(result.session.state.values),
        segment: null,
      },
      analysisRequest: null,
      diagnostics: diagnostic,
    };
  }

  const normalized = playerEffect(state, before, command, result);
  if (normalized.invalid) {
    const segmentId = state.segment?.id ?? null;
    return {
      state: {
        ...state,
        growthCandidates: createSolverCandidates(result.session.state.values),
        segment: null,
      },
      analysisRequest: null,
      diagnostics: [ineligible(segmentId, 'invalid_effect')],
    };
  }
  if (normalized.effect === null) {
    return { state, analysisRequest: null, diagnostics: [] };
  }

  const diagnostics: BehaviorDiagnostic[] = [];
  let working = state;
  let segment = state.segment;
  if (segment?.closed) {
    diagnostics.push(ineligible(segment.id, 'rapid_operation_polluted'));
    segment = null;
    working = { ...working, segment: null };
  }
  if (segment === null) {
    [working, segment] = startSegment(working, before);
  }
  segment = {
    ...segment,
    effects: [...segment.effects, normalized.effect],
    provisionalAttribution: null,
    closed: normalized.effect.kind === 'placement',
  };

  let growthCandidates = [...working.growthCandidates];
  if (normalized.effect.kind === 'elimination') {
    growthCandidates[normalized.effect.cell] = removeCandidate(
      growthCandidates[normalized.effect.cell],
      normalized.effect.digit,
    );
  } else {
    growthCandidates = [...createSolverCandidates(result.session.state.values)];
  }
  const observation = issueAnalysis(
    { ...working, growthCandidates, segment },
    result.session,
    segment,
  );
  return { ...observation, diagnostics };
}

export function invalidateForRestore(
  state: BehaviorRecognitionState,
  restored: GameSession,
): BehaviorObservation {
  return {
    state: createBehaviorRecognitionState(restored),
    analysisRequest: null,
    diagnostics: state.segment
      ? [ineligible(state.segment.id, 'restore_polluted')]
      : [],
  };
}

export function acceptBehaviorAnalysisResult(
  state: BehaviorRecognitionState,
  response: GrowthAnalysisResponse,
  current: GameSession,
): { state: BehaviorRecognitionState; diagnostic: BehaviorDiagnostic } {
  const segment = state.segment;
  if (
    segment === null ||
    response.sessionId !== state.sessionId ||
    response.segmentId !== segment.id ||
    response.requestId !== segment.requestId ||
    response.startingRevision !== segment.startingRevision ||
    response.startingBoardFingerprint !== segment.startingBoardFingerprint ||
    response.issuedRevision !== segment.issuedRevision ||
    current.state.revision !== segment.issuedRevision
  ) {
    return {
      state,
      diagnostic: ineligible(response.segmentId, 'revision_expired'),
    };
  }
  if (
    response.expectedBoardFingerprint !== segment.expectedBoardFingerprint ||
    createBoardFingerprint(current.state.values) !==
      segment.expectedBoardFingerprint
  ) {
    return {
      state,
      diagnostic: ineligible(response.segmentId, 'board_fingerprint_mismatch'),
    };
  }

  const attribution = attributionFromAnalysis(response);
  if (!segment.closed) {
    return {
      state: {
        ...state,
        segment: { ...segment, provisionalAttribution: attribution },
      },
      diagnostic: {
        segmentId: segment.id,
        finality: 'provisional',
        attribution,
      },
    };
  }
  return {
    state: { ...state, segment: null },
    diagnostic: {
      segmentId: segment.id,
      finality: 'final',
      attribution,
    },
  };
}

export function finalizeBehaviorSegment(state: BehaviorRecognitionState): {
  state: BehaviorRecognitionState;
  diagnostic: BehaviorDiagnostic | null;
} {
  const segment = state.segment;
  if (segment === null) {
    return { state, diagnostic: null };
  }
  return {
    state: { ...state, segment: null },
    diagnostic: segment.provisionalAttribution
      ? {
          segmentId: segment.id,
          finality: 'final',
          attribution: segment.provisionalAttribution,
        }
      : ineligible(segment.id, 'revision_expired'),
  };
}
