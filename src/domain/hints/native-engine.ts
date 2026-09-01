import NativeHintEngine, {
  Spec as NativeHintEngineModule,
} from '../../native/NativeHintEngine';
import { HintEngineRequest, HintEngineResult, HintStep } from './contracts';
import {
  validateHintEngineRequest,
  validateHintStepForState,
} from './candidate-state';
import { HintEngine, HintEngineOptions } from './engine';

type NativeCancelledResult = {
  status: 'cancelled';
  reasonKey: string;
};

export class HintCancelledError extends Error {
  constructor() {
    super('The hint request was cancelled.');
    this.name = 'HintCancelledError';
  }
}

export class NativeHintEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NativeHintEngineError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCandidate(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.cell === 'number' &&
    typeof value.digit === 'number'
  );
}

function isRegion(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.kind === 'string' &&
    typeof value.index === 'number'
  );
}

function isProofStep(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.kind === 'string' &&
    typeof value.reason === 'string' &&
    Array.isArray(value.focusCells) &&
    value.focusCells.every(cell => typeof cell === 'number') &&
    Array.isArray(value.focusRegions) &&
    value.focusRegions.every(isRegion) &&
    Array.isArray(value.premiseCandidates) &&
    value.premiseCandidates.every(isCandidate) &&
    Array.isArray(value.valueEvidence) &&
    value.valueEvidence.every(isCandidate) &&
    Array.isArray(value.eliminations) &&
    value.eliminations.every(isCandidate) &&
    Array.isArray(value.placements) &&
    value.placements.every(isCandidate)
  );
}

function isHintStepShape(value: unknown): value is HintStep {
  return (
    isRecord(value) &&
    typeof value.contractVersion === 'number' &&
    typeof value.boardFingerprint === 'string' &&
    typeof value.techniqueCode === 'string' &&
    typeof value.difficultyLevel === 'number' &&
    Array.isArray(value.focusCells) &&
    value.focusCells.every(cell => typeof cell === 'number') &&
    Array.isArray(value.focusRegions) &&
    value.focusRegions.every(isRegion) &&
    Array.isArray(value.premiseCandidates) &&
    value.premiseCandidates.every(isCandidate) &&
    Array.isArray(value.eliminations) &&
    value.eliminations.every(isCandidate) &&
    Array.isArray(value.placements) &&
    value.placements.every(isCandidate) &&
    (value.proofSteps === undefined ||
      (Array.isArray(value.proofSteps) &&
        value.proofSteps.every(isProofStep))) &&
    (value.humanCost === undefined || typeof value.humanCost === 'number') &&
    typeof value.explanationKey === 'string' &&
    isRecord(value.explanationParams)
  );
}

function parseNativeResult(
  encoded: string,
): HintEngineResult | NativeCancelledResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    throw new NativeHintEngineError(
      'The native hint engine returned invalid JSON.',
    );
  }

  if (!isRecord(parsed) || typeof parsed.status !== 'string') {
    throw new NativeHintEngineError(
      'The native hint engine returned an invalid result.',
    );
  }
  if (parsed.status === 'step' && isHintStepShape(parsed.step)) {
    return { status: 'step', step: parsed.step };
  }
  if (
    ['invalid_board', 'no_supported_step', 'solved', 'cancelled'].includes(
      parsed.status,
    ) &&
    typeof parsed.reasonKey === 'string'
  ) {
    return parsed as HintEngineResult | NativeCancelledResult;
  }
  throw new NativeHintEngineError(
    'The native hint engine returned an invalid result.',
  );
}

let nextRequestSequence = 0;

export class ReactNativeHintEngine implements HintEngine {
  constructor(
    private readonly nativeModule: NativeHintEngineModule = NativeHintEngine,
  ) {}

  async nextStep(
    request: HintEngineRequest,
    options: HintEngineOptions = {},
  ): Promise<HintEngineResult> {
    const validationErrors = validateHintEngineRequest(request);
    if (validationErrors.length > 0) {
      return {
        status: 'invalid_board',
        reasonKey: 'hint.invalidBoard.requestValidation',
      };
    }
    if (options.signal?.aborted) {
      throw new HintCancelledError();
    }

    nextRequestSequence += 1;
    const requestId = `hint-${nextRequestSequence}`;
    const cancel = () => this.nativeModule.cancel(requestId);
    options.signal?.addEventListener('abort', cancel, { once: true });

    try {
      const encoded = await this.nativeModule.nextStep(
        requestId,
        request.boardFingerprint,
        request.hintCandidates.join(','),
        request.givenCells?.map(value => (value ? '1' : '0')).join('') ?? '',
      );
      const result = parseNativeResult(encoded);
      if (result.status === 'cancelled' || options.signal?.aborted) {
        throw new HintCancelledError();
      }
      if (result.status === 'step') {
        const stepErrors = validateHintStepForState(request, result.step);
        if (stepErrors.length > 0) {
          throw new NativeHintEngineError(
            `Native hint step failed validation: ${stepErrors.join('; ')}`,
          );
        }
      }
      return result;
    } finally {
      options.signal?.removeEventListener('abort', cancel);
    }
  }
}

export const hintEngine: HintEngine = new ReactNativeHintEngine();
