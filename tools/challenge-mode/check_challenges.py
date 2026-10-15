#!/usr/bin/env python3
"""Independently solve each shipped challenge; no player paths are enumerated."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
EPISODES = [
    ('discovery', ['hiddenSingle', 'lockedCandidates.pointing', 'lockedCandidates.claiming', 'nakedPair', 'hiddenPair']),
    ('combinations', ['nakedTriple', 'hiddenTriple', 'xWing', 'skyscraper', 'twoStringKite']),
    ('connections', ['swordfish', 'xyWing', 'xyzWing', 'wWing', 'emptyRectangle']),
]
TECHNIQUES = [technique for _, techniques in EPISODES for technique in techniques]


def unique_solution(puzzle: str) -> str:
    assert isinstance(puzzle, str) and len(puzzle) == 81 and all(c in '0123456789' for c in puzzle)
    cells = [int(c) for c in puzzle]
    rows, columns, boxes = [0] * 9, [0] * 9, [0] * 9
    for cell, digit in enumerate(cells):
        if not digit:
            continue
        row, col = divmod(cell, 9)
        box, bit = row // 3 * 3 + col // 3, 1 << (digit - 1)
        assert not ((rows[row] | columns[col] | boxes[box]) & bit), 'conflicting givens'
        rows[row] |= bit; columns[col] |= bit; boxes[box] |= bit
    solutions = []
    def search() -> None:
        if len(solutions) >= 2:
            return
        selected, options = -1, 0
        for cell, digit in enumerate(cells):
            if digit:
                continue
            row, col = divmod(cell, 9)
            mask = 511 & ~(rows[row] | columns[col] | boxes[row // 3 * 3 + col // 3])
            if not mask:
                return
            if selected < 0 or mask.bit_count() < options.bit_count():
                selected, options = cell, mask
        if selected < 0:
            solutions.append(''.join(map(str, cells)))
            return
        row, col = divmod(selected, 9)
        box = row // 3 * 3 + col // 3
        while options:
            bit = options & -options
            options ^= bit
            cells[selected] = bit.bit_length()
            rows[row] |= bit; columns[col] |= bit; boxes[box] |= bit
            search()
            rows[row] ^= bit; columns[col] ^= bit; boxes[box] ^= bit
            cells[selected] = 0
    search()
    assert len(solutions) == 1, 'challenge must have exactly one solution'
    return solutions[0]


def family_key(puzzle: str) -> str:
    variants = []
    for reflected in (False, True):
        for turns in range(4):
            board = ['0'] * 81
            for cell, digit in enumerate(puzzle):
                row, col = divmod(cell, 9)
                if reflected:
                    col = 8 - col
                for _ in range(turns):
                    row, col = col, 8 - row
                board[row * 9 + col] = digit
            labels = {'0': '0'}
            variants.append(''.join(labels.setdefault(digit, str(len(labels))) for digit in board))
    return min(variants)


def validate_catalog(catalog: dict[str, Any]) -> dict[str, Any]:
    assert catalog['content_usage'] == 'challenge' and catalog['set_id'] == 'discovery'
    assert len(catalog['levels']) == len(EPISODES) * 6
    assert len({family_key(level['source']['puzzle_fingerprint']) for level in catalog['levels']}) == len(catalog['levels']), 'repeated challenge puzzle family'
    for index, level in enumerate(catalog['levels']):
        episode_id, techniques = EPISODES[index // 6]
        local = index % 6
        assert level['id'] == f'{episode_id}-{local + 1}'
        assert level['episode_id'] == episode_id
        assert level['technique_code'] == (techniques[local] if local < 5 else None)
        source = level['source']
        solution = unique_solution(source['puzzle_fingerprint'])
        assert source['solution_fingerprint'] == solution, 'incorrect answer key'
        assert unique_solution(source['board_fingerprint']) == solution, 'invalid replay board'
        masks = source['candidate_masks']
        assert len(masks) == 81
        for cell, mask in enumerate(masks):
            assert type(mask) is int and 0 <= mask <= 511
            if source['board_fingerprint'][cell] != '0':
                assert mask == 0
                continue
            assert mask & (1 << (int(solution[cell]) - 1)), 'candidate mask removed the answer'
            row, col = divmod(cell, 9)
            for peer, value in enumerate(source['board_fingerprint']):
                pr, pc = divmod(peer, 9)
                if value != '0' and (row == pr or col == pc or (row // 3, col // 3) == (pr // 3, pc // 3)):
                    assert not mask & (1 << (int(value) - 1)), 'illegal source candidate'
    return {'episodes': len(EPISODES), 'levels': len(catalog['levels']), 'unique_solutions_verified': True,
            'candidate_answers_preserved': True, 'judging': 'unique_solution',
            'player_path_enumeration_required': False}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog', type=Path, default=ROOT / 'src/data/challenge/generated/challenge-catalog.json')
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text())
    resource = {key: value for key, value in catalog.items() if key != 'content_key'}
    assert hashlib.sha256(json.dumps(resource, sort_keys=True).encode()).hexdigest() == catalog['content_key']
    result = validate_catalog(catalog)
    subprocess.run(['node', str(ROOT / 'tools/technique-practice/check_allocations.mjs'),
                    str(ROOT / 'tools/technique-lessons/content-allocations.json')], check=True)
    print(json.dumps(result))

if __name__ == '__main__':
    main()
