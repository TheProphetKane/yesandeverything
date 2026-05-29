#!/usr/bin/env python3
"""code-audit dispatcher.

Runs the appropriate subset of checks for a given project, rolls findings up,
prints a markdown report to stdout, and exits with a code matching the
worst-severity finding (0=clean/LOW, 1=MEDIUM/HIGH, 2=BLOCK).

Usage:
    python checks/dispatcher.py --project HereBeHordes --target X:\\HereBeHordes
    python checks/dispatcher.py --project YesAndBudget --target X:\\YesAndBudget --staged
    python checks/dispatcher.py --project Scheduler --target X:\\Scheduler --since v0.2.0
"""
from __future__ import annotations
import argparse, json, os, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent

# Per-project check map. Each check script gets --target plus optionally
# --project. The dispatcher invokes them in order, captures JSON-lines on
# stdout, and merges findings.
PROJECT_CHECKS = {
    "HereBeHordes": [
        ("silent_field_guards.py", []),
        ("parallel_implementations.py", []),
        ("fuse_truncation.py", ["--project", "HereBeHordes"]),
        ("secret_exposure.py", []),
        ("godot_preload_runtime.py", []),
        ("godot_tscn_comments.py", []),
        ("godot_orphan_export.py", []),
        ("godot_empty_if.py", []),
        ("godot_uid_format.py", []),
        ("const_mirror_integrity.py", []),
        ("version_drift.py", ["--project", "HereBeHordes"]),
        ("voice_violations.py", ["--project", "HereBeHordes"]),
    ],
    "BrackishRising": [
        ("silent_field_guards.py", []),
        ("parallel_implementations.py", []),
        ("fuse_truncation.py", ["--project", "BrackishRising"]),
        ("secret_exposure.py", []),
        ("godot_preload_runtime.py", []),
        ("godot_tscn_comments.py", []),
        ("godot_orphan_export.py", []),
        ("godot_empty_if.py", []),
        ("godot_uid_format.py", []),
        ("const_mirror_integrity.py", []),
        ("version_drift.py", ["--project", "BrackishRising"]),
        ("voice_violations.py", ["--project", "BrackishRising"]),
    ],
    "YesAndBudget": [
        ("secret_exposure.py", []),
        ("fuse_truncation.py", ["--project", "YesAndBudget"]),
        ("version_drift.py", ["--project", "YesAndBudget"]),
        ("voice_violations.py", ["--project", "YesAndBudget"]),
    ],
    "YesAndChains": [
        ("secret_exposure.py", []),
        ("fuse_truncation.py", ["--project", "YesAndChains"]),
        ("version_drift.py", ["--project", "YesAndChains"]),
        ("voice_violations.py", ["--project", "YesAndChains"]),
    ],
    "Scheduler": [
        ("secret_exposure.py", []),
        ("fuse_truncation.py", ["--project", "Scheduler"]),
        ("version_drift.py", ["--project", "Scheduler"]),
        ("voice_violations.py", ["--project", "Scheduler"]),
    ],
    "YesAndApothecary": [
        ("secret_exposure.py", []),
        ("fuse_truncation.py", ["--project", "YesAndApothecary"]),
        ("version_drift.py", ["--project", "YesAndApothecary"]),
        ("voice_violations.py", ["--project", "YesAndApothecary"]),
    ],
    "YesAndEverything": [
        ("secret_exposure.py", []),
        ("fuse_truncation.py", ["--project", "YesAndEverything"]),
        ("voice_violations.py", ["--project", "YesAndEverything"]),
    ],
}

SEV_ORDER = {"BLOCK": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}
SEV_EXIT = {"BLOCK": 2, "HIGH": 1, "MEDIUM": 1, "LOW": 0}

def run_check(script: str, target: str, extra: list[str]) -> list[dict]:
    cmd = [sys.executable, str(HERE / script), "--target", target] + extra
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        return [{
            "severity": "MEDIUM",
            "category": "check-timeout",
            "file": script,
            "line": None,
            "message": f"check timed out after 120s",
        }]
    findings = []
    for line in r.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            findings.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    if r.returncode != 0 and not findings:
        findings.append({
            "severity": "MEDIUM",
            "category": "check-error",
            "file": script,
            "line": None,
            "message": f"check exited {r.returncode}; stderr: {r.stderr[:300]}",
        })
    return findings

def compose_report(project: str, target: str, mode: str, findings: list[dict]) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not findings:
        verdict = "clean"
    elif any(f["severity"] == "BLOCK" for f in findings):
        verdict = "block"
    elif any(f["severity"] in ("HIGH", "MEDIUM") for f in findings):
        verdict = "warn"
    else:
        verdict = "clean"
    by_sev = {"BLOCK": [], "HIGH": [], "MEDIUM": [], "LOW": []}
    for f in findings:
        by_sev[f["severity"]].append(f)
    out = []
    out.append(f"# CODE_AUDIT-{today}: {project}\n")
    out.append(f"Run mode: {mode}")
    out.append(f"Target: {target}")
    out.append(f"Verdict: {verdict}")
    out.append(f"Findings: {len(findings)} total ({len(by_sev['BLOCK'])} BLOCK, {len(by_sev['HIGH'])} HIGH, {len(by_sev['MEDIUM'])} MEDIUM, {len(by_sev['LOW'])} LOW)\n")
    if findings:
        top = sorted(findings, key=lambda f: -SEV_ORDER[f["severity"]])[0]
        out.append("## Top finding\n")
        out.append(f"**[{top['severity']}] {top['category']}** at `{top.get('file','?')}`"
                   + (f":{top['line']}" if top.get('line') else "")
                   + f". {top.get('message','')}")
        if top.get('fix'):
            out.append(f"Fix: {top['fix']}")
        out.append("")
    for sev in ("BLOCK", "HIGH", "MEDIUM", "LOW"):
        if not by_sev[sev]:
            continue
        out.append(f"## {sev} ({len(by_sev[sev])})\n")
        for f in by_sev[sev]:
            loc = f"`{f.get('file','?')}`" + (f":{f['line']}" if f.get('line') else "")
            out.append(f"- **{f['category']}** {loc}: {f.get('message','')}")
            if f.get("fix"):
                out.append(f"  - Fix: {f['fix']}")
        out.append("")
    return "\n".join(out)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True, choices=list(PROJECT_CHECKS.keys()))
    ap.add_argument("--target", required=True)
    ap.add_argument("--staged", action="store_true")
    ap.add_argument("--since")
    ap.add_argument("--out", help="Write the report to a file. If omitted, prints to stdout.")
    ap.add_argument("--exit-on-block", action="store_true",
                    help="Exit 2 if any BLOCK finding (use in preship.ps1).")
    args = ap.parse_args()

    checks = PROJECT_CHECKS[args.project]
    all_findings = []
    for script, extra in checks:
        all_findings.extend(run_check(script, args.target, extra))

    mode = "staged" if args.staged else (f"since {args.since}" if args.since else "full")
    report = compose_report(args.project, args.target, mode, all_findings)

    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(report, encoding="utf-8")
        print(f"Wrote report to {args.out}")
    else:
        print(report)

    if not all_findings:
        sys.exit(0)
    worst = max(SEV_ORDER[f["severity"]] for f in all_findings)
    worst_sev = [s for s, v in SEV_ORDER.items() if v == worst][0]
    if args.exit_on_block and worst_sev == "BLOCK":
        sys.exit(2)
    sys.exit(SEV_EXIT[worst_sev])

if __name__ == "__main__":
    main()
