# Queue triage 2026-06-05

## TL;DR

Seven non-auto-safe items are aging past the 7-day threshold; three are tied as the worst offenders at 12 days old (HBH sprite-tuning drift, YaC Stripe-monetization decision, YaE audit-queue-add pipeline). HBH carries the largest backlog at four items, three of which are blocked on the same root cause: the audit session can't reach the HBH source mount.

## HTBH

**htbh-d02-sprite-tuning-stale-13-minors** (P2, added 2026-05-24, 12 days old)

- Prompt summary: GDD §3 Live sprite tuning reference header still v0.61.2 against v0.74.42. Thirteen MINORs stale; missing rows for gates and reinforced tower. Second appearance after the 2026-05-21 audit (M-03 unresolved).
- Recommended verdict: Defer to HBH-mount unblock (htbh-audit-mount-or-sidecar-2026-05-28)
- Why: The §3 header sync and the missing gate/tower rows both need source-side GDD + sprite values that the audit session can't currently read, same block as the rest of the HBH queue.

**htbh-audit-mount-or-sidecar-2026-05-28** (P1, added 2026-05-28, 8 days old)

- Prompt summary: Sixth audit run with no source-side coverage. Either add X:\HereThereBeHordes to the scheduled audit session's folder set, or have audit-htbh-daily pre-pull source/ + docs/GDD.html from origin before invoking the audit.
- Recommended verdict: Do this session
- Why: Confirmed this session too (HereThereBeHordes is not among the four mounted folders), noticed 9 times, and it is the single root cause unblocking the other three HBH items, so it deserves Nick's hand on the folder-set change first.

**htbh-publish-gdd-integrity-guard-2026-05-28** (P1, added 2026-05-28, 8 days old)

- Prompt summary: Sixth carry-over from canonical audits 2026-05-23 through 27. Assert source docs/GDD.html ends with </html> and post-injection hordes/index.html ends with the expected tail before commit; needs HBH source-mount access.
- Recommended verdict: Defer to HBH-mount unblock (htbh-audit-mount-or-sidecar-2026-05-28)
- Why: Writing the Test-GddIntegrity guard requires editing publish-gdd.ps1 on the HBH source mount, which is exactly the access the mount item provides.

**htbh-v0-75-0-minor-rollup-verify-2026-05-28** (P2, added 2026-05-28, 8 days old)

- Prompt summary: v0.75.0 shipped 2026-05-28 (commit 3779655); a MINOR bump implies a cohesive system landed. Once source-mount access exists, confirm GDD §17 roadmap marked the feature done and the changelog entry sits at the top in descending order.
- Recommended verdict: Defer to HBH-mount unblock (htbh-audit-mount-or-sidecar-2026-05-28)
- Why: The verification is a read against GDD §17 and the changelog footer, both of which live on the source mount the audit session lacks.

## YaC

**yac-h1-stripe-monetization-decision** (P1, added 2026-05-24, 12 days old)

- Prompt summary: PROJECT_SPEC Decision 1.5 (no monetization) contradicted by the shipped Stripe gate in v0.32.0. Migration 0016 + billing endpoints + upgrade modal + docs/stripe-setup.md are all live but no DECISIONS_NEEDED entry records the pivot.
- Recommended verdict: Do this session
- Why: It is a clean binary call only Nick can make (record the monetization pivot vs. revert the scaffolding); note the prompt's "record as Decision 26" is stale, since Decision 26 is already taken by the feedback-routing entry and the log runs past Decision 28, so the new entry needs the next free number.

## YaE

**audit-queue-add-pipeline-broken-2026-05-24** (P2, added 2026-05-24, 12 days old)

- Prompt summary: CANONICAL_AUDIT-2026-05-23 ended with a "Queue-these" block of three items, none of which appear in .work-queue.json. Either work-queue-runner isn't parsing audit footers, or the convention always required the audit skill to call work-queue-runner add itself.
- Recommended verdict: Do this session
- Why: It is a low-risk A/B engineering decision on the skill pipeline (teach the runner to scan audit footers, or make the audit skills call add explicitly), and leaving it unfixed silently drops every future audit's queued follow-ups.

## YaApothecary

**yaa-state-icon-vestigial-decision-2026-05-27** (P3, added 2026-05-27, 9 days old)

- Prompt summary: src/state.js defaultState() still ships icon: 'chamomile'. icons.js was retired in v0.7.1 and the renderer no longer consumes it, so it is likely vestigial; needs a code decision to strip (plus a migrator strip) or keep and document.
- Recommended verdict: Do this session
- Why: Evidence confirms the drift (state.js line 135 still sets the icon, data/icons.js is absent), and it is a small, self-contained call Nick can authorize in one pass.

## Auto-applied

None. No item earned a clean Drop verdict. The YaC Stripe item's prescribed "Decision 26" number is stale, but the underlying monetization decision is still live and real, so the item stays in place for Nick. All four HBH items, the YaE pipeline item, and the YaA icon item need Nick's authorization or source-mount access and were left in the queue.
