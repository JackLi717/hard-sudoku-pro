#!/usr/bin/env python3
"""Build deterministic technique-coverage reports from a content database."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sqlite3
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DATABASE = ROOT / "tools/puzzle-generator/output/content-v4/content.sqlite"
DEFAULT_REPORT_ROOT = ROOT / "tools/puzzle-generator/reports"
TECHNIQUE_SOURCE = ROOT / "src/domain/hints/techniques.ts"
DEFAULT_HINT_FIXTURES = ROOT / "src/debug/generated/hint-lab-fixtures.json"
CATALOG_PATTERN = re.compile(r"\['([^']+)', ([1-5]), 'confirmed'\]")


def load_catalog() -> list[tuple[str, int]]:
    catalog = [
        (match.group(1), int(match.group(2)))
        for match in CATALOG_PATTERN.finditer(
            TECHNIQUE_SOURCE.read_text(encoding="utf-8")
        )
    ]
    if len(catalog) != 39 or len({code for code, _ in catalog}) != len(catalog):
        raise RuntimeError("Expected 39 unique techniques in the TypeScript catalog")
    return catalog


def database_metadata(connection: sqlite3.Connection) -> dict[str, str]:
    return dict(connection.execute("SELECT key, value FROM content_metadata"))


def database_puzzle_ids(connection: sqlite3.Connection) -> set[str]:
    return {row[0] for row in connection.execute("SELECT id FROM puzzles")}


def rating_path_counts(
    connection: sqlite3.Connection,
) -> tuple[Counter[str], Counter[str]]:
    puzzle_counts: Counter[str] = Counter()
    step_counts: Counter[str] = Counter()
    for code, puzzle_count, step_count in connection.execute(
        """
        SELECT technique_code, COUNT(*), SUM(use_count)
        FROM puzzle_technique_usage
        GROUP BY technique_code
        """
    ):
        puzzle_counts[code] = puzzle_count
        step_counts[code] = step_count
    return puzzle_counts, step_counts


def runtime_path_counts(
    path: Path,
    puzzle_ids: set[str],
    technique_codes: set[str],
) -> tuple[Counter[str], Counter[str]]:
    puzzle_counts: Counter[str] = Counter()
    step_counts: Counter[str] = Counter()
    seen_pairs: set[tuple[str, str]] = set()
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != ["puzzle_id", "technique_code", "use_count"]:
            raise RuntimeError("Runtime coverage CSV has an unexpected header")
        for row in reader:
            puzzle_id = row["puzzle_id"]
            code = row["technique_code"]
            if puzzle_id not in puzzle_ids or code not in technique_codes:
                raise RuntimeError(f"Invalid runtime coverage row: {row}")
            pair = (puzzle_id, code)
            if pair in seen_pairs:
                raise RuntimeError(f"Duplicate runtime coverage row: {pair}")
            seen_pairs.add(pair)
            use_count = int(row["use_count"])
            if use_count < 1:
                raise RuntimeError(f"Invalid runtime use count: {row}")
            puzzle_counts[code] += 1
            step_counts[code] += use_count
    return puzzle_counts, step_counts


def load_hint_fixtures(
    path: Path,
    technique_codes: set[str],
) -> tuple[dict[str, dict[str, Any]], int]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    fixtures: dict[str, dict[str, Any]] = {}
    for fixture in payload.get("fixtures", []):
        code = fixture.get("techniqueCode")
        puzzle_id = fixture.get("sourcePuzzleId")
        iteration = fixture.get("sourceIteration")
        if (
            code not in technique_codes
            or not isinstance(puzzle_id, str)
            or not isinstance(iteration, int)
            or code in fixtures
        ):
            raise RuntimeError(f"Invalid Hint Lab fixture source: {fixture}")
        fixtures[code] = {
            "sourcePuzzleId": puzzle_id,
            "sourceIteration": iteration,
        }
    if set(fixtures) != technique_codes:
        raise RuntimeError("Hint Lab fixtures do not cover the 39-technique catalog")
    content_version = payload.get("fixtureContentVersion")
    if not isinstance(content_version, int):
        raise RuntimeError("Hint Lab fixtures are missing their content version")
    return fixtures, content_version


def coverage_value(puzzle_count: int, step_count: int, floor: int) -> dict[str, Any]:
    return {
        "puzzleCount": puzzle_count,
        "stepCount": step_count,
        "deficitToFloor": max(0, floor - puzzle_count),
        "status": (
            "missing"
            if puzzle_count == 0
            else "below_floor" if puzzle_count < floor else "meets_floor"
        ),
    }


def summarize(entries: list[dict[str, Any]], key: str) -> dict[str, int]:
    values = [entry[key] for entry in entries]
    return {
        "observedTechniqueCount": sum(value["puzzleCount"] > 0 for value in values),
        "missingTechniqueCount": sum(value["puzzleCount"] == 0 for value in values),
        "belowFloorTechniqueCount": sum(
            value["puzzleCount"] < entry["minimumPuzzleFloor"]
            for value, entry in zip(values, entries, strict=True)
        ),
        "techniquePuzzleDeficit": sum(value["deficitToFloor"] for value in values),
    }


def build_report(
    database: Path,
    runtime_usage: Path | None,
    hint_fixtures: Path,
    minimum_puzzles: int,
) -> dict[str, Any]:
    catalog = load_catalog()
    technique_codes = {code for code, _ in catalog}
    with sqlite3.connect(f"file:{database}?mode=ro", uri=True) as connection:
        metadata = database_metadata(connection)
        puzzle_ids = database_puzzle_ids(connection)
        rating_puzzles, rating_steps = rating_path_counts(connection)
    fixtures, fixture_content_version = load_hint_fixtures(
        hint_fixtures,
        technique_codes,
    )
    unknown_rating_codes = set(rating_puzzles).difference(technique_codes)
    if unknown_rating_codes:
        raise RuntimeError(f"Unknown rating-path techniques: {unknown_rating_codes}")

    runtime_counts: tuple[Counter[str], Counter[str]] | None = None
    if runtime_usage is not None:
        runtime_counts = runtime_path_counts(
            runtime_usage,
            puzzle_ids,
            technique_codes,
        )

    techniques: list[dict[str, Any]] = []
    for code, level in catalog:
        entry: dict[str, Any] = {
            "code": code,
            "level": level,
            "minimumPuzzleFloor": minimum_puzzles,
            "detectorFixture": fixtures[code],
            "ratingPath": coverage_value(
                rating_puzzles[code],
                rating_steps[code],
                minimum_puzzles,
            ),
        }
        if runtime_counts is not None:
            runtime_puzzles, runtime_steps = runtime_counts
            entry["runtimeCanonicalPath"] = coverage_value(
                runtime_puzzles[code],
                runtime_steps[code],
                minimum_puzzles,
            )
        techniques.append(entry)

    report: dict[str, Any] = {
        "contentVersion": int(metadata["content_version"]),
        "ratingVersion": metadata["rating_version"],
        "puzzleCount": len(puzzle_ids),
        "minimumPuzzleFloor": minimum_puzzles,
        "techniqueCount": len(catalog),
        "detectorFixtureCount": len(fixtures),
        "detectorFixtureContentVersion": fixture_content_version,
        "semantics": {
            "ratingPath": "HoDoKu2 canonical rating path stored in puzzle_technique_usage",
            "runtimeCanonicalPath": (
                "HSP hint engine nextStep path; not a guarantee of player encounter"
                if runtime_counts is not None
                else "not supplied"
            ),
        },
        "ratingPathSummary": summarize(techniques, "ratingPath"),
        "techniques": techniques,
    }
    if runtime_counts is not None:
        report["runtimeCanonicalPathSummary"] = summarize(
            techniques,
            "runtimeCanonicalPath",
        )
        report["selectorReviewCandidates"] = [
            entry["code"]
            for entry in techniques
            if entry["ratingPath"]["puzzleCount"] >= minimum_puzzles
            and entry["runtimeCanonicalPath"]["puzzleCount"] < minimum_puzzles
        ]
        report["multiOpportunityAuditCandidates"] = [
            entry["code"]
            for entry in techniques
            if entry["ratingPath"]["puzzleCount"] < minimum_puzzles
            and entry["runtimeCanonicalPath"]["puzzleCount"] < minimum_puzzles
        ]
    return report


def markdown_report(report: dict[str, Any]) -> str:
    has_runtime = "runtimeCanonicalPathSummary" in report
    lines = [
        "# 10,000 题技巧覆盖评估",
        "",
        f"- 内容基线：`content-v{report['contentVersion']}`",
        f"- 评级规则：`{report['ratingVersion']}`",
        f"- 题目数量：{report['puzzleCount']}",
        f"- 当前评估下限：每项技巧 {report['minimumPuzzleFloor']} 道独立题目",
        "",
        "## 结论",
        "",
    ]
    rating = report["ratingPathSummary"]
    lines.append(
        "HoDoKu2 标准评级路径覆盖 "
        f"{rating['observedTechniqueCount']}/{report['techniqueCount']} 项技巧，"
        f"其中 {rating['belowFloorTechniqueCount']} 项低于当前下限。"
    )
    if has_runtime:
        runtime = report["runtimeCanonicalPathSummary"]
        lines.append(
            "HSP 运行时标准 `nextStep()` 路径覆盖 "
            f"{runtime['observedTechniqueCount']}/{report['techniqueCount']} 项技巧，"
            f"其中 {runtime['belowFloorTechniqueCount']} 项低于当前下限。"
        )
        lines.append(
            f"独立 Hint Lab `content-v{report['detectorFixtureContentVersion']}` "
            f"夹具已经为 {report['detectorFixtureCount']}/"
            f"{report['techniqueCount']} 项检测器提供可复现正例；"
            "它证明检测器能力，但不能替代当前 10,000 题的多机会覆盖审计。"
        )
        lines.append(
            "优先检查机会选择算法的技巧："
            + "、".join(f"`{code}`" for code in report["selectorReviewCandidates"])
            + "。"
        )
        lines.append(
            "需要多机会扫描后才能判断是否补题的技巧："
            + "、".join(
                f"`{code}`" for code in report["multiOpportunityAuditCandidates"]
            )
            + "。"
        )
    lines.extend(
        [
            "",
            "本报告只用于确定算法样本和定向补题候选。标准路径出现不等于玩家一定遇到；"
            "补题前仍需验证运行时可达状态和代表性，不按随机扩容替代技巧覆盖。",
            "",
            "## 分项覆盖",
            "",
            "| 技巧 | Level | 评级路径题数 | 评级路径步骤 | 运行时路径题数 | 运行时路径步骤 |",
            "| --- | ---: | ---: | ---: | ---: | ---: |",
        ]
    )
    for entry in report["techniques"]:
        runtime = entry.get("runtimeCanonicalPath")
        lines.append(
            f"| `{entry['code']}` | {entry['level']} | "
            f"{entry['ratingPath']['puzzleCount']} | {entry['ratingPath']['stepCount']} | "
            f"{runtime['puzzleCount'] if runtime else '—'} | "
            f"{runtime['stepCount'] if runtime else '—'} |"
        )
    lines.extend(
        [
            "",
            "## 使用规则",
            "",
            "- 评级路径关联用于难度审计和初步反向检索。",
            "- 运行时路径关联用于技巧成长算法和补题优先级判断。",
            "- 低于下限的技巧先区分选择算法遮蔽与内容缺口；只有确认的内容缺口进入定向生成。",
            "- 一道题可以补足多个技巧缺口，但每项技巧对同一道题最多计数一次。",
            "- 算法评价仍以具体中间盘面、动作正反例和人工复核为准。",
            "",
        ]
    )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    parser.add_argument("--runtime-usage", type=Path)
    parser.add_argument("--hint-fixtures", type=Path, default=DEFAULT_HINT_FIXTURES)
    parser.add_argument("--minimum-puzzles", type=int, default=50)
    parser.add_argument(
        "--json-output",
        type=Path,
        default=DEFAULT_REPORT_ROOT / "content-v4-technique-coverage.json",
    )
    parser.add_argument(
        "--markdown-output",
        type=Path,
        default=DEFAULT_REPORT_ROOT / "content-v4-technique-coverage.md",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.minimum_puzzles < 1:
        raise RuntimeError("minimum-puzzles must be positive")
    report = build_report(
        args.database,
        args.runtime_usage,
        args.hint_fixtures,
        args.minimum_puzzles,
    )
    args.json_output.parent.mkdir(parents=True, exist_ok=True)
    args.markdown_output.parent.mkdir(parents=True, exist_ok=True)
    args.json_output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    args.markdown_output.write_text(markdown_report(report), encoding="utf-8")
    print(
        "technique coverage: "
        f"rating={report['ratingPathSummary']['observedTechniqueCount']}/"
        f"{report['techniqueCount']}, "
        f"output={args.markdown_output}"
    )


if __name__ == "__main__":
    main()
