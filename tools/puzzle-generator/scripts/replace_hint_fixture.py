"""Replace one catalog fixture and its synthetic teaching variants."""
import argparse
import json
from pathlib import Path


def replace_fixture(generated: Path, output: Path, technique: str) -> None:
    fresh = json.loads(generated.read_text())
    current = json.loads(output.read_text())
    replacements = [f for f in fresh['fixtures'] if f['techniqueCode'] == technique]
    indices = [i for i, f in enumerate(current['fixtures']) if f['techniqueCode'] == technique]
    if len(replacements) != 1 or len(indices) != 1:
        raise ValueError(f'Expected exactly one catalog fixture for {technique}')
    current['fixtures'][indices[0]] = replacements[0]
    # Corpus-derived variants are curated independently and can change when the
    # exporter re-screens the corpus. A focused teaching update must retain
    # them, while replacing the deterministic synthetic examples for the
    # selected technique.
    current_variants = current.get('variants', [])
    fresh_variants = fresh.get('variants', [])
    current['variants'] = [
        fixture
        for fixture in current_variants
        if not (
            fixture['techniqueCode'] == technique
            and fixture.get('sourceKind') == 'synthetic'
        )
    ]
    current['variants'].extend(
        fixture
        for fixture in fresh_variants
        if fixture['techniqueCode'] == technique
        and fixture.get('sourceKind') == 'synthetic'
    )
    temporary = output.with_suffix('.json.tmp')
    try:
        temporary.write_text(json.dumps(current, separators=(',', ':')) + '\n')
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generated', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--technique', required=True)
    args = parser.parse_args()
    replace_fixture(args.generated, args.output, args.technique)
