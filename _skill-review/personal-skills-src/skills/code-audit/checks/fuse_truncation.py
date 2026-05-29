#!/usr/bin/env python3
"""Tail-check critical files for FUSE mid-write truncation.

The FUSE Windows mount truncates mid-write with non-trivial frequency. This
check looks at the last bytes of each project's critical-file list and asserts
the file ends syntactically clean.
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import emit, safe_read_bytes

# Per-project critical file list with expected tail markers.
# Each marker is a bytes ending the file (after rstrip whitespace) must end with.
CRITICAL = {
    "HereBeHordes": [
        ("docs/GDD.html", [b"</html>"]),
    ],
    "BrackishRising": [
        ("docs/GDD.html", [b"</html>"]),
    ],
    "YesAndEverything": [
        ("index.html", [b"</html>"]),
        ("hordes/index.html", [b"</html>"]),
        ("brackish-rising/index.html", [b"</html>"]),
        ("budget/index.html", [b"</html>"]),
    ],
    "YesAndApothecary": [
        ("index.html", [b"</html>"]),
    ],
}

# For .gd files: bad if ends mid-expression. Detect by patterns ending in
# common mid-expression tokens (operator, opening paren, no terminator).
GD_BAD_TAILS_RE = re.compile(rb"[(,+\-*/=<>!&|]\s*$|"
                             rb"\b(if|for|while|elif|var|func|const|return)\b\s*$")

def check_critical(project: str, root: Path) -> None:
    for rel, markers in CRITICAL.get(project, []):
        p = root / rel
        if not p.exists():
            continue
        data = safe_read_bytes(p)
        if data is None:
            continue
        tail = data.rstrip(b" \t\r\n")
        ok = any(tail.endswith(m) for m in markers)
        if not ok:
            emit(
                "BLOCK",
                "fuse-truncation",
                p,
                None,
                f"file does not end with any expected marker {markers!r}; last 60 bytes: {tail[-60:]!r}",
                fix="Recover via Python atomic-write-with-readback. See outputs/v0_74_30_apply.py for the pattern.",
            )

def check_gd_files(root: Path) -> None:
    # Only flag files in the genuinely critical paths
    targets = [
        "source/autoloads",
        "source/main",
        "source/systems/wave_director.gd",
        "source/systems/economy.gd",
        "source/world/fog_of_war.gd",
        "source/buildings/building.gd",
        "source/units/unit.gd",
        "source/enemies/enemy_base.gd",
        "source/enemies/enemy_pool.gd",
    ]
    seen = set()
    for t in targets:
        base = root / t
        if not base.exists():
            continue
        if base.is_dir():
            files = list(base.rglob("*.gd"))
        else:
            files = [base]
        for p in files:
            if p in seen:
                continue
            seen.add(p)
            data = safe_read_bytes(p)
            if data is None:
                continue
            tail = data.rstrip(b" \t\r\n")
            if not tail:
                continue
            # Only flag if the LAST line looks mid-statement
            last_line = tail.rsplit(b"\n", 1)[-1]
            if GD_BAD_TAILS_RE.search(last_line):
                emit(
                    "BLOCK",
                    "fuse-truncation",
                    p,
                    None,
                    f"file ends mid-statement; last line: {last_line[-80:]!r}",
                    fix="Recover via Python atomic-write-with-readback.",
                )

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    ap.add_argument("--project", required=True)
    args = ap.parse_args()
    root = Path(args.target)
    check_critical(args.project, root)
    if args.project in ("HereBeHordes", "BrackishRising"):
        check_gd_files(root)

if __name__ == "__main__":
    main()
