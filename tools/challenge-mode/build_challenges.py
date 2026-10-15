#!/usr/bin/env python3
"""Export the selected unique puzzles and answer keys, without player-path graphs."""
from __future__ import annotations
import argparse
import csv
import re
import hashlib
import json
import os
import subprocess
from pathlib import Path
import sys
import tempfile
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/technique-lessons'))
from build_lessons import compile_checker, install_json, verify_sources
from check_challenges import validate_catalog, TECHNIQUES, EPISODES


def build(args: argparse.Namespace) -> None:
    manifest_path = Path(__file__).parent / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    with tempfile.TemporaryDirectory(prefix='hsp-challenge-') as directory:
        work = Path(directory)
        source_ids = [source_id for episode in manifest['episodes'] for source_id in episode['sources']]
        corpus_path = args.corpus
        if not corpus_path:
            binary = work / 'corpus'
            core = ROOT / 'native/hsp-hint-core'
            subprocess.run([os.environ.get('CXX', 'c++'), '-O2', '-std=c++20',
                '-Wall', '-Wextra', '-Wpedantic', '-Werror', '-I' + str(core / 'include'),
                str(core / 'src/bridge.cpp'), str(core / 'src/engine.cpp'), str(core / 'src/techniques.cpp'),
                str(core / 'tests/lab_corpus_builder.cpp'), '-o', str(binary)], check=True)
            # Rebuild only the selected original puzzles; no historical corpus is required.
            wanted = {re.search(r'(hsp-[a-f0-9]+)-[0-9]+$', source_id).group(1) for source_id in source_ids}
            selected_csv = work / 'puzzles.csv'
            with (ROOT / 'tools/puzzle-generator/output/content-v4/puzzles.csv').open() as input_file, selected_csv.open('w') as output_file:
                reader = csv.DictReader(input_file)
                writer = csv.DictWriter(output_file, fieldnames=reader.fieldnames)
                writer.writeheader()
                selected = [row for row in reader if row['id'] in wanted]
                assert len(selected) == len(wanted), 'missing selected puzzle'
                writer.writerows(selected)
            corpus_path = work / 'sources.json'
            subprocess.run([str(binary), str(selected_csv),
                str(corpus_path), '10000', '10000', ','.join(TECHNIQUES), '10000'], check=True, stdout=subprocess.DEVNULL)
        corpus = json.loads(corpus_path.read_text())
        by_id = {item['id']: item for item in corpus['fixtures'] + corpus['variants']}
        teaching = json.loads((ROOT / 'src/debug/generated/hint-lab-fixtures.json').read_text())
        by_id.update({item['id']: item for item in teaching['fixtures'] + teaching['variants']})
        sources = [by_id[source_id] for source_id in source_ids]
        assert len(sources) == 18
        for index, source in enumerate(sources):
            if index % 6 < 5:
                assert source['techniqueCode'] == EPISODES[index // 6][1][index % 6]
        checker = args.checker or work / 'checker'
        if not args.checker:
            compile_checker(checker)
        verify_sources(sources, checker)
        levels = []
        for index, source in enumerate(sources):
            episode_id, techniques = EPISODES[index // 6]
            local = index % 6
            levels.append({'id': f'{episode_id}-{local + 1}', 'episode_id': episode_id,
                'technique_code': techniques[local] if local < 5 else None,
                'source': {'source_puzzle_id': source['sourcePuzzleId'],
                    'puzzle_fingerprint': source['puzzleFingerprint'],
                    'board_fingerprint': source['boardFingerprint'],
                    'candidate_masks': source['candidateMasks'],
                    'solution_fingerprint': source['solutionFingerprint']}})
        resource: dict[str, Any] = {'content_usage': 'challenge', 'set_id': 'discovery', 'levels': levels}
        checked = validate_catalog(resource)
        resource['content_key'] = hashlib.sha256(json.dumps(resource, sort_keys=True).encode()).hexdigest()
        # Shared allocations deliberately exclude answer keys.
        inventory_path = ROOT / 'tools/technique-lessons/content-allocations.json'
        inventory = json.loads(inventory_path.read_text())
        existing = [row for row in inventory['allocations'] if row['content_usage'] != 'challenge']
        allocations = {'allocations': existing + [{'content_id': level['id'], 'content_usage': 'challenge',
            **{key: value for key, value in level['source'].items() if key != 'solution_fingerprint'}} for level in levels]}
        staged = Path(directory) / 'allocations.json'
        staged.write_text(json.dumps(allocations))
        subprocess.run(['node', str(ROOT / 'tools/technique-practice/check_allocations.mjs'), str(staged)], check=True)
        install_json(Path(args.output), resource)
        install_json(inventory_path, allocations)
        report = {**checked, 'independent_sources': True, 'native_source_replay_verified': True,
                  'specialist_technique_coverage_verified': True}
        install_json(Path(__file__).parent / 'validation-report.json', report)
        print(json.dumps(report))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--corpus', type=Path)
    parser.add_argument('--checker', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'src/data/challenge/generated/challenge-catalog.json')
    build(parser.parse_args())
