#!/usr/bin/env python3
"""Verify that the versioned SQLite schemas are executable and enforce invariants."""

from __future__ import annotations

import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_ROOT = ROOT / "database" / "schema"


def load_schema(name: str) -> str:
    return (SCHEMA_ROOT / name).read_text(encoding="utf-8")


def verify_integrity(connection: sqlite3.Connection) -> None:
    if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise RuntimeError("SQLite integrity_check failed")
    if connection.execute("PRAGMA foreign_key_check").fetchall():
        raise RuntimeError("SQLite foreign_key_check failed")


def verify_content_schema() -> None:
    with sqlite3.connect(":memory:") as connection:
        connection.executescript(load_schema("content-v1.sql"))
        connection.execute(
            """
            INSERT INTO puzzles (
              id, puzzle, solution, difficulty_level, difficulty_score,
              hardest_technique, rating_version, source, content_version,
              checksum, enabled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "test-puzzle",
                "0" * 81,
                "123456789" * 9,
                1,
                10,
                "nakedSingle",
                "hsp-test",
                "schema-check",
                1,
                "test-checksum",
                1,
            ),
        )
        verify_integrity(connection)


def verify_user_schema() -> None:
    with sqlite3.connect(":memory:") as connection:
        connection.executescript(load_schema("user-v1.sql"))
        connection.executescript(load_schema("user-v2.sql"))
        if connection.execute("PRAGMA user_version").fetchone()[0] != 2:
            raise RuntimeError("User schema did not migrate to version 2")
        wallet = dict(
            connection.execute(
                "SELECT resource, balance FROM credit_wallet"
            ).fetchall()
        )
        if wallet != {"smart_hint": 5, "quick_pencil": 3}:
            raise RuntimeError(f"Unexpected initial wallet: {wallet}")

        session = (
            "session-1",
            "puzzle-1",
            1,
            1,
            1,
            "active",
            0,
            1,
            "{}",
            1,
            1,
        )
        connection.execute(
            """
            INSERT INTO game_sessions (
              id, puzzle_id, content_version, difficulty_level, attempt_number,
              status, revision, state_schema_version, state_json,
              started_at_ms, updated_at_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            session,
        )
        try:
            connection.execute(
                """
                INSERT INTO game_sessions (
                  id, puzzle_id, content_version, difficulty_level,
                  attempt_number, status, revision, state_schema_version,
                  state_json, started_at_ms, updated_at_ms
                ) VALUES ('session-2', 'puzzle-2', 1, 1, 1, 'paused', 0, 1,
                          '{}', 1, 1)
                """
            )
        except sqlite3.IntegrityError:
            pass
        else:
            raise RuntimeError("The schema allowed multiple unfinished games")

        verify_integrity(connection)


def main() -> None:
    verify_content_schema()
    verify_user_schema()
    print("SQLite schema verification passed")


if __name__ == "__main__":
    main()
