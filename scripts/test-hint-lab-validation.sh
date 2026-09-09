#!/usr/bin/env bash
set -euo pipefail
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core_root="${repository_root}/native/hsp-hint-core"
temporary_directory="$(mktemp -d)"
trap 'rm -rf "${temporary_directory}"' EXIT
"${CXX:-c++}" -std=c++20 -Wall -Wextra -Wpedantic -Werror -I"${core_root}/include" \
  "${core_root}/src/engine.cpp" "${core_root}/src/techniques.cpp" \
  "${core_root}/tests/lab_fixture_validation_test.cpp" -o "${temporary_directory}/lab_validation"
"${temporary_directory}/lab_validation"
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s "${repository_root}/tools/hint-lab" -p 'test_*.py'
