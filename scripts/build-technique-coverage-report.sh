#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_root="${repository_root}/tools/puzzle-generator/output/content-v4"
report_root="${repository_root}/tools/puzzle-generator/reports"
temporary_directory="$(mktemp -d)"
trap 'rm -rf "${temporary_directory}"' EXIT

compiler="${CXX:-c++}"
core_root="${repository_root}/native/hsp-hint-core"
runtime_usage="${temporary_directory}/content-v4-runtime-technique-usage.csv"
json_report="${temporary_directory}/content-v4-technique-coverage.json"
markdown_report="${temporary_directory}/content-v4-technique-coverage.md"

"${compiler}" \
  -O2 \
  -std=c++20 \
  -Wall \
  -Wextra \
  -Wpedantic \
  -Werror \
  -I"${core_root}/include" \
  "${core_root}/src/engine.cpp" \
  "${core_root}/src/techniques.cpp" \
  "${core_root}/tests/replay_test.cpp" \
  -o "${temporary_directory}/hsp_technique_coverage"

"${temporary_directory}/hsp_technique_coverage" \
  "${release_root}/puzzles.csv" \
  10000 \
  0 \
  "${runtime_usage}"

python3 "${repository_root}/tools/puzzle-generator/scripts/analyze_technique_coverage.py" \
  --database "${release_root}/content.sqlite" \
  --runtime-usage "${runtime_usage}" \
  --minimum-puzzles 50 \
  --json-output "${json_report}" \
  --markdown-output "${markdown_report}"

mkdir -p "${report_root}"
mv "${runtime_usage}" "${report_root}/content-v4-runtime-technique-usage.csv"
mv "${json_report}" "${report_root}/content-v4-technique-coverage.json"
mv "${markdown_report}" "${report_root}/content-v4-technique-coverage.md"

echo "Technique coverage artifacts updated in ${report_root}"
