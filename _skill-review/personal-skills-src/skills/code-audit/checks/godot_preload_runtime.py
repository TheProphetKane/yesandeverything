#!/usr/bin/env python3
"""Detect preload() inside RUNTIME conditional branches in .gd files.

preload() is parse-time. The guard does not defer the lookup. If the resource
exists, the call works (just resolves eagerly). If it doesn't, the whole
script fails to parse-load.

Only flag MEDIUM when the preload() string literal points at a path that
EXISTS on disk (then it's a working call worth a polish-note). Flag HIGH when
the path does NOT exist (real bug, will crash the script load).
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import walk_files, emit, safe_read

PRELOAD_RE = re.compile(r'preload\s*\(\s*["\']([^"\']+)["\']\s*\)')
COND_RE = re.compile(r"^(\s*)(if |elif |else:|match )")
FUNC_RE = re.compile(r"^(\s*)func\s")

def indent_width(s: str) -> int:
    w = 0
    for ch in s:
        if ch == "\t":
            w += 4
        elif ch == " ":
            w += 1
        else:
            break
    return w

def resolve_res_path(path_literal: str, project_root: Path) -> Path | None:
    """Translate `res://X` to an absolute filesystem path."""
    if path_literal.startswith("res://"):
        return project_root / path_literal[6:]
    return None

def scan_file(p: Path, project_root: Path) -> None:
    src = safe_read(p)
    if src is None:
        return
    lines = src.splitlines()
    for i, line in enumerate(lines):
        for m in PRELOAD_RE.finditer(line):
            res_path = m.group(1)
            cur_indent = indent_width(line)
            in_func = False
            in_cond = False
            for j in range(i - 1, max(-1, i - 200), -1):
                prev = lines[j]
                if not prev.strip():
                    continue
                pi = indent_width(prev)
                if FUNC_RE.match(prev) and pi < cur_indent:
                    in_func = True
                    break
                cm = COND_RE.match(prev)
                if cm and pi < cur_indent:
                    in_cond = True
            if not (in_func and in_cond):
                continue
            # Decide severity based on whether the resource exists.
            severity = "MEDIUM"
            msg = "preload() inside a runtime conditional resolves at parse time. The guard is misleading; resource loads eagerly regardless."
            fp = resolve_res_path(res_path, project_root)
            if fp is not None and not fp.exists():
                severity = "HIGH"
                msg = f"preload() at parse time references a missing resource ({res_path}). The script will fail to load."
            emit(
                severity,
                "godot-preload-conditional",
                p,
                i + 1,
                msg,
                fix="Use load() instead for runtime-conditional resource loading. If preload is correct (the resource really exists at parse time), move it to module-level const.",
            )

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    args = ap.parse_args()
    root = Path(args.target)
    for f in walk_files(root, exts={".gd"}):
        scan_file(f, root)

if __name__ == "__main__":
    main()
