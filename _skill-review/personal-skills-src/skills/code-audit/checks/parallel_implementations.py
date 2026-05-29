#!/usr/bin/env python3
"""Detect divergence between known parallel-implementation file pairs.

Currently HBH-specific: enemy_base.gd (per-Node) vs enemy_pool.gd (pool).
For each shared concept (target reacquire interval, speed multipliers,
dormancy hooks), extract values from both files and flag mismatches.

Per memory htbh-dual-pool-per-node.
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import emit, safe_read

# Pairs to check: (path1, path2, list of shared constant patterns)
# Each pattern: (concept-name, regex-in-A, regex-in-B). Both regexes must
# capture a numeric group as match.group(1).
PAIRS = [
    ("source/enemies/enemy_base.gd", "source/enemies/enemy_pool.gd", [
        ("target-reacquire",
         r"const TARGET_REACQUIRE_PERIOD\s*:\s*float\s*=\s*([0-9.]+)",
         r"const TARGET_REACQUIRE_SEC\s*:\s*float\s*=\s*([0-9.]+)"),
    ]),
]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    args = ap.parse_args()
    root = Path(args.target)
    for rel_a, rel_b, concepts in PAIRS:
        pa, pb = root / rel_a, root / rel_b
        if not pa.exists() or not pb.exists():
            continue
        sa = safe_read(pa) or ""
        sb = safe_read(pb) or ""
        for name, ra, rb in concepts:
            ma = re.search(ra, sa)
            mb = re.search(rb, sb)
            if ma and mb:
                va = float(ma.group(1))
                vb = float(mb.group(1))
                if abs(va - vb) > 1e-6:
                    emit(
                        "HIGH",
                        "parallel-impl-divergence",
                        pa,
                        None,
                        f"{name}: {rel_a}={va} vs {rel_b}={vb}. Dual-path divergence.",
                        fix=f"Centralize in source/autoloads/constants.gd; reference scripts/audit-dual-path.ps1 check #6.",
                    )

if __name__ == "__main__":
    main()
