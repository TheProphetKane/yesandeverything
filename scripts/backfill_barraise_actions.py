#!/usr/bin/env python3
"""Backfill barRaise.actions[] into status/data/*.json from each project's
latest BAR_RAISE-*.md report.

The bar-raise writer (waves/05_meta_synthesis.md) emits barRaise.actions[] on
every run going forward. This script retrofits the array from the reports that
already exist, so the dashboard actions tab lists real items before the next
scheduled run. Idempotent and re-runnable: it rebuilds actions[] from scratch
each time, so a later bar-raise run overwriting it is fine.

Portable: locates the status dir and sibling repos relative to this file, so it
runs the same in the Cowork sandbox and on the Windows mount.
FUSE-safe: atomic write (tmp + replace) with a re-parse readback and retry.
"""
import json, os, re, sys

REPO_DIR = {
    "Hordes": "HereBeHordes",
    "Rising": "BrackishRising",
    "Chains": "YesAndChains",
    "Scheduler": "YesAndScheduler",
    "Budget": "YesAndBudget",
    "Apothecary": "YesAndApothecary",
    "Agents": "YesAndAgents",
    "Everything": "YesAndEverything",
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
YAE = os.path.dirname(SCRIPT_DIR)
PARENT = os.path.dirname(YAE)
DATA_DIR = os.path.join(YAE, "status", "data")

# Live report format: "N. [SEV] (lens) Title"
RX_A = re.compile(
    r'^\s*\d+\.\s*\[(HIGH|MED|MEDIUM|LOW)\]\s*\(([^)]+)\)\s*(.+?)\s*$'
)
# Contract-template fallback: "N. [Pxx] [SEV] Title (lens)"
RX_B = re.compile(
    r'^\s*\d+\.\s*(?:\[P(\d+)\]\s*)?\[(HIGH|MED|MEDIUM|LOW)\]\s*(.+?)\s*\(([^)]+)\)\s*$'
)
CHRONIC_RX = re.compile(r'\[CHRONIC\s*x?\d+\]', re.I)


def parse_actions(md):
    """Pull HIGH+MED rows from the report's '## Action items' section.

    Handles the live format (severity then lens then title) and the
    contract-template fallback (optional priority, severity, title, trailing
    lens). Order is preserved; the report already ranks the list.
    """
    out = []
    in_sec = False
    for ln in md.splitlines():
        low = ln.strip().lower()
        if low.startswith("## action item"):
            in_sec = True
            continue
        if in_sec and ln.startswith("## "):
            break
        if not in_sec:
            continue
        pri = None
        ma = RX_A.match(ln)
        if ma:
            sev, lens, title = ma.group(1), ma.group(2), ma.group(3)
        else:
            mb = RX_B.match(ln)
            if not mb:
                continue
            pri, sev, title, lens = mb.group(1), mb.group(2), mb.group(3), mb.group(4)
        sev = "MED" if sev in ("MED", "MEDIUM") else sev
        if sev == "LOW":
            continue
        title = CHRONIC_RX.sub("", title).strip()
        row = {"severity": sev, "title": title, "lens": lens.strip()}
        if pri is not None:
            row["priority"] = int(pri)
        out.append(row)
    return out


def atomic_write_json(path, obj, tries=5):
    """Write JSON atomically and verify by re-parsing a fresh read."""
    payload = json.dumps(obj, indent=4, ensure_ascii=False) + "\n"
    for attempt in range(1, tries + 1):
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(payload)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
        try:
            with open(path, "r", encoding="utf-8") as f:
                json.load(f)
            return True
        except Exception:
            if attempt == tries:
                raise
    return False


def main():
    if not os.path.isdir(DATA_DIR):
        print("status data dir not found: " + DATA_DIR)
        return 1
    touched, skipped = 0, 0
    for fn in sorted(os.listdir(DATA_DIR)):
        if not fn.endswith(".json") or fn == "constellation.json":
            continue
        fpath = os.path.join(DATA_DIR, fn)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print("SKIP " + fn + " (unparseable: " + str(e) + ")")
            skipped += 1
            continue
        proj = data.get("project")
        br = data.get("barRaise")
        if not proj or not isinstance(br, dict) or not br.get("latestReportPath"):
            skipped += 1
            continue
        repo = REPO_DIR.get(proj)
        if not repo:
            print("SKIP " + fn + " (no repo mapping for '" + str(proj) + "')")
            skipped += 1
            continue
        rel = str(br["latestReportPath"]).replace("\\", "/")
        report = os.path.join(PARENT, repo, *rel.split("/"))
        if not os.path.isfile(report):
            print("SKIP " + fn + " (report missing: " + report + ")")
            skipped += 1
            continue
        with open(report, "r", encoding="utf-8") as f:
            actions = parse_actions(f.read())
        if not actions:
            print("SKIP " + fn + " (no parseable HIGH/MED action lines)")
            skipped += 1
            continue
        br["actions"] = actions
        atomic_write_json(fpath, data)
        n_open = br.get("actionsOpen")
        flag = "" if n_open == len(actions) else " (actionsOpen=" + str(n_open) + ")"
        print("OK   " + fn + " -> " + str(len(actions)) + " actions" + flag)
        touched += 1
    print("---")
    print("backfilled " + str(touched) + " file(s), skipped " + str(skipped))
    return 0


if __name__ == "__main__":
    sys.exit(main())
