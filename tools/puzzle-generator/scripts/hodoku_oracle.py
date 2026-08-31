#!/usr/bin/env python3
"""Run pinned HoDoKu2 as an offline logical-hint reference oracle.

This developer tool is intentionally outside the mobile runtime. It turns the
HoDoKu2 CLI solution path into stable JSON for cross-checking candidate hint
engines and fixtures.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
JAR = ROOT / "vendor" / "hodoku2" / "HoDoKu.jar"
CONFIG = ROOT / "config" / "hodoku.hcfg"
HODOKU_VERSION = "2.4.3-build-116"

PUZZLE_RE = re.compile(r"^[0-9.]{81}$")
SOLUTION_RE = re.compile(
    r"^([1-9]{81}) #1 (Easy|Medium|Hard|Unfair|Extreme) \((\d+)\)\s*$"
)
STEP_RE = re.compile(r"^\s+([^:]+):\s+(.+?)\s*$")
TECHNIQUE_RE = re.compile(r"^\s*(\S+):(.+?)\s*$")
FORBIDDEN_CODES = {"bf", "gu", "ts", "td"}


def java_command() -> list[str]:
    return [
        "java",
        "-Duser.language=en",
        "-Duser.country=US",
        "-Xmx512m",
        "-jar",
        str(JAR.relative_to(ROOT)),
    ]


def run_hodoku(arguments: list[str], timeout: int = 120) -> str:
    result = subprocess.run(
        java_command() + arguments,
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"HoDoKu2 exited with {result.returncode}: {result.stderr.strip()}"
        )
    return result.stdout


def technique_codes() -> dict[str, str]:
    output = run_hodoku(["/lt"])
    result: dict[str, str] = {}
    for line in output.splitlines():
        match = TECHNIQUE_RE.match(line)
        if match:
            code, name = match.groups()
            result[name.strip()] = code
    if len(result) < 50:
        raise RuntimeError("Could not parse the pinned HoDoKu2 technique catalog")
    return result


def analyze(puzzle: str) -> dict[str, Any]:
    normalized = puzzle.replace(".", "0")
    if not PUZZLE_RE.fullmatch(puzzle):
        raise ValueError("Puzzle must contain exactly 81 digits, dots, or zeros")

    output = run_hodoku(
        [
            "/c",
            str(CONFIG.relative_to(ROOT)),
            normalized,
            "/vs",
            "/vp",
            "/o",
            "stdout",
        ]
    )
    names_to_codes = technique_codes()
    solution: str | None = None
    level: str | None = None
    score: int | None = None
    steps: list[dict[str, Any]] = []
    reading_steps = False

    for line in output.splitlines():
        solution_match = SOLUTION_RE.match(line.strip())
        if solution_match:
            solution, level, score_text = solution_match.groups()
            score = int(score_text)
            reading_steps = True
            continue

        if line.strip() == "Done!":
            reading_steps = False

        if not reading_steps:
            continue

        step_match = STEP_RE.match(line)
        if not step_match or solution is None:
            continue
        technique_name, action = step_match.groups()
        technique_code = names_to_codes.get(technique_name.strip())
        if technique_code is None:
            raise RuntimeError(f"Unknown HoDoKu2 technique: {technique_name}")
        steps.append(
            {
                "ordinal": len(steps) + 1,
                "techniqueCode": technique_code,
                "techniqueName": technique_name.strip(),
                "action": action.strip(),
            }
        )

    if solution is None or level is None or score is None:
        raise RuntimeError("HoDoKu2 did not return a parsed solution")
    if not steps:
        raise RuntimeError("HoDoKu2 did not return a logical solution path")

    forbidden = sorted(
        {step["techniqueCode"] for step in steps}.intersection(FORBIDDEN_CODES)
    )
    if forbidden:
        raise RuntimeError(
            f"HoDoKu2 path contains forbidden fallback techniques: {forbidden}"
        )

    return {
        "oracle": "hodoku2",
        "oracleVersion": HODOKU_VERSION,
        "puzzle": normalized,
        "solution": solution,
        "level": level,
        "score": score,
        "firstStep": steps[0],
        "steps": steps,
    }


def self_test() -> None:
    puzzle = (
        "000005000700190000059376100300000000000080021002001846040060000"
        "080910063000000009"
    )
    result = analyze(puzzle)
    if result["solution"] != (
        "861425937723198654459376182318642795674589321592731846947263518"
        "285917463136854279"
    ):
        raise RuntimeError("Oracle returned an unexpected solution")
    if result["firstStep"]["techniqueCode"] != "n1":
        raise RuntimeError("Oracle returned an unexpected first logical step")
    print("HoDoKu2 oracle self-test passed")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--puzzle")
    group.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            print(json.dumps(analyze(args.puzzle), indent=2, sort_keys=True))
    except (RuntimeError, ValueError, subprocess.TimeoutExpired) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
