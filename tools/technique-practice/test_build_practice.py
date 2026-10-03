import json
from pathlib import Path
import unittest

from build_practice import ROOT, select_entries


class PracticeBuildTests(unittest.TestCase):
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
