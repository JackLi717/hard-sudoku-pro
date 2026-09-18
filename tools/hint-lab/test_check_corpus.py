import copy
import unittest

from check_corpus import (
    has_complete_pair_eliminations,
    has_complete_triple_eliminations,
    has_more_specific_linked_classification,
    independent_key,
    is_hodoku_skyscraper,
    is_hodoku_two_string_kite,
    is_two_candidate_empty_rectangle,
    is_hodoku_locked_pair,
    is_hodoku_locked_triple,
    target_multiplicity_gaps,
    turbot_named_shape,
    validate_artifact,
)


class CorpusStructureTests(unittest.TestCase):
    def setUp(self):
        self.catalog = [{'techniqueCode': f'case{index}', 'difficultyLevel': 1} for index in range(40)]
        fixtures = []
        for entry in self.catalog:
            fixtures.append({
                'id': entry['techniqueCode'], **entry,
                'puzzleFingerprint': '0' * 81,
                'solutionFingerprint': '1' * 81,
                'boardFingerprint': '0' * 81,
                'givenCells': [False] * 81,
                'candidateMasks': [511] * 81,
                'sourceIteration': 0,
                'replaySteps': [],
                'candidateBasis': 'board_direct',
                'engineResult': {'status': 'step', 'step': {**entry, 'placements': [{'cell': 0, 'digit': 1}], 'eliminations': []}},
            })
        self.data = {'fixtureCount': 40, 'fixtures': fixtures, 'variants': []}

    def reject(self, mutate):
        changed = copy.deepcopy(self.data)
        mutate(changed)
        with self.assertRaises(ValueError):
            validate_artifact(changed, self.catalog)

    def test_valid_structure(self):
        validate_artifact(self.data, self.catalog)

    def test_compact_replay_schema(self):
        self.data['fixtures'][0]['sourceIteration'] = 1
        self.data['fixtures'][0]['replaySteps'] = [{'techniqueCode': 'case1', 'placements': [{'cell': 1, 'digit': 2}], 'eliminations': []}]
        self.data['fixtures'][0]['candidateBasis'] = 'applied_hint_sequence'
        validate_artifact(self.data, self.catalog)
        self.data['fixtures'][0]['replaySteps'][0]['techniqueCode'] = 'unknown'
        with self.assertRaises(ValueError):
            validate_artifact(self.data, self.catalog)

    def test_catalog_cannot_self_certify(self):
        self.reject(lambda data: data['fixtures'].pop())
        self.reject(lambda data: data['fixtures'].reverse())

    def test_duplicate_ids(self):
        self.reject(lambda data: data['variants'].append(copy.deepcopy(data['fixtures'][0])))

    def test_candidate_ranges(self):
        self.reject(lambda data: data['fixtures'][0]['candidateMasks'].__setitem__(0, 65536))
        self.reject(lambda data: data['fixtures'][0]['candidateMasks'].pop())
        self.reject(lambda data: data['fixtures'][0]['givenCells'].__setitem__(0, 1))
        self.reject(lambda data: data['fixtures'][0]['engineResult']['step']['placements'][0].__setitem__('cell', 256))

    def test_history_and_target_metadata(self):
        self.reject(lambda data: data['fixtures'][0].__setitem__('sourceIteration', 1))
        self.reject(lambda data: data['fixtures'][0]['engineResult']['step'].__setitem__('techniqueCode', 'case1'))
        self.reject(lambda data: data['fixtures'][0].__setitem__('difficultyLevel', 9))

    def test_jellyfish_multiple_only_is_not_complete(self):
        self.assertEqual(target_multiplicity_gaps('jellyfish', {'multiple': 17}), ['target_count_missing:single'])
        self.assertEqual(target_multiplicity_gaps('jellyfish', {'multiple': 17, 'single': 1}), [])
        self.assertEqual(target_multiplicity_gaps('xWing', {'single': 4}), ['target_count_missing:multiple'])
        self.assertEqual(target_multiplicity_gaps('fullHouse', {'single': 6}), [])

    def test_digit_and_rotation_duplicates(self):
        puzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
        self.assertEqual(independent_key(puzzle), independent_key(puzzle[::-1]))
        self.assertEqual(independent_key(puzzle), independent_key(puzzle.translate(str.maketrans('123456789', '987654321'))))

    def test_hodoku_locked_pair_requires_both_common_houses(self):
        fixture = {
            'candidateMasks': [0] * 81,
            'engineResult': {
                'step': {
                    'focusCells': [0, 1],
                    'eliminations': [
                        {'cell': 3, 'digit': 1},
                        {'cell': 9, 'digit': 2},
                    ],
                },
            },
        }
        fixture['candidateMasks'][0] = 3
        fixture['candidateMasks'][1] = 3
        fixture['candidateMasks'][3] = 1
        fixture['candidateMasks'][9] = 2
        self.assertTrue(is_hodoku_locked_pair(fixture))
        fixture['candidateMasks'][9] = 0
        self.assertFalse(is_hodoku_locked_pair(fixture))
        fixture['candidateMasks'][3] = 0
        fixture['candidateMasks'][9] = 2
        self.assertFalse(is_hodoku_locked_pair(fixture))

    def test_pair_eliminations_cover_every_common_house(self):
        fixture = {
            'candidateMasks': [0] * 81,
            'engineResult': {
                'step': {
                    'focusCells': [0, 1],
                    'eliminations': [
                        {'cell': 3, 'digit': 1},
                        {'cell': 9, 'digit': 2},
                    ],
                },
            },
        }
        fixture['candidateMasks'][0] = 3
        fixture['candidateMasks'][1] = 3
        fixture['candidateMasks'][3] = 1
        fixture['candidateMasks'][9] = 2
        self.assertTrue(has_complete_pair_eliminations(fixture))
        fixture['engineResult']['step']['eliminations'].pop()
        self.assertFalse(has_complete_pair_eliminations(fixture))

    def test_hodoku_locked_triple_requires_both_common_houses(self):
        fixture = {
            'candidateMasks': [0] * 81,
            'engineResult': {
                'step': {
                    'focusCells': [0, 1, 2],
                    'eliminations': [
                        {'cell': 3, 'digit': 3},
                        {'cell': 9, 'digit': 2},
                    ],
                },
            },
        }
        fixture['candidateMasks'][0] = 1
        fixture['candidateMasks'][1] = 2
        fixture['candidateMasks'][2] = 4
        fixture['candidateMasks'][3] = 4
        fixture['candidateMasks'][9] = 2
        self.assertTrue(is_hodoku_locked_triple(fixture))
        self.assertTrue(has_complete_triple_eliminations(fixture))
        fixture['candidateMasks'][9] = 0
        self.assertFalse(is_hodoku_locked_triple(fixture))
        fixture['candidateMasks'][9] = 2
        fixture['engineResult']['step']['eliminations'].pop()
        self.assertFalse(has_complete_triple_eliminations(fixture))

    def test_hodoku_locked_triple_requires_all_cells_in_the_same_line(self):
        fixture = {
            'candidateMasks': [0] * 81,
            'engineResult': {
                'step': {
                    'focusCells': [0, 1, 9],
                    'eliminations': [
                        {'cell': 2, 'digit': 1},
                        {'cell': 3, 'digit': 2},
                    ],
                },
            },
        }
        fixture['candidateMasks'][0] = 1
        fixture['candidateMasks'][1] = 2
        fixture['candidateMasks'][9] = 4
        fixture['candidateMasks'][2] = 1
        fixture['candidateMasks'][3] = 2
        self.assertFalse(is_hodoku_locked_triple(fixture))

    def linked_fixture(self, code, cells, target, digit=1):
        masks = [0] * 81
        for cell in [*cells, target]:
            masks[cell] = 1 << (digit - 1)
        return {
            'techniqueCode': code,
            'candidateMasks': masks,
            'engineResult': {
                'step': {
                    'premiseCandidates': [
                        {'cell': cell, 'digit': digit} for cell in cells
                    ],
                    'eliminations': [{'cell': target, 'digit': digit}],
                },
            },
        }

    def test_turbot_umbrella_identifies_its_named_layouts(self):
        skyscraper = self.linked_fixture(
            'turbotFish', [48, 57, 44, 62], 40, 5
        )
        self.assertTrue(is_hodoku_skyscraper(skyscraper))
        self.assertFalse(is_hodoku_two_string_kite(skyscraper))
        self.assertEqual(turbot_named_shape(skyscraper), 'skyscraper')
        self.assertFalse(has_more_specific_linked_classification(skyscraper))

        kite = self.linked_fixture(
            'turbotFish', [19, 38, 44, 46], 26
        )
        self.assertFalse(is_hodoku_skyscraper(kite))
        self.assertTrue(is_hodoku_two_string_kite(kite))
        self.assertEqual(turbot_named_shape(kite), 'two-string-kite')
        self.assertFalse(has_more_specific_linked_classification(kite))
        kite['techniqueCode'] = 'twoStringKite'
        self.assertFalse(has_more_specific_linked_classification(kite))

        empty_rectangle = self.linked_fixture(
            'turbotFish', [0, 20, 26, 53], 45, 6
        )
        self.assertTrue(is_two_candidate_empty_rectangle(empty_rectangle))
        self.assertEqual(
            turbot_named_shape(empty_rectangle),
            'two-candidate-empty-rectangle',
        )



if __name__ == '__main__':
    unittest.main()
