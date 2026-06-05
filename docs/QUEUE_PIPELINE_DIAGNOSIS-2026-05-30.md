# Queue-add pipeline diagnosis (item audit-queue-add-pipeline-broken-2026-05-24)

Run: queue-drain-frequent, 2026-05-30T21:06Z.

## Question

Audit findings files emit a `## Queue-these` / `## Recommended actions` footer, but those
items were not landing in `.work-queue.json`. Item asked: fix via (A) teach work-queue-runner
to scan audit footers, or (B) make the audit skills call enqueue explicitly.

## Finding: option B is already chosen in source, but the runtime copy is stale

Verified against the 2026-05-23 canonical audit (the one that named three items none of which
were enqueued at the time):

- `project-canonical-audit` SOURCE (`_skill-review/personal-skills-src/skills/`) carries
  **Phase 8 - Auto-enqueue the "Queue-these" section (REQUIRED)**.
- `handler-audit` SOURCE carries the equivalent **Phase 6 - Auto-enqueue every
  "Recommended action" (REQUIRED)**.

Both phases implement option B: the audit skill itself appends each item to `.work-queue.json`
inline, with an idempotency check, rather than leaving a markdown footer for a separate parser.

The break is a deploy gap, not a design gap. The INSTALLED plugin copies the scheduled tasks
execute do NOT have these phases:

```
grep -c "Phase 8 - Auto-enqueue" .remote-plugins/.../project-canonical-audit/SKILL.md  -> 0
grep -c "Phase 6 - Auto-enqueue" .remote-plugins/.../handler-audit/SKILL.md            -> 0
diff source vs installed (project-canonical-audit)                                     -> DIFFERS
```

So the scheduled audit tasks run a pre-Phase-8 version of the skill. They write the footer,
then exit without enqueuing. The three 2026-05-23 items only reached the queue days later as
date-suffixed re-adds from subsequent daily audits, then got archived as duplicates by triage.
That is the loop spinning, not the pipeline working.

## Required action (Nick)

Reinstall / update the `personal-skills` plugin so the installed copies pick up the source
that already contains Phase 8 and Phase 6. No skill edit is needed; source is correct. Until
the reinstall, every scheduled audit will keep dropping its footer items.

Verification after reinstall:

```
grep -c "Phase 8 - Auto-enqueue" <installed>/project-canonical-audit/SKILL.md   # expect 1
grep -c "Phase 6 - Auto-enqueue" <installed>/handler-audit/SKILL.md             # expect 1
```

Then watch the next scheduled canonical/handler audit: its findings file should end with an
`## Auto-enqueued` block, and the named items should appear in `.work-queue.json` the same run.

## Why this drain did not edit anything

The source skills are already correct, so there is nothing to fix there. The installed
`.remote-plugins` tree is a managed runtime artifact; hand-editing it would be overwritten by
the next plugin sync and would desync the plugin manager's version tracking. The clean fix is a
reinstall, which is a Cowork action outside this audit-only scheduled task. Item left pending
with this diagnosis attached.
