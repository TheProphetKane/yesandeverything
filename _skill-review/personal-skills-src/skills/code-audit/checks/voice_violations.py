#!/usr/bin/env python3
"""Scan public artifacts for solo-dev-voice violations.

Scope is narrow on purpose. The voice rule applies to commits + flat-file
artifacts shipped to GitHub (CHANGELOG.md, README.md, DEPLOY.md, PROJECT_SPEC.md
on apothecary-style projects). It does NOT apply to:

- Handler docs (CLAUDE.md, CLAUDE_SETTINGS.md, PERSONAL_CLAUDE_ARCHITECTURE.md) -
  these are Nick's notes to Claude, private even if checked in.
- Decision logs (DECISIONS.md, DECISIONS_NEEDED.md) - dev voice acceptable.
- Internal context docs (CONTEXT.md on YaC, 218KB of vocabulary + changelog).
- Large HTML design docs (docs/GDD.html for HBH/BR) - they have their own
  publish-side discipline. The CHANGELOG FOOTER inside the GDD is enforced by
  the htbh-changelog-entry skill, not by this scanner. Scanning the design
  content of the GDD produces ~200 noise findings on every run.
- ADRs (docs/adr/*) - dev voice acceptable.
- Bar-raise + audit reports (docs/BAR_RAISE-*.md, docs/CANONICAL_AUDIT-*.md) -
  internal artifacts, voice doesn't apply.

If you want to enforce voice on the GDD changelog footer specifically, use the
solo-dev-voice-audit skill which has the GDD-aware scope logic.
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import walk_files, emit, safe_read

PUBLIC_FILES = {
    "CHANGELOG.md",
    "README.md",
    "DEPLOY.md",
    "PROJECT_SPEC.md",  # YaApothecary, BR scope this as public
    "BACKLOG.md",
}

# Hard excludes by filename even when in PUBLIC_DIRS
EXCLUDE_FILES = {
    "CLAUDE.md", "CLAUDE_SETTINGS.md", "PERSONAL_CLAUDE_ARCHITECTURE.md",
    "DECISIONS.md", "DECISIONS_NEEDED.md",
    "CONTEXT.md",
    "HOW_TO_ADMIN.md",
    "PLASTICS_FLIGHT_DATA.md", "PLASTICS_REFERENCE.md",
}

# Per-project public-doc dirs (relative to repo root).
PUBLIC_DIRS_BY_PROJECT = {
    "BrackishRising": [],   # docs/GDD.html excluded; GDD has its own discipline
    "HereBeHordes": [],
    "YesAndApothecary": [],
    "YesAndBudget": [],
    "YesAndChains": [],
    "Scheduler": [],
    "YesAndEverything": [],
}

# Pattern catalog
PATTERNS = [
    (r"\u2014", "HIGH", "voice-em-dash", "literal em dash (U+2014)", "Hyphen, comma, parens, or period."),
    (r"&mdash;|&ndash;", "HIGH", "voice-em-dash-entity", "em dash HTML entity", "Hyphen, comma, parens, or period."),
    (r"\bper Nick\b", "HIGH", "voice-per-nick", "`per Nick` reads as AI collaboration", "Reframe as solo-dev decision or drop."),
    (r"\b(Midjourney|Claude|ChatGPT|GPT-[\dN]|OpenAI|Anthropic)\b", "HIGH", "voice-ai-tool-name", "AI tool name", "Generic descriptor or drop."),
    (r"^Co-Authored-By: .*(Claude|GPT|OpenAI|Anthropic)", "HIGH", "voice-coauthor-trailer", "Co-Authored-By trailer names AI", "Strip from commit + remove the hook."),
    (r"<svg\b", "MEDIUM", "voice-inline-svg", "inline <svg>", "Use a Unicode glyph in a <span> instead."),
    (r"\b(let me|I'll|happy to|feel free to|as an AI)\b", "MEDIUM", "voice-ai-vocab", "AI vocabulary", "Reframe as imperative or third-person."),
]

FIRST_PERSON_RE = re.compile(r"^\s*[-*]?\s*(?:\d+\.\s*)?(I |I'll |we |we'll |let's )", re.M)

def is_public_file(p: Path, root: Path, project: str) -> bool:
    if p.name in EXCLUDE_FILES:
        return False
    if p.name in PUBLIC_FILES:
        # Skip per-project audit / bar-raise reports
        if re.match(r"^(BAR_RAISE|CANONICAL_AUDIT|HANDLER_AUDIT|CODE_AUDIT)-", p.name):
            return False
        return True
    return False

def scan_file(p: Path, project: str) -> None:
    src = safe_read(p)
    if src is None:
        return
    sev_bump = (project == "BrackishRising")
    for pat, sev, cat, msg, fix in PATTERNS:
        sev_final = sev
        if sev_bump and sev != "BLOCK":
            sev_final = "BLOCK"
        for m in re.finditer(pat, src, re.M):
            line_no = src[:m.start()].count("\n") + 1
            emit(sev_final, cat, p, line_no, msg, fix=fix)
    if p.name == "CHANGELOG.md":
        for m in FIRST_PERSON_RE.finditer(src):
            token = m.group(1).strip()
            if token in ("I", "I'll"):
                line_no = src[:m.start()].count("\n") + 1
                emit("MEDIUM", "voice-first-person", p, line_no,
                     f"first-person `{token}` in changelog context",
                     fix="Reframe as imperative.")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    ap.add_argument("--project", default="unknown")
    args = ap.parse_args()
    root = Path(args.target)
    # Use walk_files which respects SKIP_DIRS (.git, node_modules, _ARCHIVE, ...)
    for p in walk_files(args.target, exts={".md"}):
        if p.name not in PUBLIC_FILES:
            continue
        if is_public_file(p, root, args.project):
            scan_file(p, args.project)

if __name__ == "__main__":
    main()
