#!/usr/bin/env python3
"""Check autoload constants against their declared local mirrors.

Skips any mirror with `# EXCEPTION` on the same line or the line above. Also
skips files explicitly listed in the autoload header comment as having
intentionally-different values (e.g. "FRAMES_PER_ROW=14, different size").
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import walk_files, emit, safe_read

CONST_RE = re.compile(r"^const\s+([A-Z_][A-Z0-9_]*)\s*(?::\s*\w+)?\s*=\s*([0-9.\-]+)", re.M)
# Parse the autoload's header to find documented exceptions, e.g.:
#   - source/enemies/acid_projectile.gd (FRAMES_PER_ROW=14, different size)
EXCEPTION_LINE_RE = re.compile(
    r"^\s*#?\s*[-*]?\s*([a-z0-9_/]+\.gd)\s*\(([A-Z_]+)=([0-9.]+),\s*(?:different|exception|exempt)",
    re.IGNORECASE | re.MULTILINE,
)
EXCEPTION_MARKER = re.compile(r"#\s*EXCEPTION\b", re.IGNORECASE)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    args = ap.parse_args()
    root = Path(args.target)

    autoloads_dir = root / "source" / "autoloads"
    if not autoloads_dir.exists():
        return

    autoload_consts: dict[str, tuple[Path, float]] = {}
    exceptions: set[tuple[str, str]] = set()  # (file-substring, const-name)

    for ap_file in autoloads_dir.rglob("*.gd"):
        src = safe_read(ap_file)
        if src is None:
            continue
        # Header-comment exceptions
        for em in EXCEPTION_LINE_RE.finditer(src):
            exceptions.add((em.group(1), em.group(2)))
        # Consts
        for m in CONST_RE.finditer(src):
            name, raw_val = m.group(1), m.group(2)
            try:
                v = float(raw_val)
            except ValueError:
                continue
            autoload_consts[name] = (ap_file, v)

    if not autoload_consts:
        return

    for f in walk_files(root / "source", exts={".gd"}):
        if str(f.resolve()).startswith(str(autoloads_dir.resolve())):
            continue
        src = safe_read(f)
        if src is None:
            continue
        rel = str(f.relative_to(root)).replace("\\", "/")
        for m in CONST_RE.finditer(src):
            name, raw_val = m.group(1), m.group(2)
            if name not in autoload_consts:
                continue
            # Skip if file is documented as exception for this const
            skip = any(name == ex_name and ex_path in rel for ex_path, ex_name in exceptions)
            if skip:
                continue
            try:
                local_v = float(raw_val)
            except ValueError:
                continue
            # Skip if the line or preceding line has # EXCEPTION
            line_no = src[:m.start()].count("\n") + 1
            lines = src.splitlines()
            ctx = "\n".join(lines[max(0, line_no - 2):line_no])
            if EXCEPTION_MARKER.search(ctx):
                continue
            auto_file, auto_v = autoload_consts[name]
            if abs(local_v - auto_v) > 1e-6:
                emit(
                    "HIGH",
                    "const-mirror-drift",
                    f,
                    line_no,
                    f"local const {name}={local_v} disagrees with autoload {auto_file.name} value {auto_v}.",
                    fix=f"Align mirror, OR mark line with `# EXCEPTION` if the divergence is intentional, OR add an entry like `- source/path/file.gd ({name}={local_v}, different size)` to the autoload header.",
                )

if __name__ == "__main__":
    main()
