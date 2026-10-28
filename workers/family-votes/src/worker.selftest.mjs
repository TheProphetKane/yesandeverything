// Offline self-test for the family vote Worker and its VoteBox, against stand-in stores.
//     node workers/family-votes/src/worker.selftest.mjs
import worker, { VoteBox, HouseMarks, cleanDevice, rateStep, ROUTE, KV_PREFIX, IP_NEW_DEVICES, IP_WINDOW_MS, HOUSE_ROUTE, HOUSE_WRITES, HOUSE_MAX_SLUGS } from "./worker.js";

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
  const houseBox = new HouseMarks({ storage: new FakeStorage() });
  let hqueue = Promise.resolve();
  env.HOUSE = {
    idFromName: () => "house",
    get: () => ({ fetch: req => (hqueue = hqueue.then(() => houseBox.fetch(req))) }),
  };
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

// Rate limit: one address cannot create more than IP_NEW_DEVICES new device ids per window.
const postFrom = (ip, body) => worker.fetch(new Request(base, { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify(body) }), env);
let codes = [];
for (let i = 0; i < IP_NEW_DEVICES + 3; i++) codes.push((await postFrom("203.0.113.9", { device: "flood" + String(i).padStart(12, "0"), option: "triplex", value: 1 })).status);
check("one address is cut off after the cap", codes.slice(0, IP_NEW_DEVICES).every(c => c === 200) && codes.slice(IP_NEW_DEVICES).every(c => c === 429));
r = await postFrom("203.0.113.9", { device: "flood" + "0".padStart(12, "0"), option: "flamingo", value: 1 });
check("a known device from a limited address still votes", r.status === 200);
r = await postFrom("198.51.100.4", { device: "other" + "0".padStart(12, "0"), option: "triplex", value: 1 });
check("another address is unaffected", r.status === 200);
const t0 = 1000;
let st = rateStep(null, t0, 2, 100);
st = rateStep(st.rec, t0 + 1, 2, 100);
check("rateStep blocks at the limit", rateStep(st.rec, t0 + 2, 2, 100).allowed === false);
check("rateStep resets after the window", rateStep(st.rec, t0 + 200, 2, 100).allowed === true);

r = await worker.fetch(new Request("https://yesandeverything.com/thanksgiving-2026/api/version"), { ...env, BUILD_HASH: "abc1234" });
j = await r.json();
check("version route reports the build", r.status === 200 && j.build === "abc1234");

// The house search marks: one shared list, where a house holds one mark at most.
const hbase = "https://yesandeverything.com" + HOUSE_ROUTE;
const hpost = (body, ip) => worker.fetch(new Request(hbase, { method: "POST", headers: { "content-type": "application/json", ...(ip ? { "cf-connecting-ip": ip } : {}) }, body: JSON.stringify(body) }), env);
const hget = () => worker.fetch(new Request(hbase), env).then(r => r.json());

j = await hget();
check("house list starts empty", JSON.stringify(j.marks) === "{}");
r = await hpost({ slug: "11-cadillac-ct", mark: "view" });
j = await r.json();
check("a view mark saves", r.status === 200 && j.marks["11-cadillac-ct"] === "view");
j = await hget();
check("a second viewer reads the same mark", j.marks["11-cadillac-ct"] === "view" && j.at > 0);
r = await hpost({ slug: "11-cadillac-ct", mark: "no" });
j = await r.json();
check("a no replaces the view, one mark per house", j.marks["11-cadillac-ct"] === "no" && Object.keys(j.marks).length === 1);
r = await hpost({ slug: "11-cadillac-ct", mark: "" });
j = await r.json();
check("clearing removes the mark", r.status === 200 && !("11-cadillac-ct" in j.marks));
const slugs = ["17-savoy-dr", "223-destiny-ct", "513-kent-dr", "86-sun-haven-ct", "623-hunt-run-dr"];
await Promise.all(slugs.map(s => hpost({ slug: s, mark: "view" })));
j = await hget();
check("five marks from two phones at once all land", slugs.every(s => j.marks[s] === "view"));
r = await hpost({ slug: "../etc", mark: "view" });
check("a slug that is not a house folder is refused", r.status === 400);
r = await hpost({ slug: "17-savoy-dr", mark: "maybe" });
check("an unknown mark is refused", r.status === 400);
r = await worker.fetch(new Request(hbase, { method: "POST", body: "slug=x" }), env);
check("a form post to the house route is refused", r.status === 415);
r = await worker.fetch(new Request("https://yesandeverything.com/house-search/api/other"), env);
check("other house paths 404", r.status === 404);
codes = [];
for (let i = 0; i < HOUSE_WRITES + 2; i++) codes.push((await hpost({ slug: "17-savoy-dr", mark: i % 2 ? "no" : "view" }, "203.0.113.7")).status);
check("one address is cut off after the write cap", codes.slice(0, HOUSE_WRITES).every(c => c === 200) && codes.slice(HOUSE_WRITES).every(c => c === 429));
r = await hpost({ slug: "17-savoy-dr", mark: "view" }, "198.51.100.8");
check("another address still writes", r.status === 200);
for (let i = 0; i < HOUSE_MAX_SLUGS; i++) await hpost({ slug: "fill-" + i, mark: "no" });
r = await hpost({ slug: "one-more-house", mark: "no" });
check("a new house past the cap is refused", r.status === 429);
r = await hpost({ slug: "17-savoy-dr", mark: "no" });
j = await r.json();
check("a house already on the list still changes past the cap", r.status === 200 && j.marks["17-savoy-dr"] === "no");
j = await get();
check("the house marks never reach the Thanksgiving vote", !("17-savoy-dr" in j.tallies));

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("family-votes self-test passed");
