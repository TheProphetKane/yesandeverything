---
name: adr-promoter
description: Promote a lock-signal decision in chat into a written entry in the project's decision log (or a full ADR for architectural calls). Use when the user says "lock this", "lock it in", "promote this to a locked decision", "make this an ADR", "make it official", "log this decision", "add to decisions", or any time Nick fires a lock signal ("perfect" / "ideal" / "exactly how I want it") on a value that hasn't been written down yet. Routes to the right log per project — GDD Locked Decisions for HBH, DECISIONS_NEEDED.md for YaC, DESIGN.md §23 for Scheduler, docs/adr/ for substantive architectural choices on YaC or Scheduler. Also supports a backfill mode that scans recent chat for un-promoted lock signals.
---

# adr-promoter

Convert a lock-signal moment in chat into a persistent decision-log entry. Lock signals — "perfect", "ideal", "exactly how I want it", "lock it in", "make it official" — promote a value out of tuning and into a written record. Nick has explicit memory rules around this (`feedback_lock_signals`); honor them.

## Modes

- **Inline.** Append a structured entry to the project's decision log. Default for tuning values, locked tags, copy choices, schema field renames, scope cuts.
- **ADR.** Generate a numbered file under `docs/adr/` following the Michael Nygard template. Default for framework choice, persistence model, API contract, cross-system pattern, anything you'd want to link back to from code comments.
- **Backfill.** Scan recent chat (or a passed-in transcript) for un-promoted lock signals, list each with its draft entry, prompt to apply.

## Procedure

### Phase 1 — Detect the lock signal

Listen for these phrases in the user's most recent turns:

- "perfect"
- "ideal"
- "exactly how I want it"
- "lock it in"
- "lock this in"
- "make it official"
- "promote this"
- "log this decision"
- "add this to decisions"

If none of those fired but the user is explicitly invoking this skill, ask: *what value are we locking?* Don't guess.

When a phrase fires, identify the **referent** — what specifically did the lock signal land on? Look at the immediately preceding assistant message and the prior 2-3 turns. If the referent is ambiguous (multiple candidate values discussed), ask once before drafting.

### Phase 2 — Identify the project

Match against the working directory and the project CLAUDE.md primer. The four projects and their primary decision logs:

| Project | Primary log | ADR home |
|---|---|---|
| HBH (`X:\HereBeHordes`) | `docs/GDD.html` Decisions tab, "Locked Decisions" section | none — GDD-only |
| YaC (`X:\YesAndChains`) | `DECISIONS_NEEDED.md` | `docs/adr/NNNN-*.md` |
| Scheduler (`X:\Scheduler`) | `docs/DESIGN.md` §23 Open Questions (move to "Closed") | `docs/adr/NNNN-*.md` (not yet seeded) |
| YaE (`X:\YesAndEverything`) | no formal log — call it out, suggest creating one | n/a |

If the project is unclear, ask. Don't write into the wrong repo.

### Phase 3 — Inline or ADR

Decide by substance, not by length. Use ADR when the decision:

- Picks a framework, library, or vendor.
- Sets a persistence model, schema shape, or migration policy.
- Defines an API contract or cross-system protocol.
- Locks an architectural pattern (caching strategy, sync model, auth flow).
- Would be useful to link back to from code comments months from now.

Use inline when the decision:

- Tunes a number (HP, cost, speed, tier threshold).
- Locks a copy/UX string or a tag list.
- Cuts or defers a feature.
- Renames a field or function.
- Decides a binary product question that doesn't ripple architecturally.

When in doubt, prefer inline — ADRs that should have been inline are noisier than the reverse.

### Phase 4 — Draft the entry

Match the project's existing format exactly. The differences matter.

**HBH (GDD Locked Decisions, `docs/GDD.html` ~line 2199):**

```html
<div class="decision locked">
  <div class="d-header"><span class="d-title">SHORT TITLE</span><span class="d-date">YYYY-MM-DD</span></div>
  <p class="d-body">One paragraph. State the decision in solo-dev voice (no "per Nick", no em dashes, no AI framing). Explain why briefly. Reference the relevant §section at the end in parens. Note which version locked it if relevant.</p>
</div>
```

Insert at the top of the `Locked Decisions` block (immediately after the intro `<p>`). Bump the GDD version pill and add a changelog entry — that's required on every HBH reply anyway.

**YaC (`DECISIONS_NEEDED.md`):**

Find or create today's `## ✅ Answered YYYY-MM-DD` heading. Append a numbered entry:

```markdown
### N. Short topic name
**Answer:** What was decided, in Nick's voice if possible. One paragraph.

**Implication for code:** What this changes — files touched, fields renamed, paths added, items moved to or from BACKLOG.
```

Number continues from the previous entry under the same date. If a new date heading is being created, start at 1.

**Scheduler (`docs/DESIGN.md`):**

Two cases:

- If the locked item maps to an existing §23 Open Question, rewrite that paragraph in place to state the resolution and move it to a new `## 23a. Closed Decisions` block (create if missing).
- If it's a new closed decision with no prior question, append directly under `## 23a. Closed Decisions`. One paragraph each, dated.

**ADR (YaC + Scheduler, `docs/adr/NNNN-short-decision-title.md`):**

Number = max existing ADR number + 1, zero-padded to 4 digits. Filename is kebab-case slug of the title. Template:

```markdown
# NNNN. Title

Date: YYYY-MM-DD
Status: Accepted

## Context

Why this decision came up. What problem it solves. What forces are in play.

## Decision

What was decided, concrete and specific. If alternatives were considered, name them and say why they lost.

## Status

Accepted. (Or "Proposed" / "Superseded by NNNN" if applicable.)

## Consequences

What this implies — code paths affected, future work unlocked or blocked, trade-offs accepted.
```

Match the voice and depth of the existing ADRs in the repo. YaC ADRs 0001-0017 are the reference set; read 1-2 nearby ones for tone calibration before drafting. Also update `docs/adr/README.md` index with the new entry — match the existing one-line summary format.

### Phase 5 — Show and confirm

Show the draft entry inline in chat. State exactly which file(s) will be touched and where the insertion goes. Wait for confirmation before applying. After applying, on HBH only, also bump the GDD version pill and add a changelog line (the GDD-update rule applies regardless of which skill ran).

For ADRs on YaC, after applying, mention that this might warrant a release-script run if it's tied to code changes already on disk — don't run it without being asked.

## Backfill mode

When invoked as `/adr-promoter backfill` or with phrasing like "scan for un-promoted decisions":

1. Read the most recent N chat turns (default 30) or the explicit transcript handed in.
2. Grep for the lock-signal phrases listed in Phase 1.
3. For each hit, identify the referent and the project.
4. Cross-check against the current decision log — if the referent is already logged, skip with a note.
5. For each remaining hit, print: timestamp/turn marker, the lock-signal quote, the inferred referent, the inferred project, and a one-paragraph draft entry.
6. Ask which to apply. Apply in one batch on confirmation.

If nothing un-promoted is found, say so. Don't manufacture decisions to look productive.

## Voice rules

Public-facing artifacts (GDD entries, ADRs visible on GitHub) read as solo dev tracking own work. Forbidden:

- "per Nick", "the user wants", "we discussed"
- em dashes (use commas, hyphens, or two sentences)
- "I", "we", explanations of reasoning unless directly useful
- AI-tells like "Great question" or "Let me know if..."

The `DECISIONS_NEEDED.md` entries on YaC are slightly more permissive — they read as an answered-question log so "Nick said X" framing is fine there, matching the existing entries.

## Things that will bite you

- **HBH GDD edits ripple through `publish-gdd.ps1`.** If the user wants the locked decision visible on yesandeverything.com/hordes/, the GDD has to be re-published via the HBH script, not by editing YaE directly. Mention this; don't try to short-circuit it.
- **YaC ADR numbering races.** Always re-glob `docs/adr/*.md` immediately before writing — don't trust a number you computed earlier in the conversation.
- **Scheduler has no ADRs yet.** First ADR is `0001-record-architecture-decisions.md` following the YaC template; seed both the file and `docs/adr/README.md` if asked to ADR-promote on Scheduler.
- **YaE has no decision log.** If a lock signal fires on a YaE choice, suggest creating one (e.g. `DECISIONS.md` at repo root) rather than silently dropping the entry.
- **Don't double-log.** If a value was already promoted in a prior turn, don't re-promote — point at the existing entry instead.
- **One decision per call.** If the user fires multiple lock signals in one turn, draft each separately and confirm them one at a time. Batching invites errors.

## When in doubt

1. Ask once. "Which value are we locking?" or "Inline or ADR?" is always cheaper than a wrong write.
2. Match the existing format. Read one or two neighboring entries before drafting.
3. If the lock signal is ambiguous ("perfect" said about a UI tweak the user might not have meant to lock), surface it explicitly and let the user opt in.
