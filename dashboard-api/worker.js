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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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
    return new Response(val, {
      headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  },
};
