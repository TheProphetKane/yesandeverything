---
name: solo-dev-voice-audit
description: Scan public-facing artifacts (GDD changelog, README, in-code comments, recruitment posts, landing pages) for voice violations that reveal AI collaboration. Catches em dashes, "per Nick", first-person pronouns, AI vocabulary ("let me", "I'll", "as an AI"), and AI tool names (Midjourney, Claude, GPT) before they ship. Use whenever the user asks to "check voice", "audit my changelog", "scan for em dashes", "solo dev voice check", "is this writing AI-flavored", "voice audit before commit", "ready to commit, scan first", or similar. Also trigger proactively after any large doc edit on HBH (the GDD changelog is the most-public artifact and has the strictest enforcement). Reports HIGH/MEDIUM/LOW severity hits with suggested rewrites; can auto-apply HIGH-severity fixes on request.
---

## Step 0: Load project context (schema v1)

Before doing anything project-specific, read `<project-path>/.project-context.json` (schema v1; see `X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` for the full schema).

Use it to drive:
- `voice_strictness` — `standard` -> HIGH severity, `strict` -> BLOCK
- `voice_scope` — which contexts the voice rule applies to
- `public_artifact_globs` — which files to scan

If the file is missing or its `schema_version` is unsupported, fall back to reading the project's `CLAUDE.md` prose. Log a queue item asking Nick to add or migrate the context file.


# Solo-dev voice audit

Scan public-facing writing for tell-tale AI-collaboration signals before it ships. The canonical rule is memory `solo_dev_voice` (project #2 priority on HBH): all public-facing artifacts read as a solo dev tracking own work, never as AI collaboration. This skill enforces that rule mechanically.

## Why this exists

Nick's brand depends on public artifacts reading like a solo dev's voice. The GDD changelog, recruitment posts, and READMEs are the most-public surfaces. A stray em dash, a "per Nick", or a "Midjourney" mention by name leaks the AI collaboration and undermines the solo-dev framing. The reference sweep is HBH v0.34.18 (full Midjourney-name purge).

This skill catches those violations before commit, not after.

## When to use this

Trigger on:
- "Check voice on this changelog"
- "Scan for em dashes"
- "Audit my README before I push"
- "Solo dev voice check"
- "Is this AI-flavored"
- "Voice audit before commit"
- "Ready to commit, scan first"

Also trigger proactively:
- After any GDD changelog entry on HBH
- After any README/recruitment-post edit on any project
- Before a public-facing milestone (1.0 launch, demo post, public PR)

## What counts as a violation

| Pattern | Severity | Why forbidden | Fix |
|---|---|---|---|
| Em dash (U+2014) | HIGH | #1 AI tell | Hyphen, comma, or sentence break |
| `per Nick` (case-insensitive) | HIGH | Reveals AI/user dialogue | Reframe as solo dev decision |
| AI tool names (`Midjourney`, `Claude`, `ChatGPT`, `GPT-4`, `OpenAI`) | HIGH | Breaks solo-dev framing | Generic descriptor (`art generator`, `AI assistant`) or drop |
| First-person `\bI\b`, `\bI'\b`, `\bwe\b` in changelog/patch notes | MEDIUM | Out of place in changelogs | Passive voice, `Fix:`, `Result:`, `Cause:` |
| AI vocabulary (`let me`, `I'll`, `you should consider`, `as an AI`) | LOW | Stylistic tell | Strip entirely |
| Reasoning prefaces (`Let me explain why`, `The reason for this is`) | LOW | Padding, not content | Cut. State the thing. |

## Scope: public vs. private

| Artifact | Enforced? |
|---|---|
| `docs/GDD.html` changelog | YES — strictest |
| `README.md` (any project) | YES |
| Recruitment posts | YES |
| Public landing pages (`index.html`, project sub-pages) | YES |
| In-code comments shipping in public source | YES |
| `PROJECT_SPEC.md`, `CONTEXT.md`, scratch notes | NO — private design layer |
| `DECISIONS_NEEDED.md`, ADRs, `BACKLOG.md` | NO — internal |
| `CLAUDE.md` | NO — handler layer |

When in doubt, check the surrounding repo's `CLAUDE.md` for project-specific voice rules.

## How to run an audit

### Phase 1 — Resolve the target

Accept any of:
- A specific file path -> scan that file
- A glob pattern (e.g., `docs/*.md`) -> scan matches
- `"staged"` -> `git diff --cached --name-only` and scan each
- `"last commit"` -> `git diff-tree --no-commit-id --name-only -r HEAD` and scan each
- A repo path -> default to scanning the most-recently-modified public files (`docs/*.md`, `docs/*.html`, root `README.md`, root `*.md` excluding `CLAUDE.md` and the private design layer)

If the target is ambiguous, ask the user before scanning a huge tree.

### Phase 2 — Pre-filter content

Before running pattern matches, strip out regions where false positives live:

- **Code blocks** — Everything between triple backticks (fenced) and between `<pre>...</pre>` or `<code>...</code>` in HTML
- **HTML comments** — `<!-- ... -->`
- **URLs** — `https?://\S+`
- **File paths** — Tokens containing `/` or `\` with extensions
- **Inline code** — Single-backtick spans

Keep a line-number map so reported hits reference the original file lines, not the filtered ones.

### Phase 3 — Pattern scan

Run each pattern against the filtered content. Use these regexes:

| Severity | Pattern | Regex |
|---|---|---|
| HIGH | em dash | literal U+2014 |
| HIGH | "per Nick" | `(?i)\bper\s+Nick\b` |
| HIGH | AI tool names | `\b(Midjourney\|Claude\|ChatGPT\|GPT-?[0-9]+\|OpenAI\|Anthropic)\b` |
| MEDIUM | first-person `I` | `(?<![A-Za-z/-])I(?![A-Za-z/-])` (avoids `I/O`, `I-beam`, identifiers) |
| MEDIUM | first-person `I'` | `\bI'(m\|ll\|ve\|d)\b` |
| MEDIUM | first-person `we` | `(?i)\bwe\b` (only flag inside changelog/patch-note context — see Phase 4) |
| LOW | AI vocabulary | `(?i)\b(let me\|i'll\|you should consider\|as an ai\|we can\|we should)\b` |
| LOW | reasoning prefaces | `(?i)(let me explain\|the reason for this is\|to summarize\|in conclusion)` |

### Phase 4 — Contextual filtering

Some hits are false positives. Apply these rules:

- **First-person inside quoted dialogue** (e.g., user testimonial in marketing copy) -> skip
- **"we"** outside a changelog/patch-note paragraph -> demote to LOW or skip
- **"Claude" inside `CLAUDE.md` filename references** -> skip (those are pointers, not collaboration mentions)
- **AI tool names inside a private design doc that happened to be scanned** -> skip with note
- **Em dashes inside YaC's `CONTEXT.md`** -> flag but downgrade to MEDIUM (YaC tolerates more conversational tone)

### Phase 5 — Classify and report

Group by file, then by severity. Format:

```markdown
## <file path>

### HIGH severity (N hits)
- Line 42: `the build pipeline — auto-commits and pushes` -> `the build pipeline auto-commits and pushes`
- Line 87: `Midjourney generates the base sprite` -> `the art generator produces the base sprite`

### MEDIUM severity (N hits)
- Line 12: `I refactored the pathfinder` -> `Pathfinder refactored` or `Refactor: pathfinder`

### LOW severity (N hits)
- Line 33: `let me walk through` -> cut entirely
```

If a file is clean, say so explicitly. Don't bury "no violations" under a wall of prose.

End the report with a TL;DR line: `N HIGH, N MEDIUM, N LOW across N files.`

### Phase 6 — Optional auto-fix

Default: **report only.**

If the user says "fix as you go", "apply fixes", "auto-fix", or "rewrite the violations":

- **Auto-apply HIGH only:**
  - Em dash -> hyphen with surrounding-whitespace normalization (`word — word` -> `word - word`)
  - AI tool name -> generic descriptor (`Midjourney` -> `the art generator`; `Claude` -> `the AI assistant`; etc.) — use the HBH v0.34.18 commit as the reference sweep for tone
  - "per Nick" -> drop the phrase or rewrite the sentence as a solo-dev statement (this one often needs surrounding rewrite; if not trivial, surface as MEDIUM-auto and ask)
- **MEDIUM / LOW:** show the suggested rewrite, never auto-apply. These require judgment.

After applying fixes:
- Diff the changes
- Show the user the before/after
- Don't commit — leave that to the user (or to `version-bump-and-publish` if it's wired in)

## Project-specific enforcement levels

| Project | Strictness | Notes |
|---|---|---|
| HBH | Maximum | GDD changelog is the most-public artifact. All HIGH violations block commit. |
| YaC | Medium | `CONTEXT.md` is technically public but accepts conversational tone. Flag em dashes; allow first-person in narrative sections. |
| Scheduler | Per-project | Read `CLAUDE.md`. v1 is pre-launch; voice rules apply once the README goes public. |
| YaE | Per-page | `index.html` and project sub-pages are public; landing copy must comply. |

When scanning, read the project's `CLAUDE.md` first and adjust the severity table if the project has its own voice rules.

## False-positive watchlist

These trip the regexes but are legitimate:

- `I/O`, `I-beam`, `I-frame` — `I` followed by `/` or `-`
- File paths containing `I` — already filtered by Phase 2
- Quoted dialogue in marketing or testimonial copy — Phase 4
- The literal string `CLAUDE.md` as a filename reference — Phase 4
- Technical acronyms: `we` is sometimes inside identifiers (`tween`, `between`) — the `\bwe\b` boundary handles this, but verify
- Em dashes inside an existing quote (rare but possible) — flag but note the context

If a hit looks like a false positive, surface it under a separate "Possible false positives — verify manually" section rather than silently dropping it.

## Output format

By default, print the report inline. If the audit is run as part of a pre-commit hook or batch sweep, optionally write to `<repo>/.voice-audit-<YYYY-MM-DD>.md` for later review.

If auto-fix was applied, include a "Fixes applied" section listing every line changed.

## What not to do

- **Don't scan private design docs without permission.** `PROJECT_SPEC.md`, `DECISIONS_NEEDED.md`, `BACKLOG.md`, ADRs are scratch surfaces. Voice rules don't apply there.
- **Don't auto-apply MEDIUM or LOW fixes.** They need human judgment. A passive-voice rewrite can be worse than the original.
- **Don't be precious about LOW hits.** If a file has 30 LOW hits and 0 HIGH, the file is fine. Report the LOW count and move on.
- **Don't rewrite around the violation.** The job is replacing the violation, not redesigning the paragraph. If a fix requires more than a phrase-level change, surface it for human review.
- **Don't leave em dashes in code comments inside public source.** In-code comments in `source/`, `src/`, `apps/` ship publicly when the repo is open. They count.

## Reference example

The canonical sweep is HBH commit for v0.34.18 (Midjourney name purge). Pattern:

- Before: `the Midjourney prompt generates a base sprite — then the artist tweaks it`
- After: `the art generator produces a base sprite, then refinement passes adjust it`

Two HIGH fixes in one sentence: `Midjourney` -> `the art generator`, em dash -> comma. The voice now reads as solo dev describing own pipeline.

## When in doubt

1. Check the project's `CLAUDE.md` for voice rules specific to that repo.
2. If the file is private design layer, skip — voice rules don't apply.
3. If a violation needs more than a phrase-level rewrite, flag it as MEDIUM-needs-review rather than auto-fixing.
4. Memory `solo_dev_voice` is the source of truth. If this skill and memory disagree, memory wins.
