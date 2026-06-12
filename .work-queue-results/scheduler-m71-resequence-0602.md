# scheduler-m71-resequence-0602 result

- Started: 2026-06-12T11:35Z
- Finished: 2026-06-12T11:37:23Z
- Status: partial (doc drift fixed; scope decision drafted, call is Nick's)
- Prompt: M7.1 re-sequence: decide next-version scope (org-switcher widget + invite-admin UI + cross-org scope-leak tests, build now or push); X-Org-Slug documented live in DESIGN sec16 with zero SPA references.

## Verification against HEAD 802b9aa (v0.4.1, 2026-06-11)

- DESIGN sec21 re-sequence note: ALREADY LANDED (line 541 records the v0.2.1 -> post-v0.3.0 re-sequence; status line 9 names M7.1 as next milestone). That half of the item premise is closed.
- X-Org-Slug: API side fully live (apps/api/src/lib/scope.ts resolves the header). SPA side: zero senders. auth.tsx tracks active_org read-only from /api/me; only other reference is a comment in packages/shared/src/index.ts:28. Claim confirmed.
- Cross-org scope-leak tests: none exist. 14 test files under apps/api/src, zero grep hits for cross-org isolation coverage.
- Invite-admin UI: no route file; POST /api/admins/invite remains API-only.

## Fix applied

docs/DESIGN.md sec16 (line 361): appended one clarifying sentence so the doc stops implying a usable switch surface: "The header is honored by the API today, but no SPA surface sends it yet; the org-switcher widget that will is M7.1 (see sec21)." Atomic write + fresh re-parse, tail verified (617 lines, 42767 bytes). Doc-only; rides the existing committed-ready Scheduler cohort (rebrand + 2 test files), ships with Nick's next release.ps1 run. No version bump: Scheduler bumps in lockstep with releases, not per doc tweak.

## Scope recommendation (Nick decides)

Build M7.1 next as v0.5.0 (MINOR: new widget + new screen), in this order:
1. Cross-org scope-leak test suite FIRST. It is the only multi-tenant security coverage the app would have, DESIGN line 545 says the platform is ready for multi-tenant onboarding once M7.1 lands, and YaS's completion gate is real-use testing; shipping tenants before isolation tests is the wrong order. Pure-additive, zero design risk, strongest gate-serving unit.
2. SPA header org-switcher widget (the X-Org-Slug sender; closes the sec16 gap for real).
3. Invite-admin UI page (currently API-only; needed before Alexia/Taylor can self-serve).
Against pushing further: M8 + the v0.4.x polish are done, nothing else is named as next in DESIGN, and every report since 06-02 has carried this as the open thread.

## Followups recommended

- The scope-leak test suite is buildable autonomously next drain if Nick approves the M7.1 = v0.5.0 scope (would also serve the real-use-testing gate).
