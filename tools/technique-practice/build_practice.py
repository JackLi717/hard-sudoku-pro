#!/usr/bin/env python3
"""Select and verify offline practice scenes without editing puzzle data."""
from __future__ import annotations

import argparse
from collections import Counter
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/technique-lessons'))
from build_lessons import compile_checker, install_json, validate_source_input, verify_sources  # noqa: E402
sys.path.insert(0, str(ROOT / 'tools/hint-lab'))
from check_corpus import independent_key  # noqa: E402

DEFAULT_MANIFEST = Path(__file__).parent / 'manifest.json'
DEFAULT_OUTPUT = ROOT / 'src/data/practice/generated/practice-catalog.json'
DEFAULT_ALLOCATIONS = ROOT / 'tools/technique-lessons/content-allocations.json'


@lru_cache(maxsize=None)
def source_family(fingerprint: str) -> str:
    return independent_key(fingerprint)


def valid_source(source: dict, technique: str) -> bool:
    if source.get('techniqueCode') != technique:
        return False
    step = source.get('engineResult', {}).get('step', {})
    placements, eliminations = step.get('placements', []), step.get('eliminations', [])
    if technique in ('fullHouse', 'nakedSingle', 'hiddenSingle'):
        if len(placements) != 1 or eliminations:
            return False
    elif placements or not eliminations:
        return False
    try:
        validate_source_input(source)
    except (ValueError, KeyError, TypeError):
        return False
    return True


def generated_id(technique: str, example_id: str) -> str:
    prefix = ''.join(f'-{letter.lower()}' if letter.isupper() else letter
                     for letter in technique).lstrip('-')
    digest = hashlib.sha256(example_id.encode()).hexdigest()[:12]
    return f'{prefix}-{digest}'


def select_entries(manifest: dict, sources: dict, allocated: list[dict]) -> list[dict]:
    targets = manifest['targets']
    entries = list(manifest['exercises'])
    if not targets or not all(
        set(counts) == {'demo', 'exercise'} and counts['demo'] in (0, 1)
        and isinstance(counts['exercise'], int) and counts['exercise'] >= 1
        for counts in targets.values()
    ):
        raise ValueError('invalid practice targets')
    ids = set()
    examples = set()
    used_families = {
        source_family(item['puzzle_fingerprint']) for item in allocated
    }
    for entry in entries:
        if set(entry) != {'id', 'technique_code', 'role', 'example_id'}:
            raise ValueError('invalid practice selection')
        technique = entry['technique_code']
        role = entry['role']
        example_id = entry['example_id']
        if technique not in targets or role not in ('demo', 'exercise'):
            raise ValueError('invalid practice technique or role')
        if entry['id'] in ids or example_id in examples:
            raise ValueError('duplicate practice ID or example')
        source = sources.get(example_id)
        if source is None or not valid_source(source, technique):
            raise ValueError(f'invalid practice source: {example_id}')
        family = source_family(source['puzzleFingerprint'])
        if family in used_families:
            raise ValueError(f'practice source family reused: {example_id}')
        ids.add(entry['id'])
        examples.add(example_id)
        used_families.add(family)

    counts = Counter((entry['technique_code'], entry['role']) for entry in entries)
    for technique, goal in targets.items():
        for role in ('demo', 'exercise'):
            if counts[technique, role] > goal[role]:
                raise ValueError('practice selection exceeds target')
    eligible = {
        technique: [source for source in sources.values()
                    if valid_source(source, technique)]
        for technique in targets
    }
    while any(counts[technique, role] < goal[role]
              for technique, goal in targets.items()
              for role in ('demo', 'exercise')):
        choices = []
        for technique, goal in targets.items():
            for role in ('demo', 'exercise'):
                remaining = goal[role] - counts[technique, role]
                if remaining < 1:
                    continue
                candidates = [
                    source for source in eligible[technique]
                    if source['id'] not in examples
                    and source_family(source['puzzleFingerprint']) not in used_families
                ]
                families = {source_family(source['puzzleFingerprint'])
                            for source in candidates}
                if len(families) < remaining:
                    raise ValueError(
                        f'no independent {technique} {role} source available'
                    )
                choices.append((len(families) - remaining, len(families),
                                technique, role, candidates))
        _, _, technique, role, candidates = min(choices,
                                               key=lambda choice: choice[:4])
        source = min(candidates, key=lambda item: (
            len(item['engineResult']['step']['placements']) +
            len(item['engineResult']['step']['eliminations']), item['id']))
        example_id = source['id']
        content_id = generated_id(technique, example_id)
        if content_id in ids:
            raise ValueError('generated practice ID collision')
        entries.append({
            'id': content_id, 'technique_code': technique,
            'role': role, 'example_id': example_id,
        })
        ids.add(content_id)
        examples.add(example_id)
        used_families.add(source_family(source['puzzleFingerprint']))
        counts[technique, role] += 1
    return entries


def build(manifest_path: Path, output_path: Path, allocations_path: Path) -> None:
    manifest = json.loads(manifest_path.read_text())
    corpus = json.loads((ROOT / 'src/debug/generated/hint-lab-fixtures.json').read_text())
    sources = {item['id']: item for item in corpus['fixtures'] + corpus['variants']}
    inventory = json.loads(allocations_path.read_text())
    inventory['allocations'] = [
        item for item in inventory['allocations'] if item['content_usage'] != 'practice'
    ]
    entries = select_entries(manifest, sources, inventory['allocations'])
    selected = []
    exercises = []
    for entry in entries:
        source = sources[entry['example_id']]
        step = source['engineResult']['step']
        family = source_family(source['puzzleFingerprint'])
        selected.append(source)
        exercises.append({
            'id': entry['id'], 'technique_code': entry['technique_code'],
            'role': entry['role'], 'source_puzzle_id': source['sourcePuzzleId'],
            'source_family': family, 'puzzle_fingerprint': source['puzzleFingerprint'],
            'board_fingerprint': source['boardFingerprint'],
            'solution_fingerprint': source['solutionFingerprint'],
            'candidate_masks': source['candidateMasks'], 'step': step,
        })
        inventory['allocations'].append({
            'content_id': entry['id'], 'content_usage': 'practice',
            'source_puzzle_id': source['sourcePuzzleId'],
            'puzzle_fingerprint': source['puzzleFingerprint'],
            'board_fingerprint': source['boardFingerprint'],
            'candidate_masks': source['candidateMasks'],
        })

    with tempfile.TemporaryDirectory(prefix='hsp-practice-') as directory:
        checker = Path(directory) / 'checker'
        compile_checker(checker)
        verify_sources(selected, checker)
        staged = Path(directory) / 'allocations.json'
        staged.write_text(json.dumps(inventory))
        subprocess.run([
            'node', str(ROOT / 'tools/technique-practice/check_allocations.mjs'),
            str(staged),
        ], check=True)

    # Install only after every source, proof, and cross-pool allocation passes.
    install_json(manifest_path, {**manifest, 'exercises': entries})
    install_json(allocations_path, inventory)
    install_json(output_path, {'content_usage': 'practice', 'exercises': exercises})
    print(f'Built {len(exercises)} verified practice scenes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--allocations', type=Path, default=DEFAULT_ALLOCATIONS)
    args = parser.parse_args()
    build(args.manifest, args.output, args.allocations)
