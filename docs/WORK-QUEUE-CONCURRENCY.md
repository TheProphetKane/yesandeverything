# Work-queue single-flight protocol

`.work-queue.json` is mutated by several writers that can run concurrently:
the `work-queue-runner` skill (invoked by `regular-queue-drain`, `queue-drain-4h`,
`loop-tick-hourly`, `queue-triage-nightly`), and the Agents `server.mjs` `/queue`
endpoint. Lock-free read-modify-write across these lost-updated and corrupted the
file repeatedly (incident `queue-concurrency-race-2026-06-14`).

## The lock

A single lockfile, `X:\YesAndEverything\.work-queue.lock`, guards every
read-modify-write. Protocol (identical in PowerShell and Node):

1. Acquire by atomic create-exclusive (`FileMode.CreateNew` / `openSync(..,"wx")`). Write `pid|utc|host`.
2. If it exists and its mtime is older than 30s, it is stale: delete and retry (a crashed holder left it).
3. Otherwise retry with small jitter backoff up to ~15s, then abort rather than risk corruption.
4. Hold the lock only for the brief file mutation: read -> mutate in memory -> atomic write (tmp + parse-check + rename). Never hold it across a running prompt.
5. Release by deleting the lockfile.

## Writers and how they comply

- **PowerShell / skills / scheduled tasks:** mutate only via `scripts/queue-edit.ps1`
  (`-Op add|set|drop|get`, or dot-source for `Invoke-QueueMutation { param($q) ...; $q }`).
  Never hand-edit the JSON.
- **Agents server:** `server.mjs` wraps its `/queue` read-modify-write in `withQueueLock`,
  honoring the same lockfile.
- **work-queue-runner skill:** its "Single-flight (mandatory)" section routes all writes
  through `queue-edit.ps1`. Source: `_skill-review/personal-skills-src/skills/work-queue-runner/`.
  Reinstall the skill after editing the source so the cached copy picks up the rule.

## Housekeeping

`.work-queue.json`, `.work-queue.json.tmp`, and `.work-queue.lock` are operational
state, not source. Keep them gitignored (`/.work-queue.*`).
