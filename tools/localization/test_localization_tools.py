import unittest
from unittest.mock import patch

from apply_reviewed_copy import correct
from prepare_translations import batch_translate, placeholders, protect, restore
from retranslate_prose import clarify, translate


class LocalizationToolsTest(unittest.TestCase):
    def test_tokens_preserve_slots_coordinates_and_technique_names(self):
        source = 'At A1, X-Wing removes {digit} and {{count}} notes; a choice remains.'
        protected, saved = protect(source, {'X-Wing': 'X-Wing'})
        self.assertIn('a choice', protected)
        self.assertNotIn('A1', protected)
        self.assertEqual(restore(protected, saved), source)
        self.assertEqual(placeholders(source), ['{digit}', '{{count}}'])

    def test_symbols_do_not_capture_articles_or_conjunctions(self):
        source = 'A sees B or a candidate. OR is a group state.'
        protected, saved = protect(source, {'A': 'A', 'B': 'B', 'OR': 'OR'})
        self.assertIn(' or a candidate', protected)
        self.assertEqual(restore(protected, saved), source)

    def test_clarification_preserves_variables_and_cover_verbs(self):
        source = 'The branches cover every possibility; {covers} names the cover columns.'
        clarified = clarify(source)
        self.assertIn('cover every possibility', clarified)
        self.assertIn('covering columns', clarified)
        self.assertEqual(placeholders(clarified), placeholders(source))
        self.assertEqual(clarify('A logical truth state.'), 'A logical truth state.')

    def test_independent_drafts_preserve_query_order(self):
        rows = [{'source': 'First {digit}'}, {'source': 'Second {digit}'}]
        with patch('retranslate_prose.request_many', side_effect=lambda queries, _: queries):
            self.assertEqual(translate(rows, 'fr', {}), {r['source']: r['source'] for r in rows})

    def test_initial_article_is_not_a_coloring_label(self):
        rows = [{'source': 'A chain alternates A and B.'}]
        with patch('retranslate_prose.request_many', side_effect=lambda queries, _: queries):
            result = translate(rows, 'fr', {})
            self.assertEqual(result[rows[0]['source']], 'a chain alternates A and B.')

    def test_changed_or_duplicated_slots_are_rejected(self):
        protected, saved = protect('{digit}', {})
        for broken in ['', protected + protected]:
            with self.assertRaises(ValueError):
                restore(broken, saved)

    def test_empty_or_merged_batch_strings_are_rejected(self):
        for translated in ['', 'Résultat\nSuivant']:
            with self.subTest(translated=translated), patch('prepare_translations.request', return_value=translated):
                with self.assertRaises(ValueError):
                    batch_translate([{'source': 'Result'}], 'fr', {})

    def test_single_labels_are_sent_without_line_markers(self):
        with patch('prepare_translations.request', return_value='Paramètres') as request:
            self.assertEqual(batch_translate([{'source': 'Settings'}], 'fr', {}), {'Settings': 'Paramètres'})
            request.assert_called_once_with('Settings', 'fr', 'en')

    def test_corrections_are_scoped_to_the_source_concept(self):
        self.assertEqual(correct('candidate', 'ứng cử viên', 'vi'), 'ứng viên')
        self.assertEqual(correct('other text', 'ứng cử viên', 'vi'), 'ứng cử viên')
        self.assertEqual(correct('cell', 'cellule', 'fr'), 'case')

    def test_domain_corrections_preserve_scope_and_are_idempotent(self):
        examples = [
            ('The cover cannot contain two.', 'Bir kapak iki tane içeremez.', 'tr', 'Bir örtü çizgisi iki tane içeremez.'),
            ('The state is false.', 'Negara bagian salah.', 'id', 'Keadaan logis salah.'),
            ('The cover columns.', 'kolom sampul', 'id', 'kolom cakupan'),
        ]
        for source, draft, locale, expected in examples:
            with self.subTest(locale=locale):
                self.assertEqual(correct(source, draft, locale), expected)
                self.assertEqual(correct(source, expected, locale), expected)
        self.assertEqual(correct('The country.', 'Negara bagian', 'id'), 'Negara bagian')

    def test_boundary_cleanup_preserves_all_variables(self):
        self.assertEqual(correct('Result {digit}', 'Résultat {digit}\nSuivant', 'fr'), 'Résultat {digit}')
        with self.assertRaises(ValueError):
            correct('Result {digit}', 'Résultat\n{digit}', 'fr')


if __name__ == '__main__':
    unittest.main()
