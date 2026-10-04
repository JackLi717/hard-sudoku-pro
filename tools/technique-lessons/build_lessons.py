#!/usr/bin/env python3
"""Export selected lessons only after native replay and runtime reader checks."""
from __future__ import annotations

import argparse
import copy
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/hint-lab'))
from check_corpus import independent_key, step_line  # noqa: E402


def compile_checker(output: Path) -> None:
    core = ROOT / 'native/hsp-hint-core'
    subprocess.run([
        os.environ.get('CXX', 'c++'), '-O1', '-std=c++20',
        '-Wall', '-Wextra', '-Wpedantic', '-Werror',
        '-I' + str(core / 'include'),
        str(core / 'src/bridge.cpp'), str(core / 'src/engine.cpp'),
        str(core / 'src/techniques.cpp'), str(core / 'tests/lab_artifact_check.cpp'),
        '-o', str(output),
    ], check=True)


def require_fields(value: object, fields: set[str], label: str) -> dict:
    if not isinstance(value, dict) or set(value) != fields:
        raise ValueError(f'{label} has missing or unexpected fields')
    return value


def validate_source_input(source: dict) -> None:
    if not re.fullmatch(r'[A-Za-z0-9_.:-]+', str(source.get('id', ''))):
        raise ValueError('invalid source example identifier')
    for field in ('puzzleFingerprint', 'boardFingerprint', 'solutionFingerprint'):
        value = source.get(field)
        pattern = r'[1-9]{81}' if field == 'solutionFingerprint' else r'[0-9]{81}'
        if not isinstance(value, str) or not re.fullmatch(pattern, value):
            raise ValueError(f'invalid source {field}')
    if source.get('sourceKind') != 'replay':
        raise ValueError('lessons require replayable source puzzles')
    givens, masks, history = (source.get(key) for key in ('givenCells', 'candidateMasks', 'replaySteps'))
    if not isinstance(givens, list) or len(givens) != 81 or any(type(x) is not bool for x in givens):
        raise ValueError('invalid source given cells')
    if not isinstance(masks, list) or len(masks) != 81 or any(type(x) is not int or not 0 <= x <= 511 for x in masks):
        raise ValueError('invalid source candidate masks')
    if not isinstance(history, list) or len(history) > 729 or type(source.get('sourceIteration')) is not int or source['sourceIteration'] != len(history):
        raise ValueError('source replay length mismatch')
    expected_basis = 'applied_hint_sequence' if history else 'board_direct'
    if source.get('candidateBasis') != expected_basis:
        raise ValueError('source candidate basis mismatch')
    engine = source.get('engineResult')
    if not isinstance(engine, dict) or engine.get('status') != 'step' or not isinstance(engine.get('step'), dict):
        raise ValueError('source target proof is missing')
    if source.get('techniqueCode') != engine['step'].get('techniqueCode'):
        raise ValueError('source target technique mismatch')
    for action in [*history, engine['step']]:
        if not isinstance(action, dict) or not re.fullmatch(r'[A-Za-z0-9_.]+', str(action.get('techniqueCode', ''))):
            raise ValueError('invalid source replay action')
        for field in ('placements', 'eliminations'):
            if not isinstance(action.get(field), list):
                raise ValueError('invalid source replay effects')
            for effect in action[field]:
                if not isinstance(effect, dict) or type(effect.get('cell')) is not int or not 0 <= effect['cell'] < 81 or type(effect.get('digit')) is not int or not 1 <= effect['digit'] <= 9:
                    raise ValueError('invalid source replay candidate')


def validate_pattern_source(source: dict, pattern: str) -> None:
    """A named mode must be the region actually used by its proof."""
    if pattern == 'cell':
        if source['techniqueCode'] != 'nakedSingle':
            raise ValueError('cell pattern requires Naked Single')
        return
    if pattern == 'kite' and source['techniqueCode'] == 'twoStringKite':
        return
    if pattern == 'bug-plus-one' and source['techniqueCode'] == 'bugPlusOne':
        if source.get('coverage', {}).get('result') != 'placement':
            raise ValueError('BUG+1 example must place a digit')
        return
    if source['techniqueCode'] == 'uniqueRectangleType4' and pattern.startswith('strong-box-'):
        expected = ['strong-box', pattern.removeprefix('strong-box-')]
        if source.get('coverage', {}).get('layouts') != expected:
            raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
        return
    coverage = source.get('coverage', {})
    if source['techniqueCode'] == 'simpleColoring' and pattern in {'color-trap', 'color-conflict'}:
        if coverage.get('mode') != pattern.replace('-', '_') or 'components-1' not in coverage.get('layouts', []):
            raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
        return
    if source['techniqueCode'] == 'multiColoring' and pattern == 'multi-color':
        if coverage.get('mode') != 'multi_color' or 'components-2' not in coverage.get('layouts', []):
            raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
        return
    if source['techniqueCode'] == 'remotePair' and pattern in {'linear-short', 'linear-long', 'branched-long'}:
        if coverage.get('mode') != 'remote_pair' or set(coverage.get('layouts', [])) != set(pattern.split('-')):
            raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
        return
    if source['techniqueCode'] in {'xChain', 'xyChain'} and pattern.startswith('chain-'):
        if coverage.get('mode') != 'endpoints' or pattern.removeprefix('chain-') not in coverage.get('layouts', []):
            raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
        return
    if source['techniqueCode'] == 'aic' and pattern.startswith('aic-'):
        expected = (pattern.replace('-', '_') if pattern.startswith('aic-type-')
                    else pattern.removeprefix('aic-').replace('-', '_'))
        if coverage.get('mode') != expected:
            raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
        return
    if source['techniqueCode'] == 'groupedAic' and pattern in {'single-group', 'multiple-groups'}:
        if coverage.get('mode') != 'endpoints' or pattern not in coverage.get('layouts', []):
            raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
        return
    if source['techniqueCode'] == 'complexColoring' and pattern == 'complex-color':
        if coverage.get('mode') != 'complex_color':
            raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
        return
    if source['techniqueCode'] == 'forcingChain' and pattern in {'two-branch', 'multi-branch'}:
        layouts = coverage.get('layouts', [])
        two = 'branches-2' in layouts
        if coverage.get('mode') != 'common' or two != (pattern == 'two-branch'):
            raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
        return
    if source['techniqueCode'] == 'forcingNet' and pattern in {'contradiction', 'common-conclusion'}:
        expected = 'common' if pattern == 'common-conclusion' else pattern
        if coverage.get('mode') != expected:
            raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
        return
    if pattern not in source.get('coverage', {}).get('layouts', []):
        raise ValueError(f'selected example does not show {pattern}: {source["id"]}')
    if source['techniqueCode'] not in {'nakedPair', 'nakedTriple', 'nakedQuad'}:
        return
    step = source['engineResult']['step']
    cells = step['focusCells'] + [target['cell'] for target in step['eliminations']]
    def unit(cell: int, kind: str) -> int:
        if kind == 'row':
            return cell // 9
        if kind == 'column':
            return cell % 9
        return (cell // 27) * 3 + (cell % 9) // 3
    supporting = [kind for kind in ('row', 'column', 'box') if len({unit(cell, kind) for cell in cells}) == 1]
    if supporting != [pattern]:
        raise ValueError(f'ambiguous {pattern} proof region: {source["id"]}')


def verify_sources(sources: list[dict], binary: Path) -> None:
    lines: list[str] = []
    for source in sources:
        validate_source_input(source)
        lines.append(' '.join((source['id'], source['puzzleFingerprint'], source['solutionFingerprint'], source['boardFingerprint'], ''.join('1' if x else '0' for x in source['givenCells']))))
        lines.append(' '.join(map(str, source['candidateMasks'])))
        lines.append(str(len(source['replaySteps'])))
        lines.extend(step_line(step) for step in source['replaySteps'])
        lines.append(step_line(source['engineResult']))
    result = subprocess.run([str(binary)], input='\n'.join(lines) + '\n', text=True, capture_output=True, check=True)
    checks = [json.loads(line) for line in result.stdout.splitlines()]
    if len(checks) != len(sources):
        raise ValueError('native lesson verification is incomplete')
    for source, check in zip(sources, checks):
        if check.get('id') != source['id'] or check.get('errors') or check.get('historyReclassified'):
            raise ValueError(f'native source verification failed: {source["id"]}: {check.get("errors")}')
        if not any(witness.get('engineResult') == source['engineResult'] for witness in check.get('witnesses', [])):
            raise ValueError(f'serialized lesson proof was not independently reproduced: {source["id"]}')


def prepare_allocations(manifest: dict, corpus: dict, existing: dict) -> dict:
    """Derive lesson source records; authors enter references, not board data."""
    require_fields(existing, {'allocations'}, 'content allocations')
    require_fields(manifest, {'lessons'}, 'lesson manifest')
    if not isinstance(existing['allocations'], list) or not isinstance(manifest['lessons'], list):
        raise ValueError('lessons and allocations must be arrays')
    sources = {}
    for source in corpus.get('fixtures', []) + corpus.get('variants', []):
        if source['id'] in sources:
            raise ValueError('duplicate source example identifier')
        sources[source['id']] = source
    # Other modes retain their records; full validation below rejects conflicts.
    allocations = [copy.deepcopy(item) for item in existing['allocations'] if item['content_usage'] != 'lesson']
    for entry in manifest['lessons']:
        source = sources.get(entry['example_id'])
        if source is None:
            raise ValueError(f'unknown lesson example: {entry["example_id"]}')
        allocations.append({
            'content_id': entry['lesson_id'], 'content_usage': 'lesson',
            'source_puzzle_id': source['sourcePuzzleId'],
            'puzzle_fingerprint': source['puzzleFingerprint'],
            'board_fingerprint': source['boardFingerprint'],
            'candidate_masks': copy.deepcopy(source['candidateMasks']),
        })
    return {'allocations': allocations}


def build_lessons(manifest: dict, corpus: dict, allocations: dict, binary: Path | None = None) -> dict:
    require_fields(manifest, {'lessons'}, 'lesson manifest')
    if not isinstance(manifest['lessons'], list):
        raise ValueError('manifest lessons must be an array')
    sources: dict[str, dict] = {}
    # Isolated regression examples cannot silently become public teaching data.
    for source in corpus.get('fixtures', []) + corpus.get('variants', []):
        if source['id'] in sources:
            raise ValueError('duplicate source example identifier')
        sources[source['id']] = source
    selected: list[dict] = []
    lessons: list[dict] = []
    for entry in manifest['lessons']:
        demonstration = 'pattern' in entry
        require_fields(
            entry,
            {'lesson_id', 'technique_code', 'pattern', 'example_id'} if demonstration
            else {'lesson_id', 'technique_code', 'example_id', 'prerequisite_techniques', 'texts'},
            'lesson manifest entry',
        )
        source = sources.get(entry['example_id'])
        if source is None:
            raise ValueError(f'unknown lesson example: {entry["example_id"]}')
        validate_source_input(source)
        if entry['technique_code'] != source['techniqueCode']:
            raise ValueError('selected example does not teach the declared technique')
        selected.append(source)
        lesson = {
            'lesson_id': entry['lesson_id'],
            'technique_code': entry['technique_code'],
            'example': {
                'example_id': source['id'],
                'source_puzzle_id': source['sourcePuzzleId'],
                'source_family': independent_key(source['puzzleFingerprint']),
                'puzzle_fingerprint': source['puzzleFingerprint'],
                'board_fingerprint': source['boardFingerprint'],
                'candidate_masks': copy.deepcopy(source['candidateMasks']),
                'candidate_basis': source['candidateBasis'],
                'step': copy.deepcopy(source['engineResult']['step']),
            },
        }
        if demonstration:
            lesson['pattern'] = entry['pattern']
            validate_pattern_source(source, entry['pattern'])
        else:
            lesson['prerequisite_techniques'] = copy.deepcopy(entry['prerequisite_techniques'])
            lesson['texts'] = copy.deepcopy(entry['texts'])
        lessons.append(lesson)
    resource = {'content_usage': 'lesson', 'lessons': lessons}
    with tempfile.TemporaryDirectory(prefix='hsp-lessons-') as temporary:
        work = Path(temporary)
        staged, inventory = work / 'catalog.json', work / 'allocations.json'
        staged.write_text(json.dumps(resource, ensure_ascii=False) + '\n')
        inventory.write_text(json.dumps(allocations, ensure_ascii=False) + '\n')
        subprocess.run(['node', str(ROOT / 'tools/technique-lessons/check_catalog.mjs'), str(staged), str(inventory)], text=True, capture_output=True, check=True)
        if selected:
            checker = binary or work / 'lab_artifact_check'
            if binary is None:
                compile_checker(checker)
            verify_sources(selected, checker)
    return resource


def install_json(output: Path, value: dict) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    # All gates pass before the current output is touched. Install atomically.
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=output.parent, delete=False) as stream:
        staged = Path(stream.name)
        json.dump(value, stream, ensure_ascii=False, separators=(',', ':'))
        stream.write('\n')
    try:
        staged.replace(output)
    finally:
        staged.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, default=ROOT / 'tools/technique-lessons/manifest.json')
    parser.add_argument('--corpus', type=Path, default=ROOT / 'tools/technique-lessons/source-fixtures.json')
    parser.add_argument('--allocations', type=Path, default=ROOT / 'tools/technique-lessons/content-allocations.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'src/data/lessons/generated/lesson-catalog.json')
    parser.add_argument('--binary', type=Path, help='Optional existing native checker, otherwise built in a disposable directory')
    parser.add_argument('--prepare-allocations', type=Path, help='Generate and validate a replacement lesson allocation inventory at this path; do not install the catalog')
    args = parser.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text())
        corpus = json.loads(args.corpus.read_text())
        allocations = json.loads(args.allocations.read_text())
        if args.prepare_allocations:
            allocations = prepare_allocations(manifest, corpus, allocations)
        resource = build_lessons(manifest, corpus, allocations, args.binary)
        install_json(args.prepare_allocations or args.output, allocations if args.prepare_allocations else resource)
        print(json.dumps({'lessonCount': len(resource['lessons']), 'techniqueCount': len({entry['technique_code'] for entry in resource['lessons']})}))
        return 0
    except (ValueError, KeyError, TypeError, OSError, subprocess.CalledProcessError) as error:
        detail = error.stderr if isinstance(error, subprocess.CalledProcessError) and error.stderr else str(error)
        print(f'Lesson generation failed: {detail.strip()}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
