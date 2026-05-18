# YesAndChains canonical-doc audit — findings

**Audited:** 2026-05-14
**Scope:** root canonical layer (PROJECT_SPEC.md, CONTEXT.md, ROADMAP.md, BACKLOG.md, DECISIONS_NEEDED.md, NEXT_SESSION_QUEUE.md, README.md, CLAUDE.md) + `docs/launch-checklist-1.0.md` + `docs/adr/` + the previous audit at `docs/CANONICAL_AUDIT.md`.
**Method:** read each canonical file, cross-reference shipped-version claims against `CONTEXT.md` changelog + actual filesystem state + `git log`, and look for phantom references.

---

## TL;DR

The canonical layer holds up structurally — each file has a distinct, non-overlapping role and the previous `docs/CANONICAL_AUDIT.md` (2026-05-14, same day) already captures the architectural picture. The problems are **content drift**: the canonical files have not been kept up-to-date with what shipped in `0.20.0` through `0.25.2`. Three docs (ROADMAP, README, launch-checklist) still describe a `0.21.4`–era app. The most expensive single drift is **TechDisc CSV import is shipped and live in 0.24.0 but still listed as future work in two places**.

The previous audit's two open recommendations are also still open: the `PRIORITY_QUEUE.md` phantom reference in `CONTEXT.md` and the tombstoned `NEXT_SESSION_QUEUE.md` file at root.

---

## What's aligned

- **Version pill consistency.** `CONTEXT.md` (line 9), `src/util.ts:5` (`YAC_VERSION`), `src/profile.ts:72` (`BUILD_VERSION`), `index.html:1290` (cache-buster `app.js?v=0.25.2`), and `git log` HEAD all agree on `0.25.2`. The 9th preship gate (bundled `BUILD_VERSION` matches source) is working.
- **Versioning policy.** `CONTEXT.md` line 11+ and `CLAUDE.md` agree on the revised pre-1.0 semver rule (PATCH / MINOR / MAJOR=1.0).
- **Auth + SMTP wiring.** `BACKLOG.md` §0.5 and `CLAUDE.md` agree: `auth@yesandeverything.com` via Resend SMTP, on the umbrella brand domain.
- **Domain registration status.** `BACKLOG.md` §0.1, the launch-checklist "What's already done" block, and `CLAUDE.md` all reflect that `.com` + `.app` are live on Cloudflare Registrar.
- **The previous audit's TL;DR is correct.** Each root-level doc owns a distinct role; no two files claim the same authority.
- **ADR count.** ROADMAP says "15+", actual is 17 (`docs/adr/0001`–`0017`). Within tolerance.
- **`udisc_course_data.json` cleanup.** CONTEXT.md `0.21.5` flagged a "Pending Nick: delete `udisc_course_data.json`" item — file is now absent from root. (No follow-up changelog entry confirming the cleanup, but the work is done.)

---

## Drift (in priority order)

### D1. ROADMAP §22 — claims TechDisc import is future work; it shipped in 0.24.0

**ROADMAP.md:51 (Tier B "needs Nick's hands once"):**
> §22 User skill profile + TechDisc CSV import — needs migration `0009_skill_profile.sql` applied. Parser + UI scaffolding can ship around it.

Reality from `CONTEXT.md` line 79 (0.24.0, 2026-05-06):
> §22b TechDisc import + Throw Power profile + recommender consumes speed/spin… New `src/techdisc-import.ts` module parses TechDisc's `throws.csv` export… Two entry paths: (a) manual numeric input… (b) TechDisc CSV upload.

`src/techdisc-import.ts` exists, `src/profile.ts:19` imports `parseTechDiscCsv, aggregateTechDisc, formatSpeedForDisplay`, and the recommender prompt is already extended to consume the throw power profile. The migration is `0011_skill_profile.sql` (not `0009`, which is `0009_profile_home_course.sql`), and it shipped in `0.20.0`.

So ROADMAP.md line 51 is wrong on three points: the work shipped, the migration filename is wrong, and the migration was already applied.

`docs/launch-checklist-1.0.md:150` repeats the error in its "Out of scope for 1.0 (post-launch)" list:
> TechDisc CSV importer (waits on a real export sample)

Same item, opposite list, both wrong.

### D2. BACKLOG §28 header contradicts launch-checklist + CONTEXT 0.20.0

**BACKLOG.md:998:**
> §28 In Regulation (C1 Reg / C2 Reg) — player stat (added 0.13.56) ✅ DONE 0.13.61 (My-game card; **per-hole + per-course surfacing remain queued**)

**docs/launch-checklist-1.0.md:13:**
> [x] §28 In-Regulation per-course + per-hole stats (0.20.0)

**CONTEXT.md:96 (0.20.0):**
> `inRegulationStats(scope?)` refactored to take optional `{courseSlug, holeNumber, par}` filter… Course-detail aggregate stats card now shows C1/C2 IR cells… per-hole stats panel shows a C1/C2 IR row…

Per-hole + per-course IR surfacing shipped in 0.20.0. BACKLOG.md §28 header is stale.

### D3. ROADMAP "What's live" pinned to 0.24.5; three releases newer

**ROADMAP.md:16:**
> ## What's live (as of `0.24.5`, deployed)

CONTEXT.md changelog has `0.25.0` (visual modernization), `0.25.1` (in-app account deletion — material new feature touching legal compliance), and `0.25.2` (feedback inbox routing change). The "What's live" section doesn't mention any of: design tokens / hover-lift / 40px touch targets / in-app account deletion / new feedback address. The account-deletion item in particular is non-trivial (Apple 5.1.1(v) / GDPR Art. 17 / CCPA gate) — it deserves a line on the roadmap because it unblocks App Store submission.

### D4. CONTEXT.md `PRIORITY_QUEUE.md` phantom reference still present

Identified in `docs/CANONICAL_AUDIT.md` Finding #2 (same-day audit), still unfixed.

**CONTEXT.md:22:**
> 🔒 Active priority queue: `PRIORITY_QUEUE.md` is the canonical to-do list until everything in it is checked off… AI re-reads PRIORITY_QUEUE.md at the start of every session.

`PRIORITY_QUEUE.md` is **archived to `_archived/PRIORITY_QUEUE.md`** (per `CONTEXT.md` 0.21.5 changelog) and the active queue is `docs/launch-checklist-1.0.md`. Any AI session following the CONTEXT.md instruction literally will hit a missing file.

### D5. DECISIONS_NEEDED.md references a non-existent Decision 26

**DECISIONS_NEEDED.md:274 (under "Decision 24. Feedback email routing"):**
> **Answer (REVISED 2026-05-13 — see Decision 26):** All in-app feedback addresses route to `kane@yesandeverything.com`…

The file contains Decisions 1–10 and 18–25. There is no Decision 26 record. The 0.25.2 CONTEXT.md changelog (line 71) also says "Supersedes Decision 24" but never landed a Decision 26 entry in the log.

The supersession itself is fine — the cross-reference target is the gap.

### D6. DECISIONS_NEEDED.md Decision 15 missing supersession marker

**DECISIONS_NEEDED.md:103 (Decision 15. Versioning policy):**
> **Answer:** "I like patch-on-related-feature, we are mainly looking at full screens being added, complete overhauls on screens, or new menu features being added as our qualifier for minor bumps."

**CONTEXT.md:19:**
> This supersedes Decision 15 (2026-05-02 "patch-on-related-feature is fine"). The old rule produced 0.13.70 in a single minor; the new rule keeps the minor counter meaningful.

Decision 15 was superseded by the 2026-05-05 versioning revision, but the DECISIONS_NEEDED.md entry doesn't say so. The "answered log" pattern depends on supersessions being noted inline (e.g. Decision 7's "SUPERSEDED by Decision 10" marker on line 37).

### D7. README.md is multiple versions stale

**README.md:11:** `## What's working today (v0.13.x)` — current is `0.25.2` (many releases later).

**README.md:22:** `~3,400 canonical courses` — `CLAUDE.md` and `ROADMAP.md` say `~6,300`; local `course_data.json` actually has 852 records (12 MB). All three numbers disagree, which suggests "scraped" vs "in KV" vs "in local JSON" haven't been disambiguated.

**README.md:32:** Stats-mode wizard described as `Disc → Shot type → Landing → Execution → Result` (5 steps). Per `CONTEXT.md` 0.22.0 (line 88) the current order is 11 steps: `disc → stance → aim → release → shotType → landing → position → confidence → execution → result → distance` (reorderable in Settings per 0.22.2).

**README.md:73:** `§22 §12 user skill profile + TechDisc CSV import — Ready to ship as soon as a real TechDisc export is in hand.` Same drift as D1: shipped in 0.24.0.

**README.md:79:** `~830KB bundled` — actual `app.js` is 1,096,444 bytes (~1.04 MB). `CLAUDE.md:25` correctly says "~1MB".

### D8. Phantom references / file-existence checks

- `ROADMAP.md:51` references `0009_skill_profile.sql` — file does not exist. Actual file is `supabase/migrations/0011_skill_profile.sql`. (Already counted in D1.)
- `CONTEXT.md:22` references `PRIORITY_QUEUE.md` — file is at `_archived/PRIORITY_QUEUE.md`, not the root path implied. (Already counted in D4.)
- `NEXT_SESSION_QUEUE.md` is still present at root despite being tombstoned. CANONICAL_AUDIT.md Finding #1 recommended `git rm`; still not done.
- `crawler_project_notes.md` lives at root rather than in `docs/` or `tools/`. CANONICAL_AUDIT.md Finding #4 flagged this; still in place.

### D9. PROJECT_SPEC.md scope drift

**PROJECT_SPEC.md:5:**
> Live at `https://theprophetkane.github.io/yesandchains/`.

The product now also serves from `https://yesandchains.com` and `https://yesandchains.app` (both registered, DNS wired, auth allowlist updated — per BACKLOG §0.1, launch-checklist line 23). PROJECT_SPEC, as the "vision + locked architecture" doc, should at minimum acknowledge the canonical custom-domain URLs.

PROJECT_SPEC also still carries the §8 "Still open" list (course ingestion, AI calls, data persistence, multi-player, monetization, disc database source) — all six of these have answered decisions elsewhere (§1.1–§1.8 of BACKLOG; decisions 1, 2, 5, 10 in DECISIONS_NEEDED). The §8 list reads as if it's the source-of-truth open-questions register, but it isn't.

### D10. CONTEXT.md self-inconsistency on window-exposure regression count

**CONTEXT.md:44:**
> This regression has shipped **eight times across eight versions** (0.5.31 / 0.5.33 / 0.11.0 / 0.12.2 / 0.13.5 / 0.13.7 / 0.13.8 — count is unforgiving).

Seven versions listed. Either the count is off by one or a version was dropped from the enumeration. Minor — but it's a "HARD GATE" rule block, and miscounts in a hard-rule block undermine the gate.

### D11. ROADMAP §27 / §32.1 "✓ shipped 0.13.61" — BACKLOG status not fully mirrored

ROADMAP marks `§27 Daily welcome message rotation` and `§32.1 Storage feasibility projection` as shipped.

- §27 in BACKLOG.md:1074 header now reads `✅ DONE 0.13.61` — aligned. However, the §27 phasing list (lines 1094–1098, 27.1–27.4) is **not crossed off** below the DONE header, so it's unclear whether the full rotation engine (27.2–27.4) shipped or just the static fallback (27.1, which line 1095 still marks as shipped 0.13.54). Worth a 30-second clarification pass.
- §32 in BACKLOG.md:1257 has no `DONE` marker on §32.1 itself; the phasing list at line 1329 doesn't strike through `32.1`. `docs/scaling-projection.md` does exist on disk, so the work landed — the BACKLOG just doesn't reflect it.

---

## Phantom references summary

| Reference | Source | Reality |
|---|---|---|
| `PRIORITY_QUEUE.md` | `CONTEXT.md:22` | At `_archived/PRIORITY_QUEUE.md`; active queue is `docs/launch-checklist-1.0.md` |
| `0009_skill_profile.sql` | `ROADMAP.md:51` | Migration is `0011_skill_profile.sql`, already applied in 0.20.0 |
| "Decision 26" | `DECISIONS_NEEDED.md:274` + `CONTEXT.md:71` | No Decision 26 record exists |
| `https://theprophetkane.github.io/yesandchains/` as sole live URL | `PROJECT_SPEC.md:5` | Also live at `yesandchains.com` + `yesandchains.app` |
| `v0.13.x` "what's working today" | `README.md:11` | Current is `0.25.2` |
| "~830KB bundled" | `README.md:79` | `app.js` is ~1.04 MB |
| "~3,400 canonical courses" | `README.md:22` | Disputed; `CLAUDE.md` + `ROADMAP.md` say ~6,300; local file has 852 |
| 5-step stats wizard | `README.md:32` | 11-step reorderable wizard since 0.22.0/0.22.2 |
| Decision 15 (versioning) as current rule | `DECISIONS_NEEDED.md:103` | Superseded 2026-05-05 per `CONTEXT.md:19` |

---

## Recommended remediation order

1. **D1 + D7's TechDisc claim** — biggest lie. One edit each in `ROADMAP.md` (Tier B → "What's live"), `docs/launch-checklist-1.0.md` (drop from "Out of scope"), `README.md` (drop from "Currently designed-but-not-built").
2. **D2** — strike "per-hole + per-course surfacing remain queued" from BACKLOG §28 header; the launch-checklist + CONTEXT both confirm it shipped.
3. **D3** — refresh ROADMAP "What's live" to 0.25.2; add a "Visual modernization + account deletion + feedback routing (0.25.x)" bullet block.
4. **D4 + D8 NEXT_SESSION_QUEUE** — fix the `CONTEXT.md` PRIORITY_QUEUE phantom and `git rm NEXT_SESSION_QUEUE.md` (already recommended in same-day `docs/CANONICAL_AUDIT.md`).
5. **D5 + D6** — append Decision 26 to DECISIONS_NEEDED.md (feedback inbox chains@→kane@, 2026-05-13); add "SUPERSEDED by 2026-05-05 versioning revision in CONTEXT.md" line to Decision 15.
6. **D7 README** — rewrite "What's working today" against 0.25.2 surface; reconcile course-count claim; bump bundle size; rewrite wizard step list.
7. **D9 PROJECT_SPEC** — add custom-domain URLs to the header; either retire §8 "Still open" by linking each item to its answered decision, or keep §8 but mark each item as ANSWERED with a date and cross-reference.
8. **D10** — count fix or enumerate the missing version.
9. **D11** — cross off BACKLOG §27 phasing items + §32.1 in the phasing list.

None of these are structural — the canonical layer's shape works. The drifts are all "files haven't kept pace with the changelog," which is fixable in a single sweep.
