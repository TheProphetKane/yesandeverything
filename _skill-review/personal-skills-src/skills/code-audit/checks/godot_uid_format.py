#!/usr/bin/env python3
"""Validate .uid file contents look like a real Godot UID.

Godot's actual UIDs are variable-length, base-32-ish (lowercase letters +
digits, with a Crockford-style alphabet that varies by version). The
historical "13-char base32" claim from BR CLAUDE.md was project-specific
or just wrong for general Godot. This check enforces:

  - Starts with `uid://`
  - Remainder is non-empty
  - Remainder is lowercase letters + digits only (no uppercase, no punctuation)
  - Remainder is between 8 and 32 chars (generous bounds)

Empty .uid files are OK (Godot regenerates).
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import walk_files, emit, safe_read

UID_VALID = re.compile(r"^uid://[a-z0-9]{8,32}\s*$")

def scan_file(p: Path) -> None:
    src = safe_read(p)
    if src is None:
        return
    line = src.strip()
    if not line:
        return  # empty -> Godot regenerates, fine
    if not UID_VALID.match(line):
        emit(
            "BLOCK",
            "uid-format",
            p,
            1,
            f"UID does not look like a real Godot UID. Got: {line!r} (expected `uid://[a-z0-9]{{8,32}}`)",
            fix="Empty the .uid sidecar. Godot regenerates a valid UID on first open.",
        )

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    args = ap.parse_args()
    for f in walk_files(args.target, exts={".uid"}):
        scan_file(f)

if __name__ == "__main__":
    main()
