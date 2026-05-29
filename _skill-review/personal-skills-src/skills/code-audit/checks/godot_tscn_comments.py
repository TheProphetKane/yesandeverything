#!/usr/bin/env python3
"""Detect `#` comments inside .tscn files.

The TSCN parser reads `#` as the start of a hex color. Comment lines produce
parse errors. Hit BR v0.31.2.
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import walk_files, emit, safe_read

COMMENT_RE = re.compile(r"^\s*#")

def scan_file(p: Path) -> None:
    src = safe_read(p)
    if src is None:
        return
    for i, line in enumerate(src.splitlines()):
        if COMMENT_RE.match(line):
            emit(
                "BLOCK",
                "tscn-comment",
                p,
                i + 1,
                "`#` is read as a hex-color start by the .tscn parser. This line will trigger 'Invalid color code: #' and cascade.",
                fix="Embed the note in a node name, or strip the comment.",
            )

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    args = ap.parse_args()
    for f in walk_files(args.target, exts={".tscn"}):
        scan_file(f)

if __name__ == "__main__":
    main()
