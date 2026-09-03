import {
  createSolverCandidates,
  boardFromFingerprint,
} from '../src/domain/sudoku/board';
import { Board, Digit } from '../src/domain/sudoku/contracts';

// Independent peer scan, including conflicting boards and empty candidate sets.
function referenceCandidates(values: Board): number[] {
  return values.map((value, cell) => {
    if (value !== null) {
      return 0;
    }
    const forbidden = new Set<number>();
    values.forEach((peerValue, peer) => {
      if (
        peerValue !== null &&
        (Math.floor(cell / 9) === Math.floor(peer / 9) ||
          cell % 9 === peer % 9 ||
          (Math.floor(cell / 27) === Math.floor(peer / 27) &&
            Math.floor((cell % 9) / 3) === Math.floor((peer % 9) / 3)))
      ) {
        forbidden.add(peerValue);
      }
    });
    return Array.from({ length: 9 }, (_, index) => index + 1).reduce(
      (mask, digit) => mask + (forbidden.has(digit) ? 0 : 2 ** (digit - 1)),
      0,
    );
  });
}

test('region masks match peer scanning for valid and conflicting boards', () => {
  const solution = boardFromFingerprint(
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  );
  let seed = 71;
  const next = () => {
    seed = (seed * 48271) % 2147483647;
    return seed;
  };
  const boards: Board[] = [solution, Array(81).fill(null)];
  for (let index = 0; index < 200; index += 1) {
    boards.push(solution.map(value => (next() % 3 === 0 ? null : value)));
    boards.push(
      Array.from({ length: 81 }, () =>
        next() % 3 === 0 ? (((next() % 9) + 1) as Digit) : null,
      ),
    );
  }
  for (const values of boards) {
    expect(createSolverCandidates(values)).toEqual(referenceCandidates(values));
  }
});
