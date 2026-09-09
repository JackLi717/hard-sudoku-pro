#!/usr/bin/env python3
"""Rebuild and independently check the current teaching corpus before installing it."""
from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import json
from pathlib import Path
import random
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
CURRENT_CORPUS = ROOT / 'src/debug/generated/hint-lab-fixtures.json'


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path, required=True)
    parser.add_argument('--input', type=Path, default=ROOT / 'tools/puzzle-generator/output/content-v4/puzzles.csv')
    parser.add_argument('--output', type=Path, default=ROOT / 'src/debug/generated/hint-lab-fixtures.json')
    parser.add_argument('--report', type=Path, default=ROOT / 'src/debug/generated/hint-lab-validation.json')
    seeds = parser.add_mutually_exclusive_group()
    seeds.add_argument('--corpus', type=Path, help='Replay this corpus seed instead of the committed current corpus.')
    seeds.add_argument('--fresh-mine', action='store_true', help='Discover candidates from the CSV; coverage quotas are not guaranteed and still gate installation.')
    parser.add_argument('--supplement', type=Path, action='append', default=[], help='Additional generated mode-search corpus to merge before rechecking.')
    parser.add_argument('--baseline', type=Path, help='Optional one-time comparison for new independent examples.')
    parser.add_argument('--check-binary', type=Path)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='hsp-lab-build-') as temporary:
        work = Path(temporary)
        corpus = work / 'corpus.json' if args.fresh_mine else args.corpus or CURRENT_CORPUS
        if not args.fresh_mine and not corpus.is_file():
            parser.error('Current corpus seed is missing. Restore it or explicitly use --fresh-mine for candidate discovery.')
        if args.fresh_mine:
            with args.input.open(newline='') as stream:
                reader = csv.reader(stream)
                header, rows = next(reader), list(reader)
            random.Random(713).shuffle(rows)
            shuffled = work / 'puzzles.csv'
            with shuffled.open('w', newline='') as stream:
                csv.writer(stream, lineterminator='\n').writerows([header, *rows])
            subprocess.run([str(args.binary), str(shuffled), str(corpus), str(len(rows)), '64'], check=True)
        regression = work / 'regression.json'
        subprocess.run([str(args.binary), '--regression', str(ROOT / 'tools/puzzle-generator/output/content-v1/puzzles.csv'), str(regression)], check=True)
        generated = json.loads(corpus.read_text())
        def example_key(item: dict) -> tuple:
            return (item['techniqueCode'], item['boardFingerprint'], tuple(item['candidateMasks']), json.dumps(item['engineResult'], sort_keys=True))

        known = {example_key(item) for item in generated['fixtures'] + generated.get('variants', [])}
        known_ids = {item['id'] for item in generated['fixtures'] + generated.get('variants', [])}
        supplement_scans = []
        for supplement in args.supplement:
            extra = json.loads(supplement.read_text())
            supplement_scans.append(extra.get('corpusValidation', {}).get('scannedPuzzles'))
            for item in extra['fixtures'] + extra.get('variants', []):
                if example_key(item) not in known:
                    if item['id'] in known_ids:
                        digest = hashlib.sha256(json.dumps(item['engineResult'], sort_keys=True).encode()).hexdigest()[:12]
                        item['id'] += '-' + digest
                    generated.setdefault('variants', []).append(item)
                    known_ids.add(item['id'])
                    known.add(example_key(item))
        counts = collections.Counter(item['techniqueCode'] for item in generated['fixtures'] + generated.get('variants', []))
        mining = generated.setdefault('corpusValidation', {})
        mining['scannedPuzzlesScope'] = 'primary_mining_pass'
        mining['supplementScannedPuzzles'] = supplement_scans
        mining['techniques'] = [{'techniqueCode': item['techniqueCode'], 'count': counts[item['techniqueCode']]} for item in generated['fixtures']]
        structural = json.loads(regression.read_text())
        generated['regressionFixtures'] = structural['fixtures'] + structural.get('variants', [])
        candidate = work / 'hint-lab-fixtures.json'
        candidate.write_text(json.dumps(generated, ensure_ascii=False, separators=(',', ':')) + '\n')
        report = work / 'validation.json'
        command = ['python3', str(ROOT / 'tools/hint-lab/check_corpus.py'), str(candidate), '--output', str(report)]
        if args.baseline:
            command.extend(['--baseline', str(args.baseline)])
        if args.check_binary:
            command.extend(['--binary', str(args.check_binary)])
        if not args.fresh_mine or args.supplement:
            # Replay committed seeds, rebuild their native target proofs and
            # coverage, then independently verify the rebuilt artifact.
            refreshed = work / 'reclassified.json'
            diagnostic = subprocess.run(command + ['--reclassified-output', str(refreshed)], check=False, capture_output=True, text=True)
            if diagnostic.returncode not in (0, 1) or not refreshed.exists():
                print(diagnostic.stdout)
                print(diagnostic.stderr)
                raise SystemExit(diagnostic.returncode or 1)
            candidate.write_bytes(refreshed.read_bytes())
        completed = subprocess.run(command, check=False)
        if completed.returncode:
            if report.exists():
                print(report.read_text())
            raise SystemExit(completed.returncode)
        # The generated baseline is replaced only after independent checks pass.
        for source, destination in ((candidate, args.output), (report, args.report)):
            destination.parent.mkdir(parents=True, exist_ok=True)
            pending = destination.with_name(destination.name + '.partial')
            pending.write_bytes(source.read_bytes())
            pending.replace(destination)
        print(f'Installed verified Hint Lab corpus: {args.output}')


if __name__ == '__main__':
    main()
