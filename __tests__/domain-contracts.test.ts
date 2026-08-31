import {
  ALL_CANDIDATES_MASK,
  HINT_STEP_CONTRACT_VERSION,
  HintStep,
  TECHNIQUES,
  addCandidate,
  boardFromFingerprint,
  candidateMaskFor,
  createBoardFingerprint,
  digitsFromMask,
  hasCandidate,
  removeCandidate,
  validateHintStep,
} from '../src/domain';

describe('board contract', () => {
  test('round-trips the canonical 81-cell fingerprint', () => {
    const board = Array.from({ length: 81 }, (_, index) =>
      index === 0 ? 9 : null,
    );

    const fingerprint = createBoardFingerprint(board);

    expect(fingerprint).toHaveLength(81);
    expect(fingerprint.startsWith('9')).toBe(true);
    expect(boardFromFingerprint(fingerprint)).toEqual(board);
  });

  test('rejects a malformed board fingerprint', () => {
    expect(() => boardFromFingerprint('0'.repeat(80))).toThrow(
      'exactly 81 digits',
    );
  });
});

describe('candidate mask contract', () => {
  test('uses one stable bit for each digit', () => {
    const withTwo = addCandidate(0, 2);
    const withTwoAndNine = addCandidate(withTwo, 9);

    expect(candidateMaskFor(2)).toBe(0b10);
    expect(hasCandidate(withTwoAndNine, 2)).toBe(true);
    expect(hasCandidate(withTwoAndNine, 9)).toBe(true);
    expect(digitsFromMask(withTwoAndNine)).toEqual([2, 9]);
    expect(removeCandidate(withTwoAndNine, 2)).toBe(candidateMaskFor(9));
    expect(ALL_CANDIDATES_MASK).toBe(511);
  });
});

describe('hint contract', () => {
  const baseStep: HintStep = {
    contractVersion: HINT_STEP_CONTRACT_VERSION,
    boardFingerprint: '0'.repeat(81),
    techniqueCode: 'nakedSingle',
    difficultyLevel: 1,
    focusCells: [0],
    focusRegions: [{ kind: 'box', index: 0 }],
    premiseCandidates: [{ cell: 0, digit: 7 }],
    eliminations: [],
    placements: [{ cell: 0, digit: 7 }],
    explanationKey: 'hint.nakedSingle',
    explanationParams: { cell: 0, digit: 7 },
  };

  test('accepts one independently applicable placement', () => {
    expect(validateHintStep(baseStep)).toEqual([]);
  });

  test('rejects a hint that mixes placement and elimination', () => {
    const invalidStep: HintStep = {
      ...baseStep,
      eliminations: [{ cell: 1, digit: 7 }],
    };

    expect(validateHintStep(invalidStep)).toContain(
      'an atomic hint cannot mix eliminations and placements',
    );
  });

  test('keeps technique codes and translation keys unique', () => {
    expect(new Set(TECHNIQUES.map(item => item.code)).size).toBe(
      TECHNIQUES.length,
    );
    expect(new Set(TECHNIQUES.map(item => item.nameKey)).size).toBe(
      TECHNIQUES.length,
    );
  });
});
