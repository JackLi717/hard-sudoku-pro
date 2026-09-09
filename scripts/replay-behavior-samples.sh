#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core_root="${repository_root}/native/hsp-hint-core"
temporary_directory="$(mktemp -d)"
sample_path="${1:-${repository_root}/tools/behavior-evaluation/samples/tg2-initial-review-samples.json}"
appendix_path="${2:-${repository_root}/tools/behavior-evaluation/reports/tg2-system-attribution-appendix.md}"
appendix_title="${3:-TG-2 系统归因附录}"
preserve_ineligible="${4:-false}"
trap 'rm -rf "${temporary_directory}"' EXIT

"${CXX:-c++}" \
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
  "${repository_root}/tools/behavior-evaluation/native_replay.cpp" \
  -o "${temporary_directory}/native_replay"

node \
  "${repository_root}/tools/behavior-evaluation/replay_samples.mjs" \
  "${temporary_directory}/native_replay" \
  "${sample_path}" \
  "${appendix_path}" \
  "${appendix_title}" \
  "${preserve_ineligible}"
