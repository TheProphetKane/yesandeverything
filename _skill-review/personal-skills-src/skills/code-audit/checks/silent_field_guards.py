#!/usr/bin/env python3
"""Find GDScript silent-field-guard patterns.

Detects `if not ("X" in node):\n    return` (and variants) which silently no-op
for any class missing the named field. Per memory htbh-silent-field-guard.
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import walk_files, emit, safe_read

# Match both shapes:
#   if not ("X" in node):
#   if "X" in node:    (when used as a positive guard for a bail)
GUARD_RE_BAIL = re.compile(r'^(\s*)if\s+not\s+\(\s*"([^"]+)"\s+in\s+(\w+)\s*\)\s*:\s*$')
GUARD_RE_POS = re.compile(r'^(\s*)if\s+"([^"]+)"\s+in\s+(\w+)\s*:\s*$')

BAIL_LINES = {"return", "return false", "return null", "return 0", "return true"}

def scan_file(p: Path) -> None:
    src = safe_read(p)
    if src is None:
        return
    lines = src.splitlines()
    for i, line in enumerate(lines):
        m = GUARD_RE_BAIL.match(line) or GUARD_RE_POS.match(line)
        if not m:
            continue
        indent, field, ident = m.group(1), m.group(2), m.group(3)
        body_indent = indent + "\t"  # GDScript uses tabs typically
        # Look at the next non-empty line
        for j in range(i + 1, min(i + 6, len(lines))):
            nxt = lines[j].rstrip()
            if not nxt.strip():
                continue
            if nxt.lstrip() in BAIL_LINES:
                emit(
                    "HIGH",
                    "silent-field-guard",
                    p,
                    i + 1,
                    f'`{nxt.lstrip()}` after `if {"not " if "not" in line else ""}"{field}" in {ident}` silently no-ops for any class missing the field.',
                    fix=f'Derive a fallback value for {field} or gate a push_warning so the bail is visible in repro.',
                )
            break

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    args = ap.parse_args()
    for f in walk_files(args.target, exts={".gd"}):
        scan_file(f)

if __name__ == "__main__":
    main()
