#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core_root="${repository_root}/native/hsp-hint-core"
temporary_directory="$(mktemp -d)"
trap 'rm -rf "${temporary_directory}"' EXIT

"${CXX:-c++}" \
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
  -o "${temporary_directory}/fixture_export"

mkdir -p "${repository_root}/src/debug/generated"
"${temporary_directory}/fixture_export" \
  "${repository_root}/tools/puzzle-generator/output/content-v1/puzzles.csv" \
  "${repository_root}/src/debug/generated/hint-lab-fixtures.json"
