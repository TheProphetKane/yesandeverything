#!/usr/bin/env python3
"""Detect empty if/elif/else/while/for blocks in .gd files.

A control-flow guard followed by NO indented body (skipping comments and
blanks) is a parse error. Common cut-mechanic sweep residue.
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import walk_files, emit, safe_read

# Match guards. Both `if X:` and `else:` shapes.
GUARD_RE = re.compile(r"^(\s*)(if|elif|while|for)\b.*:\s*$")
ELSE_RE = re.compile(r"^(\s*)else\s*:\s*$")
COMMENT_RE = re.compile(r"^\s*#")

def indent_width(s: str) -> int:
    """Treat tabs as width 4, spaces as width 1 each for comparison purposes.
    GDScript files are usually tab-indented but mixed is possible."""
    w = 0
    for ch in s:
        if ch == "\t":
            w += 4
        elif ch == " ":
            w += 1
        else:
            break
    return w

def scan_file(p: Path) -> None:
    src = safe_read(p)
    if src is None:
        return
    lines = src.splitlines()
    for i, line in enumerate(lines):
        m = GUARD_RE.match(line) or ELSE_RE.match(line)
        if not m:
            continue
        guard_indent = indent_width(m.group(1) or "")
        # Walk forward across blank/comment lines until we find a real line.
        found_body = False
        for j in range(i + 1, len(lines)):
            nxt = lines[j]
            if not nxt.strip():
                continue
            if COMMENT_RE.match(nxt):
                continue
            nxt_indent = indent_width(nxt)
            if nxt_indent > guard_indent:
                found_body = True
            break
        if not found_body:
            emit(
                "BLOCK",
                "empty-if-block",
                p,
                i + 1,
                f"`{line.strip()}` has no indented body. Parse error; will cascade into 'Could not resolve super class inheritance'.",
                fix="Remove the empty guard, or add `pass` as the body if the guard must stay.",
            )

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    args = ap.parse_args()
    for f in walk_files(args.target, exts={".gd"}):
        scan_file(f)

if __name__ == "__main__":
    main()
