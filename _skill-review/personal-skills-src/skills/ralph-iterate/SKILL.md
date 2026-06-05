---
name: ralph-iterate
description: Iterate on a single bounded task until a defined completion signal is met or a maximum-iterations cap is hit. Each iteration MUST be informed by the previous failure (read the error output, the failing test, the audit finding, the lint output - then change approach). Use whenever the user says "iterate until", "keep trying until X passes", "ralph loop this", "fix this until the test goes green", "refactor until lint is clean", "make this work", "loop on this", "bounded retry", "polish this until done", "land this fix or tell me why we cant". The skill enforces the "two failed fix attempts" debugging discipline - after attempt 2 fails on the same root cause, the loop pivots to instrumentation rather than continuing to guess. Distinct from self-reprompt-loop which is portfolio-wide orchestration; ralph-iterate is single-task surgical iteration.
---

## Step 0: Load project context (schema v1)

Read `<project-path>/.project-context.json` for:

- `critical_files_for_python_atomic_write` - every iteration that touches one of these MUST use Python atomic-write-with-readback
- `hard_rules` - never break a hard rule in pursuit of the completion signal
- `engine` / `primary_language` - tailor the iteration approach (GDScript syntax checks, TypeScript tsc, etc.)

## When to use this skill

Tasks with CLEAR completion criteria. The whole power of the loop comes from the verification step - without a checkable signal, this is just "do the same thing N times" which is worse than not iterating.

Good fits:

- "Fix the failing test in apps/api/src/server-bind.test.ts" (signal: test passes)
- "Make the godot-perf-optimize scanner report zero false positives on HBH" (signal: no findings that the user marks as wrong)
- "Refactor enemy_pool.gd until scripts/audit-dual-path.ps1 returns clean" (signal: audit-dual-path exit 0)
- "Polish the artifact's BR card description until I stop complaining" (signal: user approval, hard cap at 3 iterations)
- "Get tsc --noEmit clean on apps/api" (signal: tsc exit 0)
- "Apply the safe drift-auto-fix items from CANONICAL_AUDIT-2026-06-04 and re-run the audit until no HIGHs remain" (signal: audit HIGH count == 0)

Bad fits (do NOT use ralph-iterate):

- "Write a new feature" - no completion check until user sees it; use self-reprompt-loop or just direct work
- "Make this code better" - "better" is not a signal; refuse and ask for a measurable criterion
- "Try a few approaches and pick the best" - that is design exploration, not iteration toward a fixed target

## Required inputs

Before iterating, the skill must have:

1. **Task** - one sentence describing what to do per iteration
2. **Completion signal** - the exact command/check that says "done", returning 0 or producing a specific marker
3. **Max iterations** - default 5. Higher only when the user explicitly says so.

If any are missing, ask once. Do not start iterating with fuzzy criteria.

## The iteration loop

### Iteration N

1. **Run the completion check FIRST.** If it already passes, exit with "already complete; no iterations needed."
2. **Read the failure output.** This is the most important step. The failure tells you what to change. If the failure is identical to last iteration, STOP and pivot (see "Two-failed-fix rule" below).
3. **Make ONE focused change** informed by the failure output. Not a grab bag. One change.
4. **Run the completion check again.** Capture the output.
5. **Decide**:
   - PASS - exit with "completed in N iterations"
   - FAIL with NEW output - record what changed, continue to iteration N+1
   - FAIL with SAME output as last iteration - go to "Two-failed-fix rule"
   - Max iterations hit - exit with "max iterations reached; here is what we learned"

### Two-failed-fix rule (HARD STOP)

After 2 iterations on the same root cause produce the same failure, STOP iterating. The pattern says:

> Two failed fix attempts on the same symptom means the mental model is wrong. Instrument before iterating further.

Per memory `debugging-discipline`. The 11-patch v0.74.22 through v0.74.32 HBH cycle is the canonical case study - that cycle was spent fixing the wrong code path because nobody stopped to verify which path the bug was actually in.

When the two-failed-fix rule triggers, the skill pivots:

1. Add instrumentation (a print statement, a profiler capture, a git bisect step)
2. Re-run with instrumentation
3. Read what the instrumentation reveals
4. Apply ONE more iteration informed by the new evidence

If even THAT fails, exit with "this needs human read - here is the instrumented output and the three theories I considered."

## Iteration journal

Maintain a per-task journal in memory across iterations. Each entry:

```
Iteration N (HH:MM)
  Hypothesis: <what I thought was wrong>
  Change: <what I actually did>
  Check output: <stdout/stderr of the completion check>
  Verdict: pass | fail-new | fail-same | timeout
```

On exit (success OR max-hit), summarize the journal so the user understands the trajectory. This is what makes ralph-iterate different from blind retry - the journal makes the reasoning auditable.

## Constraints

- **One change per iteration.** If you find yourself wanting to change three things, the criterion is wrong; refine it first.
- **Verification, not vibe.** The completion check decides; not "this looks right now."
- **Never change the completion check mid-loop** to make a failing iteration pass. If the check needs adjustment, exit, adjust, restart.
- **Never violate a hard rule** in the project context (HBH no_accuracy, no_agency_removal; YaB D-001..D-007; BR voice strictness) in pursuit of the signal.
- **Python atomic-write on critical files** per the context.
- **Honor solo-dev voice** on any committed content during iteration.
- **Do NOT auto-commit between iterations** unless the user said "commit each iteration" - normally one commit at the end.

## When to recommend ralph-iterate vs alternatives

- One bounded task with a checkable signal -> ralph-iterate
- Cross-project orchestration of "what to do next" -> self-reprompt-loop
- Walk the doc against the code looking for drift -> project-canonical-audit
- Take the audit findings and apply the safe ones -> drift-auto-fix
- Process queue items -> work-queue-runner

## Examples

### Good: "fix test until green"

Input: `pnpm -C apps/api test apps/api/src/server-bind.test.ts` returns non-zero.

Loop:
- Iter 1: Read failure. The test says `expected 127.0.0.1, got 0.0.0.0`. Hypothesis: server.ts is missing the hostname arg. Change: add `hostname: HOSTNAME`. Re-run: passes. Exit.

Total: 1 iteration. Good.

### Bad case that ralph-iterate handles correctly

Input: same as above but the dual-path issue means TWO files need changing.

Loop:
- Iter 1: Add hostname to server.ts. Re-run: still fails. Output identical to iter 0.
- Iter 2: Inspect more carefully. Notice the test boots a SECOND server in a parallel test. Change second site. Re-run: still fails. Output IDENTICAL to iter 1.
- Two-failed-fix triggers. Pivot to instrumentation: add `console.log` to capture which server.ts the test actually loads.
- Iter 3: Re-run with instrumentation. See that the test mocks `serve` itself. The fix was in the WRONG place entirely.
- Iter 4: Fix the mock setup in the test. Pass.

Without ralph-iterate, this would have been the v0.74.22 cycle - eight patches chasing the wrong file.

### Refusing a bad-fit task

Input: "Make this code better."

Response: "Better how? I need a checkable signal. Examples: 'pass code-audit with zero MEDIUM findings', 'reduce function length below 50 lines', 'eliminate all untyped Variants per warnings_as_errors'. Pick one or describe what specifically you want improved."

Do not iterate. The user clarifies, then ralph-iterate runs against the actual signal.

## Reference

- Memory `debugging-discipline` - the two-failed-fix rule.
- Memory `parallel-implementation-trap` - why "same failure twice" usually means wrong code path.
- HBH `scripts/audit-dual-path.ps1` - example of a project-specific completion check that ralph-iterate can target.
- Sibling skills: self-reprompt-loop (broader orchestration), code-audit (the verification source for many ralph tasks).
