#!/usr/bin/env python3
"""Pull the remote into this repository without ever merging a generated file.

Why it exists: pull --rebase --autostash stashes every dirty file, replays the
remote commits, then pops the stash. The sync-dashboard-data workflow commits
dashboard/data/usage.json to the remote every four hours, and the usage and status
routines leave their own copies dirty here, so the pop collides on exactly those
files and leaves the index unmerged (2026-09-30 06:40, usage.json).

Those files are generated and regenerated on a schedule, so merging them is wasted
work and a hazard. This script sets them aside first:

  1. refuses to start if the index is already unmerged or a rebase is running
  2. copies each locally changed generated file (dashboard/data/*, status/data/*)
     to .git/pull-safe-backup/<timestamp>/, so nothing is ever lost
  3. restores those paths from HEAD (index and working tree), only those paths
  4. runs git pull --rebase --autostash, which now only ever carries
     hand-written files, never a generated one
  5. runs scripts/check-index-state.py and fails if the result is not clean

Anything outside the two generated folders is left to the autostash untouched.
The next routine tick regenerates the generated files; the backup holds the copies
this run set aside.

Usage: python scripts/pull-safe.py [--repo <folder>] [--remote origin] [--branch main]
"""
import argparse
import os
import shutil
import subprocess
import sys
import time

GENERATED = ("dashboard/data/", "status/data/")


def git(repo, *args, check=False):
    p = subprocess.run(
        ["git", "-C", repo] + list(args),
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if check and p.returncode != 0:
        sys.stderr.write(p.stdout + p.stderr)
        sys.exit(p.returncode)
    return p


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    ap.add_argument("--remote", default="origin")
    ap.add_argument("--branch", default="main")
    a = ap.parse_args(argv)
    repo = a.repo
    checker = os.path.join(os.path.dirname(os.path.abspath(__file__)), "check-index-state.py")

    pre = subprocess.run([sys.executable, checker, "--repo", repo], capture_output=True, text=True)
    if pre.returncode != 0:
        sys.stdout.write(pre.stdout)
        print("pull-safe: refusing to pull over a stuck state; repair it first.")
        return 1

    # Every path that differs from HEAD, staged or not, inside the generated folders.
    changed = set()
    for args in (("diff", "--name-only"), ("diff", "--cached", "--name-only")):
        for line in git(repo, *args, "-z").stdout.split("\0"):
            if line.startswith(GENERATED):
                changed.add(line)
    changed = sorted(changed)

    if changed:
        stamp = time.strftime("%Y%m%d-%H%M%S")
        gitdir = git(repo, "rev-parse", "--absolute-git-dir", check=True).stdout.strip()
        backup = os.path.join(gitdir, "pull-safe-backup", stamp)
        for rel in changed:
            src = os.path.join(repo, rel)
            if os.path.isfile(src):
                dst = os.path.join(backup, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)
        print("pull-safe: set aside %d generated file(s), copies in %s" % (len(changed), backup))
        for rel in changed:
            print("  " + rel)
        git(repo, "restore", "--source=HEAD", "--staged", "--worktree", "--", *changed, check=True)

    p = git(repo, "pull", "--rebase", "--autostash", a.remote, a.branch)
    sys.stdout.write(p.stdout + p.stderr)
    post = subprocess.run([sys.executable, checker, "--repo", repo], capture_output=True, text=True)
    sys.stdout.write(post.stdout)
    if p.returncode != 0 or post.returncode != 0:
        print("pull-safe: FAILED; the backup above still holds the set-aside copies.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
