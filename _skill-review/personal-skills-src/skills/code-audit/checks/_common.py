"""Shared helpers for the code-audit check scripts.

Each check emits findings as JSON lines on stdout. The dispatcher rolls them
up. Severity strings: BLOCK, HIGH, MEDIUM, LOW.
"""
from __future__ import annotations
import json, os, sys, re
from typing import Iterable, Iterator
from pathlib import Path

SEVERITIES = ("BLOCK", "HIGH", "MEDIUM", "LOW")

# Walk-skip patterns - never recurse into these
SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", ".venv", "venv",
    "__pycache__", ".pytest_cache", ".vscode", ".idea",
    "_ARCHIVE", ".finances", "data", "backups",
}

# Files to skip entirely (huge / binary / generated)
SKIP_FILES_EXACT = {
    "course_data.json", "disc_database.json", "plastic_db.json",
    "app.js",  # YaC build output
    "yesandbudget.db", "yesandbudget.db-journal",
}

SKIP_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".pdf",
    ".woff", ".woff2", ".ttf", ".otf",
    ".mp3", ".mp4", ".wav", ".ogg",
    ".zip", ".tar", ".gz", ".7z",
    ".db", ".sqlite", ".sqlite3", ".sqlite-shm", ".sqlite-wal",
    ".fbx", ".obj", ".blend",
    ".lock",  # package-lock.json, pnpm-lock.yaml etc; treat as opaque
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

def emit(severity: str, category: str, file: str, line: int | None, message: str, fix: str | None = None) -> None:
    assert severity in SEVERITIES, severity
    obj = {
        "severity": severity,
        "category": category,
        "file": str(file),
        "line": line,
        "message": message,
    }
    if fix:
        obj["fix"] = fix
    print(json.dumps(obj))

def safe_read(p: Path, max_bytes: int = 5_000_000) -> str | None:
    """Read a file, returning None if too big or unreadable."""
    try:
        sz = p.stat().st_size
        if sz > max_bytes:
            return None
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except (OSError, UnicodeDecodeError):
        return None

def safe_read_bytes(p: Path, max_bytes: int = 5_000_000) -> bytes | None:
    try:
        sz = p.stat().st_size
        if sz > max_bytes:
            return None
        with open(p, "rb") as f:
            return f.read()
    except OSError:
        return None
