#!/usr/bin/env python3
"""Recheck generated Hint Lab content using an independent native process.

No claims are accepted from fixture.validation. Stored replay effects are
re-detected from the original puzzle, and stored coverage must match a native
proof witness. An incomplete/missing mode is a failing acceptance condition.
"""
from __future__ import annotations
import argparse
import collections
import json
import re
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]

def effects(items: list[dict]) -> str:
    return ','.join(f'{item["cell"]}:{item["digit"]}' for item in items) or '-'

def step_line(step: dict) -> str:
    step = step.get('step', step)
    return ' '.join((step['techniqueCode'], effects(step['placements']), effects(step['eliminations'])))

def independent_key(puzzle: str) -> str:
    """Ignore digit relabeling, reflections and quarter-turn rotations."""
    variants = []
    for reflected in (False, True):
        for turns in range(4):
            cells = ['0'] * 81
            for index, digit in enumerate(puzzle):
                row, column = divmod(index, 9)
                if reflected:
                    column = 8 - column
                for _ in range(turns):
                    row, column = column, 8 - row
                cells[row * 9 + column] = digit
            mapping = {'0': '0'}
            normalized = []
            for digit in cells:
                if digit not in mapping:
                    mapping[digit] = str(len(mapping))
                normalized.append(mapping[digit])
            variants.append(''.join(normalized))
    return min(variants)

def validate_artifact(data: dict, catalog: list[dict]) -> None:
    if len(catalog) != 39 or len({entry['techniqueCode'] for entry in catalog}) != 39:
        raise ValueError('invalid native catalog')
    primary = data.get('fixtures', [])
    if data.get('fixtureCount') != 39 or [item.get('techniqueCode') for item in primary] != [entry['techniqueCode'] for entry in catalog]:
        raise ValueError('primary fixtures must match the ordered native catalog')
    levels = {entry['techniqueCode']: entry['difficultyLevel'] for entry in catalog}
    ids = set()
    for item in primary + data.get('variants', []):
        identifier = item.get('id')
        if not isinstance(identifier, str) or not re.fullmatch(r'[A-Za-z0-9_.:-]+', identifier) or identifier in ids:
            raise ValueError('invalid or duplicate fixture ID')
        ids.add(identifier)
        code = item.get('techniqueCode')
        if code not in levels or type(item.get('difficultyLevel')) is not int or item['difficultyLevel'] != levels[code]:
            raise ValueError('fixture technique/level mismatch')
        for field in ('puzzleFingerprint', 'solutionFingerprint', 'boardFingerprint'):
            value = item.get(field)
            if not isinstance(value, str) or len(value) != 81 or any(char not in '0123456789' for char in value):
                raise ValueError('invalid board fingerprint')
        givens = item.get('givenCells', [])
        masks = item.get('candidateMasks', [])
        if len(givens) != 81 or any(type(value) is not bool for value in givens):
            raise ValueError('invalid given cells')
        if len(masks) != 81 or any(type(value) is not int or value < 0 or value > 511 for value in masks):
            raise ValueError('invalid candidate masks')
        history = item.get('replaySteps', [])
        if type(item.get('sourceIteration')) is not int or item['sourceIteration'] != len(history):
            raise ValueError('replay length mismatch')
        for index, wrapped in enumerate(history + [item['engineResult']]):
            if index == len(history) or 'step' in wrapped:
                if wrapped.get('status') != 'step' or not isinstance(wrapped.get('step'), dict):
                    raise ValueError('invalid serialized step')
                step = wrapped['step']
                if step.get('techniqueCode') not in levels or type(step.get('difficultyLevel')) is not int or step['difficultyLevel'] != levels[step['techniqueCode']]:
                    raise ValueError('step technique/level mismatch')
            else:
                # Replay storage is compact: native re-detection supplies the
                # proof, rather than persisting duplicate presentation pages.
                step = wrapped
                if set(step) != {'techniqueCode', 'placements', 'eliminations'} or step['techniqueCode'] not in levels:
                    raise ValueError('invalid compact replay step')
            if not isinstance(step.get('placements'), list) or not isinstance(step.get('eliminations'), list):
                raise ValueError('invalid effect arrays')
            for effect in step['placements'] + step['eliminations']:
                if not isinstance(effect, dict):
                    raise ValueError('invalid effect object')
                if type(effect.get('cell')) is not int or not 0 <= effect['cell'] < 81 or type(effect.get('digit')) is not int or not 1 <= effect['digit'] <= 9:
                    raise ValueError('invalid effect candidate')
        if item['engineResult']['step']['techniqueCode'] != code:
            raise ValueError('target technique mismatch')

TARGET_MULTIPLICITY_TECHNIQUES = {
    'xWing', 'swordfish', 'jellyfish', 'finnedXWing', 'sashimiXWing',
    'xyWing', 'xyzWing', 'xChain', 'xyChain',
}

def target_multiplicity_gaps(code: str, counts: dict[str, int]) -> list[str]:
    if code not in TARGET_MULTIPLICITY_TECHNIQUES:
        return []
    return ['target_count_missing:' + kind for kind in ('single', 'multiple') if counts.get(kind, 0) < 1]

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--binary', type=Path)
    parser.add_argument('--reclassified-output', type=Path, help='Regenerate a copy of native target proofs and coverage; a separate official check is still required')
    args = parser.parse_args()
    data = json.loads(args.input.read_text())
    baseline = json.loads(args.baseline.read_text()) if args.baseline else {'fixtures': [], 'variants': []}
    fixtures = data['fixtures'] + data.get('variants', [])
    previous = collections.defaultdict(set)
    for item in baseline['fixtures'] + baseline.get('variants', []):
        previous[item['techniqueCode']].add(independent_key(item['puzzleFingerprint']))
    with tempfile.TemporaryDirectory(prefix='hsp-lab-check-') as work:
        binary = args.binary or Path(work) / 'check'
        if not args.binary:
            core = ROOT / 'native/hsp-hint-core'
            subprocess.run(['c++', '-O1', '-std=c++20', '-Wall', '-Wextra', '-Wpedantic', '-Werror', '-I'+str(core/'include'), str(core/'src/bridge.cpp'), str(core/'src/engine.cpp'), str(core/'src/techniques.cpp'), str(core/'tests/lab_artifact_check.cpp'), '-o', str(binary)], check=True)
        catalog = json.loads(subprocess.run([str(binary), '--catalog'], text=True, capture_output=True, check=True).stdout)
        validate_artifact(data, catalog)
        previous = {entry['techniqueCode']: previous[entry['techniqueCode']] for entry in catalog}
        inputs = []
        for item in fixtures:
            inputs.append(' '.join((item['id'], item['puzzleFingerprint'], item['solutionFingerprint'], item['boardFingerprint'], ''.join('1' if x else '0' for x in item['givenCells']))))
            inputs.append(' '.join(map(str, item['candidateMasks'])))
            inputs.append(str(len(item.get('replaySteps', []))))
            inputs.extend(step_line(step) for step in item.get('replaySteps', []))
            inputs.append(step_line(item['engineResult']))
        result = subprocess.run([str(binary)], input='\n'.join(inputs)+'\n', text=True, capture_output=True, check=True)
    checks = [json.loads(line) for line in result.stdout.splitlines()]
    if len(checks) != len(fixtures):
        raise RuntimeError('Native checker returned an incomplete result')
    grouped = collections.defaultdict(list)
    failures = []
    for fixture, check in zip(fixtures, checks):
        if fixture['id'] != check['id']:
            raise RuntimeError('Native checker result order mismatch')
        witnesses = check['witnesses']
        coverages = [{key: witness[key] for key in ('mode', 'layouts', 'result', 'targetCount')} for witness in witnesses]
        if args.reclassified_output and coverages:
            matched_index = next((index for index, witness in enumerate(witnesses) if witness.get('engineResult') == fixture['engineResult']), 0)
            fixture['coverage'] = coverages[matched_index]
            fixture['engineResult'] = witnesses[matched_index]['engineResult']
        if fixture.get('coverage') not in coverages:
            check['errors'].append('coverage_not_proved')
        if not args.reclassified_output and not any(witness.get('engineResult') == fixture['engineResult'] and coverage == fixture.get('coverage') for witness, coverage in zip(witnesses, coverages)):
            check['errors'].append('serialized_target_verification_incomplete' if check.get('enumerationIncomplete') else 'serialized_target_proof_not_reproduced')
        if check['errors']:
            failures.append({'id': fixture['id'], 'errors': check['errors']})
        else:
            grouped[fixture['techniqueCode']].append(fixture)
    modes = {'simpleColoring': ['color_trap', 'color_conflict'], 'multiColoring': ['multi_color'], 'remotePair': ['remote_pair'], 'avoidableRectangle': ['avoidable'], 'xChain': ['endpoints'], 'xyChain': ['endpoints'], 'aic': ['contradiction'], 'groupedAic': ['endpoints'], 'complexColoring': ['complex_color'], 'forcingChain': ['common'], 'forcingNet': ['contradiction', 'common']}
    three_regions = {'fullHouse', 'hiddenSingle', 'nakedPair', 'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad'}
    two_regions = {'lockedCandidates.pointing', 'lockedCandidates.claiming', 'lockedPair', 'lockedTriple', 'xWing', 'swordfish', 'jellyfish', 'finnedXWing', 'sashimiXWing', 'skyscraper'}
    techniques = []
    for code in previous:
        items = grouped[code]
        sources = {independent_key(item['puzzleFingerprint']) for item in items}
        new_sources = sources - previous[code]
        mode_sources = collections.defaultdict(set)
        result_sources = collections.defaultdict(set)
        for item in items:
            key = independent_key(item['puzzleFingerprint'])
            mode_sources[item['coverage']['mode']].add(key)
            result_sources[(item['coverage']['mode'], item['coverage']['result'])].add(key)
        counts = collections.Counter({mode: len(keys) for mode, keys in mode_sources.items()})
        layouts = collections.Counter(tag for item in items for tag in item['coverage']['layouts'])
        target_counts = collections.Counter('single' if item['coverage']['targetCount'] == 1 else 'multiple' for item in items)
        required_modes = modes.get(code, ['direct'])
        required_layouts = ['row', 'column', 'box'] if code in three_regions else ['row', 'column'] if code in two_regions else []
        if code in {'finnedXWing', 'sashimiXWing'}:
            required_layouts += ['single-fin', 'multiple-fins']
        if code in {'xChain', 'xyChain'}:
            required_layouts += ['short', 'medium', 'long']
        if code == 'groupedAic':
            required_layouts += ['group-size-2', 'group-size-3', 'single-group', 'multiple-groups', 'endpoint-group', 'internal-group']
        shapes = {
            'wWing': ['strong-row', 'strong-column', 'strong-box'],
            'xyWing': ['box-line', 'row-column'],
            'xyzWing': ['row-link', 'column-link'],
            'emptyRectangle': ['strong-row', 'strong-column'],
            'remotePair': ['linear', 'branched', 'short', 'long'],
            'uniqueRectangle': ['corner-top-left', 'corner-top-right', 'corner-bottom-left', 'corner-bottom-right'],
            'avoidableRectangle': ['corner-top-left', 'corner-top-right', 'corner-bottom-left', 'corner-bottom-right'],
            'hiddenRectangle': ['roof-top', 'roof-bottom'],
            'swordfish': ['sparse', 'mixed-density'],
            'jellyfish': ['sparse', 'mixed-density'],
        }
        required_layouts += shapes.get(code, [])
        gaps = target_multiplicity_gaps(code, target_counts)
        if len(sources) < 3: gaps.append('fewer_than_3_independent_sources')
        if args.baseline and len(new_sources) < 2: gaps.append('fewer_than_2_new_independent_sources')
        gaps.extend('mode_needs_2:'+mode for mode in required_modes if counts[mode] < 2)
        gaps.extend('layout_missing:'+layout for layout in required_layouts if layouts[layout] < 1)
        required_results = [('contradiction', 'placement'), ('contradiction', 'elimination')] if code == 'aic' else [('common', 'placement'), ('common', 'elimination')] if code == 'forcingChain' else [('common', 'placement'), ('common', 'elimination'), ('contradiction', 'elimination')] if code == 'forcingNet' else []
        gaps.extend('mode_result_needs_2:'+mode+':'+kind for mode, kind in required_results if len(result_sources[(mode, kind)]) < 2)
        if code == 'forcingNet' and layouts['multiple-premises'] == 0:
            gaps.append('layout_missing:multiple-premises')
        techniques.append({'techniqueCode': code, 'qualifiedExamples': len(items), 'independentSources': len(sources), 'newIndependentSources': len(new_sources) if args.baseline else None, 'modes': dict(counts), 'layouts': dict(layouts), 'modeResults': {mode+':'+kind: len(keys) for (mode, kind), keys in result_sources.items()}, 'targetCounts': dict(target_counts), 'requiredTargetCounts': ['single', 'multiple'] if code in TARGET_MULTIPLICITY_TECHNIQUES else [], 'requiredModes': required_modes, 'requiredLayouts': required_layouts, 'gaps': gaps})
    report = {'scope': 'Exhaustive lower-level 1–4 detectors plus explicit same-level basic relations; advanced target proofs use supported detector grammar. Arbitrary-length advanced absence is not asserted.', 'baseline': {'exampleCount': len(baseline['fixtures']) + len(baseline.get('variants', []))} if args.baseline else None, 'summary': {'examples': len(fixtures), 'qualifiedExamples': len(fixtures)-len(failures), 'techniques': len(techniques), 'techniquesWithoutDeclaredGaps': sum(not item['gaps'] for item in techniques), 'passed': not args.reclassified_output and len(techniques) == 39 and not failures and all(not item['gaps'] for item in techniques)}, 'fixtureFailures': failures, 'techniques': techniques}
    if args.reclassified_output:
        args.reclassified_output.write_text(json.dumps(data, ensure_ascii=False)+'\n')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(report['summary']))
    return 0 if report['summary']['passed'] else 1

if __name__ == '__main__':
    raise SystemExit(main())
