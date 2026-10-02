"""Exercise real export gates with disposable examples, never publish courses."""
from __future__ import annotations

import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from build_lessons import ROOT, build_lessons, compile_checker, prepare_allocations


def test_text(locale: str) -> dict:
    return {
        'title': f'{locale}: internal contract test',
        'purpose': f'{locale}: test purpose',
        'learning_goal': f'{locale}: test goal',
        'finding_method': [f'{locale}: test observation'],
        'common_mistakes': [f'{locale}: test condition'],
        'recap': [f'{locale}: test recap'],
    }


class LessonExportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.work = tempfile.TemporaryDirectory(prefix='hsp-lesson-tests-')
        cls.binary = Path(cls.work.name) / 'checker'
        compile_checker(cls.binary)
        cls.baseline = json.loads((ROOT / 'src/debug/generated/hint-lab-fixtures.json').read_text())

    @classmethod
    def tearDownClass(cls) -> None:
        cls.work.cleanup()

    def setUp(self) -> None:
        self.corpus = copy.deepcopy(self.baseline)
        self.manifest = {'lessons': []}
        self.allocations = {'allocations': []}
        for code in ('hiddenSingle', 'nakedPair'):
            source = next(item for item in self.corpus['fixtures'] if item['techniqueCode'] == code)
            identifier = f'internal-test-{code}'
            self.manifest['lessons'].append({
                'lesson_id': identifier,
                'technique_code': code,
                'example_id': source['id'],
                'prerequisite_techniques': [],
                'texts': {locale: test_text(locale) for locale in ('en', 'zh-Hans', 'ja', 'de')},
            })
            self.allocations['allocations'].append({
                'content_id': identifier,
                'content_usage': 'lesson',
                'source_puzzle_id': source['sourcePuzzleId'],
                'puzzle_fingerprint': source['puzzleFingerprint'],
                'board_fingerprint': source['boardFingerprint'],
                'candidate_masks': source['candidateMasks'],
            })

    def build(self) -> dict:
        return build_lessons(self.manifest, self.corpus, self.allocations, self.binary)

    def selected_source(self) -> dict:
        identifier = self.manifest['lessons'][0]['example_id']
        return next(source for source in self.corpus['fixtures'] if source['id'] == identifier)

    def test_subset_is_deterministic_and_has_no_lab_or_solution_payload(self) -> None:
        before = json.dumps(self.corpus, sort_keys=True)
        resource = self.build()
        self.assertEqual(resource, self.build())
        self.assertEqual(len(resource['lessons']), 2)
        for lesson in resource['lessons']:
            example = lesson['example']
            self.assertEqual(set(example), {
                'example_id', 'source_puzzle_id', 'source_family',
                'puzzle_fingerprint', 'board_fingerprint', 'candidate_masks',
                'candidate_basis', 'step',
            })
        for field in ('solutionFingerprint', 'replaySteps', 'regressionFixtures', 'coverage', 'fixtureCount'):
            self.assertNotIn(f'"{field}"', json.dumps(resource))
        self.assertEqual(json.dumps(self.corpus, sort_keys=True), before)

    def test_empty_unpublished_catalog_is_supported(self) -> None:
        self.assertEqual(build_lessons({'lessons': []}, {'fixtures': []}, {'allocations': []}), {
            'content_usage': 'lesson', 'lessons': [],
        })

    def test_allocation_preparation_uses_generated_sources_and_keeps_other_pools(self) -> None:
        prepared = prepare_allocations(self.manifest, self.corpus, {'allocations': []})
        self.assertEqual(prepared, self.allocations)
        self.assertEqual(build_lessons(self.manifest, self.corpus, prepared, self.binary), self.build())
        other = copy.deepcopy(self.allocations['allocations'][0])
        other['content_usage'] = 'challenge'
        other['content_id'] = 'existing-challenge'
        proposed = prepare_allocations(self.manifest, self.corpus, {'allocations': [other]})
        self.assertEqual(proposed['allocations'][0], other)
        with self.assertRaises(subprocess.CalledProcessError):
            build_lessons(self.manifest, self.corpus, proposed, self.binary)

    def test_missing_locale_and_missing_allocation_fail(self) -> None:
        del self.manifest['lessons'][0]['texts']['ja']
        with self.assertRaises(subprocess.CalledProcessError):
            self.build()
        self.setUp()
        self.allocations['allocations'].pop()
        with self.assertRaises(subprocess.CalledProcessError):
            self.build()

    def test_source_reuse_at_another_stage_and_renamed_id_fails(self) -> None:
        source = next(item for item in self.corpus['fixtures'] if item['techniqueCode'] == 'fullHouse')
        self.allocations['allocations'].append({
            'content_id': 'test-practice', 'content_usage': 'practice',
            'source_puzzle_id': 'another-id',
            'puzzle_fingerprint': source['puzzleFingerprint'],
            'board_fingerprint': source['boardFingerprint'],
            'candidate_masks': source['candidateMasks'],
        })
        with self.assertRaises(subprocess.CalledProcessError):
            self.build()

    def test_native_reproduction_rejects_modified_serialized_proof(self) -> None:
        # Keep valid syntax and the same answer; a self-reported validation flag
        # cannot make a modified proof equal the independent native witness.
        source = self.selected_source()
        source['engineResult']['step']['humanCost'] += 1
        source['validation'] = {'passed': True}
        with self.assertRaisesRegex(ValueError, 'independently reproduced'):
            self.build()

    def test_native_source_validation_rejects_bad_solution(self) -> None:
        source = self.selected_source()
        solution = list(source['solutionFingerprint'])
        solution[0] = str(int(solution[0]) % 9 + 1)
        source['solutionFingerprint'] = ''.join(solution)
        with self.assertRaisesRegex(ValueError, 'native source verification failed'):
            self.build()

    def test_replay_provenance_must_be_complete(self) -> None:
        self.selected_source()['replaySteps'].pop()
        with self.assertRaisesRegex(ValueError, 'replay length mismatch'):
            self.build()

    def test_regression_example_cannot_be_selected(self) -> None:
        regression = next(item for item in self.corpus['regressionFixtures'] if item['id'] not in {
            source['id'] for source in self.corpus['fixtures'] + self.corpus['variants']
        })
        self.manifest['lessons'][0]['example_id'] = regression['id']
        with self.assertRaisesRegex(ValueError, 'unknown lesson example'):
            self.build()

    def test_failed_build_preserves_existing_output(self) -> None:
        with tempfile.TemporaryDirectory(prefix='hsp-lesson-install-test-') as temporary:
            work = Path(temporary)
            output = work / 'catalog.json'
            original = b'{"content_usage":"lesson","lessons":[]}\n'
            output.write_bytes(original)
            self.selected_source()['engineResult']['step']['humanCost'] += 1
            inputs = {'manifest': self.manifest, 'corpus': self.corpus, 'allocations': self.allocations}
            command = [sys.executable, str(ROOT / 'tools/technique-lessons/build_lessons.py')]
            for flag, value in inputs.items():
                path = work / f'{flag}.json'
                path.write_text(json.dumps(value))
                command.extend([f'--{flag}', str(path)])
            command.extend(['--binary', str(self.binary), '--output', str(output)])
            result = subprocess.run(command, text=True, capture_output=True, check=False)
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertIn('independently reproduced', result.stderr)
            self.assertEqual(output.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
