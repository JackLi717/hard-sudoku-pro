#!/usr/bin/env python3
"""Build a small, source-isolated practice pilot from validated Hint Lab replays."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/technique-lessons'))
from build_lessons import compile_checker, install_json, validate_source_input, verify_sources  # noqa: E402
sys.path.insert(0, str(ROOT / 'tools/hint-lab'))
from check_corpus import independent_key  # noqa: E402


def build() -> None:
    manifest = json.loads((Path(__file__).parent / 'manifest.json').read_text())['exercises']
    corpus = json.loads((ROOT / 'src/debug/generated/hint-lab-fixtures.json').read_text())
    sources = {item['id']: item for item in corpus['fixtures'] + corpus['variants']}
    inventory_path = ROOT / 'tools/technique-lessons/content-allocations.json'
    inventory = json.loads(inventory_path.read_text())
    inventory['allocations'] = [item for item in inventory['allocations'] if item['content_usage'] != 'practice']
    selected = []
    exercises = []
    families = set()
    for entry in manifest:
        if set(entry) != {'id', 'technique_code', 'role', 'example_id'} or entry['role'] not in ('demo', 'exercise'):
            raise ValueError('invalid practice selection')
        source = sources[entry['example_id']]
        validate_source_input(source)
        if source['techniqueCode'] != entry['technique_code']:
            raise ValueError('practice technique mismatch')
        family = independent_key(source['puzzleFingerprint'])
        if family in families:
            raise ValueError('practice source family reused')
        families.add(family)
        step = source['engineResult']['step']
        if len(step['placements']) + len(step['eliminations']) != 1:
            raise ValueError('pilot requires one atomic outcome')
        selected.append(source)
        exercise = {
            'id': entry['id'], 'technique_code': entry['technique_code'], 'role': entry['role'],
            'source_puzzle_id': source['sourcePuzzleId'], 'source_family': family,
            'puzzle_fingerprint': source['puzzleFingerprint'],
            'board_fingerprint': source['boardFingerprint'],
            'solution_fingerprint': source['solutionFingerprint'],
            'candidate_masks': source['candidateMasks'], 'step': step,
        }
        exercises.append(exercise)
        inventory['allocations'].append({
            'content_id': entry['id'], 'content_usage': 'practice',
            'source_puzzle_id': source['sourcePuzzleId'],
            'puzzle_fingerprint': source['puzzleFingerprint'],
            'board_fingerprint': source['boardFingerprint'],
            'candidate_masks': source['candidateMasks'],
        })
    if any(sum(e['technique_code'] == code and e['role'] == role for e in exercises) != count
           for code in ('hiddenSingle', 'nakedPair') for role, count in (('demo', 1), ('exercise', 3))):
        raise ValueError('pilot must have one demonstration and three exercises per technique')
    with tempfile.TemporaryDirectory(prefix='hsp-practice-') as directory:
        checker = Path(directory) / 'checker'
        compile_checker(checker)
        verify_sources(selected, checker)
    # Validate all content pools together before installing either output.
    import subprocess
    with tempfile.TemporaryDirectory(prefix='hsp-practice-alloc-') as directory:
        staged = Path(directory) / 'allocations.json'
        staged.write_text(json.dumps(inventory))
        subprocess.run(['node', str(ROOT / 'tools/technique-practice/check_allocations.mjs'), str(staged)], check=True)
    install_json(inventory_path, inventory)
    install_json(ROOT / 'src/data/practice/generated/practice-catalog.json',
                 {'content_usage': 'practice', 'exercises': exercises})
    print(f'Built {len(exercises)} verified practice scenes')


if __name__ == '__main__':
    build()
