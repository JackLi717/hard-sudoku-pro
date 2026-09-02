#!/usr/bin/env python3
"""Query puzzles by techniques in the canonical rating path."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DATABASE = ROOT / "tools/puzzle-generator/output/content-v4/content.sqlite"


def technique_list(value: str) -> list[str]:
    techniques = list(dict.fromkeys(item.strip() for item in value.split(",")))
    if not techniques or any(not item for item in techniques):
        raise argparse.ArgumentTypeError("techniques must be a comma-separated list")
    return techniques


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    match = parser.add_mutually_exclusive_group(required=True)
    match.add_argument("--all", dest="all_techniques", type=technique_list)
    match.add_argument("--any", dest="any_techniques", type=technique_list)
    parser.add_argument("--difficulty", type=int, choices=range(1, 6))
    parser.add_argument("--minimum-use-count", type=int, default=1)
    parser.add_argument("--limit", type=int, default=50)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.minimum_use_count < 1 or args.limit < 1:
        raise RuntimeError("minimum-use-count and limit must be positive")
    techniques = args.all_techniques or args.any_techniques
    required_matches = len(techniques) if args.all_techniques else 1
    placeholders = ", ".join("?" for _ in techniques)
    filters = [
        "p.enabled = 1",
        "u.rating_version = p.rating_version",
        f"u.technique_code IN ({placeholders})",
        "u.use_count >= ?",
    ]
    params: list[str | int] = [*techniques, args.minimum_use_count]
    if args.difficulty is not None:
        filters.append("p.difficulty_level = ?")
        params.append(args.difficulty)
    params.extend([required_matches, args.limit])
    sql = f"""
        SELECT p.id, p.difficulty_level, p.difficulty_score,
               p.hardest_technique,
               GROUP_CONCAT(u.technique_code, '+') AS matched_techniques
        FROM puzzle_technique_usage u
        INNER JOIN puzzles p ON p.id = u.puzzle_id
        WHERE {" AND ".join(filters)}
        GROUP BY p.id
        HAVING COUNT(DISTINCT u.technique_code) >= ?
        ORDER BY p.difficulty_level, p.difficulty_score, p.id
        LIMIT ?
    """
    with sqlite3.connect(f"file:{args.database}?mode=ro", uri=True) as connection:
        rows = connection.execute(sql, params).fetchall()
    print("puzzle_id,difficulty_level,difficulty_score,hardest_technique,matched")
    for row in rows:
        print(",".join(str(value) for value in row))


if __name__ == "__main__":
    main()
