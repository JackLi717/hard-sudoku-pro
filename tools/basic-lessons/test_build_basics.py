import copy
import json
import unittest
from build_basics import OUTPUT, build, validate


class BasicContentTests(unittest.TestCase):
    def test_committed_content_is_verified_and_reproducible(self):
        data = json.loads(OUTPUT.read_text())
        validate(data)
        self.assertEqual(build(), data)

    def test_wrong_candidate_claim_is_rejected(self):
        data = json.loads(OUTPUT.read_text())
        data['certainty']['remaining'] = data['certainty']['digit']
        with self.assertRaises(AssertionError):
            validate(data)

    def test_missing_exclusion_evidence_is_rejected(self):
        data = copy.deepcopy(json.loads(OUTPUT.read_text()))
        data['scanning']['first']['evidence'] = []
        with self.assertRaises(AssertionError):
            validate(data)


if __name__ == '__main__':
    unittest.main()
