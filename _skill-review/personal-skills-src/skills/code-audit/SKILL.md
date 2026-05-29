---
name: code-audit
description: Comprehensive code-level audit. Catches syntax errors, parse-time hazards, recurring bug patterns (silent field guards, dual-path divergence, FUSE truncation, etc.), security violations (locked-decision breaches, secret exposure), voice violations on public artifacts, and cross-file consistency drift (version pills, constant mirrors). Project-aware: applies HBH / BR / YaB / YaC / Scheduler / YaE / YaApothecary hazard catalogs as appropriate. Primary language focus: GDScript + .tscn for Godot projects. Secondary: TypeScript/Node, PowerShell, C-family. Use whenever the user asks to audit code, review code, lint, find bugs, check for smells, do static analysis, scan for issues, run a code review, do a preship code check, "is this broken", "what could break", "what's wrong with this", "scan before I ship", "deep code review". Also trigger proactively before any release.ps1 invocation on a project that has not been audited in 7+ days. Designed as a single comprehensive pass so re-iteration on the same recurring bug classes stops.
---

## Step 0: Load project context (schema v1)

Before doing anything project-specific, read `<project-path>/.project-context.json` (schema v1; see `X:\YesAndEverything\PERSONAL_CLAUDE_ARCHITECTURE.md` for the full schema).

Use it to drive:
- `critical_files_for_python_atomic_write` — used by fuse_truncation check
- `hazard_catalog` — per-project hazards to load
- `voice_strictness` — escalation rubric for voice_violations check
- `public_artifact_globs` — scope for voice_violations
- `secret_exposure_paths` — extra patterns beyond defaults
- `version_pill_locations` — version_drift check

If the file is missing or its `schema_version` is unsupported, fall back to reading the project's `CLAUDE.md` prose. Log a queue item asking Nick to add or migrate the context file.


# code-audit

The portfolio-wide deep code audit. Walks one project (or all of them), runs every relevant deterministic check, then layers semantic LLM review on top, writes a findings report, and optionally auto-fixes safe items + queues structural ones. Designed to be the last line of defense before any release.

## Why this exists

Recurring bug classes have eaten 5+ patch cycles each across Nick's projects:

- **Parallel implementation trap** (memory `parallel-implementation-trap`). HBH has dual enemy paths (per-Node + pool); a fix landed on one is invisible on the other. v0.74.22-v0.74.32 = 11 patch cycles spent fixing the wrong path.
- **Silent field guards** (memory `htbh-silent-field-guard`). `if not ("X" in node): return` silently no-ops for any class missing the field. `Building.dispatch_to_rally` bailed for 40 versions because `Unit` didn't declare `tile_position`.
- **FUSE Edit-tool truncation** (memory `htbh-fuse-edit-tool-truncation`). Mid-write file truncation on the Windows FUSE mount. Hit GDD.html (v0.74.30), fog_of_war.gd (v0.74.31), api.ts (this session), DECISIONS.md (this session). Read-back inside the Edit tool returns cached bytes that match expected, so the truncation is invisible to the editor.
- **`preload()` is parse-time** (BR memory). `if ResourceLoader.exists(path): tex = preload(path)` does NOT defer the lookup. preload() resolves when the parser walks the file. Missing files break the whole script.
- **Godot .tscn `#` comments** (BR memory). The TSCN parser treats `#` as a hex color start. Comment lines produce "Invalid color code" + cascade failures.
- **Cut-mechanic sweep residue** (BR memory). Stripping a cut feature often leaves an `if guard:` with no body, or an `@export` annotation with no var. Both are parse errors.
- **Const mirror drift** (HBH S-39). Local consts that mirror autoload values silently diverge during refactors.
- **Version pill drift** (YaB 2026-05-26 bar-raise). package.json vs CHANGELOG vs git tag falling out of sync.
- **Secret exposure** (YaB `.finances/` 2026-05-28). Bank data CSVs git-tracked despite D-001/D-002. Caught only when an explicit audit ran.
- **Voice violations** (BR v0.13.1). Em dashes + AI tool names slipped into the GDD changelog despite the solo-dev voice rule.

`project-canonical-audit` catches doc-vs-code drift. `bar-raise` does broad structural review. Neither walks the code at the SYNTAX + SEMANTIC + PATTERN level. This skill closes that gap.

## When to invoke

Always when the user asks to:
- "Audit my code", "review code", "code review"
- "Find bugs", "smell check", "lint"
- "Scan before I ship", "preship check"
- "Run static analysis", "find recurring bugs", "what could break"
- "Is this broken", "what's wrong with this"

Proactively when:
- Wired into `scripts/preship.ps1` as a step 0.5 (after typecheck, before tests). Failing critical checks BLOCK the release.
- Wired as a scheduled task (`code-audit-daily-<project>`) for projects with active commits.
- Before any HBH `release.ps1` invocation if it's been 7+ days since the last code-audit on that project.

## Run flow

Four phases. Each one produces evidence for the next.

### Phase 0: scope detection

Determine which project to audit. Heuristics:
1. If user passed a project name, use it.
2. If cwd matches `X:\HereBeHordes` / `X:\BrackishRising` / `X:\YesAndBudget` / `X:\YesAndChains` / `X:\Scheduler` / `X:\YesAndApothecary` / `X:\YesAndEverything`, use that.
3. Else ask once: "which project?"

Determine the file set:
- Default: full repo source tree (e.g. `source/` for Godot, `apps/api/src/` + `apps/web/src/` for Node, etc.).
- `--staged`: only files in `git diff --cached`. Use this for preship.
- `--since=<ref>`: only files changed since `<ref>` (tag, branch, sha).

### Phase 1: deterministic checks

Run every applicable check script from `checks/`. Each script:
- Takes a target path
- Outputs structured findings (JSON array on stdout)
- Exits 0 on clean, 1 on findings (does not block; severity is in the findings)

Run scripts via the dispatcher:

```bash
python checks/dispatcher.py --project <PROJECT> --target <PATH> [--staged] [--since <REF>]
```

The dispatcher knows which checks apply to which project (Godot projects get the GDScript + .tscn checks; Node projects get the TypeScript checks; all projects get secret-exposure + version-drift + voice).

Concrete check inventory:
- `parallel_implementations.py` — dual-path divergence (HBH enemy_base vs enemy_pool, others if pattern detected)
- `silent_field_guards.py` — `if not ("X" in node): return` style no-op bails
- `fuse_truncation.py` — files ending mid-statement (per-project critical-file list)
- `secret_exposure.py` — git-tracked sensitive files (.finances/, .env, *.pem, tokens)
- `godot_preload_runtime.py` — preload() inside conditional branches
- `godot_tscn_comments.py` — # comments in .tscn (parse errors)
- `godot_orphan_export.py` — @export not followed by a var declaration
- `godot_empty_if.py` — `if EXPR:` with no indented body (cut-mechanic residue)
- `godot_uid_format.py` — .uid files not matching `uid://b[base32]{12}`
- `version_drift.py` — package.json vs CHANGELOG vs git tag mismatch
- `const_mirror_integrity.py` — autoload constants vs local mirrors
- `voice_violations.py` — em dash, AI tool names, first-person collective on public artifacts

### Phase 2: semantic LLM review

After deterministic checks, walk the diff (or the changed files) and do a SEMANTIC pass that regex can't do. Focus on:

- **Logic smells**: unused imports, dead branches, mutable default arguments, async functions never awaited, try/catch swallowing errors silently
- **Smelly control flow**: deep nesting, mixed level of abstraction, copy-paste blocks
- **Architectural drift**: a function in module A doing module B's job, cross-layer coupling
- **Per-project locked-decision violations**: read the project's `docs/DECISIONS.md` (or equivalent) and flag any new code that contradicts a locked decision
- **API shape consistency**: new endpoints that don't match the project's REST style, response shapes that don't match the documented schema
- **Test coverage gaps**: new functions in `<file>.ts` without a co-located `<file>.test.ts` entry

Use the hazard catalogs in `hazards/` as the prompt:
- `hazards/godot-gdscript.md` — load when auditing `.gd` files
- `hazards/godot-tscn.md` — load when auditing `.tscn` files
- `hazards/typescript-node.md` — load when auditing `.ts` / `.tsx` files
- `hazards/powershell.md` — load when auditing `.ps1` files
- `hazards/c-family.md` — load when auditing `.c` / `.cpp` / `.cs` / `.h` files
- `hazards/voice-public-artifacts.md` — load when auditing CHANGELOG.md, README.md, docs/*.html, docs/*.md
- `hazards/per-project/<PROJECT>.md` — always load for the current project

### Phase 3: compose findings report

Write the report to `<project>/docs/CODE_AUDIT-YYYY-MM-DD.md`. Shape:

```markdown
# CODE_AUDIT-YYYY-MM-DD: <Project>

Run mode: full | staged | since-<ref>
Files scanned: N
Lines scanned: M
Verdict: clean | warn | block

## Top finding

<one-sentence top finding, the most-actionable single line>

## Findings by category

### Parse / syntax hazards (BLOCK)

- **<finding>**: <file>:<line>. <description>. Fix: <one-line fix>.

### Recurring bug patterns (HIGH)

- ...

### Logic smells (MEDIUM)

- ...

### Voice violations (MEDIUM)

- ...

### Style / hygiene (LOW)

- ...

## Auto-fixable items

Items the audit can land via Python atomic-write WITHOUT changing behavior:
- <list>

## Queue items

Items requiring a code change with judgment, queued to `.work-queue.json`:
- <list>

## Files not scanned

- Large data files (course_data.json, *.db, GDD.html base64 payload)
- node_modules/, dist/, build/
- _ARCHIVE/, .git/, .venv/

## What got better since last audit

<delta vs prior CODE_AUDIT report; first run says "first audit">

## What got worse since last audit

<delta vs prior; first run says "first audit">
```

Exit code from the skill:
- 0 if clean or LOW-only
- 1 if MEDIUM or HIGH (audit-only mode, no block)
- 2 if BLOCK (preship-mode aborts the release)

### Phase 4: optional auto-fix + queue

Default: report only.

If user says "apply" / "fix the safe ones" / `--apply` flag set:
- For each finding in the **Auto-fixable items** section, apply via Python atomic-write (NEVER the Edit tool for files on this FUSE mount).
- For each finding in **Queue items**, append to `X:\YesAndEverything\.work-queue.json` with `priority` derived from severity and `tags: ["code-audit", "<project>", "<category>"]`.
- Re-run the relevant checks on touched files to verify the fix landed and didn't introduce new findings.

Auto-fix safety:
- Apply atomic-write-with-readback for every file touched
- Tail-check every touched file before declaring done (per memory `htbh-fuse-edit-tool-truncation`)
- Do NOT auto-fix anything tagged BLOCK or HIGH — those need a human read
- Do NOT bump versions
- Do NOT run release.ps1

## Severity rubric

- **BLOCK** — syntax error, parse-time crash, security violation against a locked decision (D-001, D-003, D-006, D-007), bank-data exposure, file truncation, missing close on a critical file. Release is aborted.
- **HIGH** — recurring bug pattern hit (dual-path divergence, silent field guard, preload-in-conditional), const-mirror drift, version drift across the three source-of-truth locations. Should fix before release.
- **MEDIUM** — logic smell, voice violation, dead code, missing test for a new function, observability gap. Queue or hand-fix.
- **LOW** — style nit, magic number, comment improvement. Queue if cheap, ignore if not.

## Project-aware behavior

Each project has its own `hazards/per-project/<PROJECT>.md` catalog. Always load the per-project file alongside the language catalogs.

Project-detection heuristics for auto-routing:
- `X:\HereBeHordes` → HTBH catalog
- `X:\BrackishRising` → BR catalog (stricter voice rules; HBH file inheritance pattern; preload parse-time)
- `X:\YesAndBudget` → YaB catalog (D-001..D-007, .finances/ leak watch)
- `X:\YesAndChains` → YaC catalog
- `X:\Scheduler` → Scheduler catalog
- `X:\YesAndApothecary` → YaApothecary catalog
- `X:\YesAndEverything` → YaE catalog (publish injection patterns)

## Integration points

### preship.ps1

Add to each project's `scripts/preship.ps1` (the gate release.ps1 calls before commit + push):

```powershell
# Step 0.5: code audit
Write-Host "[preship] code audit..." -ForegroundColor Cyan
& claude code-audit --staged --exit-on-block
if ($LASTEXITCODE -eq 2) {
  Write-Host "[preship] FAILED: code audit BLOCK findings. See docs/CODE_AUDIT-*.md." -ForegroundColor Red
  exit 1
}
```

### Scheduled tasks

Per-project daily code-audit recommended for the high-activity projects (HBH, BR, YaB, YaC). Pattern:

```
audit-code-htbh-daily: 06:09 daily, runs code-audit on X:\HereBeHordes, auto-applies safe fixes, queues structural items.
```

### work-queue-runner

MEDIUM/LOW findings queue with `tag: code-audit`. work-queue-runner drains them on its 4-hourly cadence.

### bar-raise

The bar-raise skill should READ the latest CODE_AUDIT-*.md report and incorporate it into its bigger structural review. Pattern: bar-raise calls code-audit first if no recent report exists.

## Constraints

- Never auto-fix without explicit consent. Default mode is report-only.
- Never use the Edit tool on critical files. Use Python atomic-write-with-readback.
- Never bump versions, never run release scripts, never push.
- Never modify .git/* directly.
- Solo-dev voice on the report itself (no em dashes, no AI tool names, no first-person collective).
- Do not load > 100KB files into the LLM context for semantic review. Slice or skip.
- Respect `.gitignore`: do not scan ignored paths.
- Respect each project's CLAUDE.md hard rules (e.g. HBH's "update GDD every reply" does NOT apply to code-audit runs since the audit is meta-work, not a code change).

## How to extend

Adding a new check:
1. Drop a Python file in `checks/<check_name>.py` with the standard `--target` interface and JSON output.
2. Register it in `checks/dispatcher.py` under the appropriate language gate.
3. Add a corresponding entry to the relevant `hazards/<language>.md` or `hazards/per-project/<project>.md` file with the pattern + example + fix.

Adding a new project hazard:
1. Append to `hazards/per-project/<project>.md` with severity + example + fix.
2. If it's a regex-detectable pattern, write the check script too.

Adding a new language:
1. Create `hazards/<language>.md` with the language's hazard catalog.
2. Create check scripts targeting that language.
3. Register them in the dispatcher.

## Reference

- Memory: parallel-implementation-trap, htbh-dual-pool-per-node, htbh-silent-field-guard, htbh-fuse-edit-tool-truncation, recurring_issues_watch, debugging_discipline
- Sibling skills: project-canonical-audit (doc drift), bar-raise (structural review), drift-auto-fix (executor), work-queue-runner (drain), solo-dev-voice-audit (subset of voice checks)
- Source: this skill lives at `X:\YesAndEverything\_skill-review\personal-skills-src\skills\code-audit\` and is installed via the personal-skills plugin.
