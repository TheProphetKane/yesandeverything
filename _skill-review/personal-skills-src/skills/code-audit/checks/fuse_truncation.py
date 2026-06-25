#!/usr/bin/env python3
"""Tail-check critical files for FUSE mid-write truncation.

The FUSE Windows mount truncates mid-write with non-trivial frequency. This
check looks at the last bytes of each project's critical-file list and asserts
the file ends syntactically clean.

FUSE stale-read hardening
-------------------------
The X:\\ mount can also serve a *stale* or *short* read right after a write, so
a single-shot tail read can report a missing end-marker on a file that is
actually whole. That is the same false-positive class that produced phantom
CRITICALs in the project-canonical-audit skill (fixed 2026-06-25 with a git-
backed + re-read gate). Before emitting a BLOCK we now:

  (a) re-read the tail up to REREAD_ATTEMPTS times with a ~0.5s gap and only
      stay "bad" if the marker is missing on EVERY read (mirrors the
      retry-then-reconfirm loop in X:\\YesAndChains\\tools\\audit_dashboard.py
      _write_verified); and
  (b) where a git repo is available, cross-check against HEAD: a working tree
      that is unchanged or additions-only vs HEAD cannot have lost tail bytes,
      so a missing marker there is a stale read, not truncation. We only block
      such a file if HEAD itself genuinely lacks the marker (a real committed
      problem). Deletions / untracked / git-unavailable fall back to the stable
      re-read verdict.

BLOCK survives only for a marker/tail loss that is stable across re-reads and
not explained away by git.
"""
from __future__ import annotations
import argparse, json, re, subprocess, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import emit, safe_read_bytes

# Re-read gate: how many times to re-read a "bad" tail, and the gap between
# reads. Matches the FUSE stale-read window the dashboard writers loop over.
REREAD_ATTEMPTS = 3
REREAD_GAP = 0.5

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


def _tail_of(data: bytes | None) -> bytes | None:
    return None if data is None else data.rstrip(b" \t\r\n")


def _stable_bad(p: Path, is_bad) -> tuple[bool, bytes | None]:
    """Re-read p up to REREAD_ATTEMPTS times with a REREAD_GAP pause. Return
    (still_bad, last_bad_tail). `still_bad` is True only when at least one read
    looked bad and NO read came back good — a single good read means the earlier
    miss was a FUSE stale/short read, so we do not block.

    is_bad(tail: bytes) -> bool reports whether a tail is truncated/mid-statement.
    """
    saw_bad = False
    last_bad_tail = None
    for i in range(REREAD_ATTEMPTS):
        if i:
            time.sleep(REREAD_GAP)
        tail = _tail_of(safe_read_bytes(p))
        if tail is None:
            continue  # unreadable this round; keep trying, don't conclude bad
        if is_bad(tail):
            saw_bad = True
            last_bad_tail = tail
        else:
            return False, tail  # came back clean -> stale read, not truncation
    return saw_bad, last_bad_tail


def _git_status(root: Path, rel: str) -> str:
    """Classify the working-tree file vs HEAD. One of:
    'unchanged', 'additions-only', 'deletions', 'untracked', 'unavailable'.

    A truncation loses tail bytes, which always shows up as deletions in the
    diff; 'unchanged'/'additions-only' therefore rule truncation out.
    """
    try:
        r = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "--is-inside-work-tree"],
            capture_output=True, text=True, timeout=10,
        )
        if r.returncode != 0 or r.stdout.strip() != "true":
            return "unavailable"
        r = subprocess.run(
            ["git", "-C", str(root), "ls-files", "--error-unmatch", "--", rel],
            capture_output=True, text=True, timeout=10,
        )
        if r.returncode != 0:
            return "untracked"
        r = subprocess.run(
            ["git", "-C", str(root), "diff", "--numstat", "--", rel],
            capture_output=True, text=True, timeout=15,
        )
        if r.returncode != 0:
            return "unavailable"
    except Exception:
        return "unavailable"
    out = r.stdout.strip()
    if not out:
        return "unchanged"
    parts = out.splitlines()[0].split("\t")
    if len(parts) < 2 or parts[0] == "-" or parts[1] == "-":
        return "unavailable"  # binary / unparseable numstat
    try:
        deleted = int(parts[1])
    except ValueError:
        return "unavailable"
    return "deletions" if deleted > 0 else "additions-only"


def _git_head_tail(root: Path, rel: str) -> bytes | None:
    """Return the rstripped tail of HEAD:<rel> as bytes, or None if unavailable."""
    try:
        r = subprocess.run(
            ["git", "-C", str(root), "show", f"HEAD:{rel}"],
            capture_output=True, timeout=15,
        )
    except Exception:
        return None
    if r.returncode != 0:
        return None
    return _tail_of(r.stdout)


def _decide_block(root: Path, rel: str, p: Path, is_bad) -> tuple[bool, bytes | None]:
    """Return (block, last_tail). Block only when a tail loss is stable across
    re-reads AND not explained as a stale read by git."""
    stable, tail = _stable_bad(p, is_bad)
    if not stable:
        return False, tail
    status = _git_status(root, rel)
    if status in ("unchanged", "additions-only"):
        # No tail bytes lost vs HEAD, so a FUSE truncation is impossible here.
        # Only block if HEAD itself genuinely has a bad tail (a real committed
        # problem); otherwise the working-tree miss was a stale read.
        head_tail = _git_head_tail(root, rel)
        if head_tail is None:
            return False, tail
        return is_bad(head_tail), tail
    # deletions / untracked / unavailable -> trust the stable re-read verdict.
    return True, tail


def check_critical(project: str, root: Path) -> None:
    for rel, markers in CRITICAL.get(project, []):
        p = root / rel
        if not p.exists():
            continue
        is_bad = lambda tail, _m=markers: not any(tail.endswith(m) for m in _m)
        block, tail = _decide_block(root, rel, p, is_bad)
        if block and tail is not None:
            emit(
                "BLOCK",
                "fuse-truncation",
                p,
                None,
                f"file does not end with any expected marker {markers!r} "
                f"(stable across {REREAD_ATTEMPTS} re-reads, not a stale read); "
                f"last 60 bytes: {tail[-60:]!r}",
                fix="Recover via Python atomic-write-with-readback. See outputs/v0_74_30_apply.py for the pattern.",
            )


def _gd_tail_bad(tail: bytes) -> bool:
    last_line = tail.rsplit(b"\n", 1)[-1]
    return bool(GD_BAD_TAILS_RE.search(last_line))


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
            tail = _tail_of(data)
            if not tail:
                continue
            # Quick first pass: only pay the re-read + git cost on a bad tail.
            if not _gd_tail_bad(tail):
                continue
            rel = p.relative_to(root).as_posix()
            block, last_tail = _decide_block(root, rel, p, _gd_tail_bad)
            if block and last_tail is not None:
                last_line = last_tail.rsplit(b"\n", 1)[-1]
                emit(
                    "BLOCK",
                    "fuse-truncation",
                    p,
                    None,
                    f"file ends mid-statement (stable across {REREAD_ATTEMPTS} "
                    f"re-reads, not a stale read); last line: {last_line[-80:]!r}",
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
