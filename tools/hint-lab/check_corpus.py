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


def is_hodoku_locked_subset(item: dict, size: int) -> bool:
    """HoDoKu counts a pair/triple as locked when both common houses delete."""
    step = item.get('engineResult', {}).get('step', {})
    cells = step.get('focusCells', [])
    masks = item.get('candidateMasks', [])
    if len(cells) != size or len(masks) != 81:
        return False
    positions = [divmod(cell, 9) for cell in cells]
    first_row, first_column = positions[0]
    first_box = (first_row // 3) * 3 + first_column // 3
    same_box = all(
        (row // 3) * 3 + column // 3 == first_box
        for row, column in positions
    )
    same_row = all(row == first_row for row, _ in positions)
    same_column = all(column == first_column for _, column in positions)
    if not same_box or not (same_row or same_column):
        return False
    subset_mask = 0
    for cell in cells:
        subset_mask |= masks[cell]
    box_has_elimination = False
    line_has_elimination_outside_box = False
    for cell, mask in enumerate(masks):
        if cell in cells or not mask & subset_mask:
            continue
        row, column = divmod(cell, 9)
        box = (row // 3) * 3 + column // 3
        box_has_elimination |= box == first_box
        in_line = row == first_row if same_row else column == first_column
        line_has_elimination_outside_box |= in_line and box != first_box
    return box_has_elimination and line_has_elimination_outside_box


def is_hodoku_locked_pair(item: dict) -> bool:
    return is_hodoku_locked_subset(item, 2)


def is_hodoku_locked_triple(item: dict) -> bool:
    return is_hodoku_locked_subset(item, 3)


def has_complete_subset_eliminations(item: dict, size: int) -> bool:
    step = item.get('engineResult', {}).get('step', {})
    cells = step.get('focusCells', [])
    masks = item.get('candidateMasks', [])
    if len(cells) != size or len(masks) != 81:
        return False
    positions = [divmod(cell, 9) for cell in cells]
    first_row, first_column = positions[0]
    first_box = (first_row // 3) * 3 + first_column // 3
    same_row = all(row == first_row for row, _ in positions)
    same_column = all(column == first_column for _, column in positions)
    same_box = all(
        (row // 3) * 3 + column // 3 == first_box
        for row, column in positions
    )
    subset_mask = 0
    for cell in cells:
        subset_mask |= masks[cell]
    expected = set()
    for cell, mask in enumerate(masks):
        if cell in cells:
            continue
        row, column = divmod(cell, 9)
        box = (row // 3) * 3 + column // 3
        shares_common_house = (
            (same_row and row == first_row)
            or (same_column and column == first_column)
            or (same_box and box == first_box)
        )
        if not shares_common_house:
            continue
        for digit in range(1, 10):
            bit = 1 << (digit - 1)
            if subset_mask & bit and mask & bit:
                expected.add((cell, digit))
    actual = {
        (candidate.get('cell'), candidate.get('digit'))
        for candidate in step.get('eliminations', [])
    }
    return actual == expected


def has_complete_pair_eliminations(item: dict) -> bool:
    return has_complete_subset_eliminations(item, 2)


def has_complete_triple_eliminations(item: dict) -> bool:
    return has_complete_subset_eliminations(item, 3)


def peers(first: int, second: int) -> bool:
    first_row, first_column = divmod(first, 9)
    second_row, second_column = divmod(second, 9)
    return first != second and (
        first_row == second_row
        or first_column == second_column
        or (first_row // 3, first_column // 3)
        == (second_row // 3, second_column // 3)
    )


def linked_pattern(item: dict) -> tuple[int, set[int], list[int], list[int]] | None:
    step = item.get('engineResult', {}).get('step', {})
    premises = step.get('premiseCandidates', [])
    eliminations = step.get('eliminations', [])
    if not premises or not eliminations:
        return None
    digits = {
        candidate.get('digit')
        for candidate in premises + eliminations
    }
    cells = {candidate.get('cell') for candidate in premises}
    if (
        len(digits) != 1
        or not all(type(cell) is int and 0 <= cell < 81 for cell in cells)
    ):
        return None
    digit = next(iter(digits))
    masks = item.get('candidateMasks', [])
    if len(masks) != 81 or not 1 <= digit <= 9:
        return None
    bit = 1 << (digit - 1)
    if any(not masks[cell] & bit for cell in cells):
        return None
    targets = [candidate.get('cell') for candidate in eliminations]
    if not all(type(cell) is int and 0 <= cell < 81 for cell in targets):
        return None
    return digit, cells, targets, masks


def is_hodoku_skyscraper(item: dict) -> bool:
    pattern = linked_pattern(item)
    if not pattern:
        return False
    digit, cells, targets, masks = pattern
    if len(cells) != 4:
        return False
    bit = 1 << (digit - 1)
    for rows_are_base in (True, False):
        covers = {}
        for base in range(9):
            positions = []
            for cover in range(9):
                cell = base * 9 + cover if rows_are_base else cover * 9 + base
                if masks[cell] & bit:
                    positions.append(cover)
            if len(positions) == 2:
                covers[base] = positions
        bases = list(covers)
        for first_index, first in enumerate(bases):
            for second in bases[first_index + 1:]:
                shared = set(covers[first]) & set(covers[second])
                if len(shared) != 1:
                    continue
                shared_cover = next(iter(shared))
                first_roof = next(value for value in covers[first] if value != shared_cover)
                second_roof = next(value for value in covers[second] if value != shared_cover)
                if first_roof == second_roof:
                    continue
                cell_at = lambda base, cover: (
                    base * 9 + cover if rows_are_base else cover * 9 + base
                )
                shape = {
                    cell_at(first, shared_cover),
                    cell_at(first, first_roof),
                    cell_at(second, shared_cover),
                    cell_at(second, second_roof),
                }
                roofs = [cell_at(first, first_roof), cell_at(second, second_roof)]
                if shape == cells and all(
                    target not in cells and all(peers(target, roof) for roof in roofs)
                    for target in targets
                ):
                    return True
    return False


def is_hodoku_two_string_kite(item: dict) -> bool:
    pattern = linked_pattern(item)
    if not pattern:
        return False
    digit, cells, targets, masks = pattern
    if not 3 <= len(cells) <= 4:
        return False
    bit = 1 << (digit - 1)
    row_pairs = []
    column_pairs = []
    for index in range(9):
        row = [index * 9 + column for column in range(9) if masks[index * 9 + column] & bit]
        column = [row * 9 + index for row in range(9) if masks[row * 9 + index] & bit]
        if len(row) == 2:
            row_pairs.append(row)
        if len(column) == 2:
            column_pairs.append(column)
    for row_pair in row_pairs:
        for column_pair in column_pairs:
            if set(row_pair + column_pair) != cells:
                continue
            for row_base in row_pair:
                for column_base in column_pair:
                    if row_base == column_base:
                        continue
                    row_position = divmod(row_base, 9)
                    column_position = divmod(column_base, 9)
                    if (row_position[0] // 3, row_position[1] // 3) != (
                        column_position[0] // 3,
                        column_position[1] // 3,
                    ):
                        continue
                    row_end = next(cell for cell in row_pair if cell != row_base)
                    column_end = next(cell for cell in column_pair if cell != column_base)
                    if all(
                        target not in cells
                        and peers(target, row_end)
                        and peers(target, column_end)
                        for target in targets
                    ):
                        return True
    return False


def is_two_candidate_empty_rectangle(item: dict) -> bool:
    """Recognize the four-node Empty Rectangle form that is also a Turbot."""
    pattern = linked_pattern(item)
    if not pattern:
        return False
    digit, cells, targets, masks = pattern
    if len(cells) != 4 or len(targets) != 1:
        return False
    bit = 1 << (digit - 1)
    line_links = []
    for index in range(9):
        row = [
            index * 9 + column
            for column in range(9)
            if masks[index * 9 + column] & bit
        ]
        column = [
            row * 9 + index
            for row in range(9)
            if masks[row * 9 + index] & bit
        ]
        if len(row) == 2:
            line_links.append(row)
        if len(column) == 2:
            line_links.append(column)
    target = targets[0]
    for box_index in range(9):
        box_cells = [
            (box_index // 3 * 3 + local_row) * 9
            + box_index % 3 * 3
            + local_column
            for local_row in range(3)
            for local_column in range(3)
        ]
        box_candidates = [cell for cell in box_cells if masks[cell] & bit]
        if len(box_candidates) != 2:
            continue
        for intersection in box_cells:
            if masks[intersection] & bit:
                continue
            global_row, global_column = divmod(intersection, 9)
            if not all(
                cell // 9 == global_row or cell % 9 == global_column
                for cell in box_candidates
            ):
                continue
            if not any(cell // 9 == global_row for cell in box_candidates):
                continue
            if not any(cell % 9 == global_column for cell in box_candidates):
                continue
            for link in line_links:
                for weak_end, strong_end in (link, link[::-1]):
                    weak_row, weak_column = divmod(weak_end, 9)
                    strong_row, strong_column = divmod(strong_end, 9)
                    weak_box = weak_row // 3 * 3 + weak_column // 3
                    if weak_box == box_index:
                        continue
                    expected_target = None
                    if weak_row == global_row and weak_column == strong_column:
                        expected_target = strong_row * 9 + global_column
                    elif (
                        weak_column == global_column
                        and weak_row == strong_row
                    ):
                        expected_target = global_row * 9 + strong_column
                    if (
                        expected_target == target
                        and set(box_candidates + [weak_end, strong_end]) == cells
                    ):
                        return True
    return False


def turbot_named_shape(item: dict) -> str | None:
    if item.get('techniqueCode') != 'turbotFish':
        return None
    if is_hodoku_skyscraper(item):
        return 'skyscraper'
    if is_hodoku_two_string_kite(item):
        return 'two-string-kite'
    if is_two_candidate_empty_rectangle(item):
        return 'two-candidate-empty-rectangle'
    return None


def has_more_specific_linked_classification(item: dict) -> bool:
    code = item.get('techniqueCode')
    return code == 'twoStringKite' and is_hodoku_skyscraper(item)


def validate_artifact(data: dict, catalog: list[dict]) -> None:
    if len(catalog) != 40 or len({entry['techniqueCode'] for entry in catalog}) != 40:
        raise ValueError('invalid native catalog')
    primary = data.get('fixtures', [])
    if data.get('fixtureCount') != 40 or [item.get('techniqueCode') for item in primary] != [entry['techniqueCode'] for entry in catalog]:
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
        expected_basis = 'board_direct' if not history else 'applied_hint_sequence'
        if item.get('candidateBasis') != expected_basis:
            raise ValueError('candidate basis disagrees with replay history')
        if code == 'nakedSingle' and expected_basis != 'board_direct':
            raise ValueError('Naked Single teaching examples must be board-direct')
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
        if code == 'lockedPair' and not is_hodoku_locked_pair(item):
            raise ValueError('Locked Pair must eliminate through its line and box')
        if code == 'nakedPair' and is_hodoku_locked_pair(item):
            raise ValueError('HoDoKu Locked Pair cannot be labeled Naked Pair')
        if code in {'lockedPair', 'nakedPair'} and not has_complete_pair_eliminations(item):
            raise ValueError('Pair eliminations must cover every common house')
        if code == 'lockedTriple' and not is_hodoku_locked_triple(item):
            raise ValueError('Locked Triple must eliminate through its line and box')
        if code == 'nakedTriple' and is_hodoku_locked_triple(item):
            raise ValueError('HoDoKu Locked Triple cannot be labeled Naked Triple')
        if code in {'lockedTriple', 'nakedTriple'} and not has_complete_triple_eliminations(item):
            raise ValueError('Triple eliminations must cover every common house')
        if has_more_specific_linked_classification(item):
            raise ValueError(
                'Named four-node chain cannot be labeled as a broader technique'
            )

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
        if args.reclassified_output and check.get('historyReclassified'):
            fixture['replaySteps'] = check['replaySteps']
        elif check.get('historyReclassified'):
            check['errors'].append('replay_technique_reclassified')
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
    modes = {'simpleColoring': ['color_trap', 'color_conflict'], 'multiColoring': ['multi_color'], 'remotePair': ['remote_pair'], 'avoidableRectangle': ['avoidable'], 'xChain': ['endpoints'], 'xyChain': ['endpoints'], 'aic': ['discontinuous_elimination', 'discontinuous_placement', 'aic_type_1', 'aic_type_2', 'continuous_loop'], 'groupedAic': ['endpoints'], 'complexColoring': ['complex_color'], 'forcingChain': ['common'], 'forcingNet': ['contradiction', 'common']}
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
            'turbotFish': ['skyscraper', 'two-string-kite', 'two-candidate-empty-rectangle'],
            'wWing': ['strong-row', 'strong-column', 'strong-box'],
            'xyWing': ['box-line', 'row-column'],
            'xyzWing': ['row-link', 'column-link'],
            'emptyRectangle': ['strong-row', 'strong-column'],
            'remotePair': ['linear', 'branched', 'short', 'long'],
            'uniqueRectangle': ['corner-top-left', 'corner-top-right', 'corner-bottom-left', 'corner-bottom-right'],
            'avoidableRectangle': ['corner-top-left', 'corner-top-right', 'corner-bottom-left', 'corner-bottom-right'],
            'uniqueRectangleType4': ['strong-row', 'strong-column'],
            'hiddenRectangle': ['two-strong-links'],
            'swordfish': ['sparse', 'mixed-density'],
            'jellyfish': ['sparse', 'mixed-density'],
        }
        required_layouts += shapes.get(code, [])
        gaps = target_multiplicity_gaps(code, target_counts)
        if len(sources) < 3: gaps.append('fewer_than_3_independent_sources')
        if args.baseline and len(new_sources) < 2: gaps.append('fewer_than_2_new_independent_sources')
        gaps.extend('mode_needs_2:'+mode for mode in required_modes if counts[mode] < 2)
        gaps.extend('layout_missing:'+layout for layout in required_layouts if layouts[layout] < 1)
        required_results = [('discontinuous_placement', 'placement'), ('discontinuous_elimination', 'elimination'), ('aic_type_1', 'elimination'), ('aic_type_2', 'elimination'), ('continuous_loop', 'elimination')] if code == 'aic' else [('common', 'placement'), ('common', 'elimination')] if code == 'forcingChain' else [('common', 'placement'), ('common', 'elimination'), ('contradiction', 'elimination')] if code == 'forcingNet' else []
        gaps.extend('mode_result_needs_2:'+mode+':'+kind for mode, kind in required_results if len(result_sources[(mode, kind)]) < 2)
        if code == 'forcingNet' and layouts['multiple-premises'] == 0:
            gaps.append('layout_missing:multiple-premises')
        techniques.append({'techniqueCode': code, 'qualifiedExamples': len(items), 'independentSources': len(sources), 'newIndependentSources': len(new_sources) if args.baseline else None, 'candidateBases': dict(collections.Counter(item['candidateBasis'] for item in items)), 'modes': dict(counts), 'layouts': dict(layouts), 'modeResults': {mode+':'+kind: len(keys) for (mode, kind), keys in result_sources.items()}, 'targetCounts': dict(target_counts), 'requiredTargetCounts': ['single', 'multiple'] if code in TARGET_MULTIPLICITY_TECHNIQUES else [], 'requiredModes': required_modes, 'requiredLayouts': required_layouts, 'gaps': gaps})
    report = {'scope': 'Exhaustive lower-level 1–4 detectors plus explicit same-level basic relations; advanced target proofs use supported detector grammar. Arbitrary-length advanced absence is not asserted.', 'baseline': {'exampleCount': len(baseline['fixtures']) + len(baseline.get('variants', []))} if args.baseline else None, 'summary': {'examples': len(fixtures), 'qualifiedExamples': len(fixtures)-len(failures), 'techniques': len(techniques), 'techniquesWithoutDeclaredGaps': sum(not item['gaps'] for item in techniques), 'passed': not args.reclassified_output and len(techniques) == 40 and not failures and all(not item['gaps'] for item in techniques)}, 'fixtureFailures': failures, 'techniques': techniques}
    if args.reclassified_output:
        args.reclassified_output.write_text(json.dumps(data, ensure_ascii=False)+'\n')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(report['summary']))
    return 0 if report['summary']['passed'] else 1

if __name__ == '__main__':
    raise SystemExit(main())
