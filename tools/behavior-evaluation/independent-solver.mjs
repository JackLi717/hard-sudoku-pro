// Test-only oracle. No production solver, candidate helper or saved answer is
// used to search. It proves Sudoku outcomes, not human technique identities.
export function solveIndependently(fingerprint, nodeLimit = 200_000) {
  if (!/^[0-9]{81}$/.test(fingerprint)) throw new Error('Invalid board');
  const board = [...fingerprint].map(Number);
  const peers = cell =>
    board.flatMap((_, other) => {
      const sameRow = Math.floor(cell / 9) === Math.floor(other / 9);
      const sameColumn = cell % 9 === other % 9;
      const sameBox =
        Math.floor(cell / 27) === Math.floor(other / 27) &&
        Math.floor((cell % 9) / 3) === Math.floor((other % 9) / 3);
      return other !== cell && (sameRow || sameColumn || sameBox)
        ? [other]
        : [];
    });
  const neighbors = board.map((_, cell) => peers(cell));
  if (
    board.some(
      (digit, cell) => digit && neighbors[cell].some(p => board[p] === digit),
    )
  ) {
    return { status: 'unsatisfiable', solutions: [], nodes: 0 };
  }
  const solutions = [];
  let nodes = 0,
    exhausted = false;
  function visit() {
    if (++nodes > nodeLimit) {
      exhausted = true;
      return;
    }
    let chosen = -1,
      options = [];
    for (let cell = 0; cell < 81; cell++) {
      if (board[cell]) continue;
      const used = new Set(neighbors[cell].map(p => board[p]));
      const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => !used.has(d));
      if (!digits.length) return;
      if (chosen === -1 || digits.length < options.length) {
        chosen = cell;
        options = digits;
      }
    }
    if (chosen === -1) {
      solutions.push(board.join(''));
      return;
    }
    for (const digit of options) {
      board[chosen] = digit;
      visit();
      board[chosen] = 0;
      if (exhausted || solutions.length >= 2) return;
    }
  }
  visit();
  return {
    status: exhausted
      ? 'inconclusive'
      : solutions.length === 1
      ? 'unique'
      : solutions.length > 1
      ? 'multiple'
      : 'unsatisfiable',
    solutions,
    nodes,
  };
}

export function outcomeIsSound(solution, effect) {
  if (
    !['placement', 'elimination'].includes(effect.kind) ||
    !Number.isInteger(effect.cell) ||
    effect.cell < 0 ||
    effect.cell >= 81 ||
    !Number.isInteger(effect.digit) ||
    effect.digit < 1 ||
    effect.digit > 9
  )
    return false;
  return effect.kind === 'placement'
    ? Number(solution[effect.cell]) === effect.digit
    : Number(solution[effect.cell]) !== effect.digit;
}
