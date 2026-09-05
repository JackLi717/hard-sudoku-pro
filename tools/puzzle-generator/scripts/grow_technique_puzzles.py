#!/usr/bin/env python3
"""Grow genuinely different clue sets around technique seeds, then revalidate.

No candidate-state masks are invented: every screen starts from ordinary givens.
A case counts only once per distinct target bottleneck as well as per puzzle.
"""
from __future__ import annotations
import argparse
from collections import Counter
import gzip
from functools import lru_cache
import os
import hashlib
import json
from pathlib import Path
import random
import subprocess

import build_puzzles as b


@lru_cache(maxsize=2048)
def solution_trades(solution: str) -> tuple[tuple[int, int, int, int], ...]:
    trades = []
    for first_row in range(8):
        for second_row in range(first_row + 1, 9):
            for first_column in range(8):
                for second_column in range(first_column + 1, 9):
                    if first_row // 3 != second_row // 3 and first_column // 3 != second_column // 3:
                        continue
                    a, b = first_row * 9 + first_column, first_row * 9 + second_column
                    c, d = second_row * 9 + first_column, second_row * 9 + second_column
                    if solution[a] == solution[d] and solution[b] == solution[c]:
                        trades.append((a, b, c, d))
    return tuple(trades)


def trade_solution(solution: str, randomizer: random.Random) -> str:
    """A local four-cell trade preserves all units without relabeling a grid."""
    options = solution_trades(solution)
    if not options:
        return solution
    a, b, c, d = randomizer.choice(options)
    values = list(solution)
    values[a], values[b] = values[b], values[a]
    values[c], values[d] = values[d], values[c]
    return ''.join(values)


def mutate(puzzle: str, solution: str, randomizer: random.Random,
           protected_digit: str | None = None) -> str:
    cells = list(puzzle)
    occupied = [i for i, digit in enumerate(cells) if digit != '0' and digit != protected_digit]
    empty = [i for i, digit in enumerate(cells) if digit == '0' and solution[i] != protected_digit]
    remove = min(len(occupied), randomizer.randint(1, 6), max(0, sum(d != '0' for d in cells) - 17))
    for cell in randomizer.sample(occupied, remove):
        cells[cell] = '0'
    for cell in randomizer.sample(empty, min(len(empty), randomizer.randint(0, 4))):
        cells[cell] = solution[cell]
    return ''.join(cells)


def evaluate(binary: Path, target: str, candidates: list[dict], screen: bool) -> list[dict]:
    command = [str(binary), target] + (['--screen'] if screen else [])
    result = subprocess.run(command, input=''.join(
        f"{r['puzzle']} {r['solution']}\n" for r in candidates), text=True,
        capture_output=True, check=True, timeout=1200)
    reports = [json.loads(line) for line in result.stdout.splitlines()]
    if len(reports) != len(candidates):
        raise RuntimeError('Incomplete generation result')
    for candidate, report in zip(candidates, reports, strict=True):
        if candidate['puzzle'] != report['puzzle']:
            raise RuntimeError('Wrong puzzle in generation result')
    return reports


def grow(target: str, count: int, work: Path, binary: Path, checkpoint_dir: Path,
         max_batches: int, seed: int) -> None:
    work.mkdir(parents=True, exist_ok=True)
    (work / f"{target}.pid").write_text(str(os.getpid()))
    baseline = json.loads((b.OUTPUT_ROOT / 'content-v4/rating-report.json').read_text())
    seen = {r['puzzle'] for r in baseline}
    seeds = [r for r in baseline if target in r.get('technique_usage', {})]
    for file in checkpoint_dir.glob('revalidated-*.json.gz'):
        for record in json.loads(gzip.decompress(file.read_bytes())):
            if not record.get('accepted', True) or 'runtime_acceptance' not in record:
                continue
            if any(target == option['code'] for witness in record['runtime_acceptance']['witnesses']
                   if witness['level'] == 5 for option in witness.get('availableTechniques', [])):
                seeds.append(record)
    oracle = {'jellyfish': 'bf4', 'complexColoring': 'mc', 'xChain': 'x',
              'groupedAic': 'gaic', 'aic': 'aic', 'xyChain': 'xyc'}
    if target in oracle:
        seeds.extend(r for r in baseline if r.get('oracle_technique_usage', {}).get(oracle[target]))
    extra_seeds = work / f"seeds-{target}.json"
    if extra_seeds.exists():
        seeds.extend(json.loads(extra_seeds.read_text()))
    if not seeds:
        raise RuntimeError(f'No genuine seed puzzles found for {target}')
    seeds = list({r['puzzle']: r for r in seeds}.values())
    randomizer = random.Random(seed)
    accepted = []
    fingerprints = set()
    output = work / f'{target}.json'
    if output.exists():
        accepted = json.loads(output.read_text())
        fingerprints.update(r['training_case_fingerprint'] for r in accepted)
        seen.update(r['puzzle'] for r in accepted)
        seeds.extend(accepted)
    generated = 0
    print(f'{target}: starting with {len(seeds)} seeds, {len(accepted)} accepted', flush=True)
    for batch in range(max_batches):
        if len(accepted) >= count:
            break
        candidates = []
        attempts = 0
        while len(candidates) < 100 and attempts < 10000:
            attempts += 1
            source = randomizer.choice(accepted if accepted and randomizer.random() < 0.8 else seeds)
            solution = source['solution']
            if randomizer.random() < 0.65:
                for _ in range(randomizer.randint(1, 3)):
                    solution = trade_solution(solution, randomizer)
            starting = ''.join('0' if digit == '0' else solution[i]
                               for i, digit in enumerate(source['puzzle']))
            puzzle = mutate(starting, solution, randomizer, source.get('protected_digit'))
            if puzzle in seen:
                continue
            seen.add(puzzle)
            if b.solution_count(puzzle) != 1:
                continue
            candidate = {k: v for k, v in source.items() if k not in
                         {'runtime_acceptance', 'origin', 'accepted', 'removal_reason'}}
            candidate['puzzle'] = puzzle
            candidate['solution'] = solution
            candidate['source'] = 'hodoku2-seed-clue-variation'
            candidates.append(candidate)
        if not candidates:
            raise RuntimeError('Could not produce unique candidate clue sets')
        screens = evaluate(binary, target, candidates, True)
        eligible = [r for r, screen in zip(candidates, screens, strict=True) if screen['eligible']]
        reports = evaluate(binary, target, eligible, False) if eligible else []
        for candidate, report in zip(eligible, reports, strict=True):
            if not b.accept_runtime(candidate, report) or target not in b.preferred_cases(candidate):
                continue
            witness = next(w for w in report['witnesses'] if w['technique'] == target and not w['enumerationBoundReached'])
            fingerprint = hashlib.sha256(json.dumps([witness['board'], witness['candidates']]).encode()).hexdigest()
            if fingerprint in fingerprints:
                continue
            candidate['training_target'] = target
            candidate['training_case_fingerprint'] = fingerprint
            # The old seed's oracle path describes a different puzzle. Never carry it over.
            for field in ['oracle_technique_usage', 'oracle_difficulty_level', 'oracle_hardest_technique',
                          'hardest_oracle_technique', 'hodoku_level', 'generator_level']:
                candidate.pop(field, None)
            candidate['technique_usage'] = report['usage']
            candidate['total_steps'] = sum(report['usage'].values())
            candidate['difficulty_score'] = candidate['total_steps']
            fingerprints.add(fingerprint)
            accepted.append(candidate)
            seeds.append(candidate)
            if len(accepted) == count:
                break
        generated += len(candidates)
        b.write_json(output, accepted)
        print(f'{target}: batch={batch + 1}, screened={generated}, hits={len(eligible)}, distinct cases={len(accepted)}/{count}', flush=True)
    if len(accepted) < count:
        raise RuntimeError(f'{target}: only {len(accepted)}/{count} valid distinct cases; no quota relaxation')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('target')
    parser.add_argument('--count', type=int, default=50)
    parser.add_argument('--work-dir', type=Path, required=True)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--checkpoints', type=Path, required=True)
    parser.add_argument('--max-batches', type=int, default=200)
    parser.add_argument('--seed', type=int, default=20260905)
    args = parser.parse_args()
    grow(args.target, args.count, args.work_dir, args.binary, args.checkpoints, args.max_batches, args.seed)


if __name__ == '__main__':
    main()
