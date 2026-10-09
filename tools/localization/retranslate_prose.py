#!/usr/bin/env python3
"""Retranslate complete Sudoku sentences with unambiguous domain context.

Drafts go to a temporary directory for AI review, never directly into the app.
Google's independent query array avoids the line-marker drift of the first draft.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import re
import subprocess
from threading import Event
from urllib.parse import quote

from prepare_translations import protect, restore

ROOT = Path(__file__).resolve().parents[2]
RATE_LIMITED = Event()


def clarify(source: str) -> str:
    """Disambiguate English polysemy without changing the mathematical statement."""
    tokens: dict[str, str] = {}

    def save(match: re.Match) -> str:
        token = f'KEEP{len(tokens):04d}'
        tokens[token] = match[0]
        return token

    precise = {
        'Endpoints are the outermost candidates of a chain; a chain alternating from strong link to strong link guarantees at least one is true.':
            'The endpoints are the two outermost candidate digits in a chain. If the chain alternates strong and weak links and both its first and last links are strong, at least one endpoint candidate must be true.',
        'Cover lines are the crossing rows or columns containing all same-digit candidates from the bases. Here the 2s from blue rows lie in amber columns; a basic fish has equally many bases and covers.':
            'Cover lines are crossing rows or columns that contain every candidate for the chosen digit from the base lines. Here every candidate 2 in the blue base rows is in an amber cover column. A basic fish requires the number of base lines to equal the number of cover lines.',
        'Strong links connect the {digit}s into {componentCount} components; matching letters mean the same state only within one component.':
            'Strong links connect candidates for digit {digit} into {componentCount} connected components. Matching letters represent the same logical truth state only within a single component.',
        'Choose cells in one row, column or box and count the union of all their candidates.':
            'Choose cells in one row, column or 3×3 block. Count how many distinct candidate digits appear in those cells altogether.',
    }
    value = re.sub(r'\{\{\w+\}\}|\{[^{}]+\}', save, precise.get(source, source))
    value = re.sub(r'\bcovers?(?=\s+(?:every|all|both|the strong link|HoDoKu))', save, value, flags=re.I)
    phrases = [
        (r'\bnonseeing cells\b', 'cells that do not share a row, column or 3×3 block'),
        (r'\bevery other unsolved cell\b', 'each of the other unsolved cells'),
        (r'\bequally many bases and covers\b', 'the same number of base lines and cover lines'),
        (r'\bcover-line\b', 'covering-line'),
        (r'\bcover columns\b', 'covering columns'),
        (r'\bcover rows\b', 'covering rows'),
        (r'\bcover (?:regions|lines)\b', 'covering lines'),
        (r'\bcover (?:region|line)\b', 'covering line'),
        (r'\bcovers\b', 'covering lines'),
        (r'\bcover\b', 'covering line'),
        (r'\bbase regions\b', 'base lines'),
        (r'\bbase region\b', 'base line'),
        (r'\bbases\b', 'base lines'),
        (r'\bbase\b(?! lines?\b)', 'base line'),
        (r'\blies on\b', 'is located on'),
        (r'\blie on\b', 'are located on'),
        (r'\blying on\b', 'located on'),
        (r'\bboxes\b', '3×3 blocks'),
        (r'\bbox\b', '3×3 block'),
        (r'\bhouses\b', 'Sudoku units'),
        (r'\bhouse\b', 'Sudoku unit'),
        (r'\bstrong links\b', 'strong inference links'),
        (r'\bstrong link\b', 'strong inference link'),
        (r'\bweak links\b', 'weak inference links'),
        (r'\bweak link\b', 'weak inference link'),
        (r'\bcannot both be true\b', 'cannot be true at the same time'),
        (r'\bcannot both be false\b', 'cannot be false at the same time'),
        (r'\bboth ends cannot be true\b', 'the two endpoints cannot be true at the same time'),
        (r'\bround A\b', 'circle-marked A'),
        (r'\bsquare B\b', 'square-marked B'),
        (r'\bstates\b', 'logical truth states'),
        (r'\bstate\b', 'logical truth state'),
        (r'\bcandidates\b', 'candidate digits'),
        (r'\bcandidate\b(?! digits?\b)', 'candidate digit'),
        (r'\bsolid links?\b', lambda m: m[0].replace('solid', 'solid-line')),
        (r'\bteal\b', 'blue-green'),
    ]
    for pattern, replacement in phrases:
        value = re.sub(pattern, replacement, value, flags=re.I)
    for token, original in tokens.items():
        value = value.replace(token, original)
    value = re.sub(r'(?:3×3\s+){2,}', '3×3 ', value)
    value = re.sub(r'(?:logical truth\s+){2,}', 'logical truth ', value)
    value = re.sub(r'(\{\w+\})s\b', r'\1 candidate digits', value)
    return value


def request_many(queries: list[str], locale: str) -> list[str]:
    if RATE_LIMITED.is_set():
        raise RuntimeError('Google rate limit: stopped further requests')
    command = [
        'curl', '--fail', '--silent', '--show-error', '--max-time', '50',
        '--get', 'https://translate.googleapis.com/translate_a/t',
        '--data-urlencode', 'client=gtx', '--data-urlencode', 'sl=en',
        '--data-urlencode', 'tl=' + {'fil': 'tl', 'pt-BR': 'pt'}.get(locale, locale),
    ]
    for query in queries:
        command.extend(['--data-urlencode', 'q=' + query])
    result = subprocess.run(command, text=True, capture_output=True)
    if result.returncode:
        if '429' in result.stderr:
            RATE_LIMITED.set()
        raise RuntimeError(result.stderr.strip())
    values = json.loads(result.stdout)
    if not isinstance(values, list) or len(values) != len(queries) or not all(isinstance(x, str) and x.strip() for x in values):
        raise ValueError('Google did not return one independent draft per query')
    return values


def translate(rows: list[dict], locale: str, terms: dict[str, str]) -> dict[str, str]:
    ordinary = {'Candidate', 'Cell', 'Row', 'Column', 'Box', 'Strong link', 'Weak link', 'Bivalue cell'}
    glossary = {k: v for k, v in terms.items() if k not in ordinary}
    prepared = []
    for row in rows:
        names = {**glossary, 'BUG': 'BUG', 'OR': 'OR', 'N': 'N', 'X': 'X', 'Y': 'Y', 'Z': 'Z'}
        if re.search(r'\bB\b', row['source']) or re.search(r'\b(?:letter|label) A\b', row['source'], re.I):
            names.update({'A': 'A', 'B': 'B'})
        text = clarify(row['source'])
        if 'A' in names and re.match(r'^A (?!and\b|gives\b)', text):
            # An initial indefinite article is not the coloring label A.
            text = 'a' + text[1:]
        prepared.append(protect(text, names))
    values = request_many([text for text, _ in prepared], locale)
    output = {}
    for row, (_, saved), value in zip(rows, prepared, values):
        value = restore(value, saved).strip()
        slots = lambda s: set(re.findall(r'\{\{\w+\}\}|\{\w+\}', s))
        if slots(value) != slots(row['source']) or ('\n' not in row['source'] and '\n' in value):
            raise ValueError('draft changed source variables or sentence boundaries')
        output[row['source']] = value
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--locales', nargs='+', required=True)
    parser.add_argument('--workers', type=int, default=3)
    parser.add_argument('--batch-size', type=int, default=12)
    args = parser.parse_args()
    rows = json.loads(args.source.read_text())
    terms = json.loads((ROOT / 'tools/localization/terminology.json').read_text())
    reviewed = json.loads((ROOT / 'tools/localization/reviewed-core-copy.json').read_text())
    args.output.mkdir(parents=True, exist_ok=True)
    cache = {locale: json.loads((args.output / f'{locale}.json').read_text()) if (args.output / f'{locale}.json').exists() else {} for locale in args.locales}
    jobs = []
    for locale in args.locales:
        batch, size = [], 0
        for row in rows:
            # Keep manually rewritten complete sentences and verified canonical names.
            if row['source'] in cache[locale] or row['source'] in reviewed[locale] or row['source'] in terms[locale]:
                continue
            length = len(quote(clarify(row['source']))) + 100
            if batch and (size + length > 6500 or len(batch) >= args.batch_size):
                jobs.append((locale, batch))
                batch, size = [], 0
            batch.append(row)
            size += length
        if batch:
            jobs.append((locale, batch))
    print(json.dumps({'sourceStrings': len(rows), 'batches': len(jobs), 'languages': args.locales}), flush=True)
    errors = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(translate, batch, locale, terms[locale]): locale for locale, batch in jobs}
        for index, future in enumerate(as_completed(futures), 1):
            locale = futures[future]
            try:
                cache[locale].update(future.result())
            except Exception as error:
                errors.append(locale + ': ' + str(error))
            if index % 20 == 0 or index == len(jobs):
                for language, data in cache.items():
                    (args.output / f'{language}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
                print(json.dumps({'completed': index, 'total': len(jobs), 'errors': errors[-1:]}), flush=True)
    if errors:
        (args.output / 'errors.json').write_text(json.dumps(errors, ensure_ascii=False, indent=2) + '\n')
        raise SystemExit(f'{len(errors)} draft batches require retry or local rewriting')


if __name__ == '__main__':
    main()
