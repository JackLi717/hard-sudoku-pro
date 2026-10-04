import json
from collections import Counter
from pathlib import Path
import sys
import unittest

from build_practice import ROOT, select_entries, valid_source
sys.path.insert(0, str(ROOT / 'tools/hint-lab'))
from check_corpus import independent_key  # noqa: E402


class PracticeBuildTests(unittest.TestCase):
    def sources(self):
        base = Path(__file__).parent
        corpus = json.loads(
            (ROOT / 'src/debug/generated/hint-lab-fixtures.json').read_text()
        )
        fish = json.loads((base / 'fish-sources.json').read_text())
        short_chain = json.loads((base / 'short-chain-sources.json').read_text())
        wing = json.loads((base / 'wing-sources.json').read_text())
        coloring = json.loads((base / 'coloring-sources.json').read_text())
        return {item['id']: item for item in
                corpus['fixtures'] + corpus['variants'] + fish['fixtures'] +
                short_chain['fixtures'] + wing['fixtures'] + coloring['fixtures']}

    def test_pointing_uses_three_independent_exercises_without_a_duplicate_demo(self):
        base = Path(__file__).parent
        manifest = json.loads((base / 'manifest.json').read_text())
        sources = self.sources()
        allocations = json.loads(
            (ROOT / 'tools/technique-lessons/content-allocations.json').read_text()
        )['allocations']
        other_allocations = [
            item for item in allocations if item['content_usage'] != 'practice'
        ]
        entries = select_entries(manifest, sources, other_allocations)
        pointing = [entry for entry in entries
                    if entry['technique_code'] == 'lockedCandidates.pointing']
        self.assertEqual(len(pointing), 3)
        self.assertTrue(all(entry['role'] == 'exercise' for entry in pointing))
        self.assertTrue(all(valid_source(sources[entry['example_id']],
                                         'lockedCandidates.pointing')
                            for entry in pointing))
        preview = json.loads(
            (ROOT / 'tools/technique-lessons/preview-manifest.json').read_text()
        )
        lesson = next(
            item for item in preview['lessons']
            if item['technique_code'] == 'lockedCandidates.pointing'
        )
        lesson_family = independent_key(
            sources[lesson['example_id']]['puzzleFingerprint']
        )
        exercise_families = {
            independent_key(sources[entry['example_id']]['puzzleFingerprint'])
            for entry in pointing
        }
        self.assertEqual(len(exercise_families), 3)
        self.assertNotIn(lesson_family, exercise_families)

    def test_rebuilding_an_exercise_preserves_existing_ids(self):
        base = Path(__file__).parent
        manifest = json.loads((base / 'manifest.json').read_text())
        sources = self.sources()
        allocations = json.loads(
            (ROOT / 'tools/technique-lessons/content-allocations.json').read_text()
        )['allocations']
        other_allocations = [
            item for item in allocations if item['content_usage'] != 'practice'
        ]
        original = manifest['exercises']
        manifest['exercises'] = original[:-1]
        expanded = select_entries(manifest, sources, other_allocations)
        self.assertEqual(expanded[:len(original) - 1], original[:-1])
        self.assertEqual(len(expanded), len(original))
        self.assertEqual(
            select_entries({**manifest, 'exercises': expanded}, sources,
                           other_allocations),
            expanded,
        )

    def test_all_exercises_use_distinct_sources_and_balanced_modes(self):
        base = Path(__file__).parent
        manifest = json.loads((base / 'manifest.json').read_text())
        sources = self.sources()
        exercises = manifest['exercises']
        self.assertEqual(len(exercises), 434)
        for technique, target in manifest['targets'].items():
            self.assertEqual(sum(entry['role'] == 'exercise' and
                                 entry['technique_code'] == technique
                                 for entry in exercises), target['exercise'], technique)
        for technique in ('swordfish', 'finnedXWing', 'sashimiXWing'):
            fish = [sources[entry['example_id']] for entry in exercises
                    if entry['technique_code'] == technique]
            self.assertEqual(len(fish), 30)
            self.assertGreaterEqual(sum('row' in item['coverage']['layouts']
                                        for item in fish), 14)
            self.assertGreaterEqual(sum('column' in item['coverage']['layouts']
                                        for item in fish), 14)
            if technique != 'swordfish':
                self.assertGreaterEqual(sum('multiple-fins' in item['coverage']['layouts']
                                            for item in fish), 14)
        expected_modes = {
            'skyscraper': {'row': 15, 'column': 15},
            'twoStringKite': {'kite': 30},
            'emptyRectangle': {'strong-row': 15, 'strong-column': 15},
            'turbotFish': {
                'skyscraper': 10, 'two-string-kite': 10,
                'two-candidate-empty-rectangle': 10,
            },
            'xyWing': {'row-link': 10, 'column-link': 10, 'row-column': 10},
            'xyzWing': {'row-link': 15, 'column-link': 15},
            'wWing': {'strong-row': 10, 'strong-column': 10, 'strong-box': 10},
            'simpleColoring': {'color-trap': 15, 'color-conflict': 15},
            'multiColoring': {'multi-color': 30},
            'remotePair': {'linear-short': 10, 'linear-long': 10, 'branched-long': 10},
        }
        for technique, modes in expected_modes.items():
            selected = [sources[entry['example_id']] for entry in exercises
                        if entry['technique_code'] == technique]
            def exercise_mode(source):
                layouts = source['coverage']['layouts']
                if technique in ('xyWing', 'xyzWing'):
                    if 'row-column' in layouts:
                        return 'row-column'
                    return next(mode for mode in modes if mode in layouts)
                if technique == 'simpleColoring':
                    return source['coverage']['mode'].replace('_', '-')
                if technique == 'multiColoring':
                    return 'multi-color'
                if technique == 'remotePair':
                    return '-'.join(layouts)
                return layouts[0] if layouts else 'kite'
            actual = Counter(exercise_mode(source) for source in selected)
            self.assertEqual(actual, modes)
        kites = [sources[entry['example_id']] for entry in exercises
                 if entry['technique_code'] == 'twoStringKite']
        kite_targets = [item['engineResult']['step']['eliminations'][0]
                        for item in kites]
        digit_counts = Counter(target['digit'] for target in kite_targets)
        box_counts = Counter((target['cell'] // 27) * 3 +
                             (target['cell'] % 9) // 3
                             for target in kite_targets)
        self.assertEqual(len(digit_counts), 9)
        self.assertTrue(all(2 <= count <= 4 for count in digit_counts.values()))
        self.assertEqual(len(box_counts), 9)
        self.assertTrue(all(3 <= count <= 4 for count in box_counts.values()))
        self.assertEqual(len({independent_key(
            sources[entry['example_id']]['puzzleFingerprint'])
            for entry in exercises}), len(exercises))


if __name__ == '__main__':
    unittest.main()
