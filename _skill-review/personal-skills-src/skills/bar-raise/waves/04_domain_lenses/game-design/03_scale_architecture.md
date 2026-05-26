# Domain Lens: game-design / 03 scale architecture

## The question

Will this game still run at peak wave with hundreds of enemies on screen? Where is per-frame work growing without batching? Where will the perf cliff hit when the dataset (units, enemies, tiles, projectiles) grows 10x?

## What to look at

- HBH `docs/OPTIMIZATION_LOG.md` for what has shipped vs what is pending.
- Hot paths: enemy tick code, fog-of-war stamping, projectile pool, A* pathfinding, MultiMesh transforms.
- Per-Node vs pool implementations (HBH has both for enemies; BR ported the same). Dual-path divergence is a known hazard.
- Profile data captures. When was the last one? If never, that itself is a finding.
- Constants centralization status (HBH S-39). Drift across files multiplies perf risk.

## Severity grading

- **HIGH**: A frame-rate regression that has shipped and the user is feeling it now.
- **MEDIUM**: An O(n^2) or O(n^k) loop on a growing dataset that has not bitten yet but will.
- **LOW**: Micro-optimization opportunity on a path that does not get hit often.

## Output shape

Write a finding only if you have one. Otherwise write exactly: "No findings."

If you have a finding, use this block:

```
### Scale architecture
- **Severity**: high | medium | low
- **Finding**: <one sentence>
- **Evidence**: <specific paths, function names, line numbers, commit refs>
- **Suggested action**: <what to do; if HIGH, this becomes a P0 work-queue item>
```

Cite at least one concrete reference. Findings without evidence get downgraded.
