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
    @staticmethod
    def rating_step(technique, level, human_cost, branches=0, nodes=0, depth=0):
        return {'technique': technique, 'level': level, 'humanCost': human_cost,
                'branchCount': branches, 'nodeCount': nodes,
                'maximumDepth': depth}

    def test_oracle_high_hit_does_not_set_runtime_level(self):
        record = {'difficulty_level': 5, 'hardest_technique': 'aic'}
        report = {'solved': True, 'minimumLevel': 2,
                  'hardestTechnique': 'nakedPair', 'usage': {'nakedPair': 1},
                  'ratingSteps': [self.rating_step('nakedPair', 2, 2050)],
                  'witnesses': []}
        self.assertTrue(builder.accept_runtime(record, report))
        self.assertEqual(record['difficulty_level'], 2)
        self.assertEqual(record['hardest_technique'], 'nakedPair')
        self.assertEqual(record['difficulty_score'], 2050)
        self.assertEqual(record['oracle_difficulty_level'], 5)
        self.assertEqual(builder.preferred_cases(record), set())

    def test_stored_usage_and_score_follow_accepted_path(self):
        record = {'difficulty_level': 5, 'hardest_technique': 'aic',
                  'technique_usage': {'nakedSingle': 60}}
        report = {'solved': True, 'minimumLevel': 5, 'hardestTechnique': 'aic',
                  'usage': {'nakedSingle': 40, 'aic': 2},
                  'ratingSteps': [self.rating_step('nakedSingle', 1, 120)] * 40 +
                                 [self.rating_step('aic', 5, 5000, 1, 10, 10)] * 2,
                  'witnesses': []}
        self.assertTrue(builder.accept_runtime(record, report))
        self.assertEqual(record['technique_usage'], report['usage'])
        self.assertEqual(record['difficulty_score'], 6725)
        self.assertEqual(record['difficulty_score_components'], {
            'hardestStep': 5188,
            'additionalAdvancedWorkload': 1297,
            'basicWorkload': 240,
            'total': 6725,
        })
        self.assertEqual(record['total_steps'], 42)

    def test_longer_deeper_forcing_net_has_higher_raw_score(self):
        short = self.rating_step('forcingNet', 5, 5100, 3, 12, 6)
        long = self.rating_step('forcingNet', 5, 5100, 3, 32, 20)
        self.assertGreater(builder.score_rating_step(long),
                           builder.score_rating_step(short))

    def test_raw_score_depends_only_on_the_rating_path(self):
        report = {'usage': {'xyChain': 1},
                  'ratingSteps': [self.rating_step('xyChain', 5, 5100, 1, 8, 8)]}
        first = builder.calculate_difficulty_score(report)
        unrelated_new_puzzles = [object() for _ in range(100)]
        self.assertEqual(builder.calculate_difficulty_score(report), first)
        self.assertEqual(len(unrelated_new_puzzles), 100)

    def test_rating_version_is_the_single_pre_release_version(self):
        self.assertEqual(builder.RATING_VERSION, '1')

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
