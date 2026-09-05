#!/usr/bin/env python3
"""Revalidate and replace the current pre-release development content in place.

Temporary checkpoints avoid repeated expensive computation and are disposable.
"""
from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import copy
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import threading

import build_puzzles as builder

ROOT = builder.REPOSITORY_ROOT
SOURCES = [builder.OUTPUT_ROOT / 'content-v4',
           builder.OUTPUT_ROOT / 'development-tier-gated']


def revalidate(work: Path, workers: int) -> list[dict]:
    audit = work / 'audit'
    audit.mkdir(parents=True, exist_ok=True)
    binary = builder.compile_generation_gate(audit)
    policy = builder.load_policy()
    inputs = []
    seen = set()
    for source in SOURCES:
        if not source.exists():
            continue
        for original in json.loads((source / 'rating-report.json').read_text()):
            if original['puzzle'] in seen:
                continue
            seen.add(original['puzzle'])
            record = copy.deepcopy(original)
            record.pop('runtime_acceptance', None)
            record.pop('training_target', None)
            record.pop('training_case_fingerprint', None)
            record['origin'] = {'release': source.name, 'level': original['difficulty_level'],
                                'id': original['id']}
            inputs.append(record)
    # Hard puzzles first, so coverage gaps become visible while easy batches finish.
    inputs.sort(key=lambda r: (-r['difficulty_level'], r['puzzle']))
    fingerprint = hashlib.sha256((builder.sha256_file(binary) +
                                  json.dumps(inputs, sort_keys=True)).encode()).hexdigest()
    previous = work / 'checkpoint-input.json'
    identity = {'fingerprint': fingerprint, 'count': len(inputs)}
    if previous.exists() and json.loads(previous.read_text()) != identity:
        raise RuntimeError('Checkpoint inputs or evaluator changed; use a new disposable work directory')
    builder.write_json(previous, identity)
    lock = threading.Lock()
    finished = 0

    def run_batch(index: int, records: list[dict]) -> list[dict]:
        nonlocal finished
        checkpoint = audit / f'revalidated-{index:04d}.json.gz'
        if checkpoint.exists():
            result = json.loads(gzip.decompress(checkpoint.read_bytes()))
        else:
            process = subprocess.run([str(binary)], input=''.join(
                f"{r['puzzle']} {r['solution']}\n" for r in records),
                text=True, capture_output=True, check=True, timeout=1800)
            reports = [json.loads(line) for line in process.stdout.splitlines()]
            if len(reports) != len(records):
                raise RuntimeError('Incomplete runtime batch')
            result = []
            for record, report in zip(records, reports, strict=True):
                if record['puzzle'] != report['puzzle']:
                    raise RuntimeError('Mismatched runtime report')
                builder.validate_grid(record['puzzle'], record['solution'])
                valid = builder.accept_runtime(record, report)
                unique = builder.solution_count(record['puzzle']) == 1
                record['accepted'] = valid and unique
                record['removal_reason'] = None if record['accepted'] else (
                    'runtime_incomplete' if not valid else 'not_unique')
                result.append(record)
            temporary = checkpoint.with_suffix('.tmp')
            temporary.write_bytes(gzip.compress(json.dumps(result, separators=(',', ':')).encode(), mtime=0))
            temporary.rename(checkpoint)
        with lock:
            finished += len(result)
            coverage = Counter(c for r in result if r['accepted'] for c in builder.preferred_cases(r)
                               if c in policy['generationAcceptance']['levelFiveTechniques'])
            print(f'Revalidated {finished}/{len(inputs)}; batch {index}: {dict(coverage)}', flush=True)
        return result

    all_records = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(run_batch, index, inputs[start:start + 100])
                   for index, start in enumerate(range(0, len(inputs), 100))]
        for future in as_completed(futures):
            all_records.extend(future.result())
    all_records.sort(key=lambda r: r['puzzle'])
    summary = summarize(all_records, policy)
    builder.write_json(work / 'revalidation-summary.json', summary)
    print(json.dumps(summary, indent=2), flush=True)
    return all_records


def summarize(records: list[dict], policy: dict) -> dict:
    accepted = [r for r in records if r['accepted']]
    original = [r for r in records if r['origin']['release'] == 'content-v4']
    counts = Counter(c for r in accepted for c in builder.preferred_cases(r))
    available = Counter(c['code'] for r in accepted for c in {
        c['code']: c for w in r['runtime_acceptance']['witnesses'] if w['level'] == 5
        for c in w.get('availableTechniques', []) if not c['bounded']}.values())
    return {
        'sourceCount': len(records), 'retained': len(accepted),
        'originalLevelTransitions': dict(sorted(Counter(
            f"{r['origin']['level']}->{r['difficulty_level'] if r['accepted'] else 'removed'}"
            for r in original).items())),
        'distribution': dict(sorted(Counter(r['difficulty_level'] for r in accepted).items())),
        'levelFiveCoverage': {code: {'preferred': counts[code], 'availableAtFrontier': available[code],
                                    'shortfall': max(0, 50 - counts[code])}
                              for code in policy['generationAcceptance']['levelFiveTechniques']},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work-dir', type=Path, help='optional disposable checkpoint directory')
    parser.add_argument('--validate-only', action='store_true')
    parser.add_argument('--workers', type=int, default=3)
    parser.add_argument('--assemble', action='store_true')
    parser.add_argument('--grown-dir', type=Path)
    args = parser.parse_args()
    if args.workers not in range(1, 9):
        parser.error('workers must be 1–8')
    if args.assemble:
        if args.grown_dir is None or args.work_dir is None:
            parser.error('--assemble requires --work-dir and --grown-dir')
        print(json.dumps(assemble(args.work_dir.resolve(), args.grown_dir,
                                  builder.OUTPUT_ROOT / 'content-v4'), indent=2))
    else:
        import tempfile
        if args.work_dir is None:
            with tempfile.TemporaryDirectory(prefix='hsp-rebuild-') as temporary:
                rebuild(Path(temporary), args.workers, args.validate_only)
        else:
            rebuild(args.work_dir.resolve(), args.workers, args.validate_only)


def rebuild(work: Path, workers: int, validate_only: bool) -> None:
    revalidate(work, workers)
    if validate_only:
        return
    from grow_technique_puzzles import grow
    grown = work / 'new-puzzles'
    policy = builder.load_policy()
    for index, target in enumerate(policy['generationAcceptance']['levelFiveTechniques']):
        grow(target, 50, grown, work / 'audit/generation-gate', work / 'audit',
             max_batches=200, seed=20260905 + index)
    print(json.dumps(assemble(work, grown, builder.OUTPUT_ROOT / 'content-v4'), indent=2))



def assemble(work: Path, grown: Path, destination: Path) -> dict:
    """Replace the current development baseline after quality checks pass."""
    import shutil
    import tempfile
    policy = builder.load_policy()
    checked = [r for file in sorted((work / 'audit').glob('revalidated-*.json.gz'))
               for r in json.loads(gzip.decompress(file.read_bytes()))]
    expected_count = json.loads((work / 'checkpoint-input.json').read_text())['count']
    if len(checked) != expected_count or len({r['puzzle'] for r in checked}) != expected_count:
        raise RuntimeError('Revalidation has not completed')
    original = [r for r in checked if r['origin']['release'] == 'content-v4']
    summary = {
        'originalPuzzleCount': len(original),
        'removedPuzzleCount': sum(not r['accepted'] for r in original),
        'originalLevelTransitions': dict(sorted(Counter(
            f"{r['origin']['level']}->{r['difficulty_level'] if r['accepted'] else 'removed'}"
            for r in original).items())),
    }
    records = [r for r in checked if r['accepted']]
    aic_bottlenecks = set()
    for record in records:
        if record['origin']['release'] != 'development-tier-gated' or 'aic' not in builder.preferred_cases(record):
            continue
        witness = next(w for w in record['runtime_acceptance']['witnesses']
                       if w['technique'] == 'aic' and not w['enumerationBoundReached'])
        aic_bottlenecks.add(json.dumps([witness['board'], witness['candidates']]))
    new_by_target = {'aic': len(aic_bottlenecks)}
    for target in policy['generationAcceptance']['levelFiveTechniques']:
        if target == 'aic' and not (grown / 'aic.json').exists():
            continue
        file = grown / f'{target}.json'
        additions = json.loads(file.read_text()) if file.exists() else []
        if len(additions) < 50:
            raise RuntimeError(f'{target} has only {len(additions)}/50 new cases')
        if len({r['training_case_fingerprint'] for r in additions}) != len(additions):
            raise RuntimeError(f'{target} contains duplicate bottleneck cases')
        new_by_target[target] = len(additions)
        records.extend(additions)
    if any(count < 50 for count in new_by_target.values()):
        raise RuntimeError('Incomplete new-puzzle quota')
    if len({r['puzzle'] for r in records}) != len(records):
        raise RuntimeError('Duplicate puzzles in merged content')
    level_map = {policy['techniqueCodeMap'][code]: int(level)
                 for level, codes in policy['levels'].items() for code in codes}
    level_map['complexColoring'] = 5
    compact = []
    for record in records:
        report = record['runtime_acceptance']
        if not report['solved'] or report['minimumLevel'] != record['difficulty_level']:
            raise RuntimeError('Invalid logical acceptance result')
        if set(report['usage']) - set(level_map):
            raise RuntimeError('Unsupported technique in accepted path')
        witnesses = {}
        for witness in report['witnesses']:
            if witness['level'] != record['difficulty_level']:
                continue
            code = witness['technique']
            if code not in witnesses or (witnesses[code]['enumerationBoundReached'] and not witness['enumerationBoundReached']):
                witnesses[code] = {k: v for k, v in witness.items() if k != 'availableTechniques'}
        item = {key: record[key] for key in ['puzzle', 'solution', 'difficulty_level', 'hardest_technique']}
        item.update({
            'source': record.get('source', 'hodoku2-2.4.3-build-116'),
            'difficulty_score': sum((level_map[code] ** 3) * count for code, count in report['usage'].items()),
            'technique_usage': report['usage'], 'total_steps': sum(report['usage'].values()),
            'runtime_acceptance': {**{k: report[k] for k in ['solved', 'minimumLevel', 'hardestTechnique', 'usage']},
                                   'witnesses': list(witnesses.values())},
        })
        if 'training_target' in record:
            item['training_target'] = record['training_target']
            item['training_case_fingerprint'] = record['training_case_fingerprint']
        compact.append(item)
    compact.sort(key=lambda r: (r['difficulty_level'], r['difficulty_score'], r['puzzle']))
    counts = Counter(r['difficulty_level'] for r in compact)
    summary['newCasesByTechnique'] = new_by_target
    summary['finalPuzzleCount'] = len(compact)
    summary['addedPuzzleCount'] = len(compact) - sum(r['accepted'] for r in checked if r['origin']['release'] == 'content-v4')
    builder.finalize_records(compact, 4, 'hodoku2-2.4.3+hsp-1.2')
    # Temporary output is discarded after copying; no new release/version/archive.
    with tempfile.TemporaryDirectory(prefix='hsp-content-') as temporary:
        stage = Path(temporary)
        catalog = json.loads((destination / 'manifest.json').read_text())['techniqueCatalog']
        builder.write_artifacts(stage, compact, 4, 'hodoku2-2.4.3+hsp-1.2',
                                len(checked), policy, catalog, dict(counts), summary)
        validation = json.loads((stage / 'validation-report.json').read_text())
        if not validation['levelFiveCoverageComplete']:
            raise RuntimeError('L5 coverage failed; current development content was not replaced')
        for file in stage.iterdir():
            shutil.copy2(file, destination / file.name)
    # Experimental raw logs are not part of the current content baseline.
    shutil.rmtree(destination / 'audit', ignore_errors=True)
    database_hash = builder.sha256_file(destination / 'content.sqlite')
    app_file = ROOT / 'src/data/content/content-database.ts'
    import re
    app_file.write_text(re.sub(r"sha256: '[0-9a-f]{64}'", f"sha256: '{database_hash}'", app_file.read_text()))
    return summary


if __name__ == '__main__':
    main()
