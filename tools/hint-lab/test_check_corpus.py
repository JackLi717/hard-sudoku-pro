import copy
import unittest

from check_corpus import independent_key, target_multiplicity_gaps, validate_artifact


class CorpusStructureTests(unittest.TestCase):
    def setUp(self):
        self.catalog = [{'techniqueCode': f'case{index}', 'difficultyLevel': 1} for index in range(39)]
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
                'engineResult': {'status': 'step', 'step': {**entry, 'placements': [{'cell': 0, 'digit': 1}], 'eliminations': []}},
            })
        self.data = {'fixtureCount': 39, 'fixtures': fixtures, 'variants': []}

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


if __name__ == '__main__':
    unittest.main()
