# Tier-1 lens report contract

Every lens subagent returns one structured report in this shape. The orchestrator collects the reports and hands the full set to Wave 5. A report that deviates from this contract gets one re-spawn, then exclusion, so stick to it.

## Report shape

Return a single fenced JSON block:

```json
{
  "lens": "security",
  "dimension_score": 72,
  "blocking": false,
  "findings": [
    {
      "id": "security-01",
      "severity": "high",
      "impact": 4,
      "confidence": 5,
      "evidence": "worker/src/index.js:412; commit a1b2c3d",
      "finding": "One sentence stating what is wrong.",
      "suggested_action": "Imperative sentence stating what to do.",
      "tensions_with": ["solo-tool-ux"]
    }
  ],
  "notes": "Optional, one sentence max."
}
```

## Fields

- `lens` -- the lens id. Tier-1 ids: `architecture`, `reliability`, `security`, `performance`, `data-integrity`, `maintainability`, `solo-tool-ux`, `cost-economics`, `dependency`, `observability`, `strategic-kill-this`, `compliance-data-steward`. Domain lenses use their file-derived id.
- `dimension_score` -- integer 0-100. 100 means this single dimension is in excellent shape; 0 means severely compromised. The lens scores ITS OWN dimension only. The score is never a claim about how important this dimension is relative to other dimensions; weighting is the orchestrator's job.
- `blocking` -- boolean. `true` only for an objective hard-rule breach defined in the project's `.project-context.json` `hard_rules` (a committed secret, a locked-decision violation). A BLOCK is a factual gate, not a tradeoff and never a matter of degree. When `true`, name the breached rule and the proof in the relevant finding's `evidence`.
- `findings` -- list, possibly empty. Each finding carries:
  - `id` -- `<lens>-NN`, stable within the run.
  - `severity` -- `high` | `medium` | `low`.
  - `impact` -- integer 1-5. How much the project suffers if this is left alone.
  - `confidence` -- integer 1-5. How solid the evidence is. Speculation without a concrete reference caps at 2.
  - `evidence` -- concrete paths, function names, line numbers, commit refs. Required above LOW severity.
  - `finding` -- one sentence.
  - `suggested_action` -- one imperative sentence.
  - `tensions_with` -- list of other lens ids whose dimension this action might degrade (a security hardening that adds friction to solo-tool-ux, a performance change that hurts maintainability). Empty list if none.
- `notes` -- optional, one sentence max.

## What a lens must not do

- A lens reports only on its own dimension.
- It must NOT propose a verdict. Verdicts are computed in Wave 5 from all reports together.
- It must NOT rank itself against other lenses or compare its importance to other dimensions.
- It must NOT zero its score to force attention. Score the dimension as it stands.
- It must NOT mark tradeoffs as `blocking`. `blocking` is reserved for hard-rule breaches only.

## Nothing to flag

If the lens has nothing to flag, it returns an empty `findings` list and a high `dimension_score` (90+ when the dimension is genuinely clean). That is a valid and common result; do not pad.
