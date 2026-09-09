#!/usr/bin/env bash
set -euo pipefail
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core_root="${repository_root}/native/hsp-hint-core"
temporary_directory="$(mktemp -d)"
trap 'rm -rf "${temporary_directory}"' EXIT
"${CXX:-c++}" -std=c++20 -O2 -Wall -Wextra -Wpedantic -Werror \
  -I"${core_root}/include" \
  "${core_root}/src/bridge.cpp" "${core_root}/src/engine.cpp" \
  "${core_root}/src/techniques.cpp" "${core_root}/tests/lab_corpus_builder.cpp" \
  -o "${temporary_directory}/lab_corpus_builder"
"${CXX:-c++}" -std=c++20 -O2 -Wall -Wextra -Wpedantic -Werror \
  -I"${core_root}/include" \
  "${core_root}/src/bridge.cpp" "${core_root}/src/engine.cpp" \
  "${core_root}/src/techniques.cpp" "${core_root}/tests/lab_artifact_check.cpp" \
  -o "${temporary_directory}/lab_artifact_check"
python3 "${repository_root}/tools/hint-lab/build_corpus.py" \
  --binary "${temporary_directory}/lab_corpus_builder" \
  --check-binary "${temporary_directory}/lab_artifact_check" "$@"
