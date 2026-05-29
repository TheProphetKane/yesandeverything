#!/usr/bin/env python3
"""Find sensitive-file patterns being git-tracked (or about to be).

Walks the repo, identifies files matching known secret/PII patterns, cross-
checks against .gitignore. If a sensitive file is tracked AND not ignored,
that's a leak.
"""
from __future__ import annotations
import argparse, fnmatch, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import emit

# (glob, severity, category, message)
# These patterns should NEVER be tracked.
SENSITIVE = [
    (".finances/**", "BLOCK", "secret-exposure", "bank statement file (D-001/D-002: bank data stays local)"),
    (".credentials/**", "BLOCK", "secret-exposure", "credentials directory"),
    ("**/.env", "HIGH", "secret-exposure", "environment file (typically has secrets)"),
    ("**/.env.local", "HIGH", "secret-exposure", "local-env file"),
    ("**/.discord_webhook.txt", "HIGH", "secret-exposure", "Discord webhook URL"),
    ("**/.cloudflare-token", "BLOCK", "secret-exposure", "Cloudflare API token"),
    ("**/.github-pat", "BLOCK", "secret-exposure", "GitHub PAT"),
    ("**/.admin-token", "HIGH", "secret-exposure", "admin token"),
    ("**/private_key*", "BLOCK", "secret-exposure", "private key file"),
    ("**/*.pem", "BLOCK", "secret-exposure", "PEM certificate / key"),
    ("**/yesandbudget.db", "BLOCK", "secret-exposure", "YaB SQLite (D-001: bank data stays local)"),
    ("**/yesandbudget.db-*", "BLOCK", "secret-exposure", "YaB SQLite journal/wal"),
    ("**/credentials.json", "BLOCK", "secret-exposure", "credentials JSON (typical OAuth)"),
    ("**/service-account*.json", "BLOCK", "secret-exposure", "GCP service-account key"),
]

def get_tracked_files(root: Path) -> list[str]:
    """List all files git knows about in this repo."""
    try:
        result = subprocess.run(
            ["git", "-C", str(root), "ls-files"],
            capture_output=True, text=True, check=True, timeout=30,
        )
        return result.stdout.strip().split("\n") if result.stdout else []
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return []

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    args = ap.parse_args()
    root = Path(args.target)
    tracked = get_tracked_files(root)
    if not tracked:
        return

    for f in tracked:
        for glob, sev, cat, msg in SENSITIVE:
            if fnmatch.fnmatch(f, glob):
                emit(
                    sev,
                    cat,
                    f,
                    None,
                    msg + f" (git-tracked: {f})",
                    fix=f"Add to .gitignore; git rm --cached {f}. History scrub: git filter-repo --path-glob '{glob}' --invert-paths --force; git push --force.",
                )
                break

if __name__ == "__main__":
    main()
