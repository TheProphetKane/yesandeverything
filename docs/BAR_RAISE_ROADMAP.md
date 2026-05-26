# Bar-raise + dashboard buildout roadmap

Status: Active. Roadmap drafted 2026-05-26. Multi-session build.
Owner: Nick.
Reference for: Claude sessions picking up the build.

This is the working plan for porting a friend's `bar-raise` skill structure onto Nick's six-project portfolio, plus standing up a live status dashboard on yesandeverything.com that the skill writes into. Use it as the resume-point across sessions.

## What we're building (one paragraph)

A periodic-review system that runs every day per project and every week across the constellation. Each run produces a Markdown findings report stored alongside the project's own canonical docs, plus a small JSON status file that a static dashboard page on yesandeverything.com reads and renders. The skill itself is a 5-wave structure (portfolio overview, per-project discovery, Tier-1 lenses, domain lenses, synthesis) modeled on the friend's `/bar-raise-*` skill but with the domain lens set rewritten for game-design, static-site, cloud-edge, finance-product, generative-art, PWA, orchestration, release-pipeline, and public-voice. Scheduling runs via Windows Task Scheduler invoking the Claude Code CLI with the right prompts. Cowork stays in the loop for file-creation work and one-off interactive sessions.

## Decisions locked

- **Cadence**: per-project bar-raise daily, constellation bar-raise weekly. (2026-05-26)
- **Dashboard data flow**: JSON committed to the YaE repo so GitHub Pages serves it. Each project's `release.ps1` writes its own JSON; the bar-raise skill rewrites it on each run. "Available on the webpage as it gets updated" maps to "a `git push` from the release script triggers a Pages rebuild, and the dashboard reflects the new state within ~30 seconds." (2026-05-26)
- **Claude Code vs Cowork**: mixed by task type. Coding, git, scheduled bar-raise runs, audits, releases all move to Claude Code. File-creation work (docs, decks, spreadsheets, anything where the file-card UI matters) stays in Cowork. (2026-05-26)
- **Terminology**: "orchestration" replaces "meta-tooling" as the umbrella term for skill suite, work-queue, audit loop, scheduled tasks, FUSE-truncation defense, incident-runbook hygiene, and skill-chain handoff integrity. One domain, eight lenses. (2026-05-26)
- **Phase 1 pilot projects**: Brackish Rising and YesAndChains, not HBH. BR is in heavy iteration (v0.10.0 through v0.12.0 shipped same day); YaC has the live worker + frequent commits. HBH is the reference model but iteration heat is on the newer two. (2026-05-26)

## Anti-scope

- **No backend on yesandeverything.com.** The dashboard reads static JSON, not a live API. Bank data and audit findings live where they always have. The dashboard is a viewer, not a control plane.
- **No mobile interface beyond "it renders on a phone browser".** The dashboard is responsive but not a PWA.
- **No write-from-web actions.** You cannot trigger a bar-raise from the dashboard. Triggering happens via the local schedule or by running `claude` on the laptop. The dashboard is read-only.
- **The bar-raise does not modify code.** It writes reports. Drift-fix and work-queue-runner are separate skills that may consume bar-raise output as input.

## Phased build

Each phase is independently shippable. Phase ordering favors the dashboard being visible early so the value is immediate; the bar-raise skill enriches data on a working dashboard, not the other way around.

### Phase 0: roadmap + JSON contract + URL lock

DONE 2026-05-26.

- Roadmap committed at `docs/BAR_RAISE_ROADMAP.md`.
- JSON contract drafted (below; subject to refinement during Phase 1).
- URL path locked: `yesandeverything.com/status/`.

JSON contract:

```json
{
  "project": "BR",
  "displayName": "Brackish Rising",
  "version": "0.12.0",
  "lastReleaseAt": "2026-05-25T22:00:00Z",
  "lastReleaseMessage": "HBH -> BR filename + display-name rename pass",
  "milestone": {
    "id": "M0",
    "label": "Foundation",
    "status": "in-progress"
  },
  "repoUrl": "https://github.com/TheProphetKane/brackish-rising",
  "workTreeClean": true,
  "audit": {
    "latestReportPath": "docs/AUDIT-2026-05-25-v0.11.0.md",
    "latestReportAt": "2026-05-25T18:00:00Z",
    "findings": { "high": 0, "medium": 2, "low": 5 }
  },
  "barRaise": {
    "latestReportPath": null,
    "latestReportAt": null,
    "verdict": null,
    "topFinding": null,
    "actionsOpen": null,
    "actionsClosed": null
  },
  "workQueueDepth": 0,
  "stale": false,
  "tags": ["game-design", "orchestration", "release-pipeline", "public-voice"]
}
```

Verdict enum: `healthy | needs-attention | at-risk | stalled | null`.
Stale flag set true by the dashboard JS when `lastReleaseAt` is older than 14 days for an active project, 60 days for parked.

JSON files at `yesandeverything.com/status/data/<project>.json`. Constellation JSON at `yesandeverything.com/status/data/constellation.json`.

### Phase 1: static dashboard reading existing repo signals

Pilot: Brackish Rising and YesAndChains. HBH/Scheduler/YaA/YaB follow in Phase 1b once the pilot proves out.

Done means: BR and YaC cards visible at yesandeverything.com/status/, each showing version pill, last release date+message, milestone, work-tree status. No bar-raise data yet (those fields render as "no report"). Refreshes on each release-script run because each `release.ps1` writes the JSON before committing.

Files this phase creates:

- `X:\YesAndEverything\status\index.html` - the dashboard page. Self-contained HTML/CSS/JS, dark mode matching the rest of YaE, no framework.
- `X:\YesAndEverything\status\data\` - directory for the per-project JSONs.
- `X:\YesAndEverything\status\data\BR.json` - seeded hand-authored, then maintained by BR's release script.
- `X:\YesAndEverything\status\data\YaC.json` - same.
- `X:\YesAndEverything\status\data\.gitkeep` - placeholder so the dir tracks even when empty.

Files each pilot project's `release.ps1` gains:

- One new step: write the JSON to `X:\YesAndEverything\status\data\<project>.json` and commit + push the YaE side. BR already touches YaE for the GDD publish, so the commit/push is in motion already. YaC does not currently touch YaE, so this step needs to be added.

Risk: dashboard page rendering. Mitigation: ship a minimal version (table-ish card layout, no charts) first; iterate on visuals after the data flow proves out.

### Phase 1b: extend to the remaining four projects

Done means: HBH, Scheduler, YaA, YaB cards live on the dashboard. Each project's release script writes its own JSON.

Order suggested: HBH (high release cadence, reference model), Scheduler (active iteration), YaA (release pipeline proven), YaB (least churn).

### Phase 2: per-project bar-raise skill (Waves 2 + 3 + 5)

Done means: running `claude` with the per-project bar-raise prompt against BR produces a Markdown report at `X:\BrackishRising\docs\BAR_RAISE-2026-05-26.md`, updates `X:\YesAndEverything\status\data\BR.json` with the bar-raise fields, and surfaces on the dashboard.

Skill location: install as a plugin under `personal-skills-src/skills/bar-raise/` so it ships with the existing skill suite. The friend's structure proves the file shape; we keep it.

Wave shape (adapted from the friend's, paths fixed for Nick's tree):

```
personal-skills-src/skills/bar-raise/
|-- SKILL.md
|-- README.md
|-- waves/
|   |-- 01_portfolio_overview.md
|   |-- 02_per_project_discovery.md
|   |-- 03_tier1_lenses/
|   |   |-- 01_architecture.md
|   |   |-- 02_reliability.md
|   |   |-- 03_security.md
|   |   |-- 04_performance.md
|   |   |-- 05_data_integrity.md
|   |   |-- 06_maintainability.md
|   |   |-- 07_solo_tool_ux.md
|   |   |-- 08_cost_economics.md
|   |   |-- 09_dependency.md
|   |   |-- 10_observability.md
|   |   `-- 11_strategic_kill_this.md
|   |-- 04_domain_lenses/        (filled in Phase 4)
|   `-- 05_meta_synthesis.md
`-- orchestrators/
    |-- per_project.md
    `-- constellation.md
```

Tier-1 lens trim vs the friend's 12: drop `compliance_data_steward` (not relevant to solo-dev projects), and rename `ux_human_factors` to `solo_tool_ux` to focus on the actual question (does this thing work for the one person who uses it). Eleven lenses, not twelve.

Findings file format:

```markdown
# BAR_RAISE-YYYY-MM-DD: <project>

Verdict: healthy | needs-attention | at-risk | stalled
Run: per-project | constellation
Lenses applied: Tier-1 = 11, Domain = N (list)

## Top finding
<one paragraph>

## Findings by lens
### Architecture
- Severity: high | medium | low | none
- ...

### Reliability
...

## Action items
1. [HIGH] ...
2. [MED] ...
3. [LOW] ...

## What got better since last review
- ...

## What got worse since last review
- ...
```

The synthesis (Wave 5) writes both the Markdown file and the JSON update. JSON write uses the Python atomic-write-with-readback pattern documented in the HBH FUSE-truncation memory.

### Phase 3: constellation orchestrator (Waves 1 + 2(N) + 3 + 4 + 5)

Done means: running the constellation prompt produces a portfolio-level Markdown at `X:\YesAndEverything\docs\CONSTELLATION-YYYY-MM-DD.md` and a `status/data/constellation.json`. Dashboard renders a top-of-page portfolio-verdict panel from it.

Constellation Wave 1 produces the cross-project picture. Wave 2 fans out (the friend's structure proves the parallel-per-project pattern). Wave 4 domain lenses run only if a project bears the matching tag. Wave 5 collapses everything.

Constellation JSON shape:

```json
{
  "generatedAt": "2026-05-26T06:00:00Z",
  "portfolioVerdict": "healthy",
  "projects": ["BR", "YaC", "HBH", "Scheduler", "YaA", "YaB"],
  "summary": "...",
  "topActions": [
    { "project": "BR", "severity": "high", "label": "..." }
  ],
  "atRiskProjects": [],
  "stalledProjects": [],
  "totalOpenActions": 0,
  "totalClosedSinceLastConstellation": 0
}
```

### Phase 4: domain lens set

Done means: each project carries a `tags` array in its JSON; the per-project bar-raise pulls in matching domain lenses; the lens content reflects the actual domain not a generic template.

9 domains, ~42 lenses. Not every project bears every domain; typical per-project run pulls in 3-5 domain lenses on top of the 11 Tier-1.

| Domain | Lenses | Projects that bear the tag |
|---|---|---|
| `game-design` | playability, scope-discipline, scale-architecture, asset-pipeline, voice-and-tone (in-game lore voice), sound-design-discipline, art-direction-consistency, save-format-stability | BR, HBH |
| `static-site` | build-config, page-weight, link-rot, gh-pages-quirks, seo-and-open-graph, accessibility-baseline | YaE |
| `cloud-edge` | worker-cpu-budget, KV-data-shape, auth-token-hygiene | YaC (worker), Scheduler (worker) |
| `finance-product` | dedupe-correctness, categorization-tail, threat-model, backup-cadence | YaB |
| `generative-art` | schema-driven-correctness, print-fidelity, palette-discipline | YaA |
| `PWA` | install-and-offline, sync, dataset-size | YaC |
| `orchestration` | skill-suite-health, work-queue-hygiene, audit-loop-integrity, fuse-truncation-defense, incident-runbook-currency, scheduled-task-firing-state, skill-trigger-collisions, skill-chain-handoff-integrity | every project (via YaE-side skill suite) |
| `release-pipeline` | per-project-ps1-stack, discord-notify-wiring, version-pill-drift, gate-page-publish | every project |
| `public-voice` | solo-dev-voice-portfolio, ai-tell-concealment-currency, brand-consistency-cross-artifact | YaE, YaC, YaA, BR, HBH |

Per-project lens budgets (Tier-1 always = 11):

| Project | Domains | Lenses | Total run |
|---|---|---|---|
| BR | game-design, orchestration, release-pipeline, public-voice | 8 + 8 + 4 + 3 = 23 | 34 |
| HBH | game-design, orchestration, release-pipeline, public-voice | same as BR | 34 |
| YaC | static-site (no, that's YaE) -> none, cloud-edge, PWA, orchestration, release-pipeline, public-voice | 3 + 3 + 8 + 4 + 3 = 21 | 32 |
| YaE | static-site, orchestration, release-pipeline, public-voice | 6 + 8 + 4 + 3 = 21 | 32 |
| YaA | generative-art, orchestration, release-pipeline, public-voice | 3 + 8 + 4 + 3 = 18 | 29 |
| YaB | finance-product, orchestration, release-pipeline | 4 + 8 + 4 = 16 | 27 |
| Scheduler | cloud-edge, orchestration, release-pipeline | 3 + 8 + 4 = 15 | 26 |

If 26-34 lenses per run proves heavy in practice, two cheap dials: (a) most domain lenses can short-circuit with "no finding" so they cost little; (b) Phase 4 can ship in two passes, the first running only Tier-1 + the top 3 lenses per domain, the second filling in the rest.

### Phase 5: scheduling

Done means: Windows Task Scheduler entries fire every morning for the six per-project bar-raises and every Monday morning for the constellation. Dashboard reflects the new data automatically.

Mechanism: Task Scheduler invokes a PowerShell script per project that calls `claude --print` (or whatever the right Claude Code non-interactive flag is, verify during implementation). The prompt is a small shim that says "load the bar-raise per-project orchestrator and run it against `X:\<project>`".

Staggering: six per-project tasks fire at 5-minute intervals starting 06:00 local so the Discord posts and JSON commits do not collide. Constellation at 07:00 Monday after the per-project Monday runs complete.

Fallback when the laptop is asleep: Task Scheduler's "Run task as soon as possible after a scheduled start is missed" option covers it. If a run misses for 24 hours the dashboard's `stale` flag flips and surfaces visibly.

### Phase 6: polish + handover

Done means: the system runs without Claude in the loop. Update `PERSONAL_CLAUDE_ARCHITECTURE.md` to document the new bar-raise contract. Add bar-raise references to each project's CLAUDE.md. Optional: dashboard UX polish (sparklines, severity heatmap, "next action" highlight, alert-threshold colors).

## Dashboard page sketch

Plain HTML/CSS/JS, single file at `X:\YesAndEverything\status\index.html`. Dark mode matches YaE root. Fonts inherit from YaE.

Layout: portfolio verdict banner at the top (from `constellation.json`, null in Phase 1), then six project cards in a responsive grid (2 columns on desktop, 1 on mobile). Each card shows version pill, last release line, milestone, work-tree status, audit findings counts (H/M/L), bar-raise verdict + top finding, open-action count, stale flag.

Top-right: a refresh button that re-fetches all JSONs without a page reload. A "last refreshed" timestamp lives next to it.

No charts in v1. Add later if useful.

## Claude Code vs Cowork split

Claude Code owns:

- All scheduled bar-raise runs.
- All scheduled audit runs (migrate existing ones from Cowork as Phase 5 lands).
- All release-script invocations triggered by the bar-raise.
- The work-queue drain when triggered by schedule.
- Any session where the request is "edit code, run tests, commit, push".

Cowork stays for:

- One-off file creation (docs, decks, spreadsheets, PDFs).
- Interactive review sessions where the file-card UI matters.
- Skills that lean on Cowork-only tools (artifacts, file presenting, MCP search).
- Roadmap-style planning conversations like this one.

Boundary heuristic: if the work produces or modifies files in a project repo, prefer Claude Code; if it produces standalone outputs for review or sharing, prefer Cowork.

## Open questions to lock during implementation

- Does Claude Code's non-interactive CLI flag stay `--print` or does the build I install use a different name? Verify on first Phase 5 invocation.
- Severity scale: stick with three (high/medium/low) or grow to five (critical/high/medium/low/info)? Default three; revisit if Phase 3 surfaces too many findings to triage cleanly.
- Stale-threshold per project: 14 days for active, 60 days for parked. Confirm during Phase 1 once dashboards have real data.
- Do we want a single combined Discord channel for bar-raise notifications, or per-project channels? Default: per-project channels, matching the existing dev-log convention. Constellation gets its own channel (`#constellation-digest`?).
- BAR_RAISE-YYYY-MM-DD reports: daily writes generate ~180 files per project per year. Acceptable bloat? Default: keep all, the markdown is small. Revisit if it slows audits.
- 26-34 lenses per per-project run might be too heavy. Phase 4 may need to ship in two passes (Tier-1 + top-3 domain first, full set second).

## Next-session pickup

If you are a Claude session opening this file fresh, here is how to continue.

1. Check the "Phase status" section below for the last phase marked DONE. Open the next phase.
2. Read the YaE handler at `X:\YesAndEverything\CLAUDE.md` for the static-site conventions that apply to anything you put under `status/`.
3. If you are in Phase 2 or later, also read the relevant project's CLAUDE.md for that project's hazards (FUSE truncation, voice rules, lock signals).
4. Use the atomic-write-with-readback pattern documented in `htbh-fuse-edit-tool-truncation` memory for any file under 100 KB that you write. The Edit tool truncates silently on this mount.
5. Update this roadmap as you go. Mark phases DONE with the session date. Add new "open questions" as they come up.

## Phase status

| Phase | Status | Session marker |
|---|---|---|
| 0 - roadmap + contract + URL lock | DONE | 2026-05-26 |
| 1 - static dashboard reading existing signals (BR + YaC pilot) | DONE | 2026-05-26 |
| 1b - extend dashboard to HBH / Scheduler / YaA / YaB | DONE | 2026-05-26 |
| 2 - per-project bar-raise skill (SKILL.md + orchestrator + Waves 2/3/5 + Wave 4 dir scaffolded) | DONE | 2026-05-26 |
| 3 - constellation orchestrator (Wave 1 + constellation orchestrator filled, JSON contract locked) | DONE | 2026-05-26 |
| 4 - domain lens set | pending | |
| 5 - scheduling | pending | |
| 6 - polish + handover | pending | |
