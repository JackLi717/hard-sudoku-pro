"""Replace one catalog fixture from a freshly validated native export."""
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
