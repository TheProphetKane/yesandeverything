// Family vote for /thanksgiving-2026/: a thumbs up or down per listing, one record per voter.
//
// Each voter is one key in the VOTES namespace, tg26:<name slug>, with the votes held in the
// key's metadata so a single list() returns the whole tally without a read per voter. Votes by
// different people land on different keys and never overwrite each other.
//
// There is no sign-in. A voter types a first name, and that name is the record, so this is a
// trust-the-family page, not a ballot. The bounds below keep a stray visitor from filling it.

export const PREFIX = "tg26:";
export const ROUTE = "/thanksgiving-2026/api/votes";
export const MAX_VOTERS = 60;
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

export function cleanName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name || name.length > 30) return null;
  if (!/^[\p{L}\p{M}' .-]+$/u.test(name)) return null;
  return name;
}

export function voterKey(name) {
  const slug = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? PREFIX + slug : null;
}

async function listVoters(env) {
  const voters = [];
  let cursor;
  do {
    const page = await env.VOTES.list({ prefix: PREFIX, cursor });
    for (const k of page.keys) {
      const m = k.metadata;
      if (m && typeof m.name === "string" && m.v && typeof m.v === "object") {
        voters.push({ key: k.name, name: m.name, v: m.v });
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return voters;
}

function publicView(voters) {
  return voters.map(({ name, v }) => ({ name, v }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== ROUTE) return json({ error: "Not found." }, 404);

    if (request.method === "GET") {
      return json({ voters: publicView(await listVoters(env)) });
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

    const name = cleanName(body && body.name);
    if (!name) return json({ error: "Enter a first name: letters only, up to 30 characters." }, 400);
    const key = voterKey(name);
    if (!key) return json({ error: "Enter a first name using letters." }, 400);
    if (!OPTIONS.has(body.option)) return json({ error: "That listing is not on the ballot." }, 400);
    if (![1, -1, 0].includes(body.value)) return json({ error: "A vote is up, down or cleared." }, 400);

    const existing = await env.VOTES.getWithMetadata(key);
    const known = existing && existing.metadata && existing.metadata.v ? existing.metadata : null;
    let voters = await listVoters(env);
    if (!known && voters.length >= MAX_VOTERS) {
      return json({ error: "The vote is full." }, 429);
    }

    const v = { ...(known ? known.v : {}) };
    if (body.value === 0) delete v[body.option]; else v[body.option] = body.value;
    const shownName = known && typeof known.name === "string" ? known.name : name;

    if (Object.keys(v).length === 0) {
      await env.VOTES.delete(key);
    } else {
      await env.VOTES.put(key, "1", { metadata: { name: shownName, v } });
    }

    // A list() can lag a fresh write, so answer with this voter's record merged in.
    voters = voters.filter(x => x.key !== key);
    if (Object.keys(v).length) voters.push({ key, name: shownName, v });
    return json({ ok: true, me: { name: shownName, v }, voters: publicView(voters) });
  },
};
