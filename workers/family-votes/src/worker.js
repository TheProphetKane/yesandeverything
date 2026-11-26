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
//
// Since 2026-11-03 the same Worker keeps the house plan's shared state (yesandeverything.com/house-plan/,
// the Needed and Wanted switch and the Done box on every job) in a third Durable Object, PlanState.
// It is its own object because the plan outlives the house search: the HouseMarks storage is wiped
// at closing and this one is not. Every change is logged with who made it and when, so a job ticked
// done by mistake can be unticked and the log still shows both.
//
// Since 2026-11-24 the same Worker keeps the board for Golden's Guzzlers, the family's annual blind
// beer tasting (yesandeverything.com/goldens-guzzlers/), in a fourth Durable Object, BeerBoard. The
// board is one record: every pour, its six thumbs, the guesses on who brought it, the reveal, the
// next puller and the surprise pick. A phone sends one change at a time, each with its own id, and
// the object applies it to the record and answers with the whole board, so every phone at the table
// reads the same standings. A change sent twice, because an answer was lost on bad wifi, applies
// once. Clearing the board for next year keeps the cleared board as an archive, and a pour taken off
// the board is kept too, so neither can be lost to a slipped tap. The query ?board=test points at a
// second object with the same rules, so the page can be tried without touching the real standings.
//
// Since 2026-11-24 the board is a yearly record. Each year's night is its own record, kept under
// its year for good: starting the next year opens a fresh board and leaves every past year as it
// was, and no change from the page can reach a past year. Beside the boards sit the beer log's two
// lists: beers marked to bring back for another try, and the stash, beers someone has collected
// for a future night. A revealed beer that was in someone's stash comes off it as poured, so the
// stash only ever shows what is still waiting.

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

// The house plan's shared state: one record per job card, in the PlanState Durable Object.
export const PLAN_ROUTE = "/house-plan/api/state";
// A job id is the card's own anchor on the plan page (job-d-d-room); anything else is refused.
export const PLAN_JOB = /^job-[a-z0-9-]{1,80}$/;
export const PLAN_MARKS = new Set(["need", "want"]);
// More jobs than the plan will ever hold, so a stray visitor cannot fill the store.
export const PLAN_MAX_JOBS = 300;
// Writes one address may make per hour.
export const PLAN_WRITES = 300;
export const PLAN_LOG_KEEP = 1000;
export const PLAN_LOG_SEND = 60;

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

// The house plan's state. Each job holds two fields that change on their own: mark, need or want,
// which overrides the mark the page was built with, and done, true or false. Each field keeps when
// it was last set by the tapping person's clock, so an old tap that waited offline cannot undo a
// newer one. One object serves every request in turn, so two people tapping at once never collide.
export class PlanState {
  constructor(ctx) {
    this.storage = ctx.storage;
  }

  async view() {
    const jobs = {};
    let at = 0;
    const all = await this.storage.list({ prefix: "j:" });
    for (const [k, rec] of all) {
      const out = {};
      if (rec.mark) out.mark = rec.mark;
      if (rec.done !== undefined) out.done = rec.done;
      if (Object.keys(out).length) jobs[k.slice(2)] = out;
      if (rec.at > at) at = rec.at;
    }
    const logged = await this.storage.list({ prefix: "log:" });
    const log = [...logged.values()].slice(-PLAN_LOG_SEND).reverse()
      .map(e => ({ job: e.job, field: e.field, from: e.from, to: e.to, name: e.name || "", at: e.at }));
    return { jobs, at, log, count: all.size };
  }

  async fetch(request) {
    if (request.method === "GET") {
      const { jobs, at, log } = await this.view();
      return json({ jobs, at, log });
    }
    const { job, field, value, name, set } = await request.json();
    const now = Date.now();
    const ip = request.headers.get("x-client-ip");
    if (ip) {
      const step = rateStep(await this.storage.get("r:" + ip), now, PLAN_WRITES, IP_WINDOW_MS);
      if (!step.allowed) {
        return new Response(JSON.stringify({ error: "Too many changes from this address. Try again later." }), {
          status: 429, headers: { ...HEADERS, "retry-after": String(step.retryAfter) },
        });
      }
      await this.storage.put("r:" + ip, step.rec);
      const old = await this.storage.list({ prefix: "r:" });
      for (const [k, rec] of old) if (now - rec.start >= IP_WINDOW_MS) await this.storage.delete(k);
    }
    const key = "j:" + job;
    const stored = await this.storage.get(key);
    const rec = { ...(stored || {}), sets: { ...((stored && stored.sets) || {}) } };
    if (rec.sets[field] && rec.sets[field] > set) {
      const state = await this.view();
      return json({ ok: true, stale: true, jobs: state.jobs, at: state.at, log: state.log });
    }
    if (!stored) {
      const { count } = await this.view();
      if (count >= PLAN_MAX_JOBS) return json({ error: "The plan is full." }, 429);
    }
    const from = rec[field] === undefined ? null : rec[field];
    rec[field] = value;
    rec.sets[field] = set;
    rec.at = now;
    await this.storage.put(key, rec);
    if (from !== value) {
      let seq = (await this.storage.get("logseq")) || 0;
      await this.storage.put("log:" + String(++seq).padStart(10, "0"), { job, field, from, to: value, name, at: now });
      await this.storage.put("logseq", seq);
      const logged = await this.storage.list({ prefix: "log:" });
      const extra = logged.size - PLAN_LOG_KEEP;
      if (extra > 0) for (const k of [...logged.keys()].slice(0, extra)) await this.storage.delete(k);
    }
    const state = await this.view();
    return json({ ok: true, jobs: state.jobs, at: state.at, log: state.log });
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

function plan(env) {
  return env.PLAN.get(env.PLAN.idFromName("house-plan"));
}

// The house plan route: GET reads every job's state, POST {job, field, value, name, set} sets one
// field of one job: field "mark" with value "need" or "want", or field "done" with true or false.
async function planRoute(request, env) {
  if (request.method === "GET") return plan(env).fetch(new Request("https://planstate" + PLAN_ROUTE));
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return json({ error: "Send the change as JSON." }, 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 1024) {
    return json({ error: "That request is too large." }, 413);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "That change could not be read." }, 400); }
  const job = body && typeof body.job === "string" && PLAN_JOB.test(body.job) ? body.job : null;
  if (!job) return json({ error: "That job is not on the plan." }, 400);
  let value;
  if (body.field === "mark" && PLAN_MARKS.has(body.value)) value = body.value;
  else if (body.field === "done" && typeof body.value === "boolean") value = body.value;
  else return json({ error: "A change is a mark of need or want, or done true or false." }, 400);
  if (body.name !== undefined && body.name !== "" && !cleanName(body.name)) {
    return json({ error: "A name is letters and spaces, up to 40 characters." }, 400);
  }
  const now = Date.now();
  const set = Number.isFinite(body.set) && body.set > now - 30 * 86400000 && body.set < now + 300000 ? body.set : now;
  return plan(env).fetch(new Request("https://planstate" + PLAN_ROUTE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-client-ip": request.headers.get("cf-connecting-ip") || "",
    },
    body: JSON.stringify({ job, field: body.field, value, name: cleanName(body.name), set }),
  }));
}

// Golden's Guzzlers: the beer tasting board, in the BeerBoard Durable Object.
export const BEER_ROUTE = "/goldens-guzzlers/api/board";
export const BEER_ROSTER = ["Mike", "Bill", "Brennan", "Nick", "AJ", "Gannan"];
export const BEER_VOTES = new Set(["up", "side", "down"]);
// Six people bring about six beers each; twice that still fits.
export const BEER_MAX_POURS = 80;
// Changes one address may send per hour. Every phone in one house shares one address, and a whole
// night of six thumbs, six guesses and a reveal per pour is about five hundred.
export const BEER_WRITES = 1200;
// Change ids remembered, so a change sent again after a lost answer applies once.
export const BEER_SEEN_KEEP = 400;
// Cleared boards and removed pours kept for recovery.
export const BEER_ARCHIVE_KEEP = 5;
export const BEER_REMOVED_KEEP = 60;
// The first night on the board.
export const BEER_FIRST_YEAR = 2026;
// Beers waiting in stashes for future nights.
export const BEER_STASH_MAX = 400;
// Changes that go to the beer log's lists rather than to this year's board.
export const BEER_LIB_OPS = new Set(["bringback", "stash-add", "stash-remove", "stash-edit", "ban"]);
// Live connections: every open phone hears each change the moment it lands.
export const BEER_LIVE_ROUTE = "/goldens-guzzlers/api/live";
export const BEER_LIVE_MAX = 300;
// The journal keeps every change, newest last; this many stay, about forty nights.
export const BEER_LOG_KEEP = 20000;
// A copy of every year goes to the second store this long after a change, and once a day.
export const BEER_SNAPSHOT_MS = 5 * 60 * 1000;
export const BEER_REMOVED_STASH_KEEP = 200;
// A photo of the can, shrunk on the phone before it is sent: one per pour, replaced when sent again.
export const BEER_PHOTO_MAX = 400 * 1024;
export const BEER_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Photos one address may send per hour. Each one also costs a write to the key-value store.
export const BEER_PHOTO_WRITES = 60;
// Secret ballots: a phone votes and guesses only for whoever is holding it. The admin's device keeps
// score for the table, so its key lets it enter anyone's vote or guess.
const BEER_OWN_ROW = "Each phone votes for whoever is holding it. Tap Switch to hand the phone over.";
// Off for the 2026 night (Kane, 2026-11-26 17:28): one tablet enters every vote, so any phone can
// enter any row. Turning it back on brings the own-row rule back on the board and on the page.
export const BEER_SECRET_BALLOTS = false;
// Snap the can: a vision model on Cloudflare reads a photo of the label for the beer's name, brewery
// and style. Reads are capped per address and per day, which keeps them inside the free daily allowance.
export const BEER_LABEL_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
export const BEER_LABEL_READS = 60;
export const BEER_LABEL_DAY = 120;
// Each snap is also kept for a day at an address of its own, so a picture search can fetch it.
export const BEER_SNAP_KEEP = 30;
export const BEER_SNAP_MS = 24 * 60 * 60 * 1000;
const BEER_SNAP_ID = /^\d{13}[a-z0-9]{4}$/;
const BEER_LABEL_ASK = "This photo shows a beer can or bottle. Under printed, copy what its label prints: the beer's name, the brewery that made it, and its style, such as Hazy IPA, Pilsner, Oatmeal Stout or Gose, leaving out the alcohol content and the size. Under known, give the name, brewery and style of this exact beer if you recognize it from its can or bottle, including anything the label leaves out. Use an empty string for anything you are not sure of, and never make up a beer.";
const BEER_POUR_ID = /^[a-z0-9]{4,24}$/;
const BEER_OP_ID = /^[A-Za-z0-9_-]{8,40}$/;
// Deleting, banning a beer, and starting a new year are for the admin alone. The Worker never
// holds the admin password: the BEER_ADMIN_HASH secret is pbkdf2-sha256$<rounds>$<salt hex>$<hash hex>,
// and a right password earns a signed key that the admin's phone keeps for a year.
export const BEER_ADMIN_OPS = new Set(["remove", "stash-remove", "clear", "newyear", "ban"]);
// The deletes among them, which take the word DELETE as well.
export const BEER_DELETE_OPS = new Set(["remove", "stash-remove", "clear"]);
export const BEER_ADMIN_DAYS = 365;
// Wrong passwords allowed before admin sign-in pauses, and how long it pauses.
export const BEER_ADMIN_FAILS = 8;
export const BEER_ADMIN_LOCK_MS = 15 * 60 * 1000;

const beerEnc = new TextEncoder();
const beerHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const beerUnhex = hex => new Uint8Array((String(hex).match(/[0-9a-f]{2}/gi) || []).map(h => parseInt(h, 16)));

// Every character compared whatever the first difference, so the time taken gives nothing away.
function beerSame(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function beerAdminPassword(env, password) {
  const rec = String((env && env.BEER_ADMIN_HASH) || "").trim().split("$");
  if (rec.length !== 4 || rec[0] !== "pbkdf2-sha256") return false;
  if (typeof password !== "string" || !password || password.length > 200) return false;
  const rounds = Number(rec[1]);
  if (!Number.isInteger(rounds) || rounds < 1000 || rounds > 100000) return false;
  const key = await crypto.subtle.importKey("raw", beerEnc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: beerUnhex(rec[2]), iterations: rounds }, key, 256);
  return beerSame(beerHex(bits), rec[3].toLowerCase());
}

async function beerAdminSig(env, exp) {
  const key = await crypto.subtle.importKey("raw", beerEnc.encode("goldens-guzzlers-admin|" + String(env.BEER_ADMIN_HASH).trim()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return beerHex(await crypto.subtle.sign("HMAC", key, beerEnc.encode("admin:" + exp)));
}

export async function beerAdminKey(env, now) {
  const exp = now + BEER_ADMIN_DAYS * 86400000;
  return exp + "." + (await beerAdminSig(env, exp));
}

export async function beerIsAdmin(env, key, now) {
  if (!env || !env.BEER_ADMIN_HASH || typeof key !== "string") return false;
  const m = /^(\d{13})\.([0-9a-f]{64})$/.exec(key);
  if (!m || Number(m[1]) <= now) return false;
  return beerSame(await beerAdminSig(env, Number(m[1])), m[2]);
}

export function beerFresh() {
  return { v: 1, rev: 0, nextPuller: BEER_ROSTER[0], surprise: null, pours: [] };
}

export function beerNorm(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// One beer, however it was typed: "Bramblewood Brewing Co." and "bramblewood" are the same brewery.
// The page carries the same function, so its log and the stash agree on what counts as the same beer.
const BEER_BREWERY_FILLER = /\b(brewing|brewery|breweries|brewers|brewhouse|brew|beer|beers|co|company|ales|ale|works|craft|the|and)\b/g;
export function beerKey(name, brewery) {
  return beerNorm(name) + "|" + beerNorm(brewery).replace(BEER_BREWERY_FILLER, " ").replace(/\s+/g, " ").trim();
}

// A banned beer, matched on its name: the same brewery, or a brewery left blank on either side,
// so leaving the brewery off never slips a banned beer past. The page uses the same rule.
export function beerBanHit(banned, name, brewery) {
  const want = beerKey(name, brewery).split("|");
  for (const [key, m] of Object.entries(banned || {})) {
    const [n, b] = key.split("|");
    if (n === want[0] && (b === want[1] || !b || !want[1])) return m;
  }
  return null;
}

// Read a label with the vision model: the photo goes in as a data address, and the answer comes back
// as {name, brewery, style}, each cut to the page's lengths. The model's words are only suggestions:
// the page fills them into the form, and a person checks them before anything is saved.
// The reader answers twice: what the label prints, and what it knows of this exact beer from the
// can's look, which the page marks as a guess to check.
const BEER_LABEL_FIELDS = { type: "object", properties: { name: { type: "string" }, brewery: { type: "string" }, style: { type: "string" } }, required: ["name", "brewery", "style"] };
export async function beerReadLabel(env, bytes, type) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  const out = await env.AI.run(BEER_LABEL_MODEL, {
    messages: [
      { role: "system", content: "You read beer labels in photos. Answer with the JSON asked for and nothing else." },
      { role: "user", content: [{ type: "text", text: BEER_LABEL_ASK }, { type: "image_url", image_url: { url: "data:" + type + ";base64," + btoa(bin) } }] },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { type: "object", properties: { printed: BEER_LABEL_FIELDS, known: BEER_LABEL_FIELDS }, required: ["printed", "known"] },
    },
    max_tokens: 300,
    temperature: 0,
  });
  let r = out && out.response;
  if (typeof r === "string") {
    const m = r.match(/\{[\s\S]*\}/);
    r = m ? JSON.parse(m[0]) : null;
  }
  if (!r || typeof r !== "object") throw new Error("no label");
  // An answer in the older flat shape is read as what the label prints.
  const printed = r.printed && typeof r.printed === "object" ? r.printed : r;
  const known = r.known && typeof r.known === "object" ? r.known : {};
  const clean = f => ({ name: beerText(f.name, 80), brewery: beerText(f.brewery, 80), style: beerText(f.style, 60) });
  const usage = out.usage && typeof out.usage === "object" ? { input: out.usage.prompt_tokens || 0, output: out.usage.completion_tokens || 0 } : null;
  return { label: clean(printed), known: clean(known), tokens: usage };
}

// One change to the beer log's lists: the bring-back marks, the banned beers and the stash. Pure,
// like beerApply.
export function beerLibApply(lib, op, now) {
  const marks = {
    bringBack: { ...((lib.marks && lib.marks.bringBack) || {}) },
    banned: { ...((lib.marks && lib.marks.banned) || {}) },
  };
  const stash = (lib.stash || []).map(s => ({ ...s }));
  switch (op.op) {
    case "ban": {
      const name = beerText(op.name, 80), brewery = beerText(op.brewery, 80);
      if (!name) return { error: "A beer to ban needs its name." };
      const key = beerKey(name, brewery);
      if (op.on === true) {
        if (marks.banned[key]) return { lib, changed: false };
        marks.banned[key] = { name, brewery, style: beerText(op.style, 60), at: now };
        // A banned beer never comes back.
        delete marks.bringBack[key];
      } else if (op.on === false) {
        if (!marks.banned[key]) return { lib, changed: false };
        delete marks.banned[key];
      } else return { error: "A ban is on or off." };
      break;
    }
    case "bringback": {
      const name = beerText(op.name, 80), brewery = beerText(op.brewery, 80);
      if (!name) return { error: "A beer to bring back needs its name." };
      const key = beerKey(name, brewery);
      if (op.on === true) {
        if (beerBanHit(marks.banned, name, brewery)) return { error: name + " is banned, so it cannot come back." };
        marks.bringBack[key] = { name, brewery, style: beerText(op.style, 60), at: now };
      } else if (op.on === false) {
        if (!marks.bringBack[key]) return { lib, changed: false };
        delete marks.bringBack[key];
      } else return { error: "Bring back is on or off." };
      break;
    }
    case "stash-add": {
      const name = beerText(op.name, 80);
      if (!name) return { error: "A stashed beer needs its name." };
      if (beerBanHit(marks.banned, name, beerText(op.brewery, 80))) return { error: name + " is banned from Golden's Guzzlers. Pick another beer." };
      if (typeof op.sid !== "string" || !BEER_POUR_ID.test(op.sid)) return { error: "That stash entry could not be read." };
      if (stash.some(s => s.id === op.sid)) return { lib, changed: false };
      if (stash.length >= BEER_STASH_MAX) return { error: "The stash is full." };
      stash.push({ id: op.sid, name, brewery: beerText(op.brewery, 80), style: beerText(op.style, 60), who: beerWho(op.who), at: now });
      break;
    }
    case "stash-edit": {
      const i = stash.findIndex(s => s.id === op.sid);
      if (i < 0) return { error: "That stash entry is gone." };
      const name = beerText(op.name, 80), brewery = beerText(op.brewery, 80);
      if (!name) return { error: "A stashed beer needs its name." };
      if (beerBanHit(marks.banned, name, brewery)) return { error: name + " is banned from Golden's Guzzlers. Pick another beer." };
      stash[i] = { ...stash[i], name, brewery, style: beerText(op.style, 60) };
      break;
    }
    case "stash-remove": {
      const i = stash.findIndex(s => s.id === op.sid);
      if (i < 0) return { lib, changed: false };
      stash.splice(i, 1);
      break;
    }
    default:
      return { error: "That change is not one the board knows." };
  }
  return { lib: { marks, stash }, changed: true };
}

// Text from the page: no control characters, one space at a time, cut to a length.
export function beerText(raw, max) {
  if (typeof raw !== "string") return "";
  return raw.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function beerWho(raw) {
  return BEER_ROSTER.includes(raw) ? raw : "";
}

function beerMap(raw, ok) {
  const out = {};
  if (raw && typeof raw === "object") for (const n of BEER_ROSTER) if (ok(raw[n])) out[n] = raw[n];
  return out;
}

// One change applied to the board. Pure, so the self-test can run it on its own. Answers
// {board, changed} with the new board, or {error} for a change the board refuses. A pull while
// another pour is still in its coozie changes nothing, so two phones pulling at once make one pour.
export function beerApply(board, op, now) {
  const b = structuredClone(board);
  const find = id => b.pours.find(p => p.id === id);
  const last = b.pours[b.pours.length - 1];
  const current = last && !last.revealed ? last : null;
  let archive = null, removed = null;
  switch (op.op) {
    case "puller": {
      const name = beerWho(op.name);
      if (!name) return { error: "That puller is not at the table." };
      b.nextPuller = name;
      // A beer still in its coozie was pulled by whoever pulls now.
      if (current && !Object.keys(current.votes).length) current.puller = name;
      break;
    }
    case "pour": {
      if (current || find(op.pid)) return { board, changed: false };
      if (typeof op.pid !== "string" || !BEER_POUR_ID.test(op.pid)) return { error: "That pour could not be read." };
      if (b.pours.length >= BEER_MAX_POURS) return { error: "The board is full." };
      const n = b.pours.reduce((m, p) => Math.max(m, p.n), 0) + 1;
      // One person pulls every beer (Mike, in 2026), so the puller stays put until someone changes it.
      b.pours.push({ id: op.pid, n, puller: b.nextPuller, votes: {}, guesses: {}, revealed: false, name: "", brewery: "", style: "", provider: "", at: now });
      break;
    }
    case "unpour": {
      if (!current || current.id !== op.pid || Object.keys(current.votes).length) return { board, changed: false };
      b.pours.pop();
      b.nextPuller = current.puller;
      break;
    }
    case "vote": {
      const p = find(op.pid), name = beerWho(op.name);
      if (!p) return { error: "That pour is not on the board." };
      if (!name) return { error: "That taster is not at the table." };
      if (BEER_SECRET_BALLOTS && op.by && op.by !== name && !op.keeper) return { error: BEER_OWN_ROW };
      if (op.v === "") delete p.votes[name];
      else if (BEER_VOTES.has(op.v)) p.votes[name] = op.v;
      else return { error: "A vote is up, side, down or cleared." };
      break;
    }
    case "guess": {
      const p = find(op.pid), name = beerWho(op.name), who = beerWho(op.who);
      if (!p) return { error: "That pour is not on the board." };
      if (!name) return { error: "That taster is not at the table." };
      if (BEER_SECRET_BALLOTS && op.by && op.by !== name && !op.keeper) return { error: BEER_OWN_ROW };
      if (who) p.guesses[name] = who;
      else if (op.who === "") delete p.guesses[name];
      else return { error: "A guess names someone at the table." };
      break;
    }
    case "reveal":
    case "edit": {
      const p = find(op.pid);
      if (!p) return { error: "That pour is not on the board." };
      const name = beerText(op.name, 80);
      if (!name) return { error: "A revealed beer needs its name." };
      p.name = name;
      // A fix from the beer log sends only the words it changes; whatever it leaves out stays as it was.
      if (op.op === "reveal" || op.brewery !== undefined) p.brewery = beerText(op.brewery, 80);
      if (op.op === "reveal" || op.style !== undefined) p.style = beerText(op.style, 60);
      if (op.op === "reveal" || op.provider !== undefined) p.provider = beerWho(op.provider);
      if (op.op === "edit") {
        if (op.votes !== undefined) p.votes = beerMap(op.votes, v => BEER_VOTES.has(v));
        if (op.guesses !== undefined) p.guesses = beerMap(op.guesses, w => BEER_ROSTER.includes(w));
      }
      if (!p.revealed) { p.revealed = true; p.revealedAt = now; }
      break;
    }
    case "remove": {
      const p = find(op.pid);
      if (!p) return { board, changed: false };
      b.pours = b.pours.filter(x => x.id !== op.pid);
      if (b.surprise === op.pid) b.surprise = null;
      // A pour deleted while still in its coozie hands the pull back, as putting it back does.
      if (current && current.id === op.pid) b.nextPuller = current.puller;
      removed = p;
      break;
    }
    case "photo": {
      // Only the board's own photo upload makes this change, once the image is stored.
      const p = find(op.pid);
      if (!p) return { error: "That pour is not on the board." };
      p.photo = now;
      break;
    }
    case "surprise": {
      if (op.pid === null || op.pid === "") { b.surprise = null; break; }
      const p = find(op.pid);
      if (!p || !p.revealed) return { error: "Pick a beer that has been revealed." };
      b.surprise = p.id;
      break;
    }
    case "clear": {
      if (op.confirm !== "DELETE") return { error: "Clearing the board takes the word DELETE." };
      archive = board;
      b.pours = [];
      b.surprise = null;
      break;
    }
    default:
      return { error: "That change is not one the board knows." };
  }
  b.rev = (b.rev || 0) + 1;
  b.at = now;
  return { board: b, changed: true, archive, removed };
}

export class BeerBoard {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.storage = ctx.storage;
    this.env = env;
    // A phone's keep-alive ping is answered without waking the object.
    if (typeof ctx.setWebSocketAutoResponse === "function" && typeof WebSocketRequestResponsePair !== "undefined") {
      ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    }
  }

  // After every change: into the journal, a snapshot scheduled, every open phone told.
  async after(op, now, m, board) {
    await this.journal(op, now, m);
    await this.scheduleSnapshot();
    await this.broadcast(m, board);
  }

  // The journal: every change as it was sent, so any night can be rebuilt step by step.
  async journal(op, now, m) {
    const seq = ((await this.storage.get("logseq")) || 0) + 1;
    const entry = { at: now, year: m.year, op: { ...op } };
    delete entry.op.opId;
    delete entry.op.admin;
    delete entry.op.password;
    await this.storage.put("log:" + String(seq).padStart(10, "0"), entry);
    await this.storage.put("logseq", seq);
    const cut = seq - BEER_LOG_KEEP;
    if (cut > 0 && seq % 200 === 0) {
      const oldest = await this.storage.list({ prefix: "log:", limit: 400 });
      for (const k of oldest.keys()) if (Number(k.slice(4)) <= cut) await this.storage.delete(k);
    }
  }

  async broadcast(m, board) {
    if (!this.ctx || typeof this.ctx.getWebSockets !== "function") return;
    const sockets = this.ctx.getWebSockets();
    if (!sockets.length) return;
    const msg = JSON.stringify({ type: "state", ...(await this.state(m, board)) });
    for (const ws of sockets) {
      try { ws.send(msg); } catch (e) { /* a phone that dropped reconnects and reads the board */ }
    }
  }

  async scheduleSnapshot() {
    if (!this.env || !this.env.VOTES || typeof this.storage.getAlarm !== "function") return;
    if (!(await this.storage.getAlarm())) await this.storage.setAlarm(Date.now() + BEER_SNAPSHOT_MS);
  }

  async alarm() {
    await this.writeSnapshot();
  }

  // A full copy of every year and both lists, kept in the key-value store, outside this object's
  // own storage: one copy always current, and one kept for each day there was a change.
  async writeSnapshot() {
    if (!this.env || !this.env.VOTES) return null;
    const m = await this.meta();
    const which = (await this.storage.get("which")) || "live";
    const boards = {};
    for (const y of m.years) boards[y] = await this.board(y);
    const now = Date.now();
    const body = JSON.stringify({ at: now, board: which, year: m.year, years: m.years, libRev: m.libRev, boards, ...(await this.lib()) });
    const prefix = "goldens-guzzlers:" + which + ":";
    await this.env.VOTES.put(prefix + "latest", body);
    await this.env.VOTES.put(prefix + "day:" + new Date(now).toISOString().slice(0, 10), body);
    await this.storage.put("snapAt", now);
    return now;
  }

  async webSocketMessage(ws, message) {
    if (message === "ping") ws.send("pong");
  }

  async webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch (e) { /* already closed */ }
  }

  async webSocketError(ws) {
    try { ws.close(1011, "error"); } catch (e) { /* already closed */ }
  }

  // The year record: the year the board is on and every year that has a board. A store from before
  // years, one "board" record, moves under the first year once.
  async meta() {
    const m = await this.storage.get("meta");
    if (m) return m;
    const fresh = { year: BEER_FIRST_YEAR, years: [BEER_FIRST_YEAR], libRev: 0 };
    const old = await this.storage.get("board");
    if (old) {
      await this.storage.put("board:" + BEER_FIRST_YEAR, { ...old, year: BEER_FIRST_YEAR });
      await this.storage.delete("board");
    }
    await this.storage.put("meta", fresh);
    return fresh;
  }

  async board(year) {
    return (await this.storage.get("board:" + year)) || { ...beerFresh(), year };
  }

  async lib() {
    return {
      marks: (await this.storage.get("marks")) || { bringBack: {} },
      stash: (await this.storage.get("stash")) || [],
    };
  }

  // What every answer carries: the year, every year, the log's revision and this year's board.
  async state(m, board) {
    return { ok: true, year: m.year, years: m.years, libRev: m.libRev, board: board || await this.board(m.year) };
  }

  // Keep the newest entries under one prefix and drop the rest.
  async trim(prefix, keep) {
    const all = await this.storage.list({ prefix });
    const extra = all.size - keep;
    if (extra > 0) for (const k of [...all.keys()].slice(0, extra)) await this.storage.delete(k);
  }

  async fetch(request) {
    // A phone opening a live connection. It hears every change from here on.
    if (request.headers.get("Upgrade") === "websocket") {
      if (typeof WebSocketPair === "undefined") return json({ error: "Live connections are not available here." }, 426);
      if (this.ctx.getWebSockets().length >= BEER_LIVE_MAX) return json({ error: "Too many phones are connected." }, 429);
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    const url = new URL(request.url);
    const m = await this.meta();
    if (request.method === "GET") {
      const snapId = url.searchParams.get("snap");
      if (snapId) {
        const rec = BEER_SNAP_ID.test(snapId) ? await this.storage.get("snap:" + snapId) : null;
        if (!rec || Date.now() - rec.at > BEER_SNAP_MS) return json({ error: "That snap is gone." }, 404);
        return new Response(rec.bytes, { headers: { "content-type": rec.type, "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" } });
      }
      const photo = url.searchParams.get("photo");
      if (photo) {
        const rec = BEER_POUR_ID.test(photo) ? await this.storage.get("photo:" + photo) : null;
        if (!rec) return json({ error: "There is no photo for that pour." }, 404);
        // The address carries the photo's time, so a replaced photo is a new address.
        return new Response(rec.bytes, { headers: { "content-type": rec.type, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
      }
      const view = url.searchParams.get("view");
      // The journal names who did what, the stash included, so only the admin reads it.
      if (view === "journal") {
        if (!(await beerIsAdmin(this.env, request.headers.get("x-beer-admin"), Date.now()))) return json({ error: "Only the admin can read the journal." }, 403);
        const recent = await this.storage.list({ prefix: "log:", reverse: true, limit: 50 });
        return json({ ok: true, entries: [...recent.values()] });
      }
      // Dates and counts only, nothing from the board: when the last copy went out, and how long the journal is.
      if (view === "backups") {
        const prefix = "goldens-guzzlers:" + ((await this.storage.get("which")) || "live") + ":";
        const keys = this.env && this.env.VOTES ? (await this.env.VOTES.list({ prefix })).keys.map(k => k.name.slice(prefix.length)) : [];
        return json({ ok: true, snapshotAt: (await this.storage.get("snapAt")) || null, keys, journal: (await this.storage.get("logseq")) || 0 });
      }
      if (view === "library") {
        const boards = {};
        for (const y of m.years) boards[y] = await this.board(y);
        return json({ ok: true, year: m.year, years: m.years, libRev: m.libRev, boards, ...(await this.lib()) });
      }
      const y = Number(url.searchParams.get("year") || m.year);
      if (!m.years.includes(y)) return json({ error: "There is no board for that year." }, 404);
      return json({ ok: true, year: m.year, years: m.years, libRev: m.libRev, board: await this.board(y) });
    }
    // Snap the can: read the label and send back the beer's name, brewery and style. Nothing is stored.
    if (request.method === "PUT" && url.searchParams.get("read") === "label") {
      const type = request.headers.get("content-type") || "";
      const bytes = new Uint8Array(await request.arrayBuffer());
      const now = Date.now();
      if (!BEER_PHOTO_TYPES.has(type) || !bytes.length || bytes.length > BEER_PHOTO_MAX) return json({ error: "That photo could not be read." }, 400);
      const ip = request.headers.get("x-client-ip");
      if (ip) {
        const step = rateStep(await this.storage.get("a:" + ip), now, BEER_LABEL_READS, IP_WINDOW_MS);
        if (!step.allowed) return json({ error: "Too many labels read from this address. Type this one in." }, 429);
        await this.storage.put("a:" + ip, step.rec);
      }
      // The snap is kept first, so a picture search still works when the reader cannot help.
      const tail = [...crypto.getRandomValues(new Uint8Array(4))].map(b => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
      const snap = String(now) + tail;
      await this.storage.put("snap:" + snap, { type, bytes, at: now });
      await this.trim("snap:", BEER_SNAP_KEEP);
      if (!this.env || !this.env.AI) return json({ error: "Reading labels is not set up here.", snap }, 503);
      const day = "reads:" + new Date(now).toISOString().slice(0, 10);
      const count = (await this.storage.get(day)) || 0;
      if (count >= BEER_LABEL_DAY) return json({ error: "The label reader is done for today. Type this one in.", snap }, 429);
      await this.storage.put(day, count + 1);
      try {
        return json({ ok: true, snap, ...(await beerReadLabel(this.env, bytes, type)) });
      } catch (e) {
        return json({ error: "The label could not be read. Type it in.", snap }, 502);
      }
    }

    // A photo of the can: kept with the pour, copied to the key-value store, and every phone told.
    if (request.method === "PUT") {
      const pid = url.searchParams.get("photo") || "";
      const type = request.headers.get("content-type") || "";
      const bytes = new Uint8Array(await request.arrayBuffer());
      const now = Date.now();
      if (!BEER_POUR_ID.test(pid) || !BEER_PHOTO_TYPES.has(type) || !bytes.length || bytes.length > BEER_PHOTO_MAX) {
        return json({ error: "That photo could not be read." }, 400);
      }
      const ip = request.headers.get("x-client-ip");
      if (ip) {
        const step = rateStep(await this.storage.get("p:" + ip), now, BEER_PHOTO_WRITES, IP_WINDOW_MS);
        if (!step.allowed) return json({ error: "Too many photos from this address. Try again later." }, 429);
        await this.storage.put("p:" + ip, step.rec);
        const old = await this.storage.list({ prefix: "p:" });
        for (const [k, rec] of old) if (now - rec.start >= IP_WINDOW_MS) await this.storage.delete(k);
      }
      const board = await this.board(m.year);
      const out = beerApply(board, { op: "photo", pid }, now);
      if (out.error) return json({ error: out.error, ...(await this.state(m, board)) }, 400);
      await this.storage.put("photo:" + pid, { type, bytes, at: now });
      await this.storage.put("board:" + m.year, out.board);
      const where = request.headers.get("x-beer-board") === "test" ? "test" : "live";
      try {
        if (this.env && this.env.VOTES) await this.env.VOTES.put("goldens-guzzlers:" + where + ":photo:" + pid, bytes, { metadata: { type, at: now } });
      } catch (e) { /* the copy is a spare; the photo itself is stored above */ }
      const by = beerWho(url.searchParams.get("by"));
      await this.after(by ? { op: "photo", pid, by } : { op: "photo", pid }, now, m, out.board);
      return json({ ...(await this.state(m, out.board)), changed: true });
    }

    const op = await request.json();
    const now = Date.now();
    if (op.op === "photo") return json({ error: "A photo goes up as the image itself." }, 400);
    // Which board this object is, so its snapshots go under the right name.
    const which = request.headers.get("x-beer-board");
    if (which && which !== this.which) {
      this.which = which;
      await this.storage.put("which", which);
    }
    const ip = request.headers.get("x-client-ip");
    if (ip) {
      const step = rateStep(await this.storage.get("r:" + ip), now, BEER_WRITES, IP_WINDOW_MS);
      if (!step.allowed) {
        return new Response(JSON.stringify({ error: "Too many changes from this address. Try again later." }), {
          status: 429, headers: { ...HEADERS, "retry-after": String(step.retryAfter) },
        });
      }
      await this.storage.put("r:" + ip, step.rec);
      const old = await this.storage.list({ prefix: "r:" });
      for (const [k, rec] of old) if (now - rec.start >= IP_WINDOW_MS) await this.storage.delete(k);
    }
    // The admin signs in with the password and gets back a key; the password itself is never stored.
    if (op.op === "admin-login") {
      if (!this.env || !this.env.BEER_ADMIN_HASH) return json({ error: "The admin password is not set up yet." }, 503);
      const lock = (await this.storage.get("adminFails")) || { n: 0, start: now };
      if (now - lock.start > BEER_ADMIN_LOCK_MS) { lock.n = 0; lock.start = now; }
      if (lock.n >= BEER_ADMIN_FAILS) return json({ error: "Too many wrong passwords. Try again in fifteen minutes." }, 429);
      if (!(await beerAdminPassword(this.env, op.password))) {
        lock.n++;
        await this.storage.put("adminFails", lock);
        return json({ error: "That is not the admin password." }, 403);
      }
      await this.storage.delete("adminFails");
      return json({ ok: true, admin: await beerAdminKey(this.env, now) });
    }
    delete op.password;
    // Who sent it, from the name picked when the page opened. It goes in the journal and nowhere else.
    if (op.by !== undefined) {
      const by = beerWho(op.by);
      if (by) op.by = by; else delete op.by;
    }

    const seen = (await this.storage.get("seen")) || [];
    if (op.opId && seen.includes(op.opId)) return json({ ...(await this.state(m)), changed: false, repeat: true });

    // The admin's device keeps score for the table: with its key, a vote or a guess can be anyone's.
    delete op.keeper;
    if ((op.op === "vote" || op.op === "guess") && op.by && op.name !== op.by && (await beerIsAdmin(this.env, op.admin, now))) op.keeper = true;

    // A delete, a ban or a new year needs the admin's key, and a delete needs the word DELETE as well.
    if (BEER_ADMIN_OPS.has(op.op)) {
      if (!(await beerIsAdmin(this.env, op.admin, now))) return json({ error: "Only the admin can do that.", ...(await this.state(m)) }, 403);
      if (BEER_DELETE_OPS.has(op.op) && op.confirm !== "DELETE") return json({ error: "A delete takes the word DELETE.", ...(await this.state(m)) }, 400);
    }
    delete op.admin;
    const remember = async () => {
      if (!op.opId) return;
      seen.push(op.opId);
      await this.storage.put("seen", seen.slice(-BEER_SEEN_KEEP));
    };

    // Only the test board can be wiped whole, so a trial run leaves nothing behind there.
    if (op.op === "wipe") {
      if (request.headers.get("x-beer-board") !== "test" || op.confirm !== "wipe the test board") {
        return json({ error: "Only the test board can be wiped.", ...(await this.state(m)) }, 400);
      }
      await this.storage.deleteAll();
      const fresh = await this.meta();
      await this.storage.put("which", "test");
      await this.broadcast(fresh);
      return json({ ...(await this.state(fresh)), changed: true });
    }

    // A snapshot on demand, to make sure the copy outside this object is current.
    if (op.op === "snapshot") {
      const at = await this.writeSnapshot();
      await remember();
      return json({ ...(await this.state(m)), changed: false, snapshotAt: at });
    }

    // A new year opens a fresh board and leaves every earlier year exactly as it was.
    if (op.op === "newyear") {
      const y = Number(op.year);
      if (op.confirm !== "new year" || !Number.isInteger(y) || y <= m.year || y > m.year + 5) {
        return json({ error: "A new year comes after " + m.year + ".", ...(await this.state(m)) }, 400);
      }
      const prev = await this.board(m.year);
      const next = { ...beerFresh(), year: y, nextPuller: prev.nextPuller || BEER_ROSTER[0] };
      await this.storage.put("board:" + y, next);
      m.year = y;
      m.years = [...m.years, y];
      m.libRev++;
      await this.storage.put("meta", m);
      await this.after(op, now, m, next);
      await remember();
      return json({ ...(await this.state(m, next)), changed: true });
    }

    if (BEER_LIB_OPS.has(op.op)) {
      const before = await this.lib();
      const out = beerLibApply(before, op, now);
      if (out.error) return json({ error: out.error, ...(await this.state(m)) }, 400);
      if (out.changed) {
        // A beer taken out of the stash is kept, so a slipped tap loses nothing.
        const gone = op.op === "stash-remove" ? before.stash.find(s => s.id === op.sid) : null;
        if (gone) {
          let seq = (await this.storage.get("seq")) || 0;
          await this.storage.put("removedStash:" + String(++seq).padStart(8, "0"), { at: now, entry: gone });
          await this.storage.put("seq", seq);
          await this.trim("removedStash:", BEER_REMOVED_STASH_KEEP);
        }
        await this.storage.put("marks", out.lib.marks);
        await this.storage.put("stash", out.lib.stash);
        m.libRev++;
        await this.storage.put("meta", m);
        await this.after(op, now, m);
      }
      await remember();
      return json({ ...(await this.state(m)), changed: out.changed });
    }

    // Every other change is to this year's board. A change made for an earlier year, by a phone
    // that has not seen the new year start, is turned away rather than landing on the wrong night.
    if (op.y !== undefined && op.y !== m.year) {
      return json({ error: "The board has moved on to " + m.year + ", so that change was not saved.", ...(await this.state(m)) }, 409);
    }
    const board = await this.board(m.year);
    const out = beerApply(board, op, now);
    if (out.error) return json({ error: out.error, ...(await this.state(m, board)) }, 400);
    if (out.changed) {
      let seq = (await this.storage.get("seq")) || 0;
      if (out.archive) {
        await this.storage.put("archive:" + String(++seq).padStart(8, "0"), { at: now, board: out.archive });
        await this.trim("archive:", BEER_ARCHIVE_KEEP);
      }
      if (out.removed) {
        await this.storage.put("removed:" + String(++seq).padStart(8, "0"), { at: now, pour: out.removed });
        await this.trim("removed:", BEER_REMOVED_KEEP);
      }
      if (out.archive || out.removed) await this.storage.put("seq", seq);
      await this.storage.put("board:" + m.year, out.board);
      // A revealed beer that was waiting in someone's stash comes off it as poured.
      if (op.op === "reveal" || op.op === "edit") {
        const p = out.board.pours.find(x => x.id === op.pid);
        const lib = await this.lib();
        let moved = false;
        if (p) for (const s of lib.stash) {
          if (!s.pouredYear && beerKey(s.name, s.brewery) === beerKey(p.name, p.brewery)) {
            s.pouredYear = m.year;
            s.pouredPour = p.n;
            moved = true;
          }
        }
        if (moved) {
          await this.storage.put("stash", lib.stash);
          m.libRev++;
          await this.storage.put("meta", m);
        }
      }
      await this.after(op, now, m, out.board);
    }
    await remember();
    return json({ ...(await this.state(m, out.board)), changed: out.changed });
  }
}

function beer(env, which) {
  return env.BEER.get(env.BEER.idFromName(which === "test" ? "goldens-guzzlers-test" : "goldens-guzzlers"));
}

// The beer board route: GET reads the board, POST sends one change, {op, opId, ...}. The checks
// here are shape only; beerApply applies the rules. ?board=test reads and writes the test board.
async function beerRoute(request, env) {
  const url = new URL(request.url);
  const which = url.searchParams.get("board") === "test" ? "test" : "live";
  const inner = "https://beerboard" + BEER_ROUTE;
  if (url.pathname === BEER_LIVE_ROUTE) {
    if (request.headers.get("Upgrade") !== "websocket") return json({ error: "This address takes a live connection." }, 426);
    return beer(env, which).fetch(request);
  }
  if (request.method === "GET") {
    const q = new URLSearchParams();
    const view = url.searchParams.get("view");
    if (view === "library" || view === "journal" || view === "backups") q.set("view", view);
    if (/^\d{4}$/.test(url.searchParams.get("year") || "")) q.set("year", url.searchParams.get("year"));
    if (BEER_POUR_ID.test(url.searchParams.get("photo") || "")) q.set("photo", url.searchParams.get("photo"));
    if (BEER_SNAP_ID.test(url.searchParams.get("snap") || "")) q.set("snap", url.searchParams.get("snap"));
    const qs = q.toString();
    return beer(env, which).fetch(new Request(inner + (qs ? "?" + qs : ""), { headers: { "x-beer-admin": request.headers.get("x-beer-admin") || "" } }));
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  // Snap the can: the photo goes to the board's object, which counts the reads and asks the label reader.
  if (url.searchParams.get("read") === "label") {
    const type = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!BEER_PHOTO_TYPES.has(type)) return json({ error: "Send the photo as an image." }, 415);
    if (Number(request.headers.get("content-length") || 0) > BEER_PHOTO_MAX) return json({ error: "That photo is too large." }, 413);
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength) return json({ error: "That photo is empty." }, 400);
    if (bytes.byteLength > BEER_PHOTO_MAX) return json({ error: "That photo is too large." }, 413);
    return beer(env, which).fetch(new Request(inner + "?read=label", {
      method: "PUT",
      headers: { "content-type": type, "x-client-ip": request.headers.get("cf-connecting-ip") || "", "x-beer-board": which },
      body: bytes,
    }));
  }
  // A photo of the can goes up as the image itself, never inside a change.
  if (url.searchParams.has("photo")) {
    const pid = url.searchParams.get("photo") || "";
    const type = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!BEER_POUR_ID.test(pid)) return json({ error: "That pour could not be read." }, 400);
    if (!BEER_PHOTO_TYPES.has(type)) return json({ error: "Send the photo as an image." }, 415);
    if (Number(request.headers.get("content-length") || 0) > BEER_PHOTO_MAX) return json({ error: "That photo is too large." }, 413);
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength) return json({ error: "That photo is empty." }, 400);
    if (bytes.byteLength > BEER_PHOTO_MAX) return json({ error: "That photo is too large." }, 413);
    const q = new URLSearchParams({ photo: pid });
    const by = beerWho(url.searchParams.get("by"));
    if (by) q.set("by", by);
    return beer(env, which).fetch(new Request(inner + "?" + q, {
      method: "PUT",
      headers: { "content-type": type, "x-client-ip": request.headers.get("cf-connecting-ip") || "", "x-beer-board": which },
      body: bytes,
    }));
  }
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return json({ error: "Send the change as JSON." }, 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return json({ error: "That request is too large." }, 413);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "That change could not be read." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.op !== "string") {
    return json({ error: "That change could not be read." }, 400);
  }
  if (JSON.stringify(body).length > 4096) return json({ error: "That request is too large." }, 413);
  if (body.opId !== undefined && !(typeof body.opId === "string" && BEER_OP_ID.test(body.opId))) {
    return json({ error: "That change could not be read." }, 400);
  }
  return beer(env, which).fetch(new Request(inner, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-client-ip": request.headers.get("cf-connecting-ip") || "",
      "x-beer-board": which,
    },
    body: JSON.stringify(body),
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === VERSION_ROUTE && request.method === "GET") {
      return json({ worker: "family-votes", build: env.BUILD_HASH || "dev" });
    }
    if (url.pathname === HOUSE_ROUTE) return houseRoute(request, env);
    if (url.pathname === PLAN_ROUTE) return planRoute(request, env);
    if (url.pathname === BEER_ROUTE || url.pathname === BEER_LIVE_ROUTE) return beerRoute(request, env);
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
