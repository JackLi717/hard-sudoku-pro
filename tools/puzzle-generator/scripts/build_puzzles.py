#!/usr/bin/env python3
"""Build a reviewed-ready Sudoku content database with HoDoKu2.

HoDoKu2 owns puzzle generation, solution finding, and logical step detection.
This script only orchestrates the CLI, maps step codes to HSP levels, validates
the exported records, and packages deterministic release artifacts.
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
    return str(path.relative_to(ROOT))


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
        match = PUZZLE_LINE_RE.match(line.strip())
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
) -> dict[str, Any] | None:
    step_codes: list[str] = analysis["step_codes"]
    forbidden = set(policy["forbiddenTechniques"])
    if forbidden.intersection(step_codes):
        return None

    default_level = int(policy["defaultLevel"])
    levels = [level_by_code.get(code, default_level) for code in step_codes]
    display_level = max(levels)
    hardest_code = next(
        code
        for code, level in zip(step_codes, levels, strict=True)
        if level == display_level
    )
    puzzle = analysis["puzzle_dotted"].replace(".", "0")
    solution = analysis["solution"]
    validate_grid(puzzle, solution)

    usage = Counter(step_codes)
    return {
        "puzzle": puzzle,
        "solution": solution,
        "difficulty_level": display_level,
        "difficulty_score": analysis["hodoku_score"],
        "hardest_technique": hardest_code,
        "hardest_technique_name": code_to_name[hardest_code],
        "hodoku_level": analysis["hodoku_level"],
        "generator_level": analysis["generator_level"],
        "total_steps": len(step_codes),
        "technique_usage": dict(sorted(usage.items())),
    }


def build_records(
    per_level: int,
    policy: dict[str, Any],
    audit_dir: Path,
) -> tuple[list[dict[str, Any]], int, dict[str, str]]:
    name_to_code, code_to_name = load_technique_catalog(audit_dir)
    level_by_code = technique_levels(policy)
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
        for analysis in analyses:
            puzzle = analysis["puzzle_dotted"].replace(".", "0")
            if puzzle in seen_puzzles:
                continue
            seen_puzzles.add(puzzle)
            record = rate_candidate(analysis, policy, level_by_code, code_to_name)
            if record is None:
                continue
            level = record["difficulty_level"]
            if len(buckets[level]) < per_level:
                buckets[level].append(record)
        counts = ", ".join(f"L{level}={len(buckets[level])}" for level in range(1, 6))
        print(f"Pass {pass_number}: source={HODOKU_LEVELS[native_level]}, {counts}", flush=True)

    # Broad first pass. Native labels are candidate sources, not final HSP levels.
    for native_level in range(5):
        process(native_level, max(30, per_level * 2))

    preferred_sources = {
        1: [0],
        2: [1],
        3: [1, 2],
        4: [2, 3],
        5: [3, 4],
    }
    source_offsets = {level: 0 for level in range(1, 6)}
    while any(len(bucket) < per_level for bucket in buckets.values()):
        missing_level = next(level for level in range(1, 6) if len(buckets[level]) < per_level)
        sources = preferred_sources[missing_level]
        offset = source_offsets[missing_level]
        source_offsets[missing_level] += 1
        process(sources[offset % len(sources)], max(30, per_level))
        if pass_number >= 40:
            missing = {level: per_level - len(bucket) for level, bucket in buckets.items() if len(bucket) < per_level}
            raise RuntimeError(f"Unable to fill requested difficulty distribution: {missing}")

    records = [
        record
        for level in range(1, 6)
        for record in sorted(
            buckets[level], key=lambda item: (item["difficulty_score"], item["puzzle"])
        )[:per_level]
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
        record["source"] = f"hodoku2-{HODOKU_VERSION}-build-{HODOKU_BUILD}"
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
        expected_per_level = len(records) // 5
        if distribution != {level: expected_per_level for level in range(1, 6)}:
            raise RuntimeError(f"Unexpected SQLite difficulty distribution: {distribution}")
    finally:
        connection.close()

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
        "checks": [
            "81-character puzzle and solution format",
            "givens match solution",
            "valid solution rows, columns, and boxes",
            "unique puzzle IDs and checksums",
            "HoDoKu2 logical path exists",
            "no brute force, give up, or incomplete steps",
            "SQLite integrity and foreign keys",
        ],
    }
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
            "rule": "highest HSP technique tier; HoDoKu score sorts within tier",
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
        "--content-version",
        type=int,
        default=1,
        help="positive content release version (default: 1)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.per_level < 1 or args.content_version < 1:
        raise RuntimeError("per-level and content-version must be positive")

    check_environment()
    policy = load_policy()
    rating_version = f"hodoku2-{HODOKU_VERSION}+{policy['policyVersion']}"
    final_dir = OUTPUT_ROOT / f"content-v{args.content_version}"
    if final_dir.exists():
        raise RuntimeError(f"Refusing to overwrite existing release: {final_dir}")

    staging_dir = OUTPUT_ROOT / f".content-v{args.content_version}.building-{os.getpid()}"
    staging_dir.mkdir(parents=True, exist_ok=False)
    audit_dir = staging_dir / "audit"
    audit_dir.mkdir()
    print(f"Building in {staging_dir}", flush=True)

    records, total_analyzed, code_to_name = build_records(
        args.per_level, policy, audit_dir
    )
    finalize_records(records, args.content_version, rating_version)
    write_artifacts(
        staging_dir,
        records,
        args.content_version,
        rating_version,
        total_analyzed,
        policy,
        code_to_name,
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
