#!/usr/bin/env python3
"""Independently replay every saved advanced step with lower-tier-only search."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('release_dir', type=Path)
    args = parser.parse_args()
    records = json.loads((args.release_dir / 'rating-report.json').read_text())
    rows = []
    for record in records:
        for witness in record['runtime_acceptance']['witnesses']:
            rows.append(' '.join([record['puzzle'], witness['board'],
                                  str(witness['level']), witness['technique'],
                                  *map(str, witness['candidates'])]))
    core = Path(__file__).resolve().parents[3] / 'native/hsp-hint-core'
    with tempfile.TemporaryDirectory() as temporary:
        binary = Path(temporary) / 'witness-check'
        subprocess.run([os.environ.get('CXX', 'c++'), '-O2', '-std=c++20',
                        '-Wall', '-Wextra', '-Wpedantic', '-Werror',
                        f'-I{core / "include"}', str(core / 'src/engine.cpp'),
                        str(core / 'src/techniques.cpp'),
                        str(core / 'src/validation.cpp'),
                        str(core / 'tests/generation_witness_check.cpp'),
                        '-o', str(binary)], check=True, timeout=180)
        subprocess.run([str(binary)], input='\n'.join(rows) + '\n', text=True,
                       check=True, timeout=900)


if __name__ == '__main__':
    main()
