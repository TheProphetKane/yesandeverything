# Handler audit 2026-05-22

Audit of CLAUDE.md handler files against current repo state. Triggered by `handler-audit-weekly` scheduled task.

## TL;DR

Three of six handlers were accessible this session (YaE, Scheduler, YaC). HTBH, YaApothecary, and YaB are not mounted in the current Cowork folder set, so their handlers could not be verified. Of the three audited, one HIGH severity issue: the YaE handler points twice at `X:\HereBeHordes\...` for HBH scripts, but the actual repo lives at `X:\HereThereBeHordes`. Three MEDIUM issues clustered in YaE around new sub-projects (apothecary, budget) and a stale DNS-transfer claim shared with YaC. Scheduler handler is fully aligned. Three safe auto-fixes queued for the next drain.

## HIGH severity (handler is teaching the wrong thing)

### YaE — `X:\HereBeHordes` path is wrong twice

`X:\YesAndEverything\CLAUDE.md` line 47:

> run `X:\HereBeHordes\scripts\publish-gdd.ps1` and it'll push the injection here for you.

And line 63:

> Recovery for the actual truncation lives in `X:\HereBeHordes\outputs\v0_61_10_gdd_tail_recover.py`.

Actual folder is `X:\HereThereBeHordes` (per `user_preferences` and the existing `HANDLER_AUDIT-2026-05-15.md` reference). Anyone copy-pasting either line gets a file-not-found. Even though the project's display name is "Here Be Hordes" (locked v0.72.0), the directory was never renamed.

**Recommended fix:** replace both `X:\HereBeHordes` with `X:\HereThereBeHordes`. Safe text swap.

## MEDIUM (handler is incomplete or out of date)

### YaE — project list omits apothecary and budget

Line 8: "Each project (HBH, Chains, Scheduler) lives in its own repo." Two new sub-projects have landed since: `apothecary/` (mirror from `X:\YesAndApothecary`, referenced later in the file table at line 22) and `projects/budget/` (the new Yes-and Budget landing page, no current handler mention at all). The opening summary still implies a three-project umbrella.

**Recommended fix:** revise line 8 to enumerate all current sub-projects: HBH, Chains, Scheduler, Apothecary, Budget.

### YaE — `PERSONAL_CLAUDE_ARCHITECTURE.md` row claims "four personal projects"

Line 26: "The handler-and-canonical pattern spec applied to all four personal projects." Now six (HBH, YaC, Scheduler, YaE, YaApothecary, YaB). The actual `PERSONAL_CLAUDE_ARCHITECTURE.md` may also still say four; not verified this session.

**Recommended fix:** swap "four" for "six" in the table row. Verify the architecture doc itself in a follow-up read.

### YaE + YaC — DNS-transfer claim is past its window

YaE line 64: "DNS is on Cloudflare for `yesandeverything.com` as of 2026-05-06. Registrar transfer from Squarespace is pending 5-7 day completion."

YaC line 56: "DNS registrar transfer from Squarespace pending 5–7 days from 2026-05-06."

Today is 2026-05-22 — 16 days past the start of the window, ~9 days past the latest expected completion. Either the transfer completed (claim is stale) or it stalled (claim is misleadingly optimistic). Neither handler reflects the current state.

**Recommended fix:** confirm registrar status and replace the "pending" line in both handlers with a dated factual statement. Not auto-safe — needs the actual answer first.

### YaE — deploy section still shows raw `git push`, not `scripts/release.ps1`

Lines 35-45 narrate the deploy flow as:

```powershell
cd X:\YesAndEverything
git add .
git commit -m "..."
git push
```

But `scripts/release.ps1` now exists in YaE (with `push-to-github.ps1` + `discord-notify.ps1`), and the personal-settings rule (memory `use_release_scripts`) is to default to the release script. The handler teaches the older path.

**Recommended fix:** replace the inline git commands with a `scripts/release.ps1` invocation, mirroring the Scheduler/YaC pattern. Note the script header itself documents that HBH's `publish-gdd.ps1` handles GDD-side pushes, so YaE's `release.ps1` is for direct landing-page edits.

## LOW (cosmetic)

### YaC — file-size pinning drifts

Line 12: `CONTEXT.md` "Currently 218KB" → actual **232K**.
Line 25: `index.html` "~93KB" → actual **96K**.
Line 25: `app.js` "~1MB bundled" → actual **1.2M**.
Line 30: `disc_database.json` "~647KB" → actual **636K**.

All within the rounding the prose implies. Not worth touching individually, but worth a single sweep once any number crosses 25%+ drift.

## What's healthy

- **Scheduler handler is fully aligned.** All five migrations present (`0001_initial` through `0005_review_queue`). React 18 + Vite + Tailwind in `apps/web`, Hono + Wrangler in `apps/api`. No shadcn / Material / Chakra creep. All `docs/` files referenced from the handler exist.
- **YaC file table verified.** Every file in the canonical-knowledge-layer table is present, including all 19 ADR files (handler claim of "15+" still holds).
- **YaE `hordes/` injection rule is correctly described.** Line 33 matches the actual `hordes/index.html` shape (single hand-authored gate, `var ENCODED` injection target). Cross-handler check with HTBH not possible this session.
- **YaE `apothecary/` row at line 22 correctly describes** the multi-file ES-module mirror flow.
- **YaC `auth@yesandeverything.com` sender line still correct** — no further sender migrations since v0.25.2.
- **Versioning policy section in YaC handler matches the live policy in `CONTEXT.md`** (PATCH / MINOR / MAJOR with the revised 2026-05-05 semver).

## Inaccessible handlers (verification gap)

The scheduled task asked for six handlers; three are outside this session's mounted folders:

- `X:\HereThereBeHordes\CLAUDE.md` (HTBH)
- `X:\YesAndApothecary\CLAUDE.md` (YaApothecary)
- `X:\YesAndBudget\CLAUDE.md` (YaB)

The session has mounts only for `X:\YesAndEverything`, `X:\Scheduler`, `X:\YesAndChains`. Recommend either expanding the scheduled-task mount set or adding a self-reprompt step that requests directory access at the start of `handler-audit-weekly`. Until then, these three are blind spots.

## Recommended actions (sorted by severity)

1. **YaE** — replace `X:\HereBeHordes` with `X:\HereThereBeHordes` (lines 47 and 63). Auto-safe.
2. **YaE** — update line 8 project list to include apothecary and budget. Auto-safe.
3. **YaE** — update line 26 "four personal projects" → "six". Auto-safe.
4. **YaE + YaC** — confirm DNS-transfer status, then update both handlers. Not auto-safe; needs research.
5. **YaE** — replace deploy flow snippet with `scripts/release.ps1` invocation. Needs review (changing a learned workflow).
6. **YaC** — refresh file-size numbers in one pass. Low priority; defer.
7. **Audit infra** — expand `handler-audit-weekly` to mount HTBH / YaApothecary / YaB so the next run covers all six.

## Auto-applied

None. Report-only run per skill default.

## Queued items

The three HIGH/MEDIUM auto-safe fixes (items 1-3 above) added to `X:\YesAndEverything\.work-queue.json` for the next `queue-drain-frequent` run. DNS-transfer status (item 4) queued as a research item, gated.
