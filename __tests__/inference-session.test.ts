import {
  addCandidate,
  applyInferenceAction,
  boardFromFingerprint,
  createInferenceSession,
  createSolverCandidates,
  deriveInferenceBranch,
  hasCandidate,
  inferenceConclusion,
  inferenceConclusions,
  inferenceRootForPath,
  removeCandidate,
  undoInferenceAction,
  validateInferenceEntry,
} from '../src/domain';

const puzzle = boardFromFingerprint(
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
);
const solution = boardFromFingerprint(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
);

describe('forcing inference session', () => {
  test('validates visible notes without depending on their completeness', () => {
    const emptyNotes = Array.from({ length: 81 }, () => 0);
    expect(validateInferenceEntry(puzzle, emptyNotes).invalidCells).toEqual([]);

    const illegalNotes = [...emptyNotes];
    illegalNotes[2] = addCandidate(0, 5);
    expect(validateInferenceEntry(puzzle, illegalNotes).invalidCells).toEqual([
      2,
    ]);

    const retained = validateInferenceEntry(puzzle, emptyNotes, [
      { cell: 2, digit: 4 },
    ]);
    expect(retained.invalidCells).toEqual([]);
    expect(hasCandidate(retained.candidateGrid[2], 4)).toBe(false);
    expect(
      hasCandidate(
        validateInferenceEntry(puzzle, emptyNotes).candidateGrid[2],
        4,
      ),
    ).toBe(true);
  });

  test('uses every deletion in a visible Quick draft as an inference premise', () => {
    const rowSixBoard = boardFromFingerprint('0'.repeat(81));
    const quickCandidates = [...createSolverCandidates(rowSixBoard)];
    const affectedCells = [45, 46, 47] as const;
    for (const cell of affectedCells) {
      quickCandidates[cell] = removeCandidate(quickCandidates[cell], 1);
    }

    const validation = validateInferenceEntry(
      rowSixBoard,
      quickCandidates,
      [],
      'visible',
    );

    expect(validation.invalidCells).toEqual([]);
    for (const cell of affectedCells) {
      expect(hasCandidate(validation.candidateGrid[cell], 1)).toBe(false);
    }
  });

  test('creates complementary A/B roots and propagates a true candidate', () => {
    let session = createInferenceSession(puzzle);
    session = applyInferenceAction(session, {
      path: 'a',
      cells: [2],
      digit: 4,
      truth: 'true',
    });

    expect(inferenceRootForPath(session, 'a')).toEqual({
      cell: 2,
      digit: 4,
      truth: 'true',
    });
    expect(inferenceRootForPath(session, 'b')).toEqual({
      cell: 2,
      digit: 4,
      truth: 'false',
    });
    const branchA = deriveInferenceBranch(session, 'a');
    const branchB = deriveInferenceBranch(session, 'b');
    expect(branchA.truths).toContainEqual({ cell: 2, digit: 4 });
    expect(hasCandidate(branchA.candidates[6], 4)).toBe(false);
    expect(hasCandidate(branchB.candidates[6], 4)).toBe(true);
  });

  test('treats a completed path as viable rather than as a conclusion', () => {
    let session = createInferenceSession(puzzle);
    puzzle.forEach((value, cell) => {
      const digit = solution[cell];
      if (value === null && digit !== null) {
        session = applyInferenceAction(session, {
          path: 'a',
          cells: [cell],
          digit,
          truth: 'true',
        });
      }
    });

    expect(deriveInferenceBranch(session, 'a').complete).toBe(true);
    expect(deriveInferenceBranch(session, 'b').complete).toBe(false);
    expect(inferenceConclusions(session)).toEqual([]);
  });

  test('finds a contradiction conclusion and keeps undo independent', () => {
    let session = createInferenceSession(puzzle);
    session = applyInferenceAction(session, {
      path: 'a',
      cells: [2],
      digit: 4,
      truth: 'true',
    });
    session = applyInferenceAction(session, {
      path: 'a',
      cells: [6],
      digit: 4,
      truth: 'true',
    });

    expect(deriveInferenceBranch(session, 'a').contradiction?.kind).toBe(
      'opposite_truth',
    );
    expect(inferenceConclusion(session)).toEqual({
      cell: 2,
      digit: 4,
      action: 'remove',
      reason: 'path_contradiction',
    });

    const undone = undoInferenceAction(session);
    expect(deriveInferenceBranch(undone, 'a').contradiction).toBeNull();
    expect(undone.actions).toHaveLength(1);
    expect(undoInferenceAction(undone).root).toBeNull();
  });

  test('accepts multi-cell exclusions and finds a shared result', () => {
    let session = createInferenceSession(puzzle);
    session = applyInferenceAction(session, {
      path: 'a',
      cells: [2],
      digit: 4,
      truth: 'true',
    });
    session = applyInferenceAction(session, {
      path: 'b',
      cells: [3, 6, 7],
      digit: 4,
      truth: 'false',
    });

    const branchB = deriveInferenceBranch(session, 'b');
    expect(hasCandidate(branchB.candidates[6], 4)).toBe(false);
    expect(hasCandidate(branchB.candidates[7], 4)).toBe(false);
    expect(inferenceConclusion(session)).toEqual({
      cell: 6,
      digit: 4,
      action: 'remove',
      reason: 'shared_result',
    });
    expect(inferenceConclusions(session)).toEqual([
      {
        cell: 6,
        digit: 4,
        action: 'remove',
        reason: 'shared_result',
      },
      {
        cell: 7,
        digit: 4,
        action: 'remove',
        reason: 'shared_result',
      },
    ]);
  });
});
