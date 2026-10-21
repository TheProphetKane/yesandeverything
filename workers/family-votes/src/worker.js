// Family vote for /thanksgiving-2026/: a thumbs up or down per listing, one record per device.
//
// There is no sign-in and no name. The page makes a random device id once, keeps it in the
// browser, and sends it with each vote, so each phone or laptop counts once per listing. It is a
// trust-the-family page, not a ballot; the bounds below keep a stray visitor from filling it.
//
// Each device is one key in the VOTES namespace, tg26:d:<device id>, with its votes held in the
// key's metadata so a single list() returns the whole tally without a read per voter. Devices
// land on different keys and never overwrite each other. The tally never returns device ids.

export const PREFIX = "tg26:d:";
export const ROUTE = "/thanksgiving-2026/api/votes";
export const MAX_VOTERS = 200;
export const OPTIONS = new Set([
  "npb-pair",
  "jupiter-6br",
  "casa-solara",
  "historic-house",
  "pool-game-room",
  "three-homes",
  "flamingo",
  "triplex",
]);

const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

export function cleanDevice(raw) {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(raw) ? raw : null;
}

async function listVotes(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.VOTES.list({ prefix: PREFIX, cursor });
    for (const k of page.keys) {
      const m = k.metadata;
      if (m && m.v && typeof m.v === "object") out.push({ key: k.name, v: m.v });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

function tallies(votes) {
  const t = {};
  for (const opt of OPTIONS) t[opt] = { up: 0, down: 0 };
  for (const { v } of votes) {
    for (const [opt, val] of Object.entries(v)) {
      if (!t[opt]) continue;
      if (val === 1) t[opt].up++; else if (val === -1) t[opt].down++;
    }
  }
  return t;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== ROUTE) return json({ error: "Not found." }, 404);

    if (request.method === "GET") {
      let votes = await listVotes(env);
      const device = cleanDevice(url.searchParams.get("device"));
      let mine = {};
      if (device) {
        // list() can lag a write by up to a minute, so read this device's own key directly
        // and put it in the tally, or a voter would see their own vote vanish and come back.
        const key = PREFIX + device;
        const rec = await env.VOTES.getWithMetadata(key);
        mine = rec && rec.metadata && rec.metadata.v ? rec.metadata.v : {};
        votes = votes.filter(x => x.key !== key);
        if (Object.keys(mine).length) votes.push({ key, v: mine });
      }
      return json({ tallies: tallies(votes), mine });
    }

    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    if (!(request.headers.get("content-type") || "").includes("application/json")) {
      return json({ error: "Send the vote as JSON." }, 415);
    }
    if (Number(request.headers.get("content-length") || 0) > 2048) {
      return json({ error: "That request is too large." }, 413);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: "That vote could not be read." }, 400); }

    const device = cleanDevice(body && body.device);
    if (!device) return json({ error: "This browser could not be identified. Reload the page and try again." }, 400);
    if (!OPTIONS.has(body.option)) return json({ error: "That listing is not on the ballot." }, 400);
    if (![1, -1, 0].includes(body.value)) return json({ error: "A vote is up, down or cleared." }, 400);

    const key = PREFIX + device;
    const existing = await env.VOTES.getWithMetadata(key);
    const known = existing && existing.metadata && existing.metadata.v ? existing.metadata.v : null;
    let votes = await listVotes(env);
    if (!known && votes.length >= MAX_VOTERS) return json({ error: "The vote is full." }, 429);

    const v = { ...(known || {}) };
    if (body.value === 0) delete v[body.option]; else v[body.option] = body.value;
    if (Object.keys(v).length === 0) await env.VOTES.delete(key);
    else await env.VOTES.put(key, "1", { metadata: { v } });

    // A list() can lag a fresh write, so answer with this device's record merged in.
    votes = votes.filter(x => x.key !== key);
    if (Object.keys(v).length) votes.push({ key, v });
    return json({ ok: true, mine: v, tallies: tallies(votes) });
  },
};
