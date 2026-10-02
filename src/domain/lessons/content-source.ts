import { validateHintEngineRequest } from '../hints/candidate-state';
import { EncodedContentSource, ContentAllocation } from './contracts';

export class LessonContentError extends Error {
  name = 'LessonContentError';
}

export function requireRecord(
  value: unknown,
  fields: readonly string[],
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new LessonContentError(`${label} must be an object`);
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some(key => !fields.includes(key)) ||
    fields.some(key => !Object.hasOwn(record, key))
  ) {
    throw new LessonContentError(`${label} has missing or unexpected fields`);
  }
  return record;
}

export function requireIdentifier(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.:-]+$/.test(value)) {
    throw new LessonContentError(`${label} must be a stable identifier`);
  }
  return value;
}

export function requireFingerprint(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[0-9]{81}$/.test(value)) {
    throw new LessonContentError(`${label} must contain 81 digits`);
  }
  return value;
}

export function validateContentSource(source: EncodedContentSource): void {
  requireIdentifier(source.source_puzzle_id, 'source_puzzle_id');
  const puzzle = requireFingerprint(
    source.puzzle_fingerprint,
    'puzzle_fingerprint',
  );
  const board = requireFingerprint(
    source.board_fingerprint,
    'board_fingerprint',
  );
  const errors = [
    ...validateHintEngineRequest({
      contractVersion: 1,
      boardFingerprint: board,
      hintCandidates: source.candidate_masks,
      givenCells: [...puzzle].map(value => value !== '0'),
    }),
  ];
  for (let cell = 0; cell < 81; cell++) {
    if (puzzle[cell] !== '0' && puzzle[cell] !== board[cell]) {
      errors.push(`given value changed at ${cell}`);
    }
  }
  if (errors.length) throw new LessonContentError(errors.join('; '));
}

function transformedCells(reflected: boolean, turns: number): number[] {
  return Array.from({ length: 81 }, (_, cell) => {
    let row = Math.floor(cell / 9);
    let column = cell % 9;
    if (reflected) column = 8 - column;
    for (let turn = 0; turn < turns; turn++) [row, column] = [column, 8 - row];
    return row * 9 + column;
  });
}

const TRANSFORMS = [false, true].flatMap(reflected =>
  [0, 1, 2, 3].map(turns => transformedCells(reflected, turns)),
);

function normalizeDigits(board: string): Map<string, number> {
  const mapping = new Map<string, number>([['0', 0]]);
  for (const digit of board) {
    if (!mapping.has(digit)) mapping.set(digit, mapping.size);
  }
  return mapping;
}

/** Same family despite renumbering, reflection, rotation or replay stage. */
export function sourceFamilyKey(puzzle: string): string {
  requireFingerprint(puzzle, 'puzzle_fingerprint');
  return TRANSFORMS.map(transform => {
    const board = Array<string>(81);
    transform.forEach((target, cell) => {
      board[target] = puzzle[cell];
    });
    const mapping = normalizeDigits(board.join(''));
    return board.map(digit => mapping.get(digit)).join('');
  }).sort()[0];
}

/** Compare values, candidate labels and given identity, not just values. */
export function contentSnapshotKey(source: EncodedContentSource): string {
  validateContentSource(source);
  // A uniquely solvable Sudoku has at most one globally absent given digit:
  // otherwise exchanging two absent digits yields another solution. Native
  // generation proves uniqueness; fewer anchors cannot be canonicalized here.
  if (new Set(source.puzzle_fingerprint.replace(/0/g, '')).size < 8) {
    throw new LessonContentError(
      'source lacks enough digit anchors for equivalence checking',
    );
  }
  return TRANSFORMS.map(transform => {
    const board = Array<string>(81);
    const givens = Array<string>(81);
    const masks = Array<number>(81);
    transform.forEach((target, cell) => {
      board[target] = source.board_fingerprint[cell];
      givens[target] = source.puzzle_fingerprint[cell] === '0' ? '0' : '1';
      masks[target] = source.candidate_masks[cell];
    });
    const mapping = normalizeDigits(board.join(''));
    for (let digit = 1; digit <= 9; digit++) {
      if (!mapping.has(String(digit))) mapping.set(String(digit), mapping.size);
    }
    const normalizedMasks = masks.map(mask => {
      let normalized = 0;
      for (let digit = 1; digit <= 9; digit++) {
        if (Math.floor(mask / 2 ** (digit - 1)) % 2) {
          normalized += 2 ** (mapping.get(String(digit))! - 1);
        }
      }
      return normalized;
    });
    return `${board.map(digit => mapping.get(digit)).join('')}|${givens.join(
      '',
    )}|${normalizedMasks.join(',')}`;
  }).sort()[0];
}

export function validateContentAllocations(
  input: unknown,
): readonly ContentAllocation[] {
  const root = requireRecord(input, ['allocations'], 'content allocations');
  if (!Array.isArray(root.allocations))
    throw new LessonContentError('allocations must be an array');
  const identifiers = new Set<string>();
  const families = new Map<string, string>();
  const sourceIds = new Map<string, string>();
  const snapshots = new Map<string, string>();
  return root.allocations.map(value => {
    const record = requireRecord(
      value,
      [
        'content_id',
        'content_usage',
        'source_puzzle_id',
        'puzzle_fingerprint',
        'board_fingerprint',
        'candidate_masks',
      ],
      'content allocation',
    );
    const allocation = record as ContentAllocation;
    requireIdentifier(allocation.content_id, 'content_id');
    if (
      !['lesson', 'practice', 'challenge'].includes(allocation.content_usage)
    ) {
      throw new LessonContentError('invalid content_usage');
    }
    const id = `${allocation.content_usage}:${allocation.content_id}`;
    if (identifiers.has(id))
      throw new LessonContentError(`duplicate allocation ${id}`);
    identifiers.add(id);
    validateContentSource(allocation);
    const family = sourceFamilyKey(allocation.puzzle_fingerprint);
    const snapshot = contentSnapshotKey(allocation);
    for (const [map, key] of [
      [families, family],
      [snapshots, snapshot],
    ] as const) {
      const owner = map.get(key);
      if (owner && owner !== allocation.content_usage) {
        throw new LessonContentError(
          'source or equivalent snapshot belongs to another content pool',
        );
      }
      map.set(key, allocation.content_usage);
    }
    const knownFamily = sourceIds.get(allocation.source_puzzle_id);
    if (knownFamily && knownFamily !== family) {
      throw new LessonContentError(
        'source_puzzle_id identifies different source families',
      );
    }
    sourceIds.set(allocation.source_puzzle_id, family);
    return allocation;
  });
}
