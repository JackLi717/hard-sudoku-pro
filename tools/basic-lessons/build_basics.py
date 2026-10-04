"""Build deterministic, unique tutorial examples. Never edit the output by hand."""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'src/data/lessons/generated/basic-lessons.json'
DIGITS = set(range(1, 10))
ROWS = [list(range(r * 9, r * 9 + 9)) for r in range(9)]
COLS = [list(range(c, 81, 9)) for c in range(9)]
BOXES = [[(b // 3 * 3 + r) * 9 + b % 3 * 3 + c
          for r in range(3) for c in range(3)] for b in range(9)]
PEERS = [set(ROWS[i // 9] + COLS[i % 9] + BOXES[i // 27 * 3 + i % 9 // 3]) - {i}
         for i in range(81)]


def candidates(board: list[int], cell: int) -> set[int]:
    return DIGITS - {board[p] for p in PEERS[cell]} if not board[cell] else set()


def solutions(board: list[int], limit: int = 2) -> list[list[int]]:
    result: list[list[int]] = []
    board = board.copy()

    def visit() -> None:
        if len(result) >= limit:
            return
        choices = [(candidates(board, i), i) for i, n in enumerate(board) if not n]
        if not choices:
            result.append(board.copy())
            return
        digits, cell = min(choices, key=lambda item: len(item[0]))
        for digit in sorted(digits):
            board[cell] = digit
            visit()
            if len(result) >= limit:
                break
        board[cell] = 0

    visit()
    return result


def puzzle(seed: int) -> tuple[list[int], list[int]]:
    rng = random.Random(seed)
    shuffled = lambda values: rng.sample(list(values), len(values))
    rows = [b * 3 + r for b in shuffled(range(3)) for r in shuffled(range(3))]
    cols = [b * 3 + c for b in shuffled(range(3)) for c in shuffled(range(3))]
    digits = shuffled(range(1, 10))
    solution = [digits[(r * 3 + r // 3 + c) % 9] for r in rows for c in cols]
    board = solution.copy()
    for cell in shuffled(range(81)):
        previous = board[cell]
        board[cell] = 0
        if len(solutions(board)) != 1:
            board[cell] = previous
        if board.count(0) >= 44:
            break
    return board, solution


def certainty(board: list[int]) -> dict | None:
    for target in range(81):
        pair = candidates(board, target)
        if len(pair) != 2:
            continue
        for source in sorted(PEERS[target]):
            single = candidates(board, source)
            if len(single) == 1 and single <= pair:
                digit = next(iter(single))
                return dict(target=target, source=source, digit=digit,
                            remaining=next(iter(pair - single)), candidates=sorted(pair))
    return None


def scan_step(board: list[int], digit: int, excluded_box: int = -1) -> dict | None:
    for box, cells in enumerate(BOXES):
        if box == excluded_box or any(board[c] == digit for c in cells):
            continue
        empty = [c for c in cells if not board[c]]
        allowed = [c for c in empty if digit in candidates(board, c)]
        if len(allowed) != 1 or len(empty) < 3:
            continue
        excluded = [c for c in empty if c != allowed[0]]
        evidence = sorted({p for c in excluded for p in PEERS[c] if board[p] == digit})
        return dict(box=box, cell=allowed[0], excluded=excluded, evidence=evidence)
    return None


def build() -> dict:
    output: dict = {}
    for seed in range(400):
        board, solution = puzzle(6300 + seed)
        if 'operations' not in output:
            fill = next((i for i in range(81) if candidates(board, i) == {6}), None)
            notes = next((i for i in range(81) if candidates(board, i) == {1, 2, 7}), None)
            if fill is not None and notes is not None and fill not in PEERS[notes]:
                output['operations'] = dict(board=board, solution=solution, fill=fill, notes=notes)
        if 'certainty' not in output:
            detail = certainty(board)
            if detail:
                output['certainty'] = dict(board=board, **detail)
        if 'scanning' not in output:
            for digit in sorted(DIGITS, key=lambda n: (-board.count(n), n)):
                first = scan_step(board, digit)
                if not first:
                    continue
                after = board.copy()
                after[first['cell']] = digit
                second = scan_step(after, digit, first['box'])
                if second:
                    output['scanning'] = dict(board=board, digit=digit, first=first, second=second)
                    break
        if len(output) == 3:
            validate(output)
            return output
    raise ValueError('No suitable teaching scenes found')


def validate(data: dict) -> None:
    for scene in data.values():
        assert len(scene['board']) == 81
        assert len(solutions(scene['board'])) == 1, 'Tutorial puzzle must have a unique solution'
    op = data['operations']
    assert solutions(op['board'])[0] == op['solution']
    assert candidates(op['board'], op['fill']) == {6}
    after_fill = op['board'].copy()
    after_fill[op['fill']] = 6
    assert candidates(after_fill, op['notes']) == {1, 2, 7}
    certain = data['certainty']
    board = certain['board'].copy()
    assert candidates(board, certain['target']) == set(certain['candidates'])
    assert candidates(board, certain['source']) == {certain['digit']}
    board[certain['source']] = certain['digit']
    assert candidates(board, certain['target']) == {certain['remaining']}
    scan = data['scanning']
    board = scan['board'].copy()
    for step in [scan['first'], scan['second']]:
        cells = BOXES[step['box']]
        assert [c for c in cells if scan['digit'] in candidates(board, c)] == [step['cell']]
        assert set(step['excluded']) == {c for c in cells if not board[c]} - {step['cell']}
        for cell in step['excluded']:
            assert any(board[p] == scan['digit'] and p in PEERS[cell] for p in step['evidence'])
        board[step['cell']] = scan['digit']


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.check:
        validate(json.loads(OUTPUT.read_text()))
        print('Three unique tutorial puzzles; all candidate and placement steps verified.')
    else:
        data = build()
        OUTPUT.write_text(json.dumps(data, indent=2) + '\n')
        print(f'Generated {OUTPUT}')
