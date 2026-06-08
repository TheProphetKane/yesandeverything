---
name: handler-audit
description: Audit the four project-level CLAUDE.md handler files (HBH, YaC, Scheduler, YaE) against the current state of each project to surface stale paths, stale version pills, stale email or URL references, stale convention claims, and cross-handler inconsistency. Use whenever the user says "audit the handlers", "check CLAUDE.md drift", "verify the handler files", "audit my CLAUDE.md", "are the handlers still accurate", "do the handler files match reality", "sweep the CLAUDE.md files", or any request to validate that what the per-project handler primers claim still matches the project they describe. The skill walks all four handlers, harvests every concrete claim, verifies each against the project, and writes a dated findings report to X:\YesAndEverything\docs\. Report-only by default; auto-fixes safe items only when the user says "fix as you go".
---

## Step 0: Load project context (schema v1)

Before doing anything project-specific, read `<project-path>/.project-context.json` (schema v1; see `X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` for the full schema).

Use it to drive:
- `handler` — which CLAUDE.md file to audit
- `hard_rules` + `locked_decisions_summary` — verify they match the prose
- All fields — cross-check that the prose in CLAUDE.md doesn't claim something contradicted by the structured fields

If the file is missing or its `schema_version` is unsupported, fall back to reading the project's `CLAUDE.md` prose. Log a queue item asking Nick to add or migrate the context file.


# Handler audit (CLAUDE.md drift sweep)

Audit the four project-level CLAUDE.md handler files against the current state of each project they describe. Surface stale paths, stale version pills, stale email/URL references, stale convention claims, and cross-handler inconsistency. Optionally apply low-risk text fixes.

## Why this exists

The four CLAUDE.md handlers (HBH, YaC, Scheduler, YaE) are the first thing every new Claude session reads for each project. Each one is a primer: "this is what this repo is, this is what to watch for, these are the conventions." When a handler drifts from reality, it actively teaches the wrong thing for the rest of the session. The drift is usually small (a renamed file, an old email, a version pill that didn't get bumped) but the cost is high because the handler runs at the top of every conversation.

`canonical-doc-handler-init` creates these files; nothing currently re-audits them. This skill closes that gap.

## When to use this

Trigger on requests like:
- "Audit the handlers"
- "Check CLAUDE.md drift"
- "Verify the handler files"
- "Audit my CLAUDE.md"
- "Are the handlers still accurate"
- "Sweep the CLAUDE.md files"
- "Do the handler files match reality"

Also trigger proactively after big cross-project shifts (e.g., DNS migration, sender-email change, monorepo restructure) where any of the four handlers might now describe yesterday's truth.

## The four handler paths

The audit is hard-coded to these four files. Don't expand scope without asking.

| Handler | Project |
|---|---|
| `X:\HereBeHordes\CLAUDE.md` | Here There Be Hordes (Godot 4.6 RTS) |
| `X:\YesAndChains\CLAUDE.md` | YesAndChains (pocket disc-golf caddy PWA) |
| `X:\YesAndScheduler\CLAUDE.md` | Yes and Scheduler (employee-scheduling web app) |
| `X:\YesAndEverything\CLAUDE.md` | YesAndEverything (umbrella static site) |

## How to run an audit

Run all four phases in order. Each phase produces evidence the next phase consumes.

### Phase 1 — Read all four handlers and extract claims

For each CLAUDE.md, harvest every concrete claim into a working table. The categories to capture:

| Claim type | Examples |
|---|---|
| File path | `docs/GDD.html`, `apps/web/`, `scripts/release.ps1`, `hordes/index.html` |
| Version pill | "currently at v0.25.2", "Godot 4.6.2", "React 18" |
| Email | `auth@yesandeverything.com`, `chains@yesandeverything.com`, `kane@yesandeverything.com` |
| URL | `https://yesandchains.com`, `https://yesandeverything.com`, `https://theprophetkane.github.io/yesandchains/` |
| Convention | "TypeScript strict mode", "no third-party UI kits", "GDScript first, C# fallback", "dark-mode by default" |
| Cross-reference | Mentions of the personal settings doc, other handlers, shared scripts |

Don't paraphrase — copy the exact phrasing. The audit checks specific strings.

### Phase 2 — Verify each claim against current project state

Walk every harvested claim. For each, decide if it still holds.

**File path claims.** Read or list the path. Missing or moved = drift.

**Version pill claims.** Find the canonical version marker for that project and compare.

| Project | Where the canonical version lives |
|---|---|
| HBH | `project.godot` `config/version=`, plus version pill near top of `docs/GDD.html` |
| YaC | Top of `CONTEXT.md` "Version & changelog" section |
| Scheduler | `package.json` `version` field, plus DESIGN.md milestone status |
| YaE | No formal pill — check recent commit messages for the latest sub-project version |

**Email claims.** Check the project's actual sender configuration (Supabase auth settings, Resend SMTP, feedback inbox docs). YaC notably moved feedback from `chains@yesandeverything.com` to `kane@yesandeverything.com` per v0.25.2 — that's an exemplar of the email drift pattern.

**URL claims.** Confirm the URL still resolves to the expected destination (live site vs. GitHub Pages fallback vs. redirect).

**Convention claims.** Spot-check. If the handler says "no shadcn", grep for `shadcn`. If it says "GDScript first", confirm no recent shift toward C#. If it says "Tailwind only", confirm no CSS-in-JS imports landed.

**Cross-reference claims.** The personal settings doc (`X:\YesAndEverything\CLAUDE_SETTINGS.md` per the memory pointer) may have moved or been renamed. Verify any handler references to it.

### Phase 3 — Cross-handler consistency check

Some things are described in more than one handler. They MUST agree.

| Shared thing | Handlers that mention it |
|---|---|
| `hordes/index.html` publish flow (base64 injection) | HBH + YaE |
| `auth@yesandeverything.com` sender on YaE umbrella | YaC + YaE |
| Personal settings doc location | All four implicitly through the memory layer |
| DNS state for `yesandeverything.com` (Cloudflare vs. Squarespace) | YaC + YaE |
| Git index.lock FUSE quirk | HBH + Scheduler |
| Release-script flow (`scripts/release.ps1`) | HBH + YaC |

For each, read both handlers' descriptions side by side. If the descriptions contradict (e.g., HBH says "publish-gdd.ps1 injects into hordes/index.html" but YaE says "gdd.html is copied into hordes/"), that's a high-severity finding even if neither standalone claim is wrong about its own project.

### Phase 4 — Write the findings report

Default output path: `X:\YesAndEverything\docs\HANDLER_AUDIT-YYYY-MM-DD.md` using today's actual date. Create the `docs/` folder if it doesn't exist. If a report already exists for today, append a new section rather than overwriting.

Structure:

```markdown
# Handler audit YYYY-MM-DD

## TL;DR

[1-3 sentences about overall handler health. State whether the four handlers are mostly aligned or have significant drift, and call out the worst category if there is one.]

## HIGH severity (handler is teaching the wrong thing)

[Items where the handler now misleads — wrong email, wrong file path, contradicted convention, cross-handler contradiction. Each item lists: which handler, the exact stale text, the current truth, and the recommended fix.]

## MEDIUM (handler is incomplete or out of date)

[Version pills that lag reality, conventions that have been refined but not updated, references that still work but point at a less-canonical doc than they should.]

## LOW (cosmetic)

[Phrasing drift, formatting inconsistency across handlers, minor link reformatting.]

## What's healthy

[Bullet list of claims verified correct. Skipping this section is a mistake — it tells the user the handlers are mostly trustworthy.]

## Recommended actions

[Numbered list, sorted by severity. For each: which handler, what to change, exact diff if low-risk.]
```

Sort findings by severity. Within a severity tier, sort by handler (HBH, YaC, Scheduler, YaE) for predictable scanning.

### Phase 5 — Apply low-risk fixes (only if asked)

The skill defaults to **report-only**. Don't edit handlers unless the user explicitly says "fix as you go" / "apply low-risk fixes" / "make the changes".

When applying:
- Low-risk (safe to auto-fix): stale email address swap, stale file-path correction when the new path is unambiguous, stale version reference when the canonical pill is authoritative.
- Always ask first: rewriting a convention paragraph, removing a "things that will bite you" entry, changing a cross-handler description that's contradicted (the user has to decide which version is canonical).

If you do apply fixes, list every edit in the findings report under a final "Auto-applied" section. Don't silently edit and leave no audit trail.

### Phase 6 — Auto-enqueue every "Recommended action" (REQUIRED, not optional)

**This phase is mandatory on every run, including scheduled-task runs with no chat prompt.** The findings report's `## Recommended actions` section enumerates every fix this audit thinks should happen. Without an automated enqueue step, those actions sit in the dated findings file forever and nobody acts on them. The 2026-05-15 handler audit (the only one on file) recommended five fixes; with no inline enqueue, none of them ever made it into the work queue.

For each numbered item under `## Recommended actions`:

1. Read `X:\YesAndEverything\.work-queue.json` (top-level `items` array).
2. Construct a stable `id` from the handler name + a short slug describing the fix (e.g. `handler-yac-version-pill-bump`, `handler-htbh-hordes-injection-description`). Idempotency check: skip if the same `id` is already present.
3. Otherwise append:

   ```json
   {
     "id": "handler-<project>-<short-slug>",
     "added": "YYYY-MM-DD",
     "project": "<htbh|yac|scheduler|yae>",
     "kind": "handler-drift",
     "auto_safe": true | false,
     "priority": "P0" | "P1" | "P2" | "P3",
     "status": "pending",
     "prompt": "<one-paragraph instruction the drain task can execute against the named CLAUDE.md>",
     "source": "YYYY-MM-DD handler audit"
   }
   ```

4. `auto_safe=true` for: version-pill bumps inside a handler, stale email swaps where the new value is unambiguous, file-path corrections where the new path verifiably exists, dated-claim refreshes where the new date can be derived from the canonical doc.
   `auto_safe=false` for: convention paragraph rewrites, cross-handler contradictions (the user has to pick the canonical version), anything that touches more than text alignment.
5. `priority`: HIGH severity findings → P1, MEDIUM → P2, LOW → P3. There is no P0 for handler drift unless a handler now points at a file that broke deploys.
6. Save `.work-queue.json` back as pretty JSON (2-space indent) and update its top-level `updated` field to the current ISO timestamp.

After enqueueing, list every item added (id + handler + auto_safe) at the bottom of the findings report under `## Auto-enqueued`. If zero items were added because everything was already in the queue, say so explicitly: `Auto-enqueued: 0 (all items already present in .work-queue.json)`.

**If `.work-queue.json` is missing or unparseable, do not silently skip.** Write `## Auto-enqueue FAILED` at the bottom of the findings file with the error message, plus a copy of every item that *would have been* enqueued in JSON form.

## Special cases

### The hordes/index.html cross-handler trap

This is the highest-value consistency check in the audit. The HBH CLAUDE.md and the YaE CLAUDE.md both describe the same file from different angles. The rule (per memory `publish_gdd_routing` and the YaE CLAUDE.md): the publish script injects a new base64 payload into the existing `hordes/index.html`; it does NOT copy `gdd.html` into `hordes/`. If either handler's description drifts toward "copy" instead of "inject", flag HIGH severity — that mismatch directly causes the regex bug pattern logged in memory `publish_gdd_regex_bug_lesson`.

### Email drift between YaC and YaE

YaC uses `auth@yesandeverything.com` for magic-link auth (Resend SMTP), and historically used `chains@yesandeverything.com` for feedback. Per v0.25.2 the feedback inbox moved. If the YaC CLAUDE.md still says `chains@yesandeverything.com` for feedback, that's HIGH severity — Claude will quote the wrong address in user-facing copy.

### DNS state for yesandeverything.com

Both YaC and YaE CLAUDE.md mention DNS state. Per the dated note in both ("registrar transfer from Squarespace pending 5-7 days from 2026-05-06"), this is a time-bound claim. After the transfer window closes (~2026-05-13), the claim is stale by definition even if no one updated either handler. Flag MEDIUM and recommend a refresh.

### Version pill cross-check on YaC

YaC's CLAUDE.md says "Pre-1.0, currently at v0.25.2 (2026-05-13)". The actual canonical pill lives in `CONTEXT.md`. If `CONTEXT.md` has moved past 0.25.2, the handler is lagging. This is the most-frequent drift pattern across the four handlers because the version moves often and the handler doesn't auto-bump.

## What not to do

- Don't audit other CLAUDE.md files outside the four named paths. The user can run this skill again with a different scope, but the default is the four handlers only.
- Don't refactor the handlers. The skill checks alignment; it doesn't redesign the primer structure.
- Don't flag every cosmetic phrasing inconsistency. Group small wording drift under a single LOW bullet.
- Don't leave the user with a wall of text. The TL;DR has to be short. Findings can be long; the summary cannot.
- Don't silently auto-fix without an explicit "fix as you go" signal. Report-only is the default for a reason — these files run at the top of every session, and a bad auto-fix has compounding cost.

## Output destination

Default report path:

```
X:\YesAndEverything\docs\HANDLER_AUDIT-YYYY-MM-DD.md
```

Use today's actual date in `YYYY-MM-DD` format. Create the `docs/` folder if it doesn't exist (YaE may not have one yet — the YaE handler doesn't list `docs/` in its files-at-a-glance table). If a report exists for today, append a new section rather than overwriting. Audit history is itself useful.
