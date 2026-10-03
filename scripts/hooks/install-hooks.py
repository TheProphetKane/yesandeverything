# -*- coding: utf-8 -*-
"""Install the tracked pre-commit hook into this repository, when it is missing or has drifted.

    python scripts/hooks/install-hooks.py           install if missing or different
    python scripts/hooks/install-hooks.py --check   exit 1 on missing or drift, write nothing

The tracked source is scripts/hooks/pre-commit beside this file. The installed copy is the
pre-commit file in the folder git reads hooks from, asked of git itself so a worktree or a
moved hooks path still lands in the right place. The two are compared with line endings
normalised, the same way X:\\PortfolioOps\\scripts\\check-precommit-hook-source.py compares
them, and the copy is written with LF endings through a temporary file and a rename, then
read back.
"""
import io
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "pre-commit")


def hooks_dir():
    out = subprocess.run(
        ["git", "-C", HERE, "rev-parse", "--path-format=absolute", "--git-path", "hooks"],
        capture_output=True, text=True, check=True)
    return out.stdout.strip()


def normalised(data):
    return data.replace(b"\r\n", b"\n")


def main(argv):
    check_only = "--check" in argv
    with io.open(SOURCE, "rb") as f:
        wanted = normalised(f.read())
    target = os.path.join(hooks_dir(), "pre-commit")
    state = "missing"
    if os.path.exists(target):
        with io.open(target, "rb") as f:
            state = "current" if normalised(f.read()) == wanted else "drifted"
    if state == "current":
        print("pre-commit hook is current: %s" % target)
        return 0
    if check_only:
        print("pre-commit hook is %s: %s (run python %s)" % (state, target, __file__))
        return 1
    os.makedirs(os.path.dirname(target), exist_ok=True)
    tmp = target + ".tmp"
    with io.open(tmp, "wb") as f:
        f.write(wanted)
    os.replace(tmp, target)
    os.chmod(target, 0o755)
    with io.open(target, "rb") as f:
        if f.read() != wanted:
            print("pre-commit hook readback does not match its source: %s" % target)
            return 1
    print("pre-commit hook was %s, installed from %s" % (state, SOURCE))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
