"""Regression tests for tier acceptance and preferred-case accounting."""
import copy
import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/build_puzzles.py'
SPEC = importlib.util.spec_from_file_location('builder', SCRIPT)
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class GenerationGateTests(unittest.TestCase):
    def test_oracle_high_hit_does_not_set_runtime_level(self):
        record = {'difficulty_level': 5, 'hardest_technique': 'aic'}
        report = {'solved': True, 'minimumLevel': 2,
                  'hardestTechnique': 'nakedPair', 'witnesses': []}
        self.assertTrue(builder.accept_runtime(record, report))
        self.assertEqual(record['difficulty_level'], 2)
        self.assertEqual(record['hardest_technique'], 'nakedPair')
        self.assertEqual(record['oracle_difficulty_level'], 5)
        self.assertEqual(builder.preferred_cases(record), set())

    def test_stored_usage_and_score_follow_accepted_path(self):
        record = {'difficulty_level': 5, 'hardest_technique': 'aic',
                  'technique_usage': {'nakedSingle': 60}}
        report = {'solved': True, 'minimumLevel': 5, 'hardestTechnique': 'aic',
                  'usage': {'nakedSingle': 40, 'aic': 2}, 'witnesses': []}
        self.assertTrue(builder.accept_runtime(record, report))
        self.assertEqual(record['technique_usage'], report['usage'])
        self.assertEqual(record['difficulty_score'], 290)
        self.assertEqual(record['total_steps'], 42)

    def test_incomplete_path_is_rejected(self):
        self.assertFalse(builder.accept_runtime({}, {'solved': False}))

    def test_only_unmasked_unbounded_selected_cases_count(self):
        witness = {'technique': 'aic', 'lowerLevelsExhausted': True,
                   'selection': 'generation_frontier_priority',
                   'enumerationBoundReached': False}
        record = {'runtime_acceptance': {'witnesses': [witness, copy.copy(witness)]}}
        self.assertEqual(builder.preferred_cases(record), {'aic'})
        for key, value in [('lowerLevelsExhausted', False),
                           ('selection', 'incidental_detector_hit'),
                           ('enumerationBoundReached', True)]:
            bad = {**witness, key: value}
            self.assertEqual(builder.preferred_cases(
                {'runtime_acceptance': {'witnesses': [bad]}}), set())

    def test_independent_uniqueness_check(self):
        puzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
        self.assertEqual(builder.solution_count(puzzle), 1)
        self.assertEqual(builder.solution_count('0' * 81), 2)
        self.assertEqual(builder.solution_count('531070000' + puzzle[9:]), 0)


if __name__ == '__main__':
    unittest.main()
