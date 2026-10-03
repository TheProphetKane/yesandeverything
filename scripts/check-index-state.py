#!/usr/bin/env python3
"""Fail loudly when the repository is stuck mid-merge or holds conflict markers.

Why it exists: on 2026-09-30 a pull with --rebase --autostash left
dashboard/data/usage.json unmerged. The index could not build a tree, every plain
commit failed for a full day, and nothing raised it, because the only guard that
looks for this (check-status-json.ps1) runs inside release.ps1 and nobody released.

Checks, over the whole index plus the two generated data folders:
  1. any unmerged index entry (git ls-files -u)
  2. a merge, rebase or cherry-pick that was started and never finished
  3. a conflict marker line inside dashboard/data or status/data

check-dashboard-live.ps1 calls this, and the daily routine health watch calls that,
so a stuck merge fails the same day. Exit 0 clean, exit 1 listing what is wrong.

Usage: python scripts/check-index-state.py [--repo <folder>]
"""
import argparse
import os
import re
import subprocess
import sys

DATA_DIRS = ("dashboard/data", "status/data")
MARKER = re.compile(r"^(<{7}( |$)|={7}$|>{7}( |$))")


def git(repo, *args):
    p = subprocess.run(
        ["git", "-C", repo] + list(args),
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return p.returncode, p.stdout


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--repo",
        default=os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
    )
    repo = ap.parse_args(argv).repo
    problems = []

    code, out = git(repo, "ls-files", "-u")
    if code != 0:
        problems.append("git ls-files -u failed; the index cannot be read")
    else:
        paths = sorted({line.split("\t", 1)[1] for line in out.splitlines() if "\t" in line})
        for p in paths:
            problems.append("unmerged index entry: %s" % p)

    code, gitdir = git(repo, "rev-parse", "--git-dir")
    gitdir = gitdir.strip()
    if code == 0:
        if not os.path.isabs(gitdir):
            gitdir = os.path.join(repo, gitdir)
        for name, what in (
            ("MERGE_HEAD", "a merge was started and never finished"),
            ("rebase-merge", "a rebase is in progress"),
            ("rebase-apply", "a rebase or patch apply is in progress"),
            ("CHERRY_PICK_HEAD", "a cherry-pick was started and never finished"),
        ):
            if os.path.exists(os.path.join(gitdir, name)):
                problems.append("%s: %s" % (name, what))

    for d in DATA_DIRS:
        root = os.path.join(repo, d)
        if not os.path.isdir(root):
            continue
        for dirpath, _, files in os.walk(root):
            for f in files:
                if not f.endswith((".json", ".md", ".html", ".txt")):
                    continue
                full = os.path.join(dirpath, f)
                try:
                    with open(full, encoding="utf-8", errors="replace") as fh:
                        for n, line in enumerate(fh, 1):
                            if MARKER.match(line):
                                rel = os.path.relpath(full, repo).replace(os.sep, "/")
                                problems.append("conflict marker at %s:%d" % (rel, n))
                                break
                except OSError as e:
                    problems.append("cannot read %s: %s" % (full, e))

    if problems:
        print("STUCK MERGE STATE in %s:" % repo)
        for p in problems:
            print("  " + p)
        print("Repair: git status, resolve or git restore the listed paths; "
              "generated data is regenerated, never hand-merged.")
        return 1
    print("Index clean: no unmerged entries, no unfinished merge, no conflict markers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
