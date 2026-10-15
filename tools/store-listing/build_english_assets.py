#!/usr/bin/env python3
"""Render localized store captions around genuine Android captures."""

from __future__ import annotations

import argparse
import base64
import csv
import html
import json
import re
import shutil
import struct
import subprocess
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LISTING = ROOT / 'docs/operations/store-listing/en-GB.json'
MANIFEST = ROOT / 'docs/operations/store-listing/en-GB-assets.json'
PHONE = ROOT / '.local/google-play/listing/en-GB/screenshots/phone'
OUTPUT = PHONE / 'composed'
LOCALE = 'en-GB'


def png_info(path: Path) -> tuple[int, int, int, int]:
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'Not a PNG: {path}')
    return struct.unpack('>IIBB', data[16:26])


def text_line(text: str, y: int, size: int, weight: int, colour: str) -> str:
    return (
        f'<text x="60" y="{y}" font-size="{size}" font-weight="{weight}" '
        f'fill="{colour}">{html.escape(text)}</text>'
    )


def render_asset(asset: dict[str, object]) -> None:
    source = PHONE / str(asset['source'])
    width, height, depth, _ = png_info(source)
    if (width, height, depth) != (1080, 1920, 8):
        raise ValueError(f'Unexpected capture dimensions: {source}')
    lines = asset['headline']
    if not isinstance(lines, list) or len(lines) != 2:
        raise ValueError('Each headline needs two intentional lines')
    caption = text_line('PLATON SUDOKU', 58, 26, 600, '#176e5b')
    caption += text_line(str(lines[0]), 143, 68, 700, '#18241f')
    caption += text_line(str(lines[1]), 218, 68, 700, '#18241f')
    caption += text_line(str(asset['subtitle']), 278, 34, 400, '#46584f')
    if asset.get('qualification'):
        caption += text_line(str(asset['qualification']), 323, 25, 400, '#46584f')
    # Crop only Android status/navigation bars. The app UI is neither repainted
    # nor rearranged. A uniform scale preserves the capture's proportions.
    source_uri = 'data:image/png;base64,' + base64.b64encode(source.read_bytes()).decode('ascii')
    crop_top = int(asset.get('cropTop', 144))
    crop_height = int(asset.get('cropHeight', 1650))
    font_family = {
        'ja-JP': 'Hiragino Sans, Hiragino Kaku Gothic ProN, sans-serif',
        'ko-KR': 'Apple SD Gothic Neo, AppleGothic, sans-serif',
        'zh-TW': 'Heiti TC, sans-serif',
    }.get(LOCALE, 'Arial, sans-serif')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
<rect width="1080" height="1920" fill="#f3f0e8"/>
<g xml:lang="{LOCALE}" font-family="{font_family}">{caption}</g>
<defs><clipPath id="capture"><rect x="40" y="364" width="1000" height="1527.78" rx="18"/></clipPath></defs>
<g clip-path="url(#capture)"><svg x="40" y="364" width="1000" height="1527.78" viewBox="0 {crop_top} 1080 {crop_height}">
<image href="{source_uri}" width="1080" height="1920"/>
</svg></g>
</svg>'''
    stem = str(asset['file']).removesuffix('.png')
    svg_path = OUTPUT / f'{stem}.svg'
    png_path = OUTPUT / f'{stem}.png'
    svg_path.write_text(svg, encoding='utf-8')
    rendered = subprocess.run(
        ['rsvg-convert', str(svg_path)], check=True, capture_output=True,
    ).stdout
    ppm = subprocess.run(
        ['pngtopnm'], input=rendered, check=True, capture_output=True,
    ).stdout
    rgb = subprocess.run(
        ['pnmtopng', '-force'], input=ppm, check=True, capture_output=True,
    ).stdout
    png_path.write_bytes(rgb)
    if png_info(png_path) != (1080, 1920, 8, 2):
        raise ValueError(f'Expected opaque 24-bit RGB PNG: {png_path}')


def render_overview(assets: list[dict[str, object]]) -> None:
    images = []
    columns = 2 if len(assets) == 4 else 3
    for index, asset in enumerate(assets):
        data = base64.b64encode((OUTPUT / str(asset['file'])).read_bytes()).decode('ascii')
        x, y = 20 + (index % columns) * 380, 20 + (index // columns) * 660
        images.append(f'<image x="{x}" y="{y}" width="360" height="640" href="data:image/png;base64,{data}"/>')
    overview_height = 20 + ((len(assets) + columns - 1) // columns) * 660
    overview_width = 20 + columns * 380
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{overview_width}" height="{overview_height}"><rect width="{overview_width}" height="{overview_height}" fill="#dedfd9"/>' + ''.join(images) + '</svg>'
    rendered = subprocess.run(['rsvg-convert'], input=svg.encode(), check=True, capture_output=True).stdout
    ppm = subprocess.run(['pngtopnm'], input=rendered, check=True, capture_output=True).stdout
    rgb = subprocess.run(['pnmtopng', '-force'], input=ppm, check=True, capture_output=True).stdout
    (OUTPUT / 'overview.png').write_bytes(rgb)


def refresh_keyword_coverage(listing: dict[str, str]) -> None:
    research_path = LISTING.with_name(f'{LOCALE}-keywords.json')
    research = json.loads(research_path.read_text())
    if LOCALE in ('ja-JP', 'ko-KR', 'zh-TW'):
        refresh_substring_coverage(listing, research, research_path)
        return
    if LOCALE in ('de-DE', 'fr-FR', 'es-ES', 'pt-BR', 'it-IT', 'id'):
        refresh_german_coverage(listing, research, research_path)
        return
    def normalize(text: str) -> str:
        return re.sub(r'\s+', ' ', re.sub('[–—‑]', '-', text.lower()))
    current = normalize(' '.join(listing.values()))
    for row in research['keywords']:
        row['listingOccurrences'] = len(re.findall(
            r'(?<![a-z0-9])' + re.escape(row['phrase']) + r'(?![a-z0-9])', current,
        ))
        row['placement'] = (
            'short_and_or_full_description' if row['phrase'] in normalize(listing['shortDescription'])
            else 'full_description'
        ) if row['listingOccurrences'] else 'not_exactly_included'
        if not row['decision'].startswith(('exclude', 'premium')):
            row['decision'] = 'included' if row['listingOccurrences'] else 'natural_variant_or_supporting_term_not_forced'
    research['summary'] = {
        'terms': len(research['keywords']),
        'observedCompetitorTerms': sum(row['apps'] > 0 for row in research['keywords']),
        'exactlyCoveredTerms': sum(row['listingOccurrences'] > 0 for row in research['keywords']),
        'multiwordTerms': sum(' ' in row['phrase'] for row in research['keywords']),
    }
    research_path.write_text(json.dumps(research, ensure_ascii=False, indent=2) + '\n')
    sources = [source['id'] for source in research['sources']]
    with research_path.with_suffix('.csv').open('w', newline='', encoding='utf-8') as output:
        writer = csv.writer(output, lineterminator='\n')
        writer.writerow(['phrase', 'apps_out_of_6', *sources, 'platon_occurrences', 'origin', 'decision', 'placement'])
        for row in research['keywords']:
            writer.writerow([row['phrase'], row['apps'], *[row['occurrences'].get(source, 0) for source in sources], row['listingOccurrences'], row['origin'], row['decision'], row['placement']])


def refresh_substring_coverage(listing: dict[str, str], research: dict, path: Path) -> None:
    # Preserve Japanese substring matching. Korean and Traditional Chinese keep
    # forms distinct while normalizing whitespace and Latin case; no word segmentation.
    # Nested row matches do not establish distinct queries or search volumes.
    def normalize(text: str) -> str:
        normalized = unicodedata.normalize('NFC', text)
        return re.sub(r'\s+', ' ', normalized.lower()) if LOCALE in ('ko-KR', 'zh-TW') else normalized

    current = normalize('\n'.join(listing.values()))
    for row in research['keywords']:
        row['listingOccurrences'] = current.count(normalize(row['phrase']))
        row['placement'] = [field for field, text in listing.items() if normalize(row['phrase']) in normalize(text)]
        if row['decision'] not in ('exclude_unsupported_claim_or_feature', 'exclude_typo_keyword_cluster', 'included_with_explicit_entitlement'):
            row['decision'] = 'included' if row['listingOccurrences'] else 'not_exactly_included'
    research['summary']['exactlyCoveredTerms'] = sum(row['listingOccurrences'] > 0 for row in research['keywords'])
    path.write_text(json.dumps(research, ensure_ascii=False, indent=2) + '\n')
    sources = [source['id'] for source in research['sources']]
    with path.with_suffix('.csv').open('w', newline='', encoding='utf-8-sig') as output:
        writer = csv.writer(output, lineterminator='\n')
        writer.writerow(['phrase', f'apps_out_of_{len(sources)}', *sources, 'platon_occurrences', 'origin', 'decision', 'reason', 'placement'])
        for row in research['keywords']:
            writer.writerow([row['phrase'], row['apps'], *[row['occurrences'].get(source, 0) for source in sources], row['listingOccurrences'], row['origin'], row['decision'], row['reason'], '|'.join(row['placement'])])


def refresh_german_coverage(listing: dict[str, str], research: dict, path: Path) -> None:
    def normalize(text: str) -> str:
        normalized = unicodedata.normalize('NFC', text).lower()
        if LOCALE in ('fr-FR', 'es-ES', 'pt-BR', 'it-IT', 'id'):
            normalized = re.sub('[’‘]', "'", normalized)
        return re.sub(r'\s+', ' ', re.sub('[–—‑]', '-', normalized))

    def count(text: str, phrase: str) -> int:
        # Unicode letters/digits, excluding underscore, delimit whole phrases.
        pattern = r'(?<![^\W_])' + re.escape(normalize(phrase)) + r'(?![^\W_])'
        return len(re.findall(pattern, normalize(text)))

    current = '\n'.join(listing.values())
    for row in research['keywords']:
        row['listingOccurrences'] = count(current, row['phrase'])
        row['placement'] = [field for field, text in listing.items() if count(text, row['phrase'])]
        if row['decision'] not in ('exclude_unsupported_claim_or_feature', 'exclude_typo_keyword_cluster', 'included_with_explicit_entitlement'):
            row['decision'] = 'included' if row['listingOccurrences'] else 'not_exactly_included'
    research['summary']['exactlyCoveredTerms'] = sum(row['listingOccurrences'] > 0 for row in research['keywords'])
    path.write_text(json.dumps(research, ensure_ascii=False, indent=2) + '\n')
    sources = [source['id'] for source in research['sources']]
    with path.with_suffix('.csv').open('w', newline='', encoding='utf-8-sig') as output:
        writer = csv.writer(output, lineterminator='\n')
        writer.writerow(['phrase', f'apps_out_of_{len(sources)}', *sources, 'platon_occurrences', 'origin', 'decision', 'reason', 'placement'])
        for row in research['keywords']:
            writer.writerow([row['phrase'], row['apps'], *[row['occurrences'].get(source, 0) for source in sources], row['listingOccurrences'], row['origin'], row['decision'], row['reason'], '|'.join(row['placement'])])


def main() -> None:
    global LOCALE, LISTING, MANIFEST, PHONE, OUTPUT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--locale', choices=('en-GB', 'ja-JP', 'de-DE', 'ko-KR', 'fr-FR', 'es-ES', 'pt-BR', 'zh-TW', 'it-IT', 'id'), default='en-GB')
    LOCALE = parser.parse_args().locale
    LISTING = ROOT / f'docs/operations/store-listing/{LOCALE}.json'
    MANIFEST = LISTING.with_name(f'{LOCALE}-assets.json')
    PHONE = ROOT / f'.local/google-play/listing/{LOCALE}/screenshots/phone'
    OUTPUT = PHONE / 'composed'
    for executable in ('rsvg-convert', 'pngtopnm', 'pnmtopng'):
        if not shutil.which(executable):
            raise RuntimeError(f'Missing rendering tool: {executable}')
    listing = json.loads(LISTING.read_text())
    for field, limit in (('title', 30), ('shortDescription', 80), ('fullDescription', 4000)):
        if len(listing[field]) > limit:
            raise ValueError(f'{field} exceeds {limit} characters')
    manifest = json.loads(MANIFEST.read_text())
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for asset in manifest['phoneScreenshots']:
        if len(asset['altText']) > 140:
            raise ValueError(f'Alt text exceeds 140 characters: {asset["file"]}')
        render_asset(asset)
    render_overview(manifest['phoneScreenshots'])
    refresh_keyword_coverage(listing)
    copy = (
        f'# Google Play store listing copy — {LOCALE}\n\n'
        'Current candidate; publication state is recorded in the ASO tracker.\n'
        f'Canonical source: docs/operations/store-listing/{LOCALE}.json.\n\n'
        f'## App name\n\n{listing["title"]}\n\n'
        f'## Short description\n\n{listing["shortDescription"]}\n\n'
        f'## Full description\n\n{listing["fullDescription"]}\n'
    )
    (PHONE.parents[1] / 'store-listing-copy.md').write_text(copy, encoding='utf-8')
    print(f'Rendered {len(manifest["phoneScreenshots"])} {LOCALE} screenshots at {OUTPUT}')
    print('Validated title/short/full character limits, alt text, dimensions and 24-bit PNG output.')


if __name__ == '__main__':
    main()
