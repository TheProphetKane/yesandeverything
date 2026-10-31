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
// The same Worker also keeps the Want to view and No votes for /house-search/ in its own
// Durable Object, HouseMarks. Each person's vote on a house is kept on its own, under the name
// that person types once on each phone or laptop, so one person's tap can never undo another's:
// a house sits in the Want to view table while anyone has it marked, and every viewer reads the
// same votes. Every change is written to a change log the page shows, so a vote that moves is
// always visible, with who moved it and when. Until 2026-10-31 a house held one shared mark,
// whoever set it, and the last tap won, which is how marks went missing between two people
// with nothing on record to say who cleared them. The marks from that version are carried over
// as unnamed votes, each claimed by the first person who sets the same mark under a name.

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

// The house search votes: one record per house slug, in the HouseMarks Durable Object.
export const HOUSE_ROUTE = "/house-search/api/marks";
export const HOUSE_MARKS = new Set(["view", "no"]);
// A slug is the page's own folder name for a house (11-cadillac-ct); anything else is refused.
export const HOUSE_SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;
// More houses than the search will ever hold, so a stray visitor cannot fill the store.
export const HOUSE_MAX_SLUGS = 400;
// People voting on one house. A family fits many times over.
export const HOUSE_MAX_VOTERS = 16;
// Writes one address may make per hour. A family tapping through the list fits many times over.
export const HOUSE_WRITES = 120;
// Change log entries kept, and how many the page is sent.
export const HOUSE_LOG_KEEP = 1000;
export const HOUSE_LOG_SEND = 40;
// The voter the single-mark version's marks are carried over under.
export const EARLIER = "earlier";

// A name as typed ("Kane", "kane ") becomes one voter key, so the same person on a phone and a
// laptop holds one vote. Letters, spaces, apostrophes, hyphens and periods, up to 40 characters.
export function cleanName(raw) {
  if (typeof raw !== "string") return "";
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  return name.length <= 40 && /^[\p{L}][\p{L} '.-]*$/u.test(name) ? name : "";
}

// No name (a page from before names) is one shared unnamed voter.
export function voterKey(name) {
  return name ? "n:" + name.toLowerCase() : "unnamed";
}

// The one-line answer older pages and the live checks read: a house is "view" while anyone has
// it marked to view, otherwise "no" while anyone has it marked no.
export function summary(votes) {
  const marks = {};
  for (const [slug, v] of Object.entries(votes)) {
    const all = Object.values(v).map(x => x.mark);
    if (all.includes("view")) marks[slug] = "view";
    else if (all.includes("no")) marks[slug] = "no";
  }
  return marks;
}

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

// The house search votes. One object serves every request in turn, so two people tapping at
// the same moment cannot overwrite each other, and a GET right after a POST reads the vote.
export class HouseMarks {
  constructor(ctx) {
    this.storage = ctx.storage;
  }

  // Carry the single-mark version's records (m:<slug>) over once, as unnamed votes, and keep a
  // copy of each under bak: so nothing from before is lost.
  async upgrade() {
    if (await this.storage.get("upgraded")) return;
    const old = await this.storage.list({ prefix: "m:" });
    for (const [k, rec] of old) {
      const slug = k.slice(2);
      const v = (await this.storage.get("v:" + slug)) || {};
      if (!v[EARLIER] && rec && HOUSE_MARKS.has(rec.mark)) v[EARLIER] = { mark: rec.mark, name: "", at: rec.at, set: rec.at };
      await this.storage.put("v:" + slug, v);
      await this.storage.put("bak:" + k, rec);
      await this.storage.delete(k);
    }
    await this.storage.put("upgraded", Date.now());
  }

  async view() {
    const votes = {};
    let at = 0;
    const all = await this.storage.list({ prefix: "v:" });
    for (const [k, v] of all) {
      const out = {};
      for (const [voter, rec] of Object.entries(v)) {
        if (rec.at > at) at = rec.at;
        if (rec.mark) out[voter] = { mark: rec.mark, name: rec.name || "", at: rec.at };
      }
      if (Object.keys(out).length) votes[k.slice(2)] = out;
    }
    const logged = await this.storage.list({ prefix: "log:" });
    // The page is sent who, what and when.
    const log = [...logged.values()].slice(-HOUSE_LOG_SEND).reverse()
      .map(e => ({ slug: e.slug, name: e.name || "", from: e.from, to: e.to, at: e.at, ...(e.why ? { why: e.why } : {}) }));
    return { votes, marks: summary(votes), at, log, count: all.size };
  }

  async fetch(request) {
    await this.upgrade();
    if (request.method === "GET") {
      const { votes, marks, at, log } = await this.view();
      return json({ votes, marks, at, log });
    }
    const { slug, mark, name, set } = await request.json();
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
    const key = "v:" + slug;
    const voter = voterKey(name);
    const stored = await this.storage.get(key);
    const v = { ...(stored || {}) };
    const mine = v[voter];
    // A change made on this person's other phone after this tap wins over it, so an old tap
    // that waited offline cannot undo a newer one when it finally goes up.
    if (mine && mine.set > set) {
      const state = await this.view();
      return json({ ok: true, stale: true, votes: state.votes, marks: state.marks, at: state.at, log: state.log });
    }
    if (!stored && mark) {
      const { count } = await this.view();
      if (count >= HOUSE_MAX_SLUGS) return json({ error: "The list is full." }, 429);
    }
    if (mark && !mine && Object.keys(v).length >= HOUSE_MAX_VOTERS) {
      return json({ error: "Too many people on this house." }, 429);
    }
    const from = mine ? mine.mark : "";
    const entries = [];
    if (from !== mark) entries.push({ slug, voter, name, from, to: mark, at: now });
    // A cleared vote stays as an empty record holding when it was cleared, so a tap made before
    // the clear that arrives after it is still recognised as older.
    v[voter] = { mark, name, at: now, set };
    // An unnamed mark carried over from the single-mark version is claimed by the first person who
    // sets the same mark under a name. A different mark sits beside it, so a no never removes it.
    if (name && voter !== EARLIER && v[EARLIER] && v[EARLIER].mark === mark) {
      entries.push({ slug, voter: EARLIER, name: "", from: v[EARLIER].mark, to: "", at: now, why: "claimed by " + name });
      delete v[EARLIER];
    }
    await this.storage.put(key, v);
    // Log keys count up, so the log reads in the order the changes were made.
    let seq = (await this.storage.get("logseq")) || 0;
    for (const e of entries) await this.storage.put("log:" + String(++seq).padStart(10, "0"), e);
    if (entries.length) await this.storage.put("logseq", seq);
    if (entries.length) {
      const logged = await this.storage.list({ prefix: "log:" });
      const extra = logged.size - HOUSE_LOG_KEEP;
      if (extra > 0) for (const k of [...logged.keys()].slice(0, extra)) await this.storage.delete(k);
    }
    const state = await this.view();
    return json({ ok: true, votes: state.votes, marks: state.marks, at: state.at, log: state.log });
  }
}

function box(env) {
  return env.BOX.get(env.BOX.idFromName("thanksgiving-2026"));
}

function house(env) {
  return env.HOUSE.get(env.HOUSE.idFromName("house-search"));
}

// The house search route: GET reads every vote, POST {slug, mark, name, set} sets that
// person's vote or, with an empty mark, clears it. The checks here are shape only; the object
// applies the bounds. `set` is when the person tapped, by their own clock; a missing or wild
// value is read as now.
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
  if (body.name !== undefined && body.name !== "" && !cleanName(body.name)) {
    return json({ error: "A name is letters and spaces, up to 40 characters." }, 400);
  }
  const now = Date.now();
  const set = Number.isFinite(body.set) && body.set > now - 30 * 86400000 && body.set < now + 300000 ? body.set : now;
  return house(env).fetch(new Request("https://housemarks" + HOUSE_ROUTE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-client-ip": request.headers.get("cf-connecting-ip") || "",
    },
    body: JSON.stringify({ slug, mark, name: cleanName(body.name), set }),
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
