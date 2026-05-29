#!/usr/bin/env python3
"""Compare version-pill sources for a project; flag drift.

Each project has a different set of sources of truth. This check loads the
relevant set per project and flags any mismatch.
"""
from __future__ import annotations
import argparse, json, re, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import emit, safe_read

def get_pkg_version(p: Path) -> str | None:
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return data.get("version")
    except Exception:
        return None

def first_changelog_version(p: Path) -> str | None:
    src = safe_read(p)
    if src is None:
        return None
    m = re.search(r"##\s*\[?v?(\d+\.\d+\.\d+)\]?", src)
    return m.group(1) if m else None

def latest_git_tag(root: Path) -> str | None:
    try:
        r = subprocess.run(
            ["git", "-C", str(root), "describe", "--tags", "--abbrev=0"],
            capture_output=True, text=True, check=False, timeout=10,
        )
        if r.returncode == 0 and r.stdout.strip():
            t = r.stdout.strip().lstrip("v")
            if re.match(r"\d+\.\d+\.\d+$", t):
                return t
        return None
    except Exception:
        return None

def html_pill_version(p: Path, label: str = "meta-pill") -> str | None:
    src = safe_read(p)
    if src is None:
        return None
    m = re.search(r'class="' + label + r'"[^>]*>\s*v?(\d+\.\d+\.\d+)', src)
    if m:
        return m.group(1)
    m = re.search(r"v(\d+\.\d+\.\d+)", src)
    return m.group(1) if m else None

PROJECT_SOURCES = {
    "YesAndBudget": [
        ("package.json", lambda r: get_pkg_version(r / "package.json")),
        ("apps/web/package.json", lambda r: get_pkg_version(r / "apps/web/package.json")),
        ("apps/api/package.json", lambda r: get_pkg_version(r / "apps/api/package.json")),
        ("packages/shared/package.json", lambda r: get_pkg_version(r / "packages/shared/package.json")),
        ("CHANGELOG.md", lambda r: first_changelog_version(r / "CHANGELOG.md")),
        ("git tag", lambda r: latest_git_tag(r)),
    ],
    "Scheduler": [
        ("package.json", lambda r: get_pkg_version(r / "package.json")),
        ("CHANGELOG.md", lambda r: first_changelog_version(r / "CHANGELOG.md")),
        ("git tag", lambda r: latest_git_tag(r)),
    ],
    "YesAndApothecary": [
        ("CHANGELOG.md", lambda r: first_changelog_version(r / "CHANGELOG.md")),
        ("index.html version-pill", lambda r: html_pill_version(r / "index.html", "version-pill")),
        ("git tag", lambda r: latest_git_tag(r)),
    ],
    "YesAndChains": [
        ("CONTEXT.md", lambda r: first_changelog_version(r / "CONTEXT.md")),
        ("git tag", lambda r: latest_git_tag(r)),
    ],
    "HereBeHordes": [
        ("docs/GDD.html meta-pill", lambda r: html_pill_version(r / "docs/GDD.html", "meta-pill")),
        ("project.godot config/version", lambda r: project_godot_version(r / "project.godot")),
        ("git tag", lambda r: latest_git_tag(r)),
    ],
    "BrackishRising": [
        ("docs/GDD.html meta-pill", lambda r: html_pill_version(r / "docs/GDD.html", "meta-pill")),
        ("CHANGELOG.md", lambda r: first_changelog_version(r / "CHANGELOG.md")),
        ("git tag", lambda r: latest_git_tag(r)),
    ],
}

def project_godot_version(p: Path) -> str | None:
    src = safe_read(p)
    if src is None:
        return None
    m = re.search(r'config/version\s*=\s*"(\d+\.\d+\.\d+)"', src)
    return m.group(1) if m else None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    ap.add_argument("--project", required=True)
    args = ap.parse_args()
    root = Path(args.target)
    sources = PROJECT_SOURCES.get(args.project, [])
    found = []
    for name, fn in sources:
        try:
            v = fn(root)
        except Exception:
            v = None
        if v is not None:
            found.append((name, v))
    if not found:
        return
    versions = {v for _, v in found}
    if len(versions) > 1:
        detail = ", ".join(f"{name}={v}" for name, v in found)
        emit(
            "HIGH",
            "version-drift",
            root,
            None,
            f"version pill drift across sources: {detail}",
            fix="Pick one source of truth (typically package.json or git tag) and align the others. Use release.ps1 stamping logic.",
        )

if __name__ == "__main__":
    main()
