// Family vote for /thanksgiving-2026/: a thumbs up or down per listing, one record per device.
//
// There is no sign-in and no name. The page makes a random device id once, keeps it in the
// browser, and sends it with each vote, so each phone or laptop counts once per listing. It is a
// trust-the-family page, not a ballot; the bounds below keep a stray visitor from filling it.
//
// Every vote goes through one Durable Object, VoteBox, which handles requests one at a time
// against its own storage. That is what makes a vote save: two quick taps from one phone, or
// ten phones at once, can never overwrite each other, and every viewer reads the same totals
// the moment a vote lands. The first version kept votes in the key-value store, whose list
// lags writes by up to a minute and whose read-then-write could drop a vote; VoteBox copies
// anything still there on its first run, then the key-value store is only read, never written.
//
// The same Worker also keeps the Want to view and No marks for /house-search/. Those are one
// shared list, not a tally: a house holds one mark at most, whoever set it, and every phone or
// laptop that opens the page reads the same list and the same table order. HouseMarks is its
// own Durable Object with its own storage. The house search page used to keep the marks in
// each browser's local storage, which is why a second viewer saw none of them (2026-10-28).

export const ROUTE = "/thanksgiving-2026/api/votes";
export const MAX_VOTERS = 200;
export const KV_PREFIX = "tg26:d:";
export const MERGE_WINDOW_MS = 10 * 60 * 1000;
export const VERSION_ROUTE = "/thanksgiving-2026/api/version";
// New device ids one address may create per window. A household of phones fits; a script
// inventing ids to fill the voter cap does not. Counted in VoteBox storage, no paid service.
export const IP_NEW_DEVICES = 12;
export const IP_WINDOW_MS = 60 * 60 * 1000;
export const OPTIONS = new Set([
  "npb-pair",
  "jupiter-6br",
  "casa-solara",
  "historic-house",
  "pool-game-room",
  "three-homes",
  "flamingo",
  "triplex",
  // Added 2026-10-21 after the first round of votes; the keys above stay so their votes keep.
  "lakeview",
  "wpb-oasis-6br",
  "sweet-home-pbg",
  "golf-game-room",
  "tropical-pbg",
  "beach-oasis",
]);

// The house search marks: one record per house slug, in the HouseMarks Durable Object.
export const HOUSE_ROUTE = "/house-search/api/marks";
export const HOUSE_MARKS = new Set(["view", "no"]);
// A slug is the page's own folder name for a house (11-cadillac-ct); anything else is refused.
export const HOUSE_SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;
// More houses than the search will ever hold, so a stray visitor cannot fill the store.
export const HOUSE_MAX_SLUGS = 400;
// Writes one address may make per hour. A family tapping through the list fits many times over.
export const HOUSE_WRITES = 120;

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

function cleanVotes(v) {
  const out = {};
  if (!v || typeof v !== "object") return out;
  for (const [opt, val] of Object.entries(v)) if (OPTIONS.has(opt) && (val === 1 || val === -1)) out[opt] = val;
  return out;
}

// Pure rate-limit step: given the stored record for one address, say whether a new device id
// may be created now and what to store. A record is {start, n}.
export function rateStep(rec, now, limit = IP_NEW_DEVICES, windowMs = IP_WINDOW_MS) {
  const cur = rec && now - rec.start < windowMs ? rec : { start: now, n: 0 };
  if (cur.n >= limit) return { allowed: false, rec: cur, retryAfter: Math.ceil((cur.start + windowMs - now) / 1000) };
  return { allowed: true, rec: { start: cur.start, n: cur.n + 1 } };
}

export class VoteBox {
  constructor(ctx, env) {
    this.storage = ctx.storage;
    this.env = env;
  }

  // Copy votes the key-value version saved. The first run copies everything; for ten minutes
  // after it, later runs pick up any device the lagging list had not shown yet, skipping any
  // device that has voted or cleared here since, so nothing comes back from the old store.
  async mergeFromKv() {
    if (!this.env.VOTES) return;
    const first = await this.storage.get("migratedAt");
    const now = Date.now();
    if (first && now - first > MERGE_WINDOW_MS) return;
    let cursor;
    do {
      const page = await this.env.VOTES.list({ prefix: KV_PREFIX, cursor });
      for (const k of page.keys) {
        const device = k.name.slice(KV_PREFIX.length);
        if (!cleanDevice(device)) continue;
        if (await this.storage.get("t:" + device)) continue;
        if (await this.storage.get("d:" + device)) continue;
        const v = cleanVotes(k.metadata && k.metadata.v);
        if (Object.keys(v).length) await this.storage.put("d:" + device, v);
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    if (!first) await this.storage.put("migratedAt", now);
  }

  async view(device) {
    const tallies = {};
    for (const opt of OPTIONS) tallies[opt] = { up: 0, down: 0 };
    const all = await this.storage.list({ prefix: "d:" });
    for (const v of all.values()) {
      for (const [opt, val] of Object.entries(v)) {
        if (!tallies[opt]) continue;
        if (val === 1) tallies[opt].up++; else if (val === -1) tallies[opt].down++;
      }
    }
    const mine = device ? (all.get("d:" + device) || {}) : {};
    return { tallies, mine, voters: all.size };
  }

  async fetch(request) {
    await this.mergeFromKv();
    const url = new URL(request.url);
    if (request.method === "GET") {
      const { tallies, mine } = await this.view(cleanDevice(url.searchParams.get("device")));
      return json({ tallies, mine });
    }
    const { device, option, value } = await request.json();
    const key = "d:" + device;
    const known = await this.storage.get(key);
    if (!known) {
      const { voters } = await this.view(null);
      if (voters >= MAX_VOTERS) return json({ error: "The vote is full." }, 429);
      const ip = request.headers.get("x-client-ip");
      if (ip) {
        const now = Date.now();
        const step = rateStep(await this.storage.get("r:" + ip), now);
        if (!step.allowed) {
          return new Response(JSON.stringify({ error: "Too many new devices from this address. Try again later." }), {
            status: 429, headers: { ...HEADERS, "retry-after": String(step.retryAfter) },
          });
        }
        await this.storage.put("r:" + ip, step.rec);
        // Drop expired records so the table cannot grow without bound.
        const old = await this.storage.list({ prefix: "r:" });
        for (const [k, rec] of old) if (now - rec.start >= IP_WINDOW_MS) await this.storage.delete(k);
      }
    }
    const v = { ...(known || {}) };
    if (value === 0) delete v[option]; else v[option] = value;
    if (Object.keys(v).length) {
      await this.storage.put(key, v);
      await this.storage.delete("t:" + device);
    } else {
      await this.storage.delete(key);
      await this.storage.put("t:" + device, 1);
    }
    const { tallies, mine } = await this.view(device);
    return json({ ok: true, tallies, mine });
  }
}

// The house search marks. One object serves every request in turn, so two people tapping at
// the same moment cannot overwrite each other, and a GET right after a POST reads the mark.
export class HouseMarks {
  constructor(ctx) {
    this.storage = ctx.storage;
  }

  // Every mark as {slug: "view" | "no"}, with the time of the newest change.
  async view() {
    const marks = {};
    let at = 0;
    const all = await this.storage.list({ prefix: "m:" });
    for (const [k, rec] of all) {
      marks[k.slice(2)] = rec.mark;
      if (rec.at > at) at = rec.at;
    }
    return { marks, at, count: all.size };
  }

  async fetch(request) {
    if (request.method === "GET") {
      const { marks, at } = await this.view();
      return json({ marks, at });
    }
    const { slug, mark } = await request.json();
    const now = Date.now();
    const ip = request.headers.get("x-client-ip");
    if (ip) {
      const step = rateStep(await this.storage.get("r:" + ip), now, HOUSE_WRITES, IP_WINDOW_MS);
      if (!step.allowed) {
        return new Response(JSON.stringify({ error: "Too many changes from this address. Try again later." }), {
          status: 429, headers: { ...HEADERS, "retry-after": String(step.retryAfter) },
        });
      }
      await this.storage.put("r:" + ip, step.rec);
      const old = await this.storage.list({ prefix: "r:" });
      for (const [k, rec] of old) if (now - rec.start >= IP_WINDOW_MS) await this.storage.delete(k);
    }
    const key = "m:" + slug;
    if (mark) {
      if (!(await this.storage.get(key))) {
        const { count } = await this.view();
        if (count >= HOUSE_MAX_SLUGS) return json({ error: "The list is full." }, 429);
      }
      await this.storage.put(key, { mark, at: now });
    } else {
      await this.storage.delete(key);
    }
    const { marks, at } = await this.view();
    return json({ ok: true, marks, at });
  }
}

function box(env) {
  return env.BOX.get(env.BOX.idFromName("thanksgiving-2026"));
}

function house(env) {
  return env.HOUSE.get(env.HOUSE.idFromName("house-search"));
}

// The house search route: GET reads the shared list, POST {slug, mark} sets one mark or, with
// an empty mark, clears it. The checks here are shape only; the object applies the bounds.
async function houseRoute(request, env) {
  if (request.method === "GET") return house(env).fetch(new Request("https://housemarks" + HOUSE_ROUTE));
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return json({ error: "Send the mark as JSON." }, 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 1024) {
    return json({ error: "That request is too large." }, 413);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "That mark could not be read." }, 400); }
  const slug = body && typeof body.slug === "string" && HOUSE_SLUG.test(body.slug) ? body.slug : null;
  if (!slug) return json({ error: "That house is not on the page." }, 400);
  const mark = body.mark === "" ? "" : HOUSE_MARKS.has(body.mark) ? body.mark : null;
  if (mark === null) return json({ error: "A mark is view, no or cleared." }, 400);
  return house(env).fetch(new Request("https://housemarks" + HOUSE_ROUTE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-client-ip": request.headers.get("cf-connecting-ip") || "",
    },
    body: JSON.stringify({ slug, mark }),
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === VERSION_ROUTE && request.method === "GET") {
      return json({ worker: "family-votes", build: env.BUILD_HASH || "dev" });
    }
    if (url.pathname === HOUSE_ROUTE) return houseRoute(request, env);
    if (url.pathname !== ROUTE) return json({ error: "Not found." }, 404);

    if (request.method === "GET") {
      const device = cleanDevice(url.searchParams.get("device"));
      const q = device ? "?device=" + device : "";
      return box(env).fetch(new Request("https://votebox" + ROUTE + q));
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

    return box(env).fetch(new Request("https://votebox" + ROUTE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-client-ip": request.headers.get("cf-connecting-ip") || "",
      },
      body: JSON.stringify({ device, option: body.option, value: body.value }),
    }));
  },
};
