#!/usr/bin/env python3
"""Detect orphan @export annotations in .gd files.

An @export annotation (NOT @export_group/_subgroup/_category which are section
markers) must be either:
  (a) inline with a var on the same line:  @export var X: int = 0
  (b) on its own line, followed by a var on the next non-comment line

Otherwise it rebinds or stacks parse-fail.
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import walk_files, emit, safe_read

# @export, @export_range, @export_enum, @export_file, etc. are VAR annotations.
# @export_group, @export_subgroup, @export_category are SECTION markers (no var).
SECTION_MARKERS = {"@export_group", "@export_subgroup", "@export_category"}

# Match the @export(...) prefix; we then check what the variant is.
EXPORT_RE = re.compile(r"^\s*(@export(?:_\w+)?)\s*(?:\([^)]*\))?\s*(.*)$")
COMMENT_OR_BLANK = re.compile(r"^\s*(#|$)")

def scan_file(p: Path) -> None:
    src = safe_read(p)
    if src is None:
        return
    lines = src.splitlines()
    for i, line in enumerate(lines):
        m = EXPORT_RE.match(line)
        if not m:
            continue
        variant = m.group(1)
        if variant in SECTION_MARKERS:
            continue  # section markers don't need a following var
        rest = m.group(2).strip()
        if rest.startswith("var "):
            continue  # inline form
        if rest:
            continue  # something else on the line; not orphan in the simple sense
        # Standalone @export var-annotation. Next non-comment, non-blank must be var.
        found_var = False
        stacked_next = False
        for j in range(i + 1, len(lines)):
            nxt = lines[j]
            if COMMENT_OR_BLANK.match(nxt):
                continue
            stripped = nxt.lstrip()
            if stripped.startswith("var "):
                found_var = True
            elif stripped.startswith("@export"):
                # Check if the next @export is a section marker (legal) or
                # another var annotation (illegal stack).
                next_m = EXPORT_RE.match(nxt)
                if next_m and next_m.group(1) not in SECTION_MARKERS:
                    stacked_next = True
            break
        if stacked_next:
            emit(
                "BLOCK",
                "orphan-export",
                p,
                i + 1,
                "@export followed by another @export with no var between. Stacked annotation will parse-fail.",
                fix="Add the var declaration between, or remove one @export.",
            )
        elif not found_var:
            emit(
                "BLOCK",
                "orphan-export",
                p,
                i + 1,
                "standalone @export not followed by a var declaration.",
                fix="Delete the orphan @export, or add the var declaration it was meant to annotate.",
            )

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    args = ap.parse_args()
    for f in walk_files(args.target, exts={".gd"}):
        scan_file(f)

if __name__ == "__main__":
    main()
