// Self-test for the dashboard data worker's conditional answers (performance-01).
//
//   node dashboard-api/worker.selftest.mjs
//
// The dashboard refetches every open tab's data once a minute and the usage file
// only grows, so the same bytes crossed the wire sixty times an hour per tab
// whether or not anything had changed. These pin the entity tag's contract,
// including the parts that are easy to get subtly wrong: no-store survives, the
// tag is over the value rather than a write stamp, and a 304 carries no body.
//
// The store is a stand-in and no network call leaves this file.

import worker from "./worker.js";

let failures = 0;
const ok = (name, cond) => {
  console.log(`  ${cond ? "ok   " : "FAIL "} ${name}`);
  if (!cond) failures++;
};

const env = (values) => ({ DASHBOARD: { get: async (k) => (k in values ? values[k] : null) } });
const get = (headers = {}) => new Request("https://usage.invalid/usage.json", { headers });

const PAYLOAD = JSON.stringify({ days: [{ d: "2026-09-22", in: 1, out: 2 }] });

// --- the first answer carries a tag ------------------------------------------
const first = await worker.fetch(get(), env({ usage: PAYLOAD }));
const tag = first.headers.get("etag");
ok("a plain request answers 200", first.status === 200);
ok("with an entity tag", typeof tag === "string" && tag.startsWith('W/"'));
ok("and the payload intact", (await first.text()) === PAYLOAD);
ok("no-store survives the change", first.headers.get("cache-control") === "no-store");
ok("and the tag is exposed to a cross-origin reader",
  (first.headers.get("access-control-expose-headers") || "").includes("ETag"));

// --- the same tag gets a 304 with no body -------------------------------------
{
  const again = await worker.fetch(get({ "if-none-match": tag }), env({ usage: PAYLOAD }));
  ok("the same tag answers 304", again.status === 304);
  ok("with no body", (await again.text()) === "");
  ok("and still says no-store", again.headers.get("cache-control") === "no-store");
  ok("and repeats the tag", again.headers.get("etag") === tag);
}

// --- a changed payload gets a new tag and the body ----------------------------
{
  const changed = JSON.stringify({ days: [{ d: "2026-09-22", in: 9, out: 9 }] });
  const r = await worker.fetch(get({ "if-none-match": tag }), env({ usage: changed }));
  ok("a changed payload answers 200 even against the old tag", r.status === 200);
  ok("with a different tag", r.headers.get("etag") !== tag);
  ok("and the new payload", (await r.text()) === changed);
}

// --- a rewrite that changed nothing keeps its tag ------------------------------
{
  // The collector rewrites these keys on every run whether or not the contents
  // moved. The tag is over the value, so an identical rewrite is still a 304.
  const r = await worker.fetch(get({ "if-none-match": tag }), env({ usage: PAYLOAD }));
  ok("an identical rewrite does not invalidate the tag", r.status === 304);
}

// --- a stale or garbage tag is ignored ------------------------------------------
{
  const r = await worker.fetch(get({ "if-none-match": 'W/"deadbeefdeadbeef"' }), env({ usage: PAYLOAD }));
  ok("an unknown tag answers the body rather than 304", r.status === 200);
}

// --- the missing-key path is unchanged --------------------------------------------
{
  const r = await worker.fetch(get({ "if-none-match": tag }), env({}));
  ok("a missing key still answers 404, never 304", r.status === 404);
}

console.log(failures === 0 ? "\nselftest passed" : `\nselftest FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
