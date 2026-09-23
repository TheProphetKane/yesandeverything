// usage.yesandeverything.com — read-only data backend for the /dashboard/ page.
//
// Why this exists: the dashboard data (usage.json + queue.json) used to ship as
// static files through GitHub Pages, which rebuilds the whole site on every push
// and is rate-limited to ~10 builds/hour. At 20-100 commits/day the build budget
// blew and the live data froze. This Worker serves the data straight from KV, so
// the collector / each release can push fresh numbers (via `wrangler kv key put`)
// and they go live in seconds with no Pages build and no rate limit.
//
// Writes are NOT done here (no POST): data is written to KV directly with the
// owner's authenticated wrangler CLI, so there is no ingest secret to leak.

const CORS = {
  // The entity tag is useless to a cross-origin caller it is not exposed to,
  // and the dashboard is cross-origin to this worker (performance-01).
  "Access-Control-Expose-Headers": "ETag",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  // If-None-Match has to be allowed on the preflight or the browser strips it
  // and every conditional request arrives unconditional (performance-01).
  "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
};
const KEYS = { "/usage.json": "usage", "/queue.json": "queue", "/statuses.json": "statuses" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return new Response("method not allowed", { status: 405, headers: CORS });
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("ok", { headers: { ...CORS, "Content-Type": "text/plain" } });
    }
    const key = KEYS[url.pathname];
    if (!key) return new Response("not found", { status: 404, headers: CORS });
    let val;
    try {
      val = await env.DASHBOARD.get(key);
    } catch (err) {
      console.error(`dashboard-api: key-value read failed for key "${key}": ${err && err.message ? err.message : err}`);
      return new Response(JSON.stringify({ error: "kv_read_failed", key }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    // A missing or evicted key used to answer 200 with "{}". The dashboard only
    // falls back to its shipped static copy when the parsed body is null, and
    // "{}" is not null, so it rendered zeroes instead of the last known-good
    // data. 404 makes the absence legible to the caller.
    if (val == null) {
      console.error(`dashboard-api: key "${key}" missing or evicted from KV`);
      return new Response(JSON.stringify({ error: "not_found", key }), {
        status: 404,
        headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    // performance-01: every open tab refetched the whole growing usage file once a
    // minute, and both ends had caching off, so the same bytes crossed the wire
    // sixty times an hour per tab whether or not anything had changed.
    //
    // A conditional request fixes the transfer without touching the freshness
    // rule. no-store stays: the dashboard must never render a cached payload, and
    // the collector rewrites these keys on a cadence nothing here can predict. An
    // entity tag is a different promise from a cache lifetime. It says nothing
    // about how long the answer is good for, only whether the answer changed, so
    // the tab still asks every sixty seconds and still gets a current answer.
    // What it stops paying for is the body when the answer is the one it holds.
    //
    // The tag is over the value itself rather than a version stamp, because the
    // collector writes these keys on every run whether or not the contents moved,
    // and a stamp would change on a rewrite that changed nothing.
    const etag = await weakEtag(val);
    const inm = request.headers.get("if-none-match");
    if (inm && inm === etag) {
      return new Response(null, {
        status: 304,
        headers: { ...CORS, ETag: etag, "Cache-Control": "no-store" },
      });
    }
    return new Response(val, {
      headers: {
        ...CORS,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ETag: etag,
      },
    });
  },
};

/* A weak entity tag over the payload.
 *
 * Weak rather than strong, and that is the honest label: this compares the bytes
 * the worker is about to send, not a byte-for-byte identity of a stored entity,
 * and a weak tag is what the specification asks for in that case.
 *
 * SHA-256 truncated to sixteen hex characters. The whole digest would be exact
 * and is a longer header on every request and every response for a comparison
 * that is already a hash comparison; sixteen characters is sixty-four bits,
 * which no dashboard payload is going to collide inside. */
async function weakEtag(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `W/"${hex.slice(0, 16)}"`;
}
