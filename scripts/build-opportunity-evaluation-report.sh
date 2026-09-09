#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core_root="${repository_root}/native/hsp-hint-core"
report_root="${repository_root}/tools/puzzle-generator/reports"
temporary_directory="$(mktemp -d)"
trap 'rm -rf "${temporary_directory}"' EXIT

compiler="${CXX:-c++}"
json_report="${temporary_directory}/opportunity-evaluation.json"
markdown_report="${temporary_directory}/opportunity-evaluation.md"

"${compiler}" \
  -O2 \
  -std=c++20 \
  -Wall \
  -Wextra \
  -Wpedantic \
  -Werror \
  -I"${core_root}/include" \
  "${core_root}/src/bridge.cpp" \
  "${core_root}/src/engine.cpp" \
  "${core_root}/src/techniques.cpp" \
  "${core_root}/tests/fixture_export.cpp" \
  -o "${temporary_directory}/opportunity_evaluation"

"${temporary_directory}/opportunity_evaluation" \
  "${repository_root}/tools/puzzle-generator/output/content-v1/puzzles.csv" \
  "${temporary_directory}/hint-lab-fixtures.json" \
  "${json_report}"

python3 \
  "${repository_root}/tools/puzzle-generator/scripts/render_opportunity_evaluation.py" \
  --input "${json_report}" \
  --markdown-output "${markdown_report}"

mkdir -p "${report_root}"
mv "${json_report}" "${report_root}/opportunity-evaluation.json"
mv "${markdown_report}" "${report_root}/opportunity-evaluation.md"

echo "Opportunity evaluation artifacts updated in ${report_root}"
