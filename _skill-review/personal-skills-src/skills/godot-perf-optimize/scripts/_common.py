"""Shared helpers for the godot-perf-optimize check scripts.

Mirrors the code-audit/_common.py shape so any future cross-skill helper can
be lifted into a shared location later.
"""
from __future__ import annotations
import json, os, sys
from typing import Iterable, Iterator
from pathlib import Path

SEVERITIES = ("BLOCK", "HIGH", "MEDIUM", "LOW")

SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", ".venv", "venv",
    "__pycache__", ".pytest_cache", ".vscode", ".idea",
    "_ARCHIVE", ".finances", "data", "backups",
    "addons",  # Godot addons - third-party, not Nick's to optimize
}

SKIP_FILES_EXACT = {
    "course_data.json", "disc_database.json", "plastic_db.json",
    "app.js", "yesandbudget.db",
}

SKIP_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".pdf",
    ".woff", ".woff2", ".ttf", ".otf",
    ".mp3", ".mp4", ".wav", ".ogg",
    ".zip", ".tar", ".gz", ".7z",
    ".db", ".sqlite", ".sqlite3", ".sqlite-shm", ".sqlite-wal",
    ".fbx", ".obj", ".blend",
    ".lock", ".pyc",
}

def walk_files(root: str, exts: Iterable[str] | None = None) -> Iterator[Path]:
    root_p = Path(root)
    if not root_p.exists():
        return
    for dirpath, dirnames, filenames in os.walk(root_p):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if fn in SKIP_FILES_EXACT:
                continue
            ext = os.path.splitext(fn)[1].lower()
            if ext in SKIP_EXT:
                continue
            if exts is not None and ext not in exts:
                continue
            yield Path(dirpath) / fn

def emit(severity: str, pattern: str, file: str, line: int | None,
         message: str, fix: str | None = None, speedup: str | None = None) -> None:
    assert severity in SEVERITIES, severity
    obj = {
        "severity": severity,
        "pattern": pattern,
        "file": str(file),
        "line": line,
        "message": message,
    }
    if fix:
        obj["fix"] = fix
    if speedup:
        obj["expected_speedup"] = speedup
    print(json.dumps(obj))

def safe_read(p: Path, max_bytes: int = 2_000_000) -> str | None:
    try:
        sz = p.stat().st_size
        if sz > max_bytes:
            return None
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except (OSError, UnicodeDecodeError):
        return None
