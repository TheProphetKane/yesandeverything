# -*- coding: utf-8 -*-
"""file-dashboard-stale.py: write the one P1 queue row for a stale live dashboard.

Called by check-dashboard-live.ps1 when the usage feed or the weekly rollup is older than
its limit. The row goes in through X:\\PortfolioOps\\queue\\queue_write.py (the only queue
writer that takes the shared lock). When a row with finding_id dashboard-stale-01 is
already open (pending or blocked), nothing is written, so repeated runs never stack rows.

    python scripts/file-dashboard-stale.py --evidence "usage.json is 120.0h old (limit 5.5h)"

Prints "filed <id>", "updated <id>" or "exists <id>" and exits 0; exits 1 on a write failure.
"""
import argparse
import datetime
import sys

sys.path.insert(0, r"X:\PortfolioOps\queue")

FINDING = "dashboard-stale-01"
OPEN = ("pending", "blocked", "blocked-on-user")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--evidence", required=True)
    args = ap.parse_args()
    from queue_write import edit

    today = datetime.date.today().isoformat()
    result = {}

    def mutate(q):
        for it in q["items"]:
            if it.get("project") == "everything" and it.get("finding_id") == FINDING and it.get("status") in OPEN:
                result["msg"] = "exists " + it["id"]
                return q
        row = {
            "id": "everything-%s-%s" % (FINDING, today),
            "source": "check-dashboard-live",
            "added": today,
            "project": "everything",
            "kind": "audit-finding",
            "finding_id": FINDING,
            "auto_safe": False,
            "priority": "P1",
            "status": "pending",
            "attempts": 0,
            "severity": "high",
            "title": "Everything: the live dashboard feed is stale (usage feed or weekly rollup past its limit).",
            "evidence": args.evidence,
            "prompt": (
                "In X:/YesAndEverything run scripts/check-dashboard-live.ps1 to see which feed is stale, "
                "then republish with powershell -NoProfile -ExecutionPolicy Bypass -File "
                "X:/PortfolioOps/scripts/collect-usage.ps1 -NoPush (usage feed) or run the constellation "
                "bar-raise (weekly rollup). Re-run the check until it exits 0, then close this row."
            ),
        }
        ids = set(i.get("id") for i in q["items"])
        n = 2
        while row["id"] in ids:
            row["id"] = "everything-%s-%s-%d" % (FINDING, today, n)
            n += 1
        q["items"].append(row)
        result["msg"] = "filed " + row["id"]
        return q

    edit(mutate)
    print(result["msg"])


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("file-dashboard-stale: " + str(e), file=sys.stderr)
        sys.exit(1)
