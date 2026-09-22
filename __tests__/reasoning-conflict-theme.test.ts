import {
  normalizeReasoningCandidateMarks,
  type ReasoningCandidateMark,
  type ReasoningConflictKind,
} from '../src/domain';
import {
  REASONING_CONFLICT_PRESENTATIONS,
  reasoningConflictPresentation,
} from '../src/ui/themes/reasoning-conflict-theme';

test('defines one visual treatment for every canonical contradiction', () => {
  const kinds: readonly ReasoningConflictKind[] = [
    'empty_cell',
    'missing_house_digit',
    'multiple_values',
    'opposite_truth',
    'peer_values',
  ];

  expect(Object.keys(REASONING_CONFLICT_PRESENTATIONS).sort()).toEqual(
    [...kinds].sort(),
  );
  expect(reasoningConflictPresentation('empty_cell')).toEqual({
    scope: 'cell',
    evidence: 'false',
    frame: 'cell',
  });
  expect(reasoningConflictPresentation('missing_house_digit').frame).toBe(
    'region',
  );
  expect(reasoningConflictPresentation('multiple_values').evidence).toBe(
    'true',
  );
  expect(reasoningConflictPresentation('opposite_truth').evidence).toBe(
    'mixed',
  );
  expect(reasoningConflictPresentation('peer_values')).toEqual({
    scope: 'region',
    evidence: 'true',
    frame: 'region',
  });
});

test('normalizes repeated descriptions of one reasoning state without merging distinct paths or truth values', () => {
  const assumption: ReasoningCandidateMark = {
    cell: 12,
    digit: 5,
    role: 'assumption',
  };
  const marks: readonly ReasoningCandidateMark[] = [
    assumption,
    { cell: 12, digit: 5, role: 'consequence', truth: 'true' },
    { cell: 12, digit: 5, role: 'consequence', truth: 'false' },
    { cell: 12, digit: 5, role: 'consequence', path: 'a' },
    { cell: 12, digit: 5, role: 'consequence', path: 'b' },
  ];

  expect(normalizeReasoningCandidateMarks(marks)).toEqual([
    assumption,
    { cell: 12, digit: 5, role: 'consequence', truth: 'false' },
    { cell: 12, digit: 5, role: 'consequence', path: 'a' },
    { cell: 12, digit: 5, role: 'consequence', path: 'b' },
  ]);
  expect(marks[0]).toBe(assumption);
});
