#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core_root="${repository_root}/native/hsp-hint-core"
temporary_directory="$(mktemp -d)"
trap 'rm -rf "${temporary_directory}"' EXIT

compiler="${CXX:-c++}"
"${compiler}" \
  -std=c++20 \
  -Wall \
  -Wextra \
  -Wpedantic \
  -Werror \
  -I"${core_root}/include" \
  "${core_root}/src/engine.cpp" \
  "${core_root}/tests/engine_test.cpp" \
  -o "${temporary_directory}/hsp_hint_core_tests"

"${temporary_directory}/hsp_hint_core_tests"
