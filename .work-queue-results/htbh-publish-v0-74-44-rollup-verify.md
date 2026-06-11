# htbh-publish-v0-74-44-rollup-verify (closed 2026-06-11T06:04:46Z)

Verdict: intentional bundle, not a dropped publish step.

Evidence:
- HBH git log has no v0.74.44 commit; sequence is 278d380 (v0.74.43) then 7332b20 + 5dbb7f3 (both v0.74.45). v0.74.44 was a doc-only bump committed inside the v0.74.45 commit.
- YaE hordes/index.html publish log goes 7bde784 (v0.74.43) directly to fd6210d (v0.74.45). No v0.74.44 publish ever ran, matching the HBH side.
- Decoded the base64 ENCODED payload at fd6210d (1,391,036 chars): the v0.74.44 changelog entry IS present ("Lore tab restored to single-content; design-history rolled up", 2026-05-25, PATCH).
- publish-gdd.ps1 re-encodes the entire GDD on every run, so any changelog entries added between publishes ride the next publish automatically. No payload loss is possible from a skipped publish; only staleness until the next run.

One-line for the next canonical audit: v0.74.44 publish gap on YaE/hordes is an intentional bundle into the v0.74.45 publish; payload verified complete 2026-06-11.
