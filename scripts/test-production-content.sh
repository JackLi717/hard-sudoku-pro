#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_root="${repository_root}/tools/puzzle-generator/output/content-v4"
temporary_directory="$(mktemp -d)"
trap 'rm -rf "${temporary_directory}"' EXIT

python3 - "${release_root}" <<'PY'
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

release_root = Path(sys.argv[1])
manifest = json.loads((release_root / "manifest.json").read_text(encoding="utf-8"))
validation = json.loads(
    (release_root / "validation-report.json").read_text(encoding="utf-8")
)
expected = manifest["difficultyDistribution"]

if manifest["contentVersion"] != 4:
    raise RuntimeError("Expected production content version 4")
if manifest["ratingPolicy"]["version"] != "hsp-1.2":
    raise RuntimeError("Unexpected production rating policy")
if manifest["puzzleCount"] < 50 or expected.get("5", 0) < 50:
    raise RuntimeError("Production content must contain at least 50 accurate L5 puzzles")
expected_l5 = {"jellyfish", "xChain", "xyChain", "aic", "groupedAic",
               "complexColoring", "forcingChain", "forcingNet"}
if set(validation.get("levelFiveTechniqueCoverage", {})) != expected_l5:
    raise RuntimeError("Missing L5 technique coverage entries")
if not validation.get("levelFiveCoverageComplete"):
    raise RuntimeError("Each L5 technique must have at least 50 qualified puzzle cases")
if any(item["preferredPuzzleCount"] < 50 for item in validation["levelFiveTechniqueCoverage"].values()):
    raise RuntimeError("Incomplete L5 technique quota")
if manifest["difficultyDistribution"] != expected:
    raise RuntimeError("Unexpected manifest difficulty distribution")
if validation["status"] != "passed" or validation["difficultyDistribution"] != expected:
    raise RuntimeError("Generated validation report did not pass")

for name, expected_hash in manifest["artifacts"].items():
    actual_hash = hashlib.sha256((release_root / name).read_bytes()).hexdigest()
    if actual_hash != expected_hash:
        raise RuntimeError(f"Artifact checksum mismatch: {name}")

with sqlite3.connect(release_root / "content.sqlite") as connection:
    if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise RuntimeError("Production SQLite integrity check failed")
    if connection.execute("PRAGMA foreign_key_check").fetchall():
        raise RuntimeError("Production SQLite foreign-key check failed")
    distribution = dict(
        connection.execute(
            "SELECT difficulty_level, COUNT(*) FROM puzzles GROUP BY difficulty_level"
        ).fetchall()
    )
    if distribution != {int(level): count for level, count in expected.items()}:
        raise RuntimeError("Unexpected SQLite difficulty distribution")
    unique_count = connection.execute(
        "SELECT COUNT(DISTINCT puzzle) FROM puzzles"
    ).fetchone()[0]
    if unique_count != manifest["puzzleCount"]:
        raise RuntimeError("Production puzzles are not unique")
    hsp_techniques = {
        "fullHouse", "nakedSingle", "hiddenSingle",
        "lockedCandidates.pointing", "lockedCandidates.claiming",
        "lockedPair", "lockedTriple", "nakedPair", "hiddenPair",
        "nakedTriple", "hiddenTriple", "nakedQuad", "hiddenQuad", "xWing",
        "swordfish", "skyscraper", "twoStringKite", "turbotFish", "wWing",
        "xyWing", "xyzWing", "simpleColoring", "multiColoring", "remotePair",
        "emptyRectangle", "hiddenRectangle", "avoidableRectangle",
        "uniqueRectangle", "bugPlusOne", "finnedXWing", "sashimiXWing",
        "jellyfish", "xChain", "xyChain", "aic", "groupedAic",
        "complexColoring", "forcingChain", "forcingNet",
    }
    stored_techniques = {
        row[0] for row in connection.execute("SELECT DISTINCT hardest_technique FROM puzzles")
    }
    stored_usage_techniques = {
        row[0]
        for row in connection.execute(
            "SELECT DISTINCT technique_code FROM puzzle_technique_usage"
        )
    }
    if (
        not stored_techniques <= hsp_techniques
        or not stored_usage_techniques <= hsp_techniques
    ):
        raise RuntimeError("Production database contains non-HSP technique codes")

print("production content: artifact, checksum, distribution, and SQLite checks passed")
PY

compiler="${CXX:-c++}"
core_root="${repository_root}/native/hsp-hint-core"
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
  "${core_root}/src/validation.cpp" \
  "${core_root}/tests/replay_test.cpp" \
  -o "${temporary_directory}/hsp_production_replay"

"${temporary_directory}/hsp_production_replay" \
  "${release_root}/puzzles.csv" \
  "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["puzzleCount"])' "${release_root}/manifest.json")" \
  0 \
  "${temporary_directory}/runtime-technique-usage.csv"
