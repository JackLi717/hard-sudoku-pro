#!/usr/bin/env python3
"""Select manifest examples from validated Hint Lab output without editing puzzle data."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'tools/technique-lessons/manifest.json'
LIBRARY = ROOT / 'tools/technique-lessons/source-fixtures.json'
CORPUS = ROOT / 'src/debug/generated/hint-lab-fixtures.json'
SHORT_CHAIN = ROOT / 'tools/technique-practice/short-chain-sources.json'


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    library = json.loads(LIBRARY.read_text())
    corpus = json.loads(CORPUS.read_text())
    short_chain = json.loads(SHORT_CHAIN.read_text())
    available = {source['id']: source for source in
                 corpus['fixtures'] + corpus['variants'] + short_chain['fixtures']}
    selected = {source['id']: source for source in library['fixtures']}
    fixtures = []
    for entry in manifest['lessons']:
        example_id = entry['example_id']
        source = selected.get(example_id) or available.get(example_id)
        if source is None or source['techniqueCode'] != entry['technique_code']:
            raise ValueError(f'missing or mismatched source: {example_id}')
        if example_id in selected and example_id in available and source != available[example_id]:
            raise ValueError(f'source changed unexpectedly: {example_id}')
        fixtures.append(source)
    if len({source['id'] for source in fixtures}) != len(fixtures):
        raise ValueError('duplicate selected example')
    LIBRARY.write_text(json.dumps({'fixtures': fixtures, 'variants': []}, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'Selected {len(fixtures)} lesson sources')


if __name__ == '__main__':
    main()
