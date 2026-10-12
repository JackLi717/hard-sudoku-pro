#!/usr/bin/env python3
"""Export the selected unique puzzles and answer keys, without player-path graphs."""
from __future__ import annotations
import argparse
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
from check_challenges import validate_catalog, TECHNIQUES


def build(args: argparse.Namespace) -> None:
    manifest_path = Path(__file__).parent / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    with tempfile.TemporaryDirectory(prefix='hsp-challenge-') as directory:
        work = Path(directory)
        corpus_path = args.corpus
        if not corpus_path:
            binary = work / 'corpus'
            core = ROOT / 'native/hsp-hint-core'
            subprocess.run([os.environ.get('CXX', 'c++'), '-O2', '-std=c++20',
                '-Wall', '-Wextra', '-Wpedantic', '-Werror', '-I' + str(core / 'include'),
                str(core / 'src/bridge.cpp'), str(core / 'src/engine.cpp'), str(core / 'src/techniques.cpp'),
                str(core / 'tests/lab_corpus_builder.cpp'), '-o', str(binary)], check=True)
            corpus_path = work / 'sources.json'
            subprocess.run([str(binary), str(ROOT / 'tools/puzzle-generator/output/content-v4/puzzles.csv'),
                str(corpus_path), '10000', '80', ','.join(TECHNIQUES), '40'], check=True, stdout=subprocess.DEVNULL)
        corpus = json.loads(corpus_path.read_text())
        by_id = {item['id']: item for item in corpus['fixtures'] + corpus['variants']}
        sources = [by_id[source_id] for source_id in manifest['sources']]
        assert len(sources) == 6
        for index, source in enumerate(sources[:5]):
            assert source['techniqueCode'] == TECHNIQUES[index]
        checker = args.checker or work / 'checker'
        if not args.checker:
            compile_checker(checker)
        verify_sources(sources, checker)
        levels = []
        for index, source in enumerate(sources):
            levels.append({'id': f'discovery-{index + 1}',
                'technique_code': TECHNIQUES[index] if index < 5 else None,
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
