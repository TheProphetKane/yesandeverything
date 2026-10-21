// Offline self-test for the family vote Worker and its VoteBox, against stand-in stores.
//     node workers/family-votes/src/worker.selftest.mjs
import worker, { VoteBox, cleanDevice, ROUTE, KV_PREFIX } from "./worker.js";

class FakeKV {
  constructor() { this.m = new Map(); }
  async list({ prefix = "" } = {}) {
    const keys = [...this.m.entries()].filter(([k]) => k.startsWith(prefix)).map(([name, e]) => ({ name, metadata: e.metadata }));
    return { keys, list_complete: true };
  }
}

// Durable Object storage stand-in. Like the real one, a single object serves one call at a time.
class FakeStorage {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? structuredClone(this.m.get(k)) : undefined; }
  async put(k, v) { this.m.set(k, structuredClone(v)); }
  async delete(k) { this.m.delete(k); }
  async list({ prefix = "" } = {}) {
    return new Map([...this.m.entries()].filter(([k]) => k.startsWith(prefix)).sort().map(([k, v]) => [k, structuredClone(v)]));
  }
}

function makeEnv(kv) {
  const env = { VOTES: kv };
  const box = new VoteBox({ storage: new FakeStorage() }, env);
  let queue = Promise.resolve();
  env.BOX = {
    idFromName: () => "one",
    get: () => ({ fetch: req => (queue = queue.then(() => box.fetch(req))) }),
  };
  env._box = box;
  return env;
}

let failed = 0;
function check(label, ok) { if (!ok) { failed++; console.error("FAIL " + label); } else console.log("ok   " + label); }

const A = "deviceAAAAAAAAAAAAAAAA", B = "deviceBBBBBBBBBBBBBBBB", C = "deviceCCCCCCCCCCCCCCCC";
const kv = new FakeKV();
kv.m.set(KV_PREFIX + C, { metadata: { v: { "historic-house": 1, "bogus": 1 } } });
const env = makeEnv(kv);
const base = "https://yesandeverything.com" + ROUTE;
const post = body => worker.fetch(new Request(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env);
const get = q => worker.fetch(new Request(base + (q || "")), env).then(r => r.json());

check("device id accepted", cleanDevice(A) === A);
check("short id refused", cleanDevice("abc") === null);

let j = await get();
check("votes from the old store carried over", j.tallies["historic-house"].up === 1 && !("bogus" in j.tallies));

let r = await post({ device: A, option: "npb-pair", value: 1 });
j = await r.json();
check("vote saved", r.status === 200 && j.mine["npb-pair"] === 1 && j.tallies["npb-pair"].up === 1);

// Five quick taps from one phone, fired without waiting: every one must land.
const opts = ["casa-solara", "three-homes", "flamingo", "triplex", "jupiter-6br"];
await Promise.all(opts.map(o => post({ device: A, option: o, value: -1 })));
j = await get("?device=" + A);
check("five quick votes from one device all saved", opts.every(o => j.mine[o] === -1) && j.mine["npb-pair"] === 1);

// Twenty phones voting at once.
const many = Array.from({ length: 20 }, (_, i) => "phone" + String(i).padStart(12, "0"));
await Promise.all(many.map(d => post({ device: d, option: "pool-game-room", value: 1 })));
j = await get();
check("twenty devices at once all counted", j.tallies["pool-game-room"].up === 20);

r = await post({ device: A, option: "npb-pair", value: -1 });
j = await r.json();
check("a device changes its vote", j.tallies["npb-pair"].up === 0 && j.tallies["npb-pair"].down === 1);

r = await post({ device: C, option: "historic-house", value: 0 });
j = await r.json();
check("clearing a carried-over vote sticks", j.tallies["historic-house"].up === 0);
j = await get();
check("the old store does not bring it back", j.tallies["historic-house"].up === 0);

r = await post({ device: B, option: "not-a-listing", value: 1 });
check("unknown listing refused", r.status === 400);
r = await post({ option: "npb-pair", value: 1 });
check("missing device refused", r.status === 400);
r = await worker.fetch(new Request(base, { method: "POST", body: "x=1" }), env);
check("form post refused", r.status === 415);
j = await get("?device=" + A);
check("no device ids in the answer", !JSON.stringify(j).includes(A));
r = await worker.fetch(new Request("https://yesandeverything.com/thanksgiving-2026/api/other"), env);
check("other paths 404", r.status === 404);

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("family-votes self-test passed");
