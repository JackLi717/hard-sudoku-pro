import {
  HINT_STEP_CONTRACT_VERSION,
  HintEngineRequest,
  HintStep,
  applyHintStep,
  boardFromFingerprint,
  createHintCandidates,
  digitsFromMask,
  validateHintEngineRequest,
  validateHintStepForState,
} from '../src/domain';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

function createRequest(): HintEngineRequest {
  return {
    contractVersion: HINT_STEP_CONTRACT_VERSION,
    boardFingerprint: puzzle,
    hintCandidates: createHintCandidates(boardFromFingerprint(puzzle)),
  };
}

function createStep(overrides: Partial<HintStep> = {}): HintStep {
  return {
    contractVersion: HINT_STEP_CONTRACT_VERSION,
    boardFingerprint: puzzle,
    techniqueCode: 'nakedSingle',
    difficultyLevel: 1,
    focusCells: [40],
    focusRegions: [{ kind: 'box', index: 4 }],
    premiseCandidates: [{ cell: 40, digit: 5 }],
    eliminations: [],
    placements: [{ cell: 40, digit: 5 }],
    explanationKey: 'hint.nakedSingle',
    explanationParams: { cell: 40, digit: 5 },
    ...overrides,
  };
}

describe('hint candidate state', () => {
  test('creates complete legal candidates independently of player notes', () => {
    const candidates = createRequest().hintCandidates;

    expect(digitsFromMask(candidates[2])).toEqual([1, 2, 4]);
    expect(candidates[0]).toBe(0);
    expect(validateHintEngineRequest(createRequest())).toEqual([]);
  });

  test('applies one placement and removes its digit from peers', () => {
    const result = applyHintStep(createRequest(), createStep(), solution);

    expect(result.boardFingerprint[40]).toBe('5');
    expect(result.hintCandidates[40]).toBe(0);
    expect(digitsFromMask(result.hintCandidates[37])).not.toContain(5);
  });

  test('rejects a placement that contradicts the bundled solution', () => {
    const invalid = createStep({
      premiseCandidates: [{ cell: 40, digit: 2 }],
      placements: [{ cell: 40, digit: 2 }],
    });

    expect(
      validateHintStepForState(createRequest(), invalid, solution),
    ).toContain('placement 40:2 contradicts the solution');
  });

  test('rejects eliminating the solution candidate', () => {
    const invalid = createStep({
      techniqueCode: 'lockedCandidates.pointing',
      difficultyLevel: 2,
      premiseCandidates: [],
      placements: [],
      eliminations: [{ cell: 2, digit: 4 }],
      explanationKey: 'hint.lockedCandidates.pointing',
    });

    expect(
      validateHintStepForState(createRequest(), invalid, solution),
    ).toContain('elimination 2:4 removes the solution');
  });

  test('rejects eliminations that jointly empty a cell', () => {
    const request = createRequest();
    const invalid = createStep({
      techniqueCode: 'nakedPair',
      difficultyLevel: 2,
      focusCells: [2],
      premiseCandidates: [],
      placements: [],
      eliminations: [
        { cell: 2, digit: 1 },
        { cell: 2, digit: 2 },
        { cell: 2, digit: 4 },
      ],
      explanationKey: 'hint.nakedPair',
    });

    expect(validateHintStepForState(request, invalid, solution)).toContain(
      'elimination 2:4 empties the cell',
    );
  });

  test('does not apply a step until it passes the solution safety check', () => {
    const invalid = createStep({
      premiseCandidates: [{ cell: 40, digit: 2 }],
      placements: [{ cell: 40, digit: 2 }],
    });

    expect(() => applyHintStep(createRequest(), invalid, solution)).toThrow(
      'contradicts the solution',
    );
  });

  test('rejects stale candidate state bound to a changed board', () => {
    const request = createRequest();
    const stale: HintEngineRequest = {
      ...request,
      boardFingerprint: `9${request.boardFingerprint.slice(1)}`,
    };

    expect(validateHintEngineRequest(stale).length).toBeGreaterThan(0);
  });

  test('validates immutable given-cell metadata', () => {
    const request = createRequest();
    const valid = {
      ...request,
      givenCells: [...puzzle].map(value => value !== '0'),
    };
    expect(validateHintEngineRequest(valid)).toEqual([]);

    const invalid = { ...valid, givenCells: [...valid.givenCells] };
    invalid.givenCells[2] = true;
    expect(validateHintEngineRequest(invalid)).toContain(
      'given cell 2 must contain a digit',
    );
  });
});
