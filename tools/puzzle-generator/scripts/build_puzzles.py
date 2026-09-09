#!/usr/bin/env python3
"""Build a validated Sudoku development content database.

HoDoKu2 supplies candidates and oracle audits. The HSP C++ detector engine
verifies lowest-tier-first logical completion and preferred technique cases.
This script orchestrates both tools and packages the accepted artifacts.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import queue
import re
import shutil
import sqlite3
import subprocess
import sys
import threading
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = ROOT.parents[1]
JAR = ROOT / "vendor" / "hodoku2" / "HoDoKu.jar"
HODOKU_CONFIG = ROOT / "config" / "hodoku.hcfg"
RATING_POLICY = ROOT / "config" / "rating-policy.json"
OUTPUT_ROOT = ROOT / "output"
CONTENT_SCHEMA = REPOSITORY_ROOT / "database" / "schema" / "content-v1.sql"

HODOKU_VERSION = "2.4.3"
HODOKU_BUILD = "116"
RATING_VERSION = "1"
HODOKU_LEVELS = ["Easy", "Medium", "Hard", "Unfair", "Extreme"]
EXPECTED_JAR_SHA256 = "b0d3e2f6e82100a51c1a4c44b590cb03a9aad36aed6663cca490e83051a7c66d"

PUZZLE_LINE_RE = re.compile(r"^([.0-9]{81}) #(Easy|Medium|Hard|Unfair|Extreme)\s*$")
SOLUTION_LINE_RE = re.compile(
    r"^([1-9]{81}) #(\d+) (Easy|Medium|Hard|Unfair|Extreme) \((\d+)\)\s*$"
)
STEP_LINE_RE = re.compile(
    r"^\s+(?:\(\d+\) \(\d+/\d+\):\s+)?([^:]+):"
)
TECHNIQUE_LINE_RE = re.compile(r"^\s*(\S+):(.+?)\s*$")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def java_command() -> list[str]:
    return [
        "java",
        "-Duser.language=en",
        "-Duser.country=US",
        "-Xmx512m",
        "-jar",
        str(JAR.relative_to(ROOT)),
    ]


def relative(path: Path) -> str:
    return os.path.relpath(path, ROOT)


def check_environment() -> None:
    required_files = [JAR, HODOKU_CONFIG, RATING_POLICY, CONTENT_SCHEMA]
    if any(not path.is_file() for path in required_files):
        raise RuntimeError("HoDoKu2 inputs or the content schema are missing")
    if sha256_file(JAR) != EXPECTED_JAR_SHA256:
        raise RuntimeError("HoDoKu2 JAR checksum does not match the pinned version")

    result = subprocess.run(
        ["java", "-version"], capture_output=True, text=True, timeout=15, check=False
    )
    version_text = result.stderr + result.stdout
    match = re.search(r'version "(\d+)', version_text)
    if result.returncode != 0 or not match or int(match.group(1)) < 21:
        raise RuntimeError("Java 21 or newer is required")


def load_policy() -> dict[str, Any]:
    with RATING_POLICY.open(encoding="utf-8") as handle:
        policy = json.load(handle)

    seen: set[str] = set()
    for level_text, codes in policy["levels"].items():
        level = int(level_text)
        if level not in range(1, 6):
            raise RuntimeError(f"Invalid policy level: {level}")
        overlap = seen.intersection(codes)
        if overlap:
            raise RuntimeError(f"Techniques occur in multiple levels: {sorted(overlap)}")
        seen.update(codes)
    technique_code_map = policy.get("techniqueCodeMap", {})
    if set(technique_code_map) != seen:
        missing = sorted(seen.difference(technique_code_map))
        extra = sorted(set(technique_code_map).difference(seen))
        raise RuntimeError(
            f"Technique code map must exactly cover the policy; missing={missing}, extra={extra}"
        )
    return policy


def load_technique_catalog(audit_dir: Path) -> tuple[dict[str, str], dict[str, str]]:
    command = java_command() + ["/lt"]
    result = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    output = result.stdout
    audit_output = result.stdout + "\n--- STDERR ---\n" + result.stderr
    (audit_dir / "hodoku-techniques.txt").write_text(audit_output, encoding="utf-8")
    if result.returncode != 0:
        raise RuntimeError("HoDoKu2 failed to list techniques")

    name_to_code: dict[str, str] = {}
    code_to_name: dict[str, str] = {}
    for line in output.splitlines():
        match = TECHNIQUE_LINE_RE.match(line)
        if not match:
            continue
        code, name = match.groups()
        name = name.strip()
        name_to_code[name] = code
        code_to_name[code] = name
    if len(name_to_code) < 50:
        raise RuntimeError("Could not parse the HoDoKu2 technique catalog")
    return name_to_code, code_to_name


def generate_candidates(
    native_level: int,
    count: int,
    audit_dir: Path,
    pass_number: int,
    technique_filter: str | None = None,
) -> list[dict[str, Any]]:
    command = java_command() + [
        "/c",
        relative(HODOKU_CONFIG),
        "/s",
        "/sl",
        str(native_level),
        "/o",
        "stdout",
    ]
    if technique_filter:
        position = command.index("/sl")
        del command[position:position + 2]
        command.extend(["/sc", technique_filter])
    process = subprocess.Popen(
        command,
        cwd=ROOT,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    assert process.stdout is not None
    assert process.stdin is not None

    line_queue: queue.Queue[str | None] = queue.Queue()

    def read_output() -> None:
        for value in process.stdout:
            line_queue.put(value)
        line_queue.put(None)

    reader = threading.Thread(target=read_output, daemon=True)
    reader.start()

    candidates: list[dict[str, Any]] = []
    raw_lines: list[str] = []
    stop_sent = False
    while True:
        try:
            line = line_queue.get(timeout=180)
        except queue.Empty as exc:
            if process.poll() is None:
                process.terminate()
            raise RuntimeError(
                f"Timed out generating HoDoKu {HODOKU_LEVELS[native_level]} candidates"
            ) from exc
        if line is None:
            break
        raw_lines.append(line)
        match = (re.match(r"^([.0-9]{81}) #(.*)$", line.strip())
                 if technique_filter else PUZZLE_LINE_RE.match(line.strip()))
        if match and len(candidates) < count:
            puzzle, label = match.groups()
            candidates.append(
                {
                    "puzzle_dotted": puzzle.replace("0", "."),
                    "generator_level": label,
                    "generator_level_number": native_level + 1,
                }
            )
            if len(candidates) == count and not stop_sent:
                process.stdin.write("q\n")
                process.stdin.flush()
                stop_sent = True

    try:
        return_code = process.wait(timeout=30)
    except subprocess.TimeoutExpired as exc:
        process.terminate()
        raise RuntimeError("HoDoKu2 did not stop after the requested count") from exc

    log_name = f"generation-{pass_number:03d}-{HODOKU_LEVELS[native_level].lower()}.txt"
    (audit_dir / log_name).write_text("".join(raw_lines), encoding="utf-8")
    if return_code != 0 or len(candidates) != count:
        raise RuntimeError(
            f"HoDoKu2 generated {len(candidates)} of {count} requested "
            f"{HODOKU_LEVELS[native_level]} candidates"
        )
    return candidates


def batch_analyze(
    candidates: list[dict[str, Any]],
    name_to_code: dict[str, str],
    audit_dir: Path,
    pass_number: int,
) -> list[dict[str, Any]]:
    input_path = audit_dir / f"batch-{pass_number:03d}-input.txt"
    output_path = audit_dir / f"batch-{pass_number:03d}-output.txt"
    input_path.write_text(
        "\n".join(candidate["puzzle_dotted"] for candidate in candidates) + "\n",
        encoding="ascii",
    )
    command = java_command() + [
        "/c",
        relative(HODOKU_CONFIG),
        "/bs",
        relative(input_path),
        "/vs",
        "/vp",
        "/o",
        "stdout",
    ]
    result = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=900,
        check=False,
    )
    output = result.stdout
    audit_output = result.stdout + "\n--- STDERR ---\n" + result.stderr
    output_path.write_text(audit_output, encoding="utf-8")
    if result.returncode != 0:
        raise RuntimeError(f"HoDoKu2 batch solve failed in pass {pass_number}")

    parsed: dict[int, dict[str, Any]] = {}
    current_index: int | None = None
    for line in output.splitlines():
        if line.strip() == "Done!":
            current_index = None
            continue
        solution_match = SOLUTION_LINE_RE.match(line.strip())
        if solution_match:
            solution, index_text, level, score_text = solution_match.groups()
            current_index = int(index_text)
            parsed[current_index] = {
                "solution": solution,
                "hodoku_level": level,
                "hodoku_score": int(score_text),
                "step_names": [],
            }
            continue
        step_match = STEP_LINE_RE.match(line)
        if step_match and current_index is not None:
            parsed[current_index]["step_names"].append(step_match.group(1).strip())

    analyses: list[dict[str, Any]] = []
    for index, candidate in enumerate(candidates, start=1):
        if index not in parsed:
            raise RuntimeError(f"Missing batch result for candidate {index} in pass {pass_number}")
        analysis = {**candidate, **parsed[index]}
        codes: list[str] = []
        for step_name in analysis.pop("step_names"):
            code = name_to_code.get(step_name)
            if code is None:
                raise RuntimeError(f"Unknown HoDoKu2 technique name: {step_name!r}")
            codes.append(code)
        if not codes:
            raise RuntimeError(f"No logical steps parsed for candidate {index}")
        analysis["step_codes"] = codes
        analyses.append(analysis)
    return analyses


def technique_levels(policy: dict[str, Any]) -> dict[str, int]:
    result: dict[str, int] = {}
    for level_text, codes in policy["levels"].items():
        for code in codes:
            result[code] = int(level_text)
    return result


def validate_grid(puzzle: str, solution: str) -> None:
    if len(puzzle) != 81 or not set(puzzle) <= set("0123456789"):
        raise RuntimeError("Invalid normalized puzzle format")
    if len(solution) != 81 or set(solution) != set("123456789"):
        raise RuntimeError("Invalid solution format")
    for index, value in enumerate(puzzle):
        if value != "0" and value != solution[index]:
            raise RuntimeError("Puzzle givens do not match the solution")

    expected = set("123456789")
    rows = [solution[offset : offset + 9] for offset in range(0, 81, 9)]
    columns = [solution[column::9] for column in range(9)]
    boxes = [
        "".join(
            solution[(box_row + row) * 9 + box_column + column]
            for row in range(3)
            for column in range(3)
        )
        for box_row in (0, 3, 6)
        for box_column in (0, 3, 6)
    ]
    if any(set(unit) != expected for unit in rows + columns + boxes):
        raise RuntimeError("Solution contains an invalid row, column, or box")


def rate_candidate(
    analysis: dict[str, Any],
    policy: dict[str, Any],
    level_by_code: dict[str, int],
    code_to_name: dict[str, str],
    technique_code_map: dict[str, str],
) -> dict[str, Any] | None:
    step_codes: list[str] = analysis["step_codes"]
    forbidden = set(policy["forbiddenTechniques"])
    if forbidden.intersection(step_codes):
        return None

    if set(step_codes).difference(level_by_code):
        return None

    levels = [level_by_code[code] for code in step_codes]
    display_level = max(levels)
    hardest_oracle_code = next(
        code
        for code, level in zip(step_codes, levels, strict=True)
        if level == display_level
    )
    puzzle = analysis["puzzle_dotted"].replace(".", "0")
    solution = analysis["solution"]
    validate_grid(puzzle, solution)

    oracle_usage = Counter(step_codes)
    usage = Counter(technique_code_map[code] for code in step_codes)
    return {
        "puzzle": puzzle,
        "solution": solution,
        "difficulty_level": display_level,
        "difficulty_score": analysis["hodoku_score"],
        "hardest_technique": technique_code_map[hardest_oracle_code],
        "hardest_technique_name": code_to_name[hardest_oracle_code],
        "hardest_oracle_technique": hardest_oracle_code,
        "hodoku_level": analysis["hodoku_level"],
        "generator_level": analysis["generator_level"],
        "total_steps": len(step_codes),
        "technique_usage": dict(sorted(usage.items())),
        "oracle_technique_usage": dict(sorted(oracle_usage.items())),
    }


def compile_generation_gate(audit_dir: Path) -> Path:
    core = REPOSITORY_ROOT / "native/hsp-hint-core"
    binary = audit_dir / "generation-gate"
    sources = [core / "src/engine.cpp", core / "src/techniques.cpp",
               core / "tests/generation_gate.cpp"]
    command = [os.environ.get("CXX", "c++"), "-O2", "-std=c++20", "-Wall",
               "-Wextra", "-Wpedantic", "-Werror", f"-I{core / 'include'}",
               *(str(path) for path in sources), "-o", str(binary)]
    subprocess.run(command, check=True, timeout=180)
    write_json(audit_dir / "generation-gate-build.json", {
        "command": command,
        "sourceSha256": {str(path.relative_to(REPOSITORY_ROOT)): sha256_file(path)
                         for path in sorted(core.rglob("*"))
                         if path.suffix in {".cpp", ".hpp"}},
    })
    return binary


def runtime_analyze(binary: Path, analyses: list[dict[str, Any]],
                    audit_dir: Path, pass_number: int) -> list[dict[str, Any]]:
    result = subprocess.run(
        [str(binary)], input="".join(
            f"{item['puzzle_dotted'].replace('.', '0')} {item['solution']}\n"
            for item in analyses), capture_output=True, text=True, check=True,
        timeout=1800,
    )
    (audit_dir / f"runtime-{pass_number:03d}.jsonl").write_text(result.stdout)
    reports = [json.loads(line) for line in result.stdout.splitlines()]
    if len(reports) != len(analyses):
        raise RuntimeError("Missing runtime acceptance result")
    for analysis, report in zip(analyses, reports, strict=True):
        if report["puzzle"] != analysis["puzzle_dotted"].replace(".", "0"):
            raise RuntimeError("Runtime result order mismatch")
    return reports


CHAIN_TECHNIQUES = {
    "xChain",
    "xyChain",
    "aic",
    "groupedAic",
    "complexColoring",
    "forcingChain",
    "forcingNet",
}


def score_rating_step(step: dict[str, Any]) -> int:
    required = {
        "technique": str,
        "level": int,
        "humanCost": int,
        "branchCount": int,
        "nodeCount": int,
        "maximumDepth": int,
    }
    if any(type(step.get(field)) is not kind for field, kind in required.items()):
        raise RuntimeError("Runtime rating step is missing required metrics")
    if (
        step["level"] not in range(1, 6)
        or step["humanCost"] <= 0
        or min(step["branchCount"], step["nodeCount"], step["maximumDepth"]) < 0
    ):
        raise RuntimeError("Runtime rating step contains invalid metrics")

    score = step["humanCost"]
    if step["technique"] in CHAIN_TECHNIQUES:
        excess_depth = max(0, step["maximumDepth"] - 8)
        score += 6 * step["nodeCount"]
        score += 12 * step["maximumDepth"]
        score += 25 * max(0, step["branchCount"] - 1)
        score += 2 * excess_depth**2
    return score


def calculate_difficulty_score(report: dict[str, Any]) -> tuple[int, dict[str, int]]:
    steps = report.get("ratingSteps")
    usage = report.get("usage")
    if not isinstance(steps, list) or not steps or not isinstance(usage, dict):
        raise RuntimeError("Runtime report does not contain a complete rating path")

    step_usage = Counter(step.get("technique") for step in steps)
    if step_usage != Counter(usage):
        raise RuntimeError("Runtime rating steps do not match technique usage")

    scored = [(step["level"], score_rating_step(step)) for step in steps]
    peak_level, peak_score = max(scored, key=lambda item: item[1])
    advanced_total = sum(score for level, score in scored if level > 1)
    basic_total = sum(score for level, score in scored if level == 1)
    other_advanced = advanced_total - (peak_score if peak_level > 1 else 0)
    other_basic = basic_total - (peak_score if peak_level == 1 else 0)
    advanced_workload = (other_advanced + 3) // 4
    basic_workload = (other_basic + 19) // 20
    total = peak_score + advanced_workload + basic_workload
    return total, {
        "hardestStep": peak_score,
        "additionalAdvancedWorkload": advanced_workload,
        "basicWorkload": basic_workload,
        "total": total,
    }


def accept_runtime(record: dict[str, Any], report: dict[str, Any]) -> bool:
    if not report["solved"] or report["minimumLevel"] not in range(1, 6):
        return False
    record["oracle_difficulty_level"] = record["difficulty_level"]
    record["oracle_hardest_technique"] = record["hardest_technique"]
    record["difficulty_level"] = report["minimumLevel"]
    record["hardest_technique"] = report["hardestTechnique"]
    record["hardest_technique_name"] = report["hardestTechnique"]
    record["runtime_acceptance"] = report
    if "usage" not in report:
        return False
    policy = load_policy()
    levels = {policy["techniqueCodeMap"][code]: int(level)
              for level, codes in policy["levels"].items() for code in codes}
    levels["complexColoring"] = 5
    if set(report["usage"]) - set(levels):
        return False
    try:
        score, components = calculate_difficulty_score(report)
    except RuntimeError:
        return False
    record["difficulty_score"] = score
    record["difficulty_score_components"] = components
    record["technique_usage"] = report["usage"]
    record["total_steps"] = sum(report["usage"].values())
    return True


def preferred_cases(record: dict[str, Any]) -> set[str]:
    return {witness["technique"]
            for witness in record["runtime_acceptance"]["witnesses"]
            if witness["lowerLevelsExhausted"]
            and witness["selection"] == "generation_frontier_priority"
            and not witness["enumerationBoundReached"]}


def solution_count(puzzle: str) -> int:
    """Count up to two solutions with MRV bitsets; never used for rating."""
    board = [int(value) for value in puzzle]
    rows, columns, boxes = [0] * 9, [0] * 9, [0] * 9
    cells = []
    for cell, digit in enumerate(board):
        row, column = divmod(cell, 9)
        box = row // 3 * 3 + column // 3
        if not digit:
            cells.append((cell, row, column, box))
            continue
        bit = 1 << (digit - 1)
        if (rows[row] | columns[column] | boxes[box]) & bit:
            return 0
        rows[row] |= bit
        columns[column] |= bit
        boxes[box] |= bit

    def search(start: int) -> int:
        if start == len(cells):
            return 1
        best, choices, size = start, 0, 10
        for index in range(start, len(cells)):
            _, row, column, box = cells[index]
            mask = 511 & ~(rows[row] | columns[column] | boxes[box])
            count = mask.bit_count()
            if count < size:
                best, choices, size = index, mask, count
                if count <= 1:
                    break
        if not choices:
            return 0
        cells[start], cells[best] = cells[best], cells[start]
        _, row, column, box = cells[start]
        count = 0
        while choices and count < 2:
            bit = choices & -choices
            choices ^= bit
            rows[row] |= bit
            columns[column] |= bit
            boxes[box] |= bit
            count += search(start + 1)
            rows[row] ^= bit
            columns[column] ^= bit
            boxes[box] ^= bit
        cells[start], cells[best] = cells[best], cells[start]
        return min(count, 2)

    return search(0)


def build_records(
    target_counts: dict[int, int],
    policy: dict[str, Any],
    audit_dir: Path,
    technique_quotas: dict[str, int] | None = None,
) -> tuple[list[dict[str, Any]], int, dict[str, str]]:
    technique_quotas = technique_quotas or {}
    binary = compile_generation_gate(audit_dir)
    name_to_code, code_to_name = load_technique_catalog(audit_dir)
    level_by_code = technique_levels(policy)
    technique_code_map: dict[str, str] = policy["techniqueCodeMap"]
    unknown_policy_codes = set(level_by_code).difference(code_to_name)
    if unknown_policy_codes:
        raise RuntimeError(f"Policy contains unknown HoDoKu2 codes: {sorted(unknown_policy_codes)}")

    buckets: dict[int, list[dict[str, Any]]] = {level: [] for level in range(1, 6)}
    seen_puzzles: set[str] = set()
    total_analyzed = 0
    pass_number = 0

    def process(native_level: int, count: int) -> None:
        nonlocal pass_number, total_analyzed
        pass_number += 1
        candidates = generate_candidates(native_level, count, audit_dir, pass_number)
        analyses = batch_analyze(candidates, name_to_code, audit_dir, pass_number)
        total_analyzed += len(analyses)
        reports = runtime_analyze(binary, analyses, audit_dir, pass_number)
        for analysis, report in zip(analyses, reports, strict=True):
            puzzle = analysis["puzzle_dotted"].replace(".", "0")
            if puzzle in seen_puzzles:
                continue
            seen_puzzles.add(puzzle)
            record = rate_candidate(
                analysis,
                policy,
                level_by_code,
                code_to_name,
                technique_code_map,
            )
            if record is None or not accept_runtime(record, report):
                continue
            level = record["difficulty_level"]
            # Reserve space in this level for the requested preferred technique.
            required = {code: quota for code, quota in technique_quotas.items()
                        if (level == 5 and code in policy["generationAcceptance"]["levelFiveTechniques"])
                        or any(technique_code_map[c] == code and level_by_code[c] == level
                               for c in level_by_code)}
            missing = {code for code, quota in required.items()
                       if sum(code in preferred_cases(r) for r in buckets[level]) < quota}
            if missing and not missing.intersection(preferred_cases(record)):
                continue
            if len(buckets[level]) < target_counts[level]:
                if solution_count(record["puzzle"]) != 1:
                    continue
                buckets[level].append(record)
        counts = ", ".join(f"L{level}={len(buckets[level])}" for level in range(1, 6))
        print(f"Pass {pass_number}: source={HODOKU_LEVELS[native_level]}, {counts}", flush=True)

    # Broad first pass. Native labels are candidate sources, not final HSP levels.
    for native_level in range(5):
        process(native_level, min(1000, max(30, target_counts[native_level + 1])))

    preferred_sources = {
        1: [0],
        2: [1],
        3: [1],
        4: [2, 3],
        5: [3, 4],
    }
    candidate_multipliers = {1: 2, 2: 2, 3: 12, 4: 2, 5: 3}
    source_offsets = {level: 0 for level in range(1, 6)}
    while any(
        len(buckets[level]) < target_counts[level] for level in range(1, 6)
    ):
        missing_level = max(
            (
                level
                for level in range(1, 6)
                if len(buckets[level]) < target_counts[level]
            ),
            key=lambda level: (
                (target_counts[level] - len(buckets[level]))
                / target_counts[level],
                target_counts[level] - len(buckets[level]),
            ),
        )
        sources = preferred_sources[missing_level]
        offset = source_offsets[missing_level]
        source_offsets[missing_level] += 1
        remaining = target_counts[missing_level] - len(buckets[missing_level])
        process(
            sources[offset % len(sources)],
            min(
                1000,
                max(100, remaining * candidate_multipliers[missing_level]),
            ),
        )
        if pass_number >= 120:
            missing = {
                level: target_counts[level] - len(bucket)
                for level, bucket in buckets.items()
                if len(bucket) < target_counts[level]
            }
            raise RuntimeError(f"Unable to fill requested difficulty distribution: {missing}")

    records = [
        record
        for level in range(1, 6)
        for record in sorted(
            buckets[level], key=lambda item: (item["difficulty_score"], item["puzzle"])
        )[: target_counts[level]]
    ]
    return records, total_analyzed, code_to_name


def finalize_records(
    records: list[dict[str, Any]],
    content_version: int,
    rating_version: str,
) -> None:
    ids: set[str] = set()
    checksums: set[str] = set()
    for record in records:
        puzzle_digest = hashlib.sha256(record["puzzle"].encode("ascii")).hexdigest()
        record["id"] = f"hsp-{puzzle_digest[:20]}"
        record["rating_version"] = rating_version
        record.setdefault("source", f"hodoku2-{HODOKU_VERSION}-build-{HODOKU_BUILD}")
        record["content_version"] = content_version
        record["enabled"] = 1
        checksum_value = "|".join(
            [
                record["puzzle"],
                record["solution"],
                str(record["difficulty_level"]),
                str(record["difficulty_score"]),
                record["hardest_technique"],
                rating_version,
            ]
        )
        record["checksum"] = hashlib.sha256(checksum_value.encode("utf-8")).hexdigest()
        if record["id"] in ids or record["checksum"] in checksums:
            raise RuntimeError("Duplicate ID or checksum in selected puzzle set")
        ids.add(record["id"])
        checksums.add(record["checksum"])


def write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def write_artifacts(
    release_dir: Path,
    records: list[dict[str, Any]],
    content_version: int,
    rating_version: str,
    total_analyzed: int,
    policy: dict[str, Any],
    code_to_name: dict[str, str],
    target_counts: dict[int, int],
    reevaluation: dict[str, Any] | None = None,
) -> None:
    core_fields = [
        "id",
        "puzzle",
        "solution",
        "difficulty_level",
        "difficulty_score",
        "hardest_technique",
        "rating_version",
        "source",
        "content_version",
        "checksum",
        "enabled",
    ]
    core_records = [{field: record[field] for field in core_fields} for record in records]
    write_json(release_dir / "puzzles.json", core_records)
    write_json(release_dir / "rating-report.json", records)

    with (release_dir / "puzzles.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=core_fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(core_records)

    database_path = release_dir / "content.sqlite"
    connection = sqlite3.connect(database_path)
    try:
        connection.executescript(CONTENT_SCHEMA.read_text(encoding="utf-8"))
        connection.executemany(
            """
            INSERT INTO puzzles (
              id, puzzle, solution, difficulty_level, difficulty_score,
              hardest_technique, rating_version, source, content_version,
              checksum, enabled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [tuple(record[field] for field in core_fields) for record in core_records],
        )
        usage_rows = [
            (record["id"], rating_version, code, count)
            for record in records
            for code, count in record["technique_usage"].items()
        ]
        connection.executemany(
            """
            INSERT INTO puzzle_technique_usage
              (puzzle_id, rating_version, technique_code, use_count)
            VALUES (?, ?, ?, ?)
            """,
            usage_rows,
        )
        metadata = {
            "schema_version": "1",
            "content_version": str(content_version),
            "rating_version": rating_version,
            "generator": "HoDoKu2",
            "generator_version": HODOKU_VERSION,
            "generator_build": HODOKU_BUILD,
            "puzzle_count": str(len(records)),
        }
        connection.executemany(
            "INSERT INTO content_metadata (key, value) VALUES (?, ?)", metadata.items()
        )
        connection.commit()

        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        foreign_keys = connection.execute("PRAGMA foreign_key_check").fetchall()
        count = connection.execute("SELECT COUNT(*) FROM puzzles").fetchone()[0]
        distribution = dict(
            connection.execute(
                "SELECT difficulty_level, COUNT(*) FROM puzzles GROUP BY difficulty_level"
            ).fetchall()
        )
        if integrity != "ok" or foreign_keys or count != len(records):
            raise RuntimeError("Generated SQLite database failed integrity validation")
        if distribution != target_counts:
            raise RuntimeError(f"Unexpected SQLite difficulty distribution: {distribution}")
    finally:
        connection.close()

    preferred_counts = Counter(code for record in records for code in preferred_cases(record))
    acceptance_policy = policy["generationAcceptance"]
    minimum_cases = acceptance_policy["levelFiveMinimumPreferredPuzzles"]
    level_five_coverage = {
        code: {"preferredPuzzleCount": preferred_counts[code],
               "required": minimum_cases,
               "shortfall": max(0, minimum_cases - preferred_counts[code])}
        for code in acceptance_policy["levelFiveTechniques"]
    }
    validation = {
        "status": "passed",
        "puzzleCount": len(records),
        "uniquePuzzleCount": len({record["puzzle"] for record in records}),
        "logicalOnly": True,
        "forbiddenTechniquesFound": [],
        "difficultyDistribution": {
            str(level): sum(record["difficulty_level"] == level for record in records)
            for level in range(1, 6)
        },
        "levelFiveTechniqueCoverage": level_five_coverage,
        "levelFiveCoverageComplete": all(item["shortfall"] == 0 for item in level_five_coverage.values()),
        "runtimeTierGate": "lowest-frontier-first; lower-tier closure stalls; target-tier path solves",
        "preferredTechniquePuzzleCounts": dict(sorted(Counter(
            code for record in records for code in preferred_cases(record)
        ).items())),
        "checks": [
            "exactly one solution (independent capped solution count)",
            "runtime solves using only L1 through assigned level",
            "lower-level detectors exhausted before every advanced selected step",
            "preferred case quotas count distinct puzzles, excluding bounded frontiers",
            "81-character puzzle and solution format",
            "givens match solution",
            "valid solution rows, columns, and boxes",
            "unique puzzle IDs and checksums",
            "HSP logical completion exists (HoDoKu2 candidate or clue variation)",
            "no brute force, give up, or incomplete steps",
            "all stored technique codes are supported HSP techniques",
            "SQLite integrity and foreign keys",
        ],
    }
    if reevaluation is not None:
        validation["reevaluation"] = reevaluation
    write_json(release_dir / "validation-report.json", validation)

    output_files = [
        release_dir / "content.sqlite",
        release_dir / "puzzles.csv",
        release_dir / "puzzles.json",
        release_dir / "rating-report.json",
        release_dir / "validation-report.json",
    ]
    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "contentVersion": content_version,
        "ratingVersion": rating_version,
        "generator": {
            "name": "HoDoKu2",
            "version": HODOKU_VERSION,
            "build": HODOKU_BUILD,
            "jarSha256": sha256_file(JAR),
            "configSha256": sha256_file(HODOKU_CONFIG),
            "randomSeed": None,
        },
        "ratingPolicy": {
            "version": policy["policyVersion"],
            "sha256": sha256_file(RATING_POLICY),
            "rule": "minimum runtime tier; fixed raw human-workload score sorts within tier",
        },
        "puzzleCount": len(records),
        "candidateCountAnalyzed": total_analyzed,
        "difficultyDistribution": {
            str(level): sum(record["difficulty_level"] == level for record in records)
            for level in range(1, 6)
        },
        "techniqueCatalog": code_to_name,
        "artifacts": {path.name: sha256_file(path) for path in output_files},
    }
    write_json(release_dir / "manifest.json", manifest)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--per-level",
        type=int,
        default=20,
        help="number of puzzles selected for each HSP level (default: 20)",
    )
    parser.add_argument(
        "--level-counts",
        help=(
            "comma-separated L1-L5 quotas; overrides --per-level "
            "(example: 500,1000,1500,3000,4000)"
        ),
    )
    parser.add_argument(
        "--content-version",
        type=int,
        default=1,
        help="positive content release version (default: 1)",
    )
    parser.add_argument("--output-dir", type=Path,
                        help="new disposable output directory; never overwrites an existing path")
    parser.add_argument("--technique-quota", action="append", default=[],
                        metavar="CODE=COUNT", help="distinct puzzles with an unmasked generation-preferred technique")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.per_level < 1 or args.content_version < 1:
        raise RuntimeError("per-level and content-version must be positive")
    if args.level_counts:
        try:
            values = [int(value) for value in args.level_counts.split(",")]
        except ValueError as exc:
            raise RuntimeError("level-counts must contain five integers") from exc
        if len(values) != 5 or any(value < 1 for value in values):
            raise RuntimeError("level-counts must contain five positive integers")
        target_counts = {level: values[level - 1] for level in range(1, 6)}
    else:
        target_counts = {level: args.per_level for level in range(1, 6)}

    check_environment()
    policy = load_policy()
    technique_quotas: dict[str, int] = {}
    for item in args.technique_quota:
        code, separator, number = item.partition("=")
        if not separator or not number.isdigit() or int(number) < 1:
            raise RuntimeError("technique-quota must be CODE=positive-count")
        matching_levels = {int(level) for level, codes in policy["levels"].items()
                           for oracle in codes if policy["techniqueCodeMap"][oracle] == code}
        if code in policy["generationAcceptance"]["levelFiveTechniques"]:
            matching_levels.add(5)
        if len(matching_levels) != 1 or 1 in matching_levels:
            raise RuntimeError(f"Unknown or unsupported advanced technique quota: {code}")
        level = next(iter(matching_levels))
        if int(number) > target_counts[level]:
            raise RuntimeError(f"Technique quota exceeds L{level} puzzle quota")
        technique_quotas[code] = int(number)
    if len(technique_quotas) > 1:
        raise RuntimeError("Use one target technique per focused build")
    rating_version = RATING_VERSION
    final_dir = (args.output_dir or OUTPUT_ROOT / f"content-v{args.content_version}").resolve()
    if final_dir.exists():
        raise RuntimeError(f"Refusing to overwrite existing release: {final_dir}")

    staging_dir = final_dir.parent / f".{final_dir.name}.building-{os.getpid()}"
    staging_dir.mkdir(parents=True, exist_ok=False)
    audit_dir = staging_dir / "audit"
    audit_dir.mkdir()
    print(f"Building in {staging_dir}", flush=True)
    print(
        "Target distribution: "
        + ", ".join(
            f"L{level}={target_counts[level]}" for level in range(1, 6)
        ),
        flush=True,
    )

    records, total_analyzed, code_to_name = build_records(
        target_counts, policy, audit_dir, technique_quotas
    )
    for code, quota in technique_quotas.items():
        if sum(code in preferred_cases(record) for record in records) < quota:
            raise RuntimeError(f"Unmet preferred technique quota: {code}={quota}")
    shutil.rmtree(audit_dir)
    finalize_records(records, args.content_version, rating_version)
    write_artifacts(
        staging_dir,
        records,
        args.content_version,
        rating_version,
        total_analyzed,
        policy,
        code_to_name,
        target_counts,
    )
    staging_dir.rename(final_dir)
    print(f"Created {len(records)} puzzles at {final_dir}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.SubprocessError, OSError, sqlite3.Error) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
