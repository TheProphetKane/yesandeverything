# Backlog arrival rate: measurement and proposal

Written 2026-08-26. Measured against `X:\PortfolioOps\queue\.work-queue.json` (411 live items),
`.work-queue-archive.json` (1,271 archived), and `X:\PortfolioOps\status\data\backlog-trend.json`
(29 governed days from 2026-07-27). 1,675 unique items, every one carrying an `added` date.
Every number below is reproducible from those three files.

Awaiting Kane's decision. Nothing has been turned off.

## What the numbers say

**Arrival rate: 184.9 items per week over the last eight weeks, 176.5 over the last four.**
About 25 a day. Per project, last four weeks, after normalising the alias names
(`hbh` and `htbh` to Hordes, `br` and `brackish` to Rising, `yac` to Chains, and so on):

| Project | Items/week | Project | Items/week |
|---|---|---|---|
| Hordes | 24.5 | Ring | 11.0 |
| Gnosis | 24.5 | Budget | 9.8 |
| Everything | 18.2 | Agents | 8.5 |
| Rising | 16.8 | Chains | 7.8 |
| Skylight | 16.5 | Cattery | 7.2 |
| Scheduler | 15.5 | ops and cross-cutting | 3.2 |
| Apothecary | 12.8 | | |

Seventy percent of arrivals come from bar-raise reviews, 26 percent from the nightly audits,
4 percent from everything else.

**Auto-drainable fraction: 4.4 percent over eight weeks, 0.8 percent over four.** Six of the
last 706 arrivals carry `auto_safe: true`. The automatic drain is not a capacity lever and has
not been one for a month; `queue-drain-hourly` has been disabled since 2026-07-31 for exactly
this reason.

**Thirty-day outcome: of 925 items that arrived more than thirty days ago, 67.5 percent were
done, 22.2 percent were swept away without action, and 10.4 percent are still open.** So a
third of everything that arrives never gets worked.

Latency explains the shape. Of items that closed and carry both dates, the median took 4 days
and the ninetieth percentile took 28. Items either get picked up within days or they never get
picked up at all. Nothing sits in progress.

**The waste is concentrated in one severity band.** Same thirty-day cohort, split by severity:

| Severity | Count | Done | Swept | Open |
|---|---|---|---|---|
| critical | 15 | 93% | 7% | 0% |
| high | 229 | 78% | 3% | 19% |
| medium | 455 | 53% | 37% | 10% |
| low | 210 | 83% | 13% | 3% |

High and critical findings get acted on. Medium is the sludge: half the intake, and more than
a third of it thrown away.

**The single biggest sweep reason is the review superseding itself.** 270 items were dropped
with the reason "superseded generation": a newer full review of the same project ran and its
action ledger did not carry the finding. Median time from enqueue to the superseding review is
18 days. Median gap between reviews of the same project since 2026-07-01 is 7 days. Ninetieth
percentile time to close a finding is 28 days. The review lattice regenerates faster than the
fixes land, so it discards its own output before that output can be worked. Hordes alone lost
99 items this way, Rising 43, Gnosis 34, Skylight 30.

**Unattended burndown against attended.** Across 28 governed days the daily burndown closed a
mean of 6.7 items a day, median 5, against a mean intake of 21.5. Its own stated target is
"intake plus two, floor five", which it has met twice in 28 days. On 2026-08-24 one attended
session closed 280 items in a day across fourteen projects, each with a resolution note and
many with a shipped version number. That is 42 times the unattended median, and it is real
work, not reclassification.

**Capacity cannot reach a third of what is open.** Of 215 currently open items, 80 are blocked
on Kane: 31 tagged `decision`, 28 tagged `attended-session`, median age 33 days, 49 of them
older than 30 days. No routine can close any of those.

## What this means

The hypothesis is right about the binding constraint and wrong about the review being innocent.
Attended capacity is what closes items, and the absorption rate the original finding measured
was a measurement of nothing being attended. But the review cadence is genuinely wasteful in one
specific way: it re-runs every project weekly against a fix latency whose ninetieth percentile
is four weeks, so it supersedes 270 of its own findings.

The lever is the review **interval**, not the review **depth**.

Throttling depth was tested against the data and fails. A per-report enqueue cap of 12 applied
retroactively to the last eight weeks would have dropped 415 items, of which 182 were
subsequently fixed and 215 were swept. That is close to a coin flip, not a filter. The `impact`
times `confidence` score does not separate outcomes either: items scoring 9 to 11 closed at
66 percent while items scoring 15 to 19 closed at 49 percent. There is no ranking signal in the
data good enough to throw findings away on.

## Proposal

### Turn off

1. **Scheduler's Wednesday bar-raise slot, and its nightly audit.** The project is retired.
   It produced 62 items in the last four weeks, 15.5 a week, all of it now worthless. Its 12
   currently open items get dropped with the retirement as the reason. Caveat: the posture line
   in `X:\YesAndScheduler\CLAUDE.md` still reads "dormant side project" as of this writing, not
   retired, and decision D33 says "deliberately parked". The retirement needs to land in that
   posture line and in the decisions ledger, or the review lattice check from D34 puts Scheduler
   back.

2. **The daily governor's "intake plus two, floor five" target.** It has been met on 2 of 28
   days. A target missed 93 percent of the time is not a governor, it is a number that makes a
   routine report failure every morning. Either the arithmetic goes and the routine becomes
   "close the top five and report the slope", or the routine goes.

3. **Tombstone `queue-drain-hourly` rather than keeping it for re-enable.** Auto-drainable
   intake is 0.8 percent of the last four weeks. The pool is not coming back, and the definition
   is carrying a promise the data has already refused.

### Change

4. **Per-project full bar-raise from weekly to fortnightly.** Two projects a day becomes one, or
   the rotation stretches from 7 days to 14. This halves intake to roughly 88 a week on its own,
   with no per-report filter and no findings discarded by rule, and it pushes the supersession
   interval from 18 days out past the 28-day close latency, which is what recovers most of the
   270 wasted items. The nightly audits stay at their current cadence: they are 26 percent of
   intake and they catch drift, which is time-sensitive in a way a deep review is not.

### Add

5. **A scheduled attended pass every two weeks**, shaped like 2026-08-24. Sized from evidence:
   that session absorbed 280 items. Post-change intake of 88 a week means a fortnight arrives
   with about 176, so one such session per fortnight clears the intake with margin and starts
   eating the standing backlog.

6. **Run a decision pass on the 80 blocked-on-user items before the first attended pass.**
   Thirty-one are rulings Kane owes and 28 are explicitly waiting for an attended session. Those
   80 are 37 percent of the open queue and no amount of capacity touches them.

### Do not do

- **Do not add unattended burndown capacity.** The measured close rate of an unattended session
  is 6.7 a day against 21.5 arriving, and 37 percent of what is open is blocked on a person.
  More unattended sessions buy very little and cost tokens every day.

- **Do not cap enqueue per report, and do not gate on the severity or confidence score.**
  Measured above: any such cut discards roughly as much work that got done as work that got
  swept.

## What the change is worth

Intake falls from 176 a week to about 88 from the fortnightly reviews, minus 15 from Scheduler,
so roughly 73 a week. One attended pass a fortnight at the observed rate is worth about 140 a
week of capacity. The queue drains instead of growing, the supersession churn mostly stops, and
no finding is discarded by a rule the data says would be wrong half the time.
