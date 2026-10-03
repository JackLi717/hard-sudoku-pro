import json
from pathlib import Path
import sys
import unittest

from build_practice import ROOT, select_entries, valid_source
sys.path.insert(0, str(ROOT / 'tools/hint-lab'))
from check_corpus import independent_key  # noqa: E402


class PracticeBuildTests(unittest.TestCase):
    def test_pointing_uses_three_independent_exercises_without_a_duplicate_demo(self):
        base = Path(__file__).parent
        manifest = json.loads((base / 'manifest.json').read_text())
        corpus = json.loads(
            (ROOT / 'src/debug/generated/hint-lab-fixtures.json').read_text()
        )
        sources = {
            item['id']: item for item in corpus['fixtures'] + corpus['variants']
        }
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

    def test_adding_an_exercise_preserves_existing_ids(self):
        base = Path(__file__).parent
        manifest = json.loads((base / 'manifest.json').read_text())
        corpus = json.loads(
            (ROOT / 'src/debug/generated/hint-lab-fixtures.json').read_text()
        )
        sources = {
            item['id']: item for item in corpus['fixtures'] + corpus['variants']
        }
        allocations = json.loads(
            (ROOT / 'tools/technique-lessons/content-allocations.json').read_text()
        )['allocations']
        other_allocations = [
            item for item in allocations if item['content_usage'] != 'practice'
        ]
        original = manifest['exercises']
        manifest['targets']['hiddenSingle']['exercise'] += 1
        expanded = select_entries(manifest, sources, other_allocations)
        self.assertEqual(expanded[:len(original)], original)
        self.assertEqual(len(expanded), len(original) + 1)
        self.assertNotIn(expanded[-1]['id'], {item['id'] for item in original})
        self.assertEqual(
            select_entries({**manifest, 'exercises': expanded}, sources,
                           other_allocations),
            expanded,
        )


if __name__ == '__main__':
    unittest.main()
