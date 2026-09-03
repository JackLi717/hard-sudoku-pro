import {
  GameCommand,
  GameCommandResult,
  GameSession,
} from '../../domain/game/contracts';
import {
  createBoardFingerprint,
  hasCandidate,
  intersectCandidateMasks,
  removeCandidate,
} from '../../domain/sudoku/board';
import { BoardFingerprint, CandidateGrid } from '../../domain/sudoku/contracts';
import {
  AttributionIneligibilityReason,
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  HintAssistanceContext,
  HintAssistanceSource,
  NormalizedPlayerEffect,
  TechniqueAttribution,
  attributionFromAnalysis,
} from '../../domain/technique-recognition/contracts';
import {
  HintAssistanceState,
  rebuildHintAssistance,
  sameEffect,
} from './hint-assistance';

type OpenBehaviorSegment = {
  id: string;
  startingRevision: number;
  startingBoardFingerprint: BoardFingerprint;
  startingGrowthCandidates: CandidateGrid;
  effects: readonly NormalizedPlayerEffect[];
  requestId: string | null;
  issuedRevision: number | null;
  compatibleRevision: number | null;
  expectedBoardFingerprint: BoardFingerprint | null;
  provisionalAttribution: TechniqueAttribution | null;
  closed: boolean;
  hintAssistance: HintAssistanceContext;
};

export type BehaviorRecognitionState = HintAssistanceState & {
  sessionId: string;
  observationId: string;
  candidateRemovalSegments: Readonly<Record<string, string>>;
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

let nextObservationSequence = 1;

export function createBehaviorRecognitionState(
  session: GameSession,
  rememberedHints: readonly HintAssistanceSource[] = [],
): BehaviorRecognitionState {
  return {
    sessionId: session.state.sessionId,
    observationId: `${session.state.sessionId}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2)}:${nextObservationSequence++}`,
    ...rebuildHintAssistance(session, rememberedHints),
    candidateRemovalSegments: {},
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
    id: `${state.observationId}:segment-${state.nextSegmentSequence}`,
    startingRevision: before.state.revision,
    startingBoardFingerprint: createBoardFingerprint(before.state.values),
    startingGrowthCandidates: [...state.growthCandidates],
    effects: [],
    requestId: null,
    issuedRevision: null,
    compatibleRevision: null,
    expectedBoardFingerprint: null,
    provisionalAttribution: null,
    closed: false,
    hintAssistance: {
      exposureComplete: state.hintExposureComplete,
      appliedSources: state.appliedHintSources,
      knownSources: state.knownHintSources,
      affectedEffects: [],
    },
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
  const requestId = `${state.observationId}:growth-${state.nextRequestSequence}`;
  const expectedBoardFingerprint = createBoardFingerprint(session.state.values);
  const updatedSegment = {
    ...segment,
    requestId,
    issuedRevision: session.state.revision,
    compatibleRevision: session.state.revision,
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
    hintAssistance: segment.hintAssistance,
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

export function pollutionReason(
  command: GameCommand,
): AttributionIneligibilityReason | null {
  switch (command.type) {
    case 'prepare_hint':
    case 'reveal_hint':
    case 'apply_hint':
    case 'complete_full_house':
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

function retractedCandidateSegment(
  state: BehaviorRecognitionState,
  before: GameSession,
  command: GameCommand,
  result: GameCommandResult,
): string | null {
  const cell = before.state.selectedCell;
  if (command.type !== 'input_digit' || cell === null) {
    return null;
  }
  if (!before.state.candidates.pencilMode) {
    // A correct placement of a previously deleted digit retracts that deletion,
    // even if the player never explicitly restored the pencil mark.
    return before.state.values[cell] === null &&
      !result.session.state.incorrectCells.includes(cell)
      ? state.candidateRemovalSegments[`${cell}:${command.digit}`] ?? null
      : null;
  }
  const field =
    before.state.candidates.activeCandidateSource === 'manual'
      ? 'manualCandidates'
      : 'quickCandidates';
  const added =
    !hasCandidate(before.state.candidates[field][cell], command.digit) &&
    hasCandidate(result.session.state.candidates[field][cell], command.digit);
  return added
    ? state.candidateRemovalSegments[`${cell}:${command.digit}`] ?? null
    : null;
}

function acknowledgeNeutralCommand(
  state: BehaviorRecognitionState,
  before: GameSession,
  command: GameCommand,
  result: GameCommandResult,
): BehaviorObservation {
  const segment = state.segment;
  const neutral =
    command.type === 'select_cell' ||
    command.type === 'set_pencil_mode' ||
    command.type === 'set_candidate_source' ||
    command.type === 'generate_quick_draft' ||
    (command.type === 'input_digit' && before.state.candidates.pencilMode);
  // Only an observed, contiguous, evidence-neutral transition can extend the
  // accepted revision. Never rewrite the immutable request's issuedRevision.
  if (
    segment &&
    neutral &&
    before.state.revision === segment.compatibleRevision &&
    result.session.state.sessionId === state.sessionId &&
    result.session.state.revision >= before.state.revision &&
    result.session.state.revision <= before.state.revision + 1 &&
    createBoardFingerprint(before.state.values) ===
      segment.expectedBoardFingerprint &&
    createBoardFingerprint(result.session.state.values) ===
      segment.expectedBoardFingerprint
  ) {
    return {
      state: {
        ...state,
        segment: {
          ...segment,
          compatibleRevision: result.session.state.revision,
        },
      },
      analysisRequest: null,
      diagnostics: [],
    };
  }
  return { state, analysisRequest: null, diagnostics: [] };
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
        ...advanceCandidateFacts(
          state,
          before,
          result.session,
          command.type !== 'undo' && command.type !== 'abandon',
        ),
        segment: null,
      },
      analysisRequest: null,
      diagnostics: diagnostic,
    };
  }

  if (command.type === 'generate_quick_draft') {
    return acknowledgeNeutralCommand(state, before, command, result);
  }
  if (command.type === 'erase') {
    const diagnostic = state.segment
      ? [ineligible(state.segment.id, 'restore_polluted')]
      : [];
    return {
      state: {
        ...state,
        ...rebuildHintAssistance(result.session, state.knownHintSources),
        candidateRemovalSegments: {},
        segment: null,
      },
      analysisRequest: null,
      diagnostics: diagnostic,
    };
  }

  const restoredSegment = retractedCandidateSegment(
    state,
    before,
    command,
    result,
  );
  if (restoredSegment !== null) {
    // Re-adding a deleted candidate retracts that evidence, even after settlement.
    // Rebuild from values, never from the player's potentially incomplete notes.
    const segmentIds = new Set([restoredSegment]);
    if (state.segment) {
      segmentIds.add(state.segment.id);
    }
    const candidateRemovalSegments = Object.fromEntries(
      Object.entries(state.candidateRemovalSegments).filter(
        ([, id]) => !segmentIds.has(id),
      ),
    );
    const restoredState: BehaviorRecognitionState = {
      ...state,
      ...rebuildHintAssistance(before, state.knownHintSources),
      candidateRemovalSegments,
      segment: null,
    };
    const diagnostics = [...segmentIds].map(id =>
      ineligible(id, 'restore_polluted'),
    );
    if (!before.state.candidates.pencilMode) {
      const placement = observeAcceptedGameCommand(
        restoredState,
        before,
        command,
        result,
      );
      return {
        ...placement,
        diagnostics: [...diagnostics, ...placement.diagnostics],
      };
    }
    return {
      state: restoredState,
      analysisRequest: null,
      diagnostics,
    };
  }

  const normalized = playerEffect(state, before, command, result);
  if (normalized.invalid) {
    const segmentId = state.segment?.id ?? null;
    return {
      state: {
        ...state,
        ...rebuildHintAssistance(result.session, state.knownHintSources),
        candidateRemovalSegments: {},
        segment: null,
      },
      analysisRequest: null,
      diagnostics: [ineligible(segmentId, 'invalid_effect')],
    };
  }
  if (normalized.effect === null) {
    return acknowledgeNeutralCommand(state, before, command, result);
  }

  const diagnostics: BehaviorDiagnostic[] = [];
  let working = state;
  let segment = state.segment;
  if (segment?.closed) {
    diagnostics.push(
      ineligible(
        segment.id,
        segment.effects.at(-1)?.kind === 'placement'
          ? 'rapid_operation_polluted'
          : 'analysis_cancelled',
      ),
    );
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
    hintAssistance: {
      ...segment.hintAssistance,
      affectedEffects: working.knownHintSources.some(source =>
        source.assistedEffects.some(effect =>
          sameEffect(effect, normalized.effect!),
        ),
      )
        ? [...segment.hintAssistance.affectedEffects, normalized.effect]
        : segment.hintAssistance.affectedEffects,
    },
  };

  let growthCandidates = [...working.growthCandidates];
  let candidateRemovalSegments = { ...working.candidateRemovalSegments };
  if (normalized.effect.kind === 'elimination') {
    candidateRemovalSegments[
      `${normalized.effect.cell}:${normalized.effect.digit}`
    ] = segment.id;
    growthCandidates[normalized.effect.cell] = removeCandidate(
      growthCandidates[normalized.effect.cell],
      normalized.effect.digit,
    );
  } else {
    const assistance = advanceCandidateFacts(working, before, result.session);
    growthCandidates = [...assistance.growthCandidates];
    candidateRemovalSegments = { ...assistance.candidateRemovalSegments };
    working = { ...working, ...assistance };
  }
  const observation = issueAnalysis(
    { ...working, growthCandidates, candidateRemovalSegments, segment },
    result.session,
    segment,
  );
  return { ...observation, diagnostics };
}

/** An attribution boundary is not necessarily a retraction of candidate facts.
 * Keep only recorded player deletions on a forward board; never copy UI notes.
 * Undo, restore, overwritten premises and contradicted deletions reset facts.
 */
function advanceCandidateFacts(
  state: BehaviorRecognitionState,
  before: GameSession,
  after: GameSession,
  retain = true,
): HintAssistanceState &
  Pick<BehaviorRecognitionState, 'candidateRemovalSegments'> {
  const assistance = rebuildHintAssistance(after, state.knownHintSources);
  const forward =
    retain &&
    before.state.sessionId === after.state.sessionId &&
    before.state.values.every((value, cell) =>
      value !== null
        ? after.state.values[cell] === value
        : after.state.values[cell] === null ||
          !state.candidateRemovalSegments[
            `${cell}:${after.state.values[cell]}`
          ],
    );
  const candidateRemovalSegments = forward
    ? Object.fromEntries(
        Object.entries(state.candidateRemovalSegments).filter(
          ([key]) => after.state.values[Number(key.split(':')[0])] === null,
        ),
      )
    : {};
  const growthCandidates = forward
    ? assistance.growthCandidates.map((mask, cell) =>
        intersectCandidateMasks(mask, state.growthCandidates[cell]),
      )
    : assistance.growthCandidates;
  return { ...assistance, growthCandidates, candidateRemovalSegments };
}

export function invalidateForRestore(
  state: BehaviorRecognitionState,
  restored: GameSession,
): BehaviorObservation {
  return {
    state: createBehaviorRecognitionState(
      restored,
      state.sessionId === restored.state.sessionId
        ? state.knownHintSources
        : [],
    ),
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
    response.requestId !== segment.requestId
  ) {
    // A foreign or superseded response must never erase the current segment.
    return {
      state,
      diagnostic: ineligible(response.segmentId, 'revision_expired'),
    };
  }
  if (
    current.state.sessionId !== state.sessionId ||
    response.startingRevision !== segment.startingRevision ||
    response.startingBoardFingerprint !== segment.startingBoardFingerprint ||
    response.issuedRevision !== segment.issuedRevision ||
    current.state.revision !== segment.compatibleRevision
  ) {
    return {
      state: {
        ...state,
        ...(current.state.sessionId === state.sessionId
          ? rebuildHintAssistance(current, state.knownHintSources)
          : {}),
        candidateRemovalSegments: {},
        segment: null,
      },
      diagnostic: ineligible(response.segmentId, 'revision_expired'),
    };
  }
  if (
    response.expectedBoardFingerprint !== segment.expectedBoardFingerprint ||
    createBoardFingerprint(current.state.values) !==
      segment.expectedBoardFingerprint
  ) {
    return {
      state: {
        ...state,
        ...rebuildHintAssistance(current, state.knownHintSources),
        candidateRemovalSegments: {},
        segment: null,
      },
      diagnostic: ineligible(response.segmentId, 'board_fingerprint_mismatch'),
    };
  }

  const attribution = attributionFromAnalysis(response, segment);
  const terminalFailure =
    response.status !== 'matched' && response.status !== 'no_match';
  if (!segment.closed && !terminalFailure) {
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
