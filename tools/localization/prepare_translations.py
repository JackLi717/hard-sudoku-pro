#!/usr/bin/env python3
"""Prepare offline translation drafts, preserving notation and reviewed terminology.

Network access happens only when this developer explicitly runs this tool. The app
ships static JSON and never sends player data or text to a translation service.
Machine drafts are not independent professional review.
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

ROOT = Path(__file__).resolve().parents[2]
LOCALES = ['ko', 'zh-Hant', 'fr', 'es', 'pt-BR', 'vi', 'hi', 'uk', 'ro', 'fi',
           'ar', 'id', 'it', 'tr', 'th', 'pl', 'ru', 'nl', 'ms', 'fil']
PLACEHOLDER = re.compile(r'\{\{\w+\}\}|\{\w+\}')
NOTATION = re.compile(r'\b(?:r[1-9]c[1-9]|[A-Z][1-9]|[1-9](?:[–/·,][1-9])+|HoDoKu|Platon Sudoku|AIC|ALS|BUG\s*\+\s*1|XY[Z]?[- ]Wing|W[- ]Wing|X[- ]Wing|XY[- ]Chain|X[- ]Chain)\b')
RATE_LIMITED = Event()


def placeholders(text: str) -> list[str]:
    return sorted(PLACEHOLDER.findall(text))


def request(text: str, target: str, source: str = 'en') -> str:
    if RATE_LIMITED.is_set():
        raise RuntimeError('translation service rate limited; requests paused')
    result = subprocess.run([
        'curl', '--fail', '--silent', '--show-error', '--max-time', '50',
        '--retry', '2', '--retry-delay', '2', '--get',
        'https://translate.googleapis.com/translate_a/single',
        '--data-urlencode', 'client=gtx', '--data-urlencode', f'sl={source}',
        '--data-urlencode', f'tl={target}', '--data-urlencode', 'dt=t',
        '--data-urlencode', 'q=' + text,
    ], capture_output=True, text=True)
    if result.returncode:
        if '429' in result.stderr:
            RATE_LIMITED.set()
        raise RuntimeError(result.stderr.strip())
    data = json.loads(result.stdout)
    return ''.join(part[0] for part in data[0] if part[0])


def protect(text: str, terms: dict[str, str]) -> tuple[str, dict[str, str]]:
    saved: dict[str, str] = {}
    def save(value: str) -> str:
        token = f'ZXQ{len(saved):04d}QXZ'
        saved[token] = value
        return token
    text = PLACEHOLDER.sub(lambda m: save(m[0]), text)
    if terms:
        symbols = {key: value for key, value in terms.items() if key in {'OR', 'N', 'X', 'Y', 'Z', 'A', 'B'}}
        words = {key: value for key, value in terms.items() if key not in symbols}
        if symbols:
            symbol_pattern = re.compile(r'(?<!\w)(' + '|'.join(map(re.escape, symbols)) + r')(?!\w)')
            text = symbol_pattern.sub(lambda m: save(symbols[m[0]]), text)
        pattern = re.compile(r'(?<!\w)(' + '|'.join(re.escape(t) for t in sorted(words, key=len, reverse=True)) + r')(?!\w)', re.IGNORECASE) if words else None
        folded = {key.casefold(): value for key, value in words.items()}
        if pattern:
            text = pattern.sub(lambda m: save(folded[m[0].casefold()]), text)
    text = NOTATION.sub(lambda m: save(m[0]), text)
    return text, saved


def restore(text: str, saved: dict[str, str]) -> str:
    for token, value in saved.items():
        # A translation can add spaces around digits in otherwise stable tokens.
        pattern = r'\s*'.join(re.escape(c) for c in token)
        if len(re.findall(pattern, text)) != 1:
            raise ValueError('translation changed protected token ' + token)
        text = re.sub(pattern, lambda _: value, text)
    if re.search(r'ZXQ\s*\d|QXZ', text):
        raise ValueError('unresolved protected token')
    return text


def batch_translate(rows: list[dict], locale: str, terms: dict[str, str]) -> dict[str, str]:
    protected = []
    for index, row in enumerate(rows):
        text, saved = protect(row.get('translationSource', row['source']), {k: v for k, v in terms.items() if k not in {'Candidate', 'Cell', 'Row', 'Column', 'Box', 'Strong link', 'Weak link', 'Bivalue cell'}})
        protected.append((f'ZXS{index:04d}SXZ', row['source'], text, saved))
    text = '\n'.join(marker + ' ' + value for marker, _, value, _ in protected)
    source_language = 'zh-CN' if locale == 'zh-Hant' else 'en'
    target = {'zh-Hant': 'zh-TW', 'fil': 'tl'}.get(locale, locale)
    if len(rows) == 1:
        _, source, value, saved = protected[0]
        result = restore(request(value, target, source_language), saved).strip()
        if not result or placeholders(source) != placeholders(result):
            raise ValueError('invalid single-string draft: ' + source)
        if '\n' not in source and '\n' in result:
            raise ValueError('translation changed string boundaries: ' + source)
        return {source: result}
    translated = request(text, target, source_language)
    chunks = re.split(r'ZXS\s*(\d{4})\s*SXZ\s*', translated)
    if len(chunks) != 2 * len(rows) + 1:
        if len(rows) > 1:
            middle = len(rows) // 2
            return {**batch_translate(rows[:middle], locale, terms),
                    **batch_translate(rows[middle:], locale, terms)}
        # No line marker is necessary for a single string.
        _, source, value, saved = protected[0]
        result = restore(request(value, target, source_language), saved)
        if placeholders(source) != placeholders(result):
            raise ValueError('placeholder mismatch: ' + source)
        return {source: result.strip()}
    output = {}
    for index, (_, source, _, saved) in enumerate(protected):
        if int(chunks[index * 2 + 1]) != index:
            raise ValueError('translation reordered string identifiers')
        try:
            value = restore(chunks[index * 2 + 2].strip(), saved)
        except ValueError:
            # Repeated slot identifiers on adjacent lines can confuse the service.
            # Retry this sentence alone, retaining successful neighboring strings.
            _, _, protected_text, _ = protected[index]
            value = restore(request(protected_text, target, source_language), saved)
        if placeholders(source) != placeholders(value):
            raise ValueError('placeholder mismatch: ' + source)
        if not value.strip() or ('\n' not in source and '\n' in value):
            raise ValueError('translation changed string boundaries: ' + source)
        output[source] = value
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--locales', nargs='+', default=LOCALES)
    parser.add_argument('--workers', type=int, default=6)
    args = parser.parse_args()
    rows = json.loads(args.source.read_text())
    glossaries = json.loads((ROOT / 'tools/localization/terminology.json').read_text())
    directory = ROOT / 'src/localization/generated'
    directory.mkdir(parents=True, exist_ok=True)
    cache: dict[str, dict[str, str]] = {}
    jobs = []
    for locale in args.locales:
        output = directory / (locale + '.json')
        cache[locale] = json.loads(output.read_text()) if output.exists() else {}
        terms = glossaries[locale]
        for row in rows:
            if row['source'] in terms:
                cache[locale][row['source']] = terms[row['source']]
        batch, length = [], 0
        for row in rows:
            if cache[locale].get(row['source']):
                continue
            if locale == 'zh-Hant' and placeholders(row['source']) == placeholders(row['chinese']):
                row = {**row, 'translationSource': row['chinese']}
            row_length = len(quote(row.get('translationSource', row['source']))) + 30
            # Short UI labels can drift across line markers even when all
            # markers survive. Translate them alone, without batch context.
            if len(row['source']) < 48:
                if batch:
                    jobs.append((locale, batch))
                    batch, length = [], 0
                jobs.append((locale, [row]))
                continue
            if length + row_length > 5000 and batch:
                jobs.append((locale, batch))
                batch, length = [], 0
            batch.append(row)
            length += row_length
        if batch:
            jobs.append((locale, batch))
    print(json.dumps({'strings': len(rows), 'batches': len(jobs), 'languages': len(args.locales)}), flush=True)
    errors = []
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        pending = {executor.submit(batch_translate, batch, locale, glossaries[locale]): (locale, batch) for locale, batch in jobs}
        for count, future in enumerate(as_completed(pending), 1):
            locale, batch = pending[future]
            try:
                cache[locale].update(future.result())
            except Exception as error:
                errors.append((locale, str(error)[:200]))
            if count % 12 == 0 or count == len(jobs):
                for language, values in cache.items():
                    (directory / (language + '.json')).write_text(json.dumps(values, ensure_ascii=False, indent=2) + '\n')
                print(json.dumps({'completed': count, 'total': len(jobs), 'errors': errors[-3:]}), flush=True)
    if errors:
        raise SystemExit(f'{len(errors)} draft batches failed; rerun to resume missing strings')


if __name__ == '__main__':
    main()
