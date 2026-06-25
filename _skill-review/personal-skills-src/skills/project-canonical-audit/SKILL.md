---
name: project-canonical-audit
description: Cross-reference a project's canonical design doc against its actual code to surface stale claims, missing implementations, and version drift. Chains into backlog-hygiene so the BACKLOG side gets audited in one pass. Use whenever the user asks to audit a repo, verify the GDD/DESIGN/PROJECT_SPEC matches reality, check for documentation drift, confirm the roadmap against what is built, or validate descriptions and product plans against the codebase. Also trigger on `is the design doc still accurate`, `do the docs match the code`, `what's stale in the GDD`, `audit X`, or any request to walk a canonical doc against the code. Auto-detects project type (Godot, web app, static site, library) for which doc is canonical. After writing findings, hands off to backlog-hygiene for the BACKLOG sweep, and includes a queue-these section so drift-auto-fix and work-queue-runner can pick up the fixes.
---

## Step 0: Load project context (schema v1)

Before doing anything project-specific, read `<project-path>/.project-context.json` (schema v1; see `X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` for the full schema).

Use it to drive:
- `canonical_docs` — which doc files to walk
- `locked_decisions_log` — where decisions live for cross-reference
- `backlog_path` — feeds the backlog-hygiene hand-off
- `version_pill_locations` — version-drift check

If the file is missing or its `schema_version` is unsupported, fall back to reading the project's `CLAUDE.md` prose. Log a queue item asking Nick to add or migrate the context file.


# Project canonical-doc audit

Audit a project's canonical design doc against its actual code state. Find what's stale, what's contradicted, what's missing, and what's correctly aligned. Optionally apply low-risk text fixes.

## Why this exists

Design docs drift from code faster than anyone wants to admit. A locked decision from three weeks ago might describe a feature that got renamed; a roadmap "✓ done" might point at a file that never landed; a sprite-tuning table might reference a version that's seven point releases stale. Each discrepancy is small, but cumulatively they erode the doc's authority as a source of truth — and once the doc isn't trusted, the project loses the cheap onboarding any future contributor would otherwise get.

This skill walks the doc, walks the code, and surfaces the drift. It does *not* refactor architecture or invent new features — it strictly checks that what the doc claims matches what's on disk.

## When to use this

Trigger on requests like:
- "Audit my docs vs. the code"
- "Is the GDD still accurate"
- "Make sure the design doc and the code agree"
- "What's stale in the roadmap"
- "Verify that the descriptions match what we've built"
- "Do a doc-vs-code drift check"

Also trigger proactively after major shipping pushes ("we just shipped M2, audit the doc") and before public-facing milestones (releases, recruitment posts, demo days) where doc-code mismatch would be embarrassing.

## How to run an audit

Follow these phases in order. Each phase produces evidence that feeds the next.

### Phase 1 — Identify the canonical doc(s)

A project has *one or more* canonical docs. Look in this order:

| Filename (case-insensitive) | Typical project type |
|---|---|
| `docs/GDD.html`, `docs/GDD.md` | Game design |
| `docs/DESIGN.md` | Web app, library |
| `PROJECT_SPEC.md` | Specification-led project |
| `CONTEXT.md` | Multi-file canonical layer (vocabulary + changelog) |
| `ROADMAP.md` | Roadmap-driven project |
| `CLAUDE.md` | Handler layer (often points to the actual canonical) |
| `README.md` | Fallback if nothing else exists |

If multiple are present, treat each as canonical for its slice (e.g., PROJECT_SPEC = vision, ROADMAP = state, BACKLOG = deferred). The audit covers all of them, not just one.

If a `CLAUDE.md` exists, read it first — it almost certainly tells you which doc is the source of truth and what to expect.

### Phase 2 — Identify version markers

Find every place the project tracks its version, so the audit can flag mismatches.

| Location | Where |
|---|---|
| `project.godot` `config/version=` | Godot projects |
| `package.json` `"version":` | Node / web projects |
| Version pill in HTML canonical doc (often a `<span class="meta-pill">vX.Y.Z</span>` near the title) | Game-design-style HTML docs |
| Top of `CONTEXT.md` "Version & changelog" section | YaC-style projects |
| Recent commit messages: `git log --oneline -10` (look for `vX.Y.Z` patterns) | Any git repo |

Note all of them. If they disagree, that's finding #1 of the audit.

### Phase 3 — Extract claims from the canonical doc(s)

This is the substantive read. Walk the doc and harvest:

- **Locked decisions** — Anything in a "Locked Decisions" section, "✓" or "DONE" marker, or status field showing `done` / `shipped` / `complete`.
- **Roadmap items** — Especially milestones and their deliverables. Each "✓" item is a claim that needs verification.
- **Status fields** — In tables, look for `todo` / `placeholder` / `have` / `wired` / `done` columns. Each row is a claim.
- **File references** — Any path the doc mentions (`source/units/scout.gd`, `assets/art/buildings/foo.png`). The file should exist at that path.
- **Feature references** — Named units, buildings, systems, endpoints, screens. Each one should have a corresponding implementation in code (script, scene, route, component).
- **Date stamps** — Tables labeled "as of YYYY-MM-DD" or "last updated YYYY-MM-DD". If older than the most recent change to the things the table describes, the table is probably stale.

Don't list every paragraph — focus on items the doc *commits to* being a certain way.

### Phase 4 — Cross-reference against the codebase

For each claim from Phase 3, check the code:

- **File exists?** `ls` / `Read` the claimed path. Missing = stale claim.
- **Feature implemented?** For a unit / building / endpoint / component, find the corresponding source file (`.gd`, `.ts`, `.tsx`, etc.). Read the head of it. Confirm it's not just a stub.
- **Wired in?** For game entities, check the central registry (a `TRAIN_RECIPES` dict, a `SCENES_BY_NAME` dict, a routing table, a HUD button map). A unit can exist on disk but not be reachable in the running game.
- **Asset present?** For sprite paths, terrain assets, etc., confirm the actual PNG / OGG / .tres file is in the project.

Don't over-read — pull the first 30 lines or grep for the symbol. The goal is presence-verification, not code review.

### Phase 4.5 — FUSE truncation gate (run before flagging ANY working-tree truncation)

The `X:\` FUSE mount intermittently serves a **stale, short read right after a write** — the same gremlin that makes `tools/safe_write.py`'s single-shot read-back throw spurious `AssertionError`s. The deterministic fix already in the tree is `X:\YesAndChains\tools\audit_dashboard.py`, whose `_write_verified` **retries then re-confirms by re-reading** rather than trusting one read. A working-tree tail that merely *looks* chopped mid-word is therefore **not** evidence of truncation.

This has already bitten this skill. On 2026-06-23 and 2026-06-24 the YaC audit raised a CRITICAL/P0 claiming `CONTEXT.md`, `BACKLOG.md`, and `CLAUDE.md` were FUSE-truncated in the working tree; both were later proven **FALSE POSITIVES** — the committed files were whole, every "lost" changelog entry / backlog section / handler section present, and `git diff` showed additions only with no tail deletions. The cost is not academic: the dashboard audit-sync (`tools/audit_dashboard.py` → `status/data/<project>.json`) faithfully pushes whatever the latest report says, so one phantom CRITICAL lights a red critical chip on the YaE status dashboard and erodes trust in the entire audit.

**Rule: never emit a truncation finding above LOW from a single raw tail read.** Prefer git over the working-tree read, require a content-level signal, and confirm it survives a re-read. All four checks below must hold, or downgrade/drop the finding.

1. **Git diff is the primary signal — not the raw tail read.** Run `git diff --numstat HEAD -- <file>`.
   - **No diff** → the working tree equals HEAD; a "chopped tail" you read is a stale cache, not truncation. **Drop it.**
   - **Modified** → read the actual hunks (`git diff HEAD -- <file>`). Genuine FUSE truncation shows **trailing-line deletions** (`-` lines at the very end of the file, not replaced). **Additions-only (all `+`, no tail `-`) is not truncation**, no matter how the raw tail looks — that was the exact 06-24 false-positive shape. Net byte count is meaningless (06-24's `CONTEXT.md` grew; its `CLAUDE.md` was byte-identical to HEAD) — **never use size as the signal**, as the skill already knows.

2. **Content-level marker, not a byte/size heuristic.** Identify the file's known trailing marker (`.html` → `</html>`; `CONTEXT.md` → its oldest changelog entry; `BACKLOG.md` → the trailing `Logged …` line; a handler `CLAUDE.md` → its final "When in doubt" item). Truncation means that **specific** marker is gone **and git confirms it deleted** — not merely that the last bytes you happened to read end mid-word.

3. **Re-read to defeat the stale cache.** Re-read the file tail **2–3 times with a short (~0.5s) gap**, or re-run `git show HEAD:<file> | tail` against the working-tree tail. Treat the truncation as real **only if it is stable across every re-read**. A tail that "heals" on a later read was a stale cache — drop it silently (do not even log it as LOW). This mirrors `audit_dashboard.py`'s retry-then-reconfirm loop.

4. **Cross-check HEAD.** `git show HEAD:<file> | tail -c 200`. If HEAD's tail is whole and the only apparent loss is an uncommitted working-tree read that fails checks 1–3, the canon is safe — at most note a possible transient mount read under "Couldn't verify," never as CRITICAL.

**Decision table:**

| `git diff HEAD -- <file>` shows | tail stable across re-reads? | marker actually deleted in git? | verdict |
|---|---|---|---|
| no diff (clean) | — | — | **stale read — drop** |
| additions only, no tail `-` | — | — | **stale read — drop** (the 06-24 shape) |
| trailing `-` deletions | no (heals on re-read) | — | **stale read — drop** |
| trailing `-` deletions | yes | no | downgrade — investigate, not CRITICAL |
| trailing `-` deletions | yes | yes | **real truncation — CRITICAL/P0** |

Only the last row earns a P0. When a finding is dropped as a stale read, **do not mention it in "Drift found" at all** — a "phantom we dismissed" line placed near a severity token still trips the dashboard's severity parser (`audit_dashboard.py` counts `[CRITICAL|HIGH|MEDIUM|LOW]` tags inside `## Drift found`). If git genuinely can't run here (detached / no repo), say so under "Couldn't verify" and **cap the finding at LOW** pending a git-backed recheck — never ship a CRITICAL on an unverifiable tail read.

### Phase 5 — Check repo-level metadata

Each adds independent value:

- **Repo description** — If `gh` CLI is available, run `gh repo view --json description,homepageUrl,repositoryTopics,isPrivate`. Compare against the project's vision statement / one-line pitch in the canonical doc. Vaguer description = soft drift. Missing description = gap.
- **README** — Exists at root? Mentions the canonical doc? Vision statement matches?
- **CLAUDE.md handler** — Exists? Up to date? Points to the canonical doc?

If `gh` isn't installed and the repo is private, ask the user to paste the relevant fields from github.com manually, OR skip and report what you couldn't verify.

### Phase 6 — Produce the findings report

Structure:

```markdown
# [Project] canonical-doc audit — YYYY-MM-DD

## TL;DR
[1-2 sentences. State whether the doc is mostly aligned or has significant drift.]

## What's aligned (no fix needed)
[Bullet list of confirmed-correct items — most of the audit. Skipping this section is a mistake; it tells the user the canonical layer is mostly trustworthy.]

## Drift found
[Numbered items. Each finding follows the bar-raise REPORT_CONTRACT shape so all audit-family output is machine-readable: `id` (kebab slug, stable across runs), `severity` (high|medium|low), `impact` (1-5, how much the project suffers if left alone), `confidence` (1-5, evidence solidity; speculation caps at 2), `evidence` (doc location + code path/line), `finding` (one sentence: doc claims X, code shows Y), `suggested_action` (one imperative sentence), `tensions_with` (other concerns the fix could degrade; usually empty for doc drift). Evidence is required above LOW.]

## Suggested fixes
[Numbered actions. For each: exact text/file change. Tag as low-risk (text alignment) or structural (needs user decision).]

## Couldn't verify
[Anything blocked by missing tools, private repo metadata, etc.]
```

Keep findings sorted by severity (date stamps first, then version pills, then roadmap checkboxes, then small phrasing drift).

### Phase 7 — Apply low-risk fixes (only if asked)

The skill defaults to **report-only**. Don't edit unless the user explicitly says "fix as you go" / "apply low-risk fixes" / "make the changes."

When applying:
- ✓ **Low-risk**: text alignment in canonical doc, status flags (`todo` → `placeholder` when assets are confirmed on disk), version pill bumps, table refreshes (e.g., the "currently used assets" list).
- ✗ **Always ask first**: deleting files (especially staleness tombstones), bumping engine/package versions, creating new files like README from scratch, changing architecture descriptions.

If you do apply fixes, log them in the canonical doc's own changelog under a new PATCH entry — don't silently edit the doc and leave no audit trail.

### Phase 8 — Auto-enqueue the "Queue-these" section (REQUIRED, not optional)

**This phase is mandatory on every run, even when invoked by a scheduled task with no chat prompt.** Historically the audit wrote a `## Queue-these` section to its findings file and relied on a separate manual step to translate that into `.work-queue.json` entries. The handoff failed often. The 2026-05-17 canonical audit named four items in its Queue-these section; two days later, zero of them had been enqueued. This phase closes that gap.

For each item in the audit's `## Queue-these` or `## Suggested fixes` section that wasn't already shipped during Phase 7:

1. Read `X:\YesAndEverything\.work-queue.json` (top-level `items` array).
2. Skip if an existing item with the same `id` already lives there (idempotency check). The `id` field is the kebab-case slug the audit assigns each finding.
3. Otherwise append a new item with this shape:

   ```json
   {
     "id": "<project>-<short-slug>-<NNN>",
     "added": "YYYY-MM-DD",
     "project": "<htbh|yac|scheduler|yae|yaa>",
     "kind": "drift-fix" | "structural",
     "auto_safe": true | false,
     "priority": "P0" | "P1" | "P2" | "P3",
     "status": "pending",
     "prompt": "<one-paragraph instruction the drain task can execute>",
     "source": "YYYY-MM-DD canonical audit",
     "severity": "high" | "medium" | "low",
     "impact": 1-5,
     "confidence": 1-5,
     "evidence": "<doc location + code path/line the finding rests on>",
     "tensions_with": []
   }
   ```

   The last five fields carry the originating finding's REPORT_CONTRACT data through to the queue, so drain sessions and the bar-raise synthesis rank queue items the same way lens findings are ranked (impact x confidence). Priority maps from severity: HIGH -> P1, MEDIUM -> P2, LOW -> P3 (P0 only for hard-rule breaches like a committed secret).

4. `auto_safe=true` only for doc-only text edits the drain can ship without your judgment (version pill bumps, typo fixes, table-row corrections). Anything touching code, architecture, deletions, or values that need a decision is `auto_safe=false`.
5. Save `.work-queue.json` back as pretty JSON (2-space indent) and update its top-level `updated` field to the current ISO timestamp.

After enqueueing, list every item added (id + project + auto_safe) at the bottom of the findings report under `## Auto-enqueued`. If zero items were added because everything was already in the queue, say so explicitly: `Auto-enqueued: 0 (all items already present in .work-queue.json)`.

**If `.work-queue.json` is missing or unparseable, do not silently skip.** Write `## Auto-enqueue FAILED` at the bottom of the findings file with the error message, plus a copy of every item that *would have been* enqueued in JSON form so they can be pasted in by hand later.

## Special cases by project type

### Godot games

- Canonical: `docs/GDD.html` typically
- Version pill: usually inside a `<span class="meta-pill">vX.Y.Z</span>` near the top, plus `project.godot` `config/version`
- Roadmap: usually a `<section id="tab-roadmap">` with milestone divs
- Cross-reference: `source/{buildings,units,enemies,systems}/*.gd` for entity implementations
- Wiring registries: `TRAIN_RECIPES`, `SCENES_BY_NAME`, HUD build-menu maps

### Web apps (Node + TS)

- Canonical: `docs/DESIGN.md` or `PROJECT_SPEC.md`
- Version: `package.json` `version` field
- Cross-reference: routes in `apps/api/`, components in `apps/web/`, migrations in `migrations/`
- Wiring: route registration, navigation links

### Static sites

- Canonical: `DEPLOY.md` + `index.html`
- Version: usually informal — recent commit messages
- Cross-reference: linked sub-pages exist; CNAME matches custom domain; deploy steps match GitHub Pages settings

### Multi-file canonical (YaC pattern)

- Canonical layer: PROJECT_SPEC + CONTEXT + ROADMAP + BACKLOG + DECISIONS_NEEDED, each owning a distinct slice
- Audit each file against its declared role: PROJECT_SPEC shouldn't contain status, ROADMAP shouldn't contain vision, etc.
- Check for "phantom references" — one doc referencing a file that doesn't exist
- **Truncation findings on these large `.md` canon files (`CONTEXT.md`, `BACKLOG.md`, `CLAUDE.md`) are the highest-risk false positives** — they are big, edited often, and live on the FUSE mount. Run the **Phase 4.5 FUSE truncation gate** before flagging any of them; a raw mid-word tail is not enough.

## What not to do

- **Don't refactor architecture.** This skill checks alignment. It doesn't redesign.
- **Don't propose new features.** If a feature isn't in the canonical doc, the audit's job is to ask whether the *code* should be removed or the *doc* should be updated — not to propose v2 features.
- **Don't be exhaustive about minor phrasing drift.** Group small wording inconsistencies under a single bullet ("phrasing slightly drifted across §3, §5, §8") rather than fifteen separate findings.
- **Don't leave the user with a wall of text.** Keep the TL;DR genuinely short. The full findings can be long; the summary cannot.

## Output destination

By default, write the findings report to the project's own `docs/` folder (or root if no `docs/` exists) as `CANONICAL_AUDIT-YYYY-MM-DD.md`. The user can move it, but landing it in the repo means the next session sees the previous audit's results and can build on them.

If the project already has a `CANONICAL_AUDIT.md`, *append* a new dated entry rather than overwriting — audit history is itself useful.
