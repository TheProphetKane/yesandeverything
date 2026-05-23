---
name: backlog-hygiene
description: Maintain a project's backlog file by marking shipped items DONE, surfacing stale cross-references, and flagging redundant or superseded rows. Use whenever the user asks to clean up the backlog, mark backlog items done, scan for stale references, audit the backlog, do backlog hygiene, sweep the BACKLOG, reconcile the backlog against recent commits, ask "what backlog items have shipped", or otherwise wants the backlog file aligned with what's actually been done. Works on both markdown-table backlogs (YaC `BACKLOG.md` style with priority emojis) and JS-object-array backlogs (HBH `docs/GDD.html` backlog tab style). Defaults to report-only — never edits without an explicit "go" / "apply" from the user.
---

# Backlog hygiene

Walk a project's backlog file, cross-reference it against recent git activity, and surface what's shipped, what's stale, and what's redundant. Optionally apply the fixes once the user signs off.

## Why this exists

Backlogs rot faster than any other doc in a repo. An item ships and the commit gets made — but updating the backlog row falls off the end of the to-do list. Three months later the backlog claims thirty things are still pending when half of them already shipped, and the file's authority collapses. Future-you doesn't trust it; new collaborators can't use it for onboarding; the priority signal (P0 / P1 / P2) becomes meaningless.

This skill fixes the rot without rewriting the backlog. It checks recent git history against backlog IDs, flags drift, and produces a report. The user reviews. Only on explicit approval does the skill touch the file.

## When to use this

Trigger on requests like:
- "Clean up the backlog"
- "Mark backlog items done"
- "What backlog items have shipped"
- "Backlog hygiene"
- "Audit the backlog"
- "Scan for stale references"
- "Sweep the BACKLOG"
- "Reconcile backlog against recent commits"

Also trigger proactively after major shipping pushes ("we just shipped M3, sweep the backlog") and before milestone reviews.

## How to run

Run these phases in order. Each phase produces evidence for the next.

### Phase 1 — Identify the backlog target

The skill works on two known formats. Auto-detect by inspecting the working repo:

| Repo signal | Target format | File path |
|---|---|---|
| `BACKLOG.md` exists with rows like `\| 0.5 \| **...** \| ✅ DONE 2026-MM-DD \|` | YaC markdown table | `BACKLOG.md` |
| `docs/GDD.html` contains `<tbody id="backlog-body">` + JS array of `{ id: 'S-..', ... }` objects | HBH JS-array | `docs/GDD.html` |

If both are present (multi-repo session), ask the user which to target. If neither is present, ask the user to point at the file. **Never invent a backlog file that doesn't exist.**

Record the format choice — it dictates every later phase (parsing, ID regex, fix syntax).

### Phase 2 — Read recent git activity

Walk the last N commits (default 50; ask if the user wants more). Use `git log --oneline -n 50` plus `git log --pretty=format:"%h|%ad|%s" --date=short -n 50` to get short SHA, date, and subject.

Per format, the **backlog ID regex** to scan in commit messages is:

| Format | ID pattern | Examples |
|---|---|---|
| YaC | `§?(\d+(?:\.\d+)*[a-z]?)` | `§0.5`, `0.5`, `§22a`, `§2.1.6` |
| HBH | `\b([SFPEMUWT])-\d{2}\b` | `S-12`, `F-09`, `P-04` |

Both: also scan for `vX.Y.Z` version refs — those help cross-check Phase 4 stale-version findings.

Group commits by ID. Multiple commits per ID is common (an item often ships across 2-4 commits). Use the **most recent** commit's date + SHA as the "shipped" stamp.

If a commit has no ID, ignore it. **Don't try to match commits to backlog rows by description text** — too noisy, too easy to mis-attribute.

### Phase 3 — Propose DONE markings

For each backlog ID present in recent commits, check its row in the backlog file:

- If already marked DONE / `status: 'done'`, skip silently.
- If still open, draft a proposed update.

The proposed update must match the file's existing convention **exactly**. Examples:

**YaC markdown:**
```
| 0.5 | **Stand up custom SMTP** | ✅ DONE 2026-05-06 | <existing notes preserved> Shipped in `abc1234`. |
```
Insert `✅ DONE YYYY-MM-DD` into the **Tag** column (column 3). Keep existing notes. Append a `Shipped in \`<sha>\`.` sentence at the end of the notes if no commit ref is already there.

**HBH JS object:**
```javascript
{ id: 'S-12', title: 'Wave director', cat: 'systems', prio: 'P0', status: 'done', notes: '<existing notes> Shipped v0.26.42 (abc1234).' },
```
Change `status: 'in-progress'` (or `'todo'`) to `status: 'done'`. Append `Shipped vX.Y.Z (<sha>).` to notes if no version+commit ref exists.

**Conservative rules for the DONE proposal:**
- Preserve every other field on the row untouched.
- Use the commit date, never today's date, for the DONE stamp.
- Use **short SHA** (7 chars) — `abc1234`, not the full 40-char hash.
- The "what shipped" 1-liner comes from the commit subject (or the most descriptive of the cluster). Don't paraphrase or invent.
- If the backlog row's existing notes already say "shipped" or "DONE", don't double-stamp — flag in the report instead.

### Phase 4 — Scan for stale cross-references

Walk the backlog file for references that no longer resolve:

**Both formats:**
- File path mentioned (e.g., `docs/launch-checklist-1.0.md`, `migrations/0003_*.sql`) — confirm the file exists. Missing path = phantom reference.
- Sibling-doc reference (e.g., `PROJECT_SPEC.md §3`, `DESIGN.md §8`) — confirm the referenced section exists.
- Cross-row reference (e.g., `see §22a`, `see S-04`) — confirm the referenced row still exists in the backlog.

**YaC-specific:**
- Look for references to `PRIORITY_QUEUE.md` — that file is tombstoned and replaced by `docs/launch-checklist-1.0.md`. Every PQ ref is stale.
- Migration filenames sometimes get renumbered. Spot-check by `ls migrations/`.
- ADR references — `ADR 0012`, `ADR 0013` — confirm the corresponding file exists in `docs/adr/`.

**HBH-specific:**
- Notes mentioning `see v0.X.Y` — confirm the version exists in the changelog footer. If the version exists **and** the row is still `status: 'todo'`, flag it as "either the item shipped and wasn't closed, or the changelog cites the wrong version."
- File references like `source/systems/wave_director.gd` — confirm the file exists.

Report each stale ref with: the row it appears in, the broken reference, and (if known) what the fix would be.

### Phase 5 — Scan for redundancy

This is the hardest phase — be conservative.

- **Two rows describing the same work.** Look for title/notes overlap. Don't aggressively merge; just flag candidates and let the user decide.
- **Superseded rows.** A row that says "Re-scoped into §X" or "Replaced by S-NN" but isn't marked `✅ SUPERSEDED` / `status: 'done'`. Propose flipping its status.
- **Empty sections.** A `## N. Section name` block where every row is already `✅ DONE` (YaC) or `status: 'done'` (HBH). Especially common for the "Action items waiting on the user" section. Propose collapsing the section under a `<details>` block or moving it to an "archived" header — **do not delete**.

For each redundancy candidate, write a 1-line "what to do" recommendation (merge / supersede / archive / keep). Default recommendation: **keep**, unless evidence is unambiguous.

### Phase 6 — Report findings

Write the report as markdown. Default to printing inline in the chat — only write a file if the user asked to save it.

Structure:

```markdown
# Backlog hygiene — <Project> — YYYY-MM-DD

## TL;DR
[1-2 sentences. N items proposed DONE, M stale refs, K redundancy candidates.]

## Items to mark DONE (N)
- §0.5 SMTP setup (shipped 2026-05-06, commit `abc1234`) — Stand up custom SMTP on yesandeverything.com
- S-12 Wave director (shipped v0.26.42, commit `def5678`) — Wave director v0 first cut
...

## Stale cross-references (M)
- §21 references `PRIORITY_QUEUE.md` (tombstoned — should be `docs/launch-checklist-1.0.md`)
- §2.1.6 cites commit `0575bbe` — confirmed present in git log, no action
- S-23 notes mention `source/systems/triage.gd` — file does not exist
...

## Redundancy (K)
- §22a is marked SUPERSEDED in notes but tag is still 🟡 P1 — flip tag to ✅ SUPERSEDED
- §0 "Action items waiting on the user" — all 6 rows are ✅ DONE; propose archive under <details>
- S-05 and S-06 describe overlapping worker/energy logic — review whether they're really separate (recommend: keep)
...

## What I won't touch
[Anything ambiguous, anything that needs a real product call, anything that would delete a row outright.]
```

Sort each section by ID. Don't bury the lede — the "Items to mark DONE" section is the most actionable.

### Phase 7 — Apply fixes (only on explicit "go")

**The skill defaults to report-only.** Print the report and stop. Do not edit the backlog file.

Apply fixes only if the user explicitly says one of:
- "go"
- "apply"
- "apply the fixes"
- "make the changes"
- "do it"

Even then, apply **only** what's in the report. Don't expand scope — if you noticed something new mid-edit, surface it as a follow-up question, not a silent change.

**When applying:**
- ✓ **Safe**: Adding `✅ DONE YYYY-MM-DD` markers, changing `status: 'todo'` → `status: 'done'`, appending `Shipped in <sha>` to notes, fixing stale path references where the new path is unambiguous.
- ✗ **Always ask first**: Deleting any row, merging two rows into one, archiving a whole section, changing priorities (P0/P1/P2), renaming IDs.

### Conservative rules (apply across every phase)

These rules override convenience. The backlog is append-only-ish; mistakes propagate forever.

- **Never delete a row outright.** Mark `✅ DONE` or `✅ SUPERSEDED` and keep the row in place.
- **Never reorder existing rows.** The natural ordering carries information (chronology, grouping, priority). Add new metadata in-place.
- **Preserve exact formatting.** Spaces vs. tabs, blank lines, emoji style (`✅` vs `[x]`), trailing punctuation — match what the file uses. Read the file before editing to lock in the format.
- **Never invent backlog IDs.** If a commit message doesn't reference an ID, **don't** match by title/description similarity. Better to under-mark than over-mark.
- **Never invent commit SHAs or dates.** Always pull from `git log`.
- **Preserve existing notes.** When adding `Shipped in <sha>` to a row, append — never overwrite or rewrite the existing notes.
- **Don't touch unrelated files.** The skill works on the backlog file only. If a stale cross-ref points at another doc that needs updating, surface it in the report; don't fix it.

## Format-specific reference

### YaC `BACKLOG.md`

- File: `BACKLOG.md` at repo root.
- Each section header: `## N. Section name`.
- Each table: 4 columns — `# | Item | Tag | Notes`.
- Priority emojis: `🔴 P0` / `🟡 P1` / `🟢 P2` / `⚪ P3`.
- Done markers: `✅ DONE` / `✅ DONE YYYY-MM-DD` / `✅ DONE 0.5.52 (\`0575bbe\`)` / `✅ SUPERSEDED`.
- Notes can be multi-paragraph with inline `<br><br>` HTML — Markdown renders inside table cells loosely. Preserve `<br>` exactly.
- IDs: dotted decimals like `0.5`, `2.1.6`, `22a`.

### HBH `docs/GDD.html` Backlog tab

- File: `docs/GDD.html`.
- Locate the JS array: search for `const BACKLOG = [` (around line ~3370). It runs ~200 rows.
- Each row: `{ id: '...', title: '...', cat: '...', prio: '...', status: '...', notes: '...' },`.
- `cat` values: `foundation` / `systems` / `units` / `enemies` / `world` / `ui` / `missions` / `polish` (and possibly others — check live values).
- `prio` values: `P0` / `P1` / `P2` / `P3`.
- `status` values: `todo` / `in-progress` / `blocked` / `done`.
- IDs: letter prefix + 2-digit number — `F-02`, `S-12`, `U-04`, `E-07`, `P-11`, `M-03`, etc.
- The render function is just below (`renderBacklog()`). The audit doesn't need to touch that — only the data array.

When editing the HBH GDD: **also bump the version pill and add a changelog entry** per the HBH CLAUDE.md hard rule. The backlog edit is itself a GDD change.

## What not to do

- **Don't refactor the backlog structure.** Don't propose moving a section, renumbering IDs, switching from emoji tags to text tags, etc. That's a separate request.
- **Don't write a new backlog file.** If the file is missing, ask the user — don't scaffold.
- **Don't be exhaustive about minor wording drift.** Group small phrasing inconsistencies under a single bullet rather than fifteen findings.
- **Don't propose closing items based on vibe.** If the commit doesn't reference the ID and the row isn't clearly stale, leave it open.
- **Don't repeat the entire backlog back in the report.** The report only covers items that changed or need attention.

## Output destination

By default, print the findings report inline in the chat. The user reads, decides, and either approves or asks for revisions.

If the user asks to save the report, write it to the project's `docs/` folder (or root) as `BACKLOG_HYGIENE-YYYY-MM-DD.md`. Append rather than overwrite if a prior hygiene report exists from the same day.
