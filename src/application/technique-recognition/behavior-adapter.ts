import {
  GameCommand,
  GameCommandResult,
  GameSession,
} from '../../domain/game/contracts';
import { candidateMoveChanges } from '../../domain/game/candidate-move';
import {
  createBoardFingerprint,
  hasCandidate,
  removeCandidate,
} from '../../domain/sudoku/board';
import {
  BoardFingerprint,
  CandidateGrid,
  Digit,
} from '../../domain/sudoku/contracts';
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
  sourceAssists,
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
): { effects: NormalizedPlayerEffect[]; invalid: boolean } {
  if (command.type === 'edit_candidates') {
    const move =
      result.historyChange?.kind === 'append'
        ? result.historyChange.move
        : null;
    const effects: NormalizedPlayerEffect[] = move
      ? candidateMoveChanges(move)
          .filter(change => change.action === 'remove')
          .map(({ cell, digit }) => ({ kind: 'elimination', cell, digit }))
      : [];
    return {
      effects,
      invalid: effects.some(
        effect =>
          !hasCandidate(state.growthCandidates[effect.cell], effect.digit),
      ),
    };
  }
  if (command.type === 'input_digit') {
    const cell = before.state.selectedCell;
    if (cell === null) {
      return { effects: [], invalid: false };
    }
    if (!before.state.candidates.pencilMode) {
      return result.session.state.incorrectCells.includes(cell)
        ? { effects: [], invalid: true }
        : {
            effects: [{ kind: 'placement', cell, digit: command.digit }],
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
      return { effects: [], invalid: false };
    }
    return hasCandidate(state.growthCandidates[cell], command.digit)
      ? {
          effects: [{ kind: 'elimination', cell, digit: command.digit }],
          invalid: false,
        }
      : { effects: [], invalid: true };
  }
  return { effects: [], invalid: false };
}

function retractedCandidateSegments(
  state: BehaviorRecognitionState,
  before: GameSession,
  command: GameCommand,
  result: GameCommandResult,
): string[] {
  if (command.type === 'edit_candidates') {
    const move =
      result.historyChange?.kind === 'append'
        ? result.historyChange.move
        : null;
    return move
      ? [
          ...new Set(
            candidateMoveChanges(move)
              .filter(change => change.action === 'add')
              .map(
                change =>
                  state.candidateRemovalSegments[
                    `${change.cell}:${change.digit}`
                  ],
              )
              .filter((id): id is string => id !== undefined),
          ),
        ]
      : [];
  }
  const cell = before.state.selectedCell;
  if (command.type !== 'input_digit' || cell === null) {
    return [];
  }
  if (!before.state.candidates.pencilMode) {
    // A correct placement of a previously deleted digit retracts that deletion,
    // even if the player never explicitly restored the pencil mark.
    return before.state.values[cell] === null &&
      !result.session.state.incorrectCells.includes(cell)
      ? [state.candidateRemovalSegments[`${cell}:${command.digit}`]].filter(
          (id): id is string => id !== undefined,
        )
      : [];
  }
  const field =
    before.state.candidates.activeCandidateSource === 'manual'
      ? 'manualCandidates'
      : 'quickCandidates';
  const added =
    !hasCandidate(before.state.candidates[field][cell], command.digit) &&
    hasCandidate(result.session.state.candidates[field][cell], command.digit);
  return added
    ? [state.candidateRemovalSegments[`${cell}:${command.digit}`]].filter(
        (id): id is string => id !== undefined,
      )
    : [];
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
    command.type === 'edit_candidates' ||
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
          command.type !== 'abandon',
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
        ...advanceCandidateFacts(state, before, result.session),
        segment: null,
      },
      analysisRequest: null,
      diagnostics: diagnostic,
    };
  }

  const restoredSegments = retractedCandidateSegments(
    state,
    before,
    command,
    result,
  );
  if (restoredSegments.length) {
    // Re-adding a deleted candidate retracts that evidence, even after settlement.
    // Rebuild from values, never from the player's potentially incomplete notes.
    const segmentIds = new Set(restoredSegments);
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
    // Retraction invalidates its segment, not unrelated accepted deletions.
    // Reapply only tracked facts; UI pencil masks are never analysis evidence.
    const candidates = [...restoredState.growthCandidates];
    for (const key of Object.keys(candidateRemovalSegments)) {
      const [cell, digit] = key.split(':').map(Number);
      candidates[cell] = removeCandidate(candidates[cell], digit as Digit);
    }
    restoredState.growthCandidates = candidates;
    const diagnostics = [...segmentIds].map(id =>
      ineligible(id, 'restore_polluted'),
    );
    const continued = observeAcceptedGameCommand(
      restoredState,
      before,
      command,
      result,
    );
    return {
      ...continued,
      diagnostics: [...diagnostics, ...continued.diagnostics],
    };
  }

  const normalized = playerEffect(state, before, command, result);
  if (normalized.invalid) {
    const segmentId = state.segment?.id ?? null;
    return {
      state: {
        ...state,
        ...advanceCandidateFacts(state, before, result.session),
        segment: null,
      },
      analysisRequest: null,
      diagnostics: [ineligible(segmentId, 'invalid_effect')],
    };
  }
  if (!normalized.effects.length) {
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
    effects: [...segment.effects, ...normalized.effects],
    provisionalAttribution: null,
    closed: normalized.effects.some(effect => effect.kind === 'placement'),
    hintAssistance: {
      ...segment.hintAssistance,
      affectedEffects: [
        ...segment.hintAssistance.affectedEffects,
        ...normalized.effects.filter(effect =>
          working.knownHintSources.some(source =>
            sourceAssists(source, effect),
          ),
        ),
      ],
    },
  };

  let growthCandidates = [...working.growthCandidates];
  let candidateRemovalSegments = { ...working.candidateRemovalSegments };
  if (normalized.effects.every(effect => effect.kind === 'elimination')) {
    working = {
      ...working,
      knownHintSources: rebuildHintAssistance(
        result.session,
        working.knownHintSources,
      ).knownHintSources,
    };
    for (const effect of normalized.effects) {
      candidateRemovalSegments[`${effect.cell}:${effect.digit}`] = segment.id;
      growthCandidates[effect.cell] = removeCandidate(
        growthCandidates[effect.cell],
        effect.digit,
      );
    }
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

/** Keep only accepted deletion facts whose originating moves and board premises
 * survive. An incorrect placement and its undo must not erase unrelated facts.
 * UI pencil masks never supply analysis facts; they only identify move effects.
 */
function advanceCandidateFacts(
  state: BehaviorRecognitionState,
  before: GameSession,
  after: GameSession,
  retain = true,
): HintAssistanceState &
  Pick<BehaviorRecognitionState, 'candidateRemovalSegments'> {
  const assistance = rebuildHintAssistance(after, state.knownHintSources);
  const invalidSegments = new Set<string>();
  for (const [key, segment] of Object.entries(state.candidateRemovalSegments)) {
    const [cell, digit] = key.split(':').map(Number);
    if (
      after.state.values[cell] === digit &&
      !after.state.incorrectCells.includes(cell)
    )
      invalidSegments.add(segment);
  }
  const candidateRemovalSegments = Object.fromEntries(
    Object.entries(state.candidateRemovalSegments).filter(([key, segment]) => {
      if (
        !retain ||
        before.state.sessionId !== after.state.sessionId ||
        invalidSegments.has(segment)
      )
        return false;
      const [cell, digit] = key.split(':').map(Number);
      if (after.state.values[cell] !== null) return false;
      const origin = [...after.history]
        .reverse()
        .find(move =>
          candidateMoveChanges(move).some(
            change => change.cell === cell && change.digit === digit,
          ),
        );
      if (!origin) return false;
      return (
        candidateMoveChanges(origin).some(
          change =>
            change.cell === cell &&
            change.digit === digit &&
            change.action === 'remove',
        ) &&
        origin.before.values.every(
          (value, index) =>
            value === null || after.state.values[index] === value,
        )
      );
    }),
  );
  const growthCandidates = [...assistance.growthCandidates];
  for (const key of Object.keys(candidateRemovalSegments)) {
    const [cell, digit] = key.split(':').map(Number);
    growthCandidates[cell] = removeCandidate(
      growthCandidates[cell],
      digit as Digit,
    );
  }
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
