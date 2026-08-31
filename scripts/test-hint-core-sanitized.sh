#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core_root="${repository_root}/native/hsp-hint-core"
temporary_directory="$(mktemp -d)"
trap 'rm -rf "${temporary_directory}"' EXIT

compiler="${CXX:-c++}"
common_flags=(
  -std=c++20
  -O1
  -g
  -fno-omit-frame-pointer
  -fsanitize=address,undefined
  -Wall
  -Wextra
  -Wpedantic
  -Werror
  -I"${core_root}/include"
)

"${compiler}" \
  "${common_flags[@]}" \
  "${core_root}/src/engine.cpp" \
  "${core_root}/src/techniques.cpp" \
  "${core_root}/tests/engine_test.cpp" \
  -o "${temporary_directory}/hsp_hint_core_sanitized_tests"

"${temporary_directory}/hsp_hint_core_sanitized_tests"

"${compiler}" \
  "${common_flags[@]}" \
  "${core_root}/src/engine.cpp" \
  "${core_root}/src/techniques.cpp" \
  "${core_root}/tests/replay_test.cpp" \
  -o "${temporary_directory}/hsp_hint_core_sanitized_replay_tests"

"${temporary_directory}/hsp_hint_core_sanitized_replay_tests" \
  "${repository_root}/tools/puzzle-generator/output/content-v1/puzzles.csv"
