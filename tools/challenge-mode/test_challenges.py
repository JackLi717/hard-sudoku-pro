import copy
import json
import unittest
from check_challenges import ROOT, unique_solution, validate_catalog


class ChallengeContentTests(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads((ROOT / 'src/data/challenge/generated/challenge-catalog.json').read_text())

    def test_all_current_sources_have_the_verified_unique_answer(self):
        self.assertTrue(validate_catalog(self.catalog)['unique_solutions_verified'])

    def test_non_unique_or_conflicting_puzzles_are_rejected(self):
        with self.assertRaises(AssertionError):
            unique_solution('0' * 81)
        with self.assertRaises(AssertionError):
            unique_solution('11' + '0' * 79)

    def test_tampered_answers_and_deleted_answer_candidates_are_rejected(self):
        changed = copy.deepcopy(self.catalog)
        changed['levels'][5]['source']['solution_fingerprint'] = '1' * 81
        with self.assertRaises(AssertionError):
            validate_catalog(changed)
        changed = copy.deepcopy(self.catalog)
        changed['levels'][5]['source']['candidate_masks'][76] &= ~(1 << 6)
        with self.assertRaises(AssertionError):
            validate_catalog(changed)


if __name__ == '__main__':
    unittest.main()
