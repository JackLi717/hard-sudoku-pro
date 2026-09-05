"""Clue variations must remain reproducible ordinary Sudoku givens."""
from pathlib import Path
import random
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from grow_technique_puzzles import mutate, trade_solution
from build_puzzles import solution_count, validate_grid


class ClueVariationTests(unittest.TestCase):
    puzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
    solution = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'

    def test_reproducible_givens_and_protected_digit(self):
        first = random.Random(17)
        second = random.Random(17)
        changed = False
        for _ in range(100):
            candidate = mutate(self.puzzle, self.solution, first, '5')
            self.assertEqual(candidate, mutate(self.puzzle, self.solution, second, '5'))
            self.assertGreaterEqual(sum(d != '0' for d in candidate), 17)
            for index, digit in enumerate(candidate):
                self.assertTrue(digit == '0' or digit == self.solution[index])
                if self.puzzle[index] == '5':
                    self.assertEqual(digit, '5')
            changed |= candidate != self.puzzle
        self.assertTrue(changed)

    def test_local_trades_preserve_all_sudoku_units(self):
        randomizer = random.Random(41)
        solution = self.solution
        changed = False
        for _ in range(100):
            following = trade_solution(solution, randomizer)
            validate_grid('0' * 81, following)
            self.assertIn(sum(a != b for a, b in zip(solution, following)), {0, 4})
            changed |= following != solution
            solution = following
        self.assertTrue(changed)

    def test_full_invalid_grid_is_not_unique(self):
        self.assertEqual(solution_count('1' * 81), 0)


if __name__ == '__main__':
    unittest.main()
