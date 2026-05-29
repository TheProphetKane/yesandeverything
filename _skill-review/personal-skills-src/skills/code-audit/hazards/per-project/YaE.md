# YesAndEverything project-specific hazards

`X:\YesAndEverything`. Static umbrella site. GitHub Pages from main/root. Hosts gated mirrors for HBH GDD (`/hordes/`), BR GDD (`/brackish-rising/`), YaB launcher (`/budget/`), apothecary app (`/apothecary/`).

## Always-on checks

- `checks/secret_exposure.py`
- `checks/voice_violations.py` (index.html, README.md, DEPLOY.md)
- `checks/parallel_implementations.py` (custom pattern: project content has 3+ fork points — hand-authored cards, base64-injected gates, apothecary mirror)

## The hordes/ injection rule (BLOCK)

Per memory `publish_gdd_routing`. `hordes/index.html` is a hand-authored password gate that loads `var ENCODED = "..."` (base64) and decodes inline. HBH-side `scripts/publish-gdd.ps1` INJECTS into the existing file. NEVER copy `gdd.html` over the gate page.

Any new code or doc instructing to overwrite `hordes/index.html` → BLOCK.
Same rule for `brackish-rising/index.html`.

## The apothecary/ mirror rule (BLOCK)

`apothecary/` is mirrored from `X:\YesAndApothecary` via that repo's `scripts/release.ps1` (which calls `scripts/deploy-to-yae.ps1`). Do NOT edit files in `apothecary/` directly; the next mirror overwrites.

Any direct edit detected → HIGH (auto-revert risk).

## Parallel-implementation trap

YaE has at least three fork points for the same content:
1. Hand-authored landing in `index.html` + per-project sub-pages
2. `hordes/index.html` and `brackish-rising/index.html` password gates that base64-inline their respective GDDs
3. `apothecary/` mirror copied from YaApothecary

A "page content is wrong" bug could be in any. Identify which generator owns the page before editing.

## CNAME care (BLOCK)

`CNAME` must contain `yesandeverything.com` exactly. GitHub regenerates it from Pages settings; if an empty CNAME gets pushed, the custom domain breaks. Any code that touches CNAME without preserving the exact value → BLOCK.

## Robots.txt

Allows crawlers on root, disallows `/hordes/` (private GDD), `/brackish-rising/` (private GDD). Code adding a public link to either gate from `index.html` → MEDIUM.

## Reveal-stagger CSS

The homepage uses `.reveal-stagger > *:nth-child(N)` rules. New project cards must have a matching nth-child rule OR the card stays at `opacity: 0`. Per session-2026-05-28 incident with the Budget card.

Now uses an `nth-child(n+9)` fallback so new cards beyond position 8 auto-fade in. New cards still need a matching opacity:1 rule OR rely on the fallback.

## Status JSON shape

Per `docs/BAR_RAISE_ROADMAP.md` Phase 1+. Each project's `release.ps1` writes its own `status/data/<project>.json`. Schema:
```
{
  project, displayName, version, lastReleaseAt, lastReleaseMessage,
  milestone: { name, status },
  repoUrl, workTreeClean,
  audit: { latestReportPath, latestReportAt, findings: { high, medium, low } },
  barRaise: { latestReportPath, latestReportAt, verdict, topFinding, actionsOpen, actionsClosed },
  workQueueDepth, stale, tags
}
```

The barRaise block must be preserved across release.ps1 dashboard refreshes (the v0.10.0 fix). Any new write-dashboard-status.ps1 that clobbers barRaise to nulls → HIGH.

## Work queue file

`.work-queue.json` is the cross-project drain queue. Append-only growth + per-4hr drain via `queue-drain-frequent` task. The 2026-05-28 update added stale-item triage (>14 days no deps → archive).

Files > 50KB on this FUSE mount risk truncation on append. If `.work-queue.json` approaches 50KB, the queue-drain task should consolidate/archive aggressively.

## Personal-Claude doc layer

- `CLAUDE_SETTINGS.md` (root) — cross-project how-to-work-with-Nick. Source of truth for tone, pushback, voice.
- `PERSONAL_CLAUDE_ARCHITECTURE.md` (root) — handler-and-canonical pattern spec.
- Per-project `CLAUDE.md` files inherit from these two and add project-local hazards.

When updating cross-project rules, update HERE first, then propagate to per-project CLAUDE.md files.
