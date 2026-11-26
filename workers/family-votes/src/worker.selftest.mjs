// Offline self-test for the family vote Worker and its VoteBox, against stand-in stores.
//     node workers/family-votes/src/worker.selftest.mjs
import { pbkdf2Sync } from "node:crypto";
import worker, { VoteBox, HouseMarks, PlanState, PLAN_ROUTE, PLAN_WRITES, PLAN_MAX_JOBS, cleanDevice, cleanName, rateStep, ROUTE, KV_PREFIX, IP_NEW_DEVICES, IP_WINDOW_MS, HOUSE_ROUTE, HOUSE_WRITES, HOUSE_MAX_SLUGS, BeerBoard, BEER_ROUTE, BEER_LIVE_ROUTE, BEER_WRITES, BEER_MAX_POURS, BEER_ADMIN_FAILS, BEER_PHOTO_MAX, beerText, beerKey, beerAdminKey, beerIsAdmin, beerAdminPassword } from "./worker.js";

// A stand-in admin password, hashed the way the real secret is, with fewer rounds to keep the test quick.
const TEST_ADMIN_PASSWORD = "selftest admin password";
const TEST_ADMIN_SALT = Buffer.from("00112233445566778899aabbccddeeff", "hex");
const TEST_ADMIN_HASH = "pbkdf2-sha256$2000$" + TEST_ADMIN_SALT.toString("hex") + "$" + pbkdf2Sync(TEST_ADMIN_PASSWORD, TEST_ADMIN_SALT, 2000, 32, "sha256").toString("hex");

class FakeKV {
  constructor() { this.m = new Map(); }
  async put(k, v) { this.m.set(k, { value: v }); }
  async get(k) { const e = this.m.get(k); return e && e.value !== undefined ? e.value : null; }
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
  async deleteAll() { this.m.clear(); }
  async getAlarm() { return this.alarmAt || null; }
  async setAlarm(t) { this.alarmAt = t; }
  async deleteAlarm() { this.alarmAt = null; }
  async list({ prefix = "", reverse = false, limit } = {}) {
    let rows = [...this.m.entries()].filter(([k]) => k.startsWith(prefix)).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    if (reverse) rows.reverse();
    if (limit) rows = rows.slice(0, limit);
    return new Map(rows.map(([k, v]) => [k, structuredClone(v)]));
  }
}

function makeEnv(kv) {
  const env = { VOTES: kv, BEER_ADMIN_HASH: TEST_ADMIN_HASH };
  // A stand-in for the label reader: it answers as the vision model does, or fails when told to.
  env.AI = {
    calls: [],
    async run(model, input) {
      this.calls.push({ model, input });
      if (this.fail) throw new Error("the reader is down");
      return this.reply || { response: { printed: { name: "Hop Goblin", brewery: "", style: "Hazy IPA" }, known: { name: "Hop Goblin", brewery: "Bramblewood Brewing", style: "Hazy IPA" } }, usage: { prompt_tokens: 1500, completion_tokens: 30 } };
    },
  };
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
  const planBox = new PlanState({ storage: new FakeStorage() });
  let pqueue = Promise.resolve();
  env.PLAN = {
    idFromName: () => "plan",
    get: () => ({ fetch: req => (pqueue = pqueue.then(() => planBox.fetch(req))) }),
  };
  // The beer board has two objects, the real board and the test board, each one at a time.
  env._beer = new Map();
  env.BEER = {
    idFromName: name => name,
    get: name => {
      if (!env._beer.has(name)) env._beer.set(name, { storage: new FakeStorage(), queue: Promise.resolve(), sockets: [] });
      const slot = env._beer.get(name);
      const obj = new BeerBoard({ storage: slot.storage, getWebSockets: () => slot.sockets }, env);
      slot.obj = obj;
      return { fetch: req => (slot.queue = slot.queue.then(() => obj.fetch(req))) };
    },
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

// The house search votes, posted without a name, as a page from before names behaves.
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

// The house search votes by name: each person's vote is kept on its own.
{
  const env2 = makeEnv(new FakeKV());
  const vpost = body => worker.fetch(new Request(hbase, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env2).then(async r => ({ status: r.status, j: await r.json() }));
  const vget = () => worker.fetch(new Request(hbase), env2).then(r => r.json());
  const t = Date.now();
  let x = await vpost({ slug: "121-oak-valley-dr", mark: "view", name: "Kane", set: t });
  check("a named vote saves under that name", x.status === 200 && x.j.votes["121-oak-valley-dr"]["n:kane"].mark === "view" && x.j.votes["121-oak-valley-dr"]["n:kane"].name === "Kane");
  x = await vpost({ slug: "121-oak-valley-dr", mark: "no", name: "Jane", set: t + 1 });
  check("a no from one person leaves the other's view in place", x.j.votes["121-oak-valley-dr"]["n:kane"].mark === "view" && x.j.votes["121-oak-valley-dr"]["n:jane"].mark === "no" && x.j.marks["121-oak-valley-dr"] === "view");
  x = await vpost({ slug: "121-oak-valley-dr", mark: "", name: "Jane", set: t + 2 });
  check("one person clearing clears only their own vote", x.j.votes["121-oak-valley-dr"]["n:kane"].mark === "view" && !("n:jane" in x.j.votes["121-oak-valley-dr"]));
  x = await vpost({ slug: "121-oak-valley-dr", mark: "", name: "kane ", set: t + 3 });
  check("the same name typed on another phone is the same person", !("121-oak-valley-dr" in x.j.votes));
  await vpost({ slug: "223-destiny-ct", mark: "view", name: "Kane", set: t + 10 });
  x = await vpost({ slug: "223-destiny-ct", mark: "", name: "Kane", set: t + 5 });
  check("an old tap that waited offline cannot undo a newer one", x.j.stale === true && x.j.votes["223-destiny-ct"]["n:kane"].mark === "view");
  await vpost({ slug: "623-hunt-run-dr", mark: "", name: "Kane", set: t + 21 });
  x = await vpost({ slug: "623-hunt-run-dr", mark: "view", name: "Kane", set: t + 20 });
  check("a tick that arrives after its own later clear stays cleared", x.j.stale === true && !("623-hunt-run-dr" in x.j.votes));
  const j2 = await vget();
  check("every change is in the log, newest first", j2.log.length === 5 && j2.log[0].slug === "223-destiny-ct" && j2.log[0].to === "view" && j2.log.some(e => e.name === "Jane" && e.to === "no"));
  check("the log carries no address or device id", !JSON.stringify(j2.log).includes("device") && !JSON.stringify(j2).includes("203.0.113"));
  await vpost({ slug: "513-kent-dr", mark: "no", device: "deviceDDDDDDDDDDDDDDDD", set: t });
  check("a device id sent with a vote is never stored or sent back", !JSON.stringify(await vget()).includes("deviceDDDD"));
  x = await vpost({ slug: "223-destiny-ct", mark: "view", name: "<script>" });
  check("a name that is not a name is refused", x.status === 400);
  check("names keep letters, spaces and apostrophes", cleanName("  Mary  Jo O'Neil ") === "Mary Jo O'Neil" && cleanName("x".repeat(41)) === "" && cleanName("Kane1") === "");
}

// The single-mark version's records carry over as unnamed votes, and the first named vote replaces each.
{
  const storage = new FakeStorage();
  await storage.put("m:314-evening-star-ct", { mark: "view", at: 1793230838549 });
  await storage.put("m:513-kent-dr", { mark: "no", at: 1793230000000 });
  const hm = new HouseMarks({ storage });
  const call = (body) => hm.fetch(new Request("https://housemarks" + HOUSE_ROUTE, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined)).then(r => r.json());
  let u = await call();
  check("old marks carry over as unnamed votes", u.votes["314-evening-star-ct"].earlier.mark === "view" && u.marks["513-kent-dr"] === "no");
  check("the old records are kept as a backup", (await storage.get("bak:m:314-evening-star-ct")).mark === "view" && !(await storage.get("m:314-evening-star-ct")));
  u = await call({ slug: "314-evening-star-ct", mark: "view", name: "Kane", set: Date.now() });
  check("the first person to set the same mark claims the carried-over one", !("earlier" in u.votes["314-evening-star-ct"]) && u.votes["314-evening-star-ct"]["n:kane"].mark === "view" && u.log.some(e => e.from === "view" && e.to === "" && e.why === "claimed by Kane"));
  u = await call({ slug: "513-kent-dr", mark: "view", name: "Jane", set: Date.now() });
  check("a different mark sits beside a carried-over one and never removes it", u.votes["513-kent-dr"].earlier.mark === "no" && u.votes["513-kent-dr"]["n:jane"].mark === "view");
  await storage.put("m:17-savoy-dr", { mark: "view", at: 1 });
  u = await call();
  check("the carry-over runs once", !("17-savoy-dr" in u.votes));
}

// The house plan's state: a Needed or Wanted switch and a Done box per job, shared by every viewer.
{
  const env3 = makeEnv(new FakeKV());
  const pbase = "https://yesandeverything.com" + PLAN_ROUTE;
  const ppost = (body, ip) => worker.fetch(new Request(pbase, { method: "POST", headers: { "content-type": "application/json", ...(ip ? { "cf-connecting-ip": ip } : {}) }, body: JSON.stringify(body) }), env3).then(async r => ({ status: r.status, j: await r.json() }));
  const pget = () => worker.fetch(new Request(pbase), env3).then(r => r.json());
  let g = await pget();
  check("the plan starts with no changes", JSON.stringify(g.jobs) === "{}" && g.log.length === 0);
  const t0 = Date.now();
  let x = await ppost({ job: "job-d-d-room", field: "mark", value: "need", name: "Kane", set: t0 });
  check("a job moves to Needed", x.status === 200 && x.j.jobs["job-d-d-room"].mark === "need");
  x = await ppost({ job: "job-d-d-room", field: "done", value: true, name: "Lexi", set: t0 + 1 });
  check("a job is ticked done and keeps its mark", x.j.jobs["job-d-d-room"].done === true && x.j.jobs["job-d-d-room"].mark === "need");
  x = await ppost({ job: "job-d-d-room", field: "done", value: false, name: "Kane", set: t0 + 2 });
  check("a job ticked done by mistake can be unticked", x.j.jobs["job-d-d-room"].done === false);
  check("the log keeps the tick and the untick, newest first, with who did each",
    x.j.log.length === 3 && x.j.log[0].to === false && x.j.log[0].name === "Kane" && x.j.log[1].to === true && x.j.log[1].name === "Lexi");
  x = await ppost({ job: "job-d-d-room", field: "done", value: true, name: "Kane", set: t0 + 1 });
  check("an old tap that waited offline cannot undo a newer one", x.j.stale === true && x.j.jobs["job-d-d-room"].done === false);
  x = await ppost({ job: "job-d-d-room", field: "mark", value: "need", name: "Kane", set: t0 + 5 });
  check("setting the same value again adds nothing to the log", x.j.log.length === 3);
  const many = ["job-paint-the-whole-house", "job-office", "job-deck-rebuild", "job-move"];
  await Promise.all(many.map((job, i) => ppost({ job, field: "done", value: true, name: "Obo", set: t0 + 10 + i })));
  g = await pget();
  check("four ticks from two phones at once all land", many.every(job => g.jobs[job].done === true));
  x = await ppost({ job: "../etc", field: "done", value: true });
  check("a job that is not a card id is refused", x.status === 400);
  x = await ppost({ job: "job-office", field: "mark", value: "fail" });
  check("a mark other than need or want is refused", x.status === 400);
  x = await ppost({ job: "job-office", field: "done", value: "yes" });
  check("done must be true or false", x.status === 400);
  x = await ppost({ job: "job-office", field: "cost", value: 1 });
  check("an unknown field is refused", x.status === 400);
  x = await ppost({ job: "job-office", field: "done", value: true, name: "<b>" });
  check("a name that is not a name is refused", x.status === 400);
  const r = await worker.fetch(new Request(pbase, { method: "POST", body: "job=job-office" }), env3);
  check("a form post to the plan route is refused", r.status === 415);
  const codes = [];
  for (let i = 0; i < PLAN_WRITES + 2; i++) codes.push((await ppost({ job: "job-bin-shelving", field: "done", value: i % 2 === 0, set: Date.now() + i }, "198.51.100.9")).status);
  check("one address is cut off after the plan write cap", codes.slice(0, PLAN_WRITES).every(c => c === 200) && codes.slice(PLAN_WRITES).every(c => c === 429));
  for (let i = 0; i < PLAN_MAX_JOBS; i++) await ppost({ job: "job-fill-" + i, field: "done", value: true });
  x = await ppost({ job: "job-one-more", field: "done", value: true });
  check("a new job past the cap is refused", x.status === 429);
  x = await ppost({ job: "job-office", field: "done", value: false, set: Date.now() + 1000 });
  check("a job already in the plan still changes past the cap", x.status === 200 && x.j.jobs["job-office"].done === false);
  check("the plan log carries no address", !JSON.stringify(await pget()).includes("198.51.100"));
  const h = await worker.fetch(new Request("https://yesandeverything.com" + HOUSE_ROUTE), env3).then(r => r.json());
  check("the plan state never reaches the house marks", !JSON.stringify(h).includes("job-"));
}

// Golden's Guzzlers: one beer board shared by every phone at the table.
{
  const env4 = makeEnv(new FakeKV());
  const bbase = "https://yesandeverything.com" + BEER_ROUTE;
  let seq = 0;
  const id = () => "change" + String(++seq).padStart(8, "0");
  const bpost = (body, o = {}) => worker.fetch(new Request(bbase + (o.test ? "?board=test" : ""), {
    method: "POST",
    headers: { "content-type": o.type || "application/json", ...(o.ip ? { "cf-connecting-ip": o.ip } : {}), ...(o.length ? { "content-length": String(o.length) } : {}) },
    body: o.raw !== undefined ? o.raw : JSON.stringify(body),
  }), env4).then(async r => ({ status: r.status, j: await r.json() }));
  const bget = test => worker.fetch(new Request(bbase + (test ? "?board=test" : "")), env4).then(r => r.json());

  let g = await bget();
  check("the beer board starts empty with Mike to pull", g.board.pours.length === 0 && g.board.nextPuller === "Mike" && g.board.rev === 0);
  let x = await bpost({ op: "pour", opId: id(), pid: "pourone1" });
  check("a pull makes pour 1, pulled by Mike, and Bill pulls next", x.status === 200 && x.j.board.pours[0].n === 1 && x.j.board.pours[0].puller === "Mike" && x.j.board.nextPuller === "Bill");
  x = await bpost({ op: "pour", opId: id(), pid: "pourtwo2" });
  check("a second pull while pour 1 is in its coozie changes nothing", x.status === 200 && x.j.changed === false && x.j.board.pours.length === 1);

  const votes = { Mike: "up", Bill: "side", Brennan: "up", Nick: "down", AJ: "up", Gannan: "up" };
  await Promise.all(Object.entries(votes).map(([name, v]) => bpost({ op: "vote", opId: id(), pid: "pourone1", name, v })));
  g = await bget();
  check("six thumbs sent at once all land", Object.entries(votes).every(([k, v]) => g.board.pours[0].votes[k] === v));

  const again = { op: "vote", opId: "resendNICK01", pid: "pourone1", name: "Nick", v: "up" };
  await bpost(again);
  await bpost({ op: "vote", opId: id(), pid: "pourone1", name: "Nick", v: "down" });
  x = await bpost(again);
  check("a change sent again after a lost answer applies once", x.j.repeat === true && x.j.board.pours[0].votes.Nick === "down");
  x = await bpost({ op: "vote", opId: id(), pid: "pourone1", name: "Nick", v: "" });
  check("a vote can be cleared", x.status === 200 && !("Nick" in x.j.board.pours[0].votes));
  await bpost({ op: "vote", opId: id(), pid: "pourone1", name: "Nick", v: "down" });
  x = await bpost({ op: "vote", opId: id(), pid: "pourone1", name: "Nick", v: "maybe" });
  check("a vote other than up, side or down is refused, with the board sent back", x.status === 400 && x.j.board.pours.length === 1);
  x = await bpost({ op: "vote", opId: id(), pid: "pourone1", name: "Zed", v: "up" });
  check("a taster who is not at the table is refused", x.status === 400);
  x = await bpost({ op: "vote", opId: id(), pid: "nosuchpour", name: "Mike", v: "up" });
  check("a vote on a pour that is not on the board is refused", x.status === 400);

  x = await bpost({ op: "guess", opId: id(), pid: "pourone1", name: "Mike", who: "Nick" });
  check("a guess on who brought it saves", x.j.board.pours[0].guesses.Mike === "Nick");
  x = await bpost({ op: "guess", opId: id(), pid: "pourone1", name: "Mike", who: "Zed" });
  check("a guess naming someone not at the table is refused", x.status === 400);
  x = await bpost({ op: "guess", opId: id(), pid: "pourone1", name: "Mike", who: "" });
  check("a guess can be cleared", !("Mike" in x.j.board.pours[0].guesses));

  x = await bpost({ op: "reveal", opId: id(), pid: "pourone1", name: "   ", brewery: "x" });
  check("a reveal with no beer name is refused", x.status === 400 && x.j.board.pours[0].revealed === false);
  x = await bpost({ op: "reveal", opId: id(), pid: "pourone1", name: "Hop\u0007  Goblin" + "!".repeat(120), brewery: " Bramblewood  Brewing ", style: "Hazy IPA", provider: "Gannan" });
  const p1 = x.j.board.pours[0];
  check("a reveal saves the name, brewery, style and who brought it", x.status === 200 && p1.revealed === true && p1.brewery === "Bramblewood Brewing" && p1.style === "Hazy IPA" && p1.provider === "Gannan");
  check("a revealed name loses control characters and stops at 80", p1.name.startsWith("Hop Goblin!") && p1.name.length === 80 && !/[\u0000-\u001f]/.test(p1.name));
  x = await bpost({ op: "reveal", opId: id(), pid: "pourone1", name: "Hop Goblin", provider: "Zed" });
  check("a provider who is not at the table is saved as nobody", x.j.board.pours[0].provider === "");

  x = await bpost({ op: "pour", opId: id(), pid: "pourtwo2" });
  check("after the reveal the next pull is pour 2, pulled by Bill", x.j.board.pours[1].n === 2 && x.j.board.pours[1].puller === "Bill" && x.j.board.nextPuller === "Brennan");
  x = await bpost({ op: "unpour", opId: id(), pid: "pourtwo2" });
  check("a pour pulled by mistake goes back in the bucket and Bill pulls again", x.j.board.pours.length === 1 && x.j.board.nextPuller === "Bill");
  await bpost({ op: "pour", opId: id(), pid: "pourtwo2" });
  await bpost({ op: "vote", opId: id(), pid: "pourtwo2", name: "AJ", v: "up" });
  x = await bpost({ op: "unpour", opId: id(), pid: "pourtwo2" });
  check("a pour with a vote on it cannot be put back", x.j.changed === false && x.j.board.pours.length === 2);

  x = await bpost({ op: "surprise", opId: id(), pid: "pourtwo2" });
  check("only a revealed beer can be the surprise", x.status === 400);
  x = await bpost({ op: "surprise", opId: id(), pid: "pourone1" });
  check("a revealed beer can be the surprise", x.j.board.surprise === "pourone1");

  x = await bpost({ op: "edit", opId: id(), pid: "pourone1", name: "Hop Goblin", brewery: "Bramblewood", style: "Hazy IPA", provider: "Gannan", votes: { Mike: "down", Zed: "up", Bill: "sideways", AJ: "side" }, guesses: { Nick: "Gannan", Bill: "Zed" } });
  const e1 = x.j.board.pours[0];
  check("a fix replaces the votes and guesses, keeping only real tasters and real votes", JSON.stringify(e1.votes) === JSON.stringify({ Mike: "down", AJ: "side" }) && JSON.stringify(e1.guesses) === JSON.stringify({ Nick: "Gannan" }) && e1.brewery === "Bramblewood");

  // Deleting is the admin's alone, with a key earned by the password, and every delete takes the word DELETE.
  x = await bpost({ op: "remove", opId: id(), pid: "pourone1", confirm: "DELETE" });
  check("a delete without the admin's key is refused and the pour stays", x.status === 403 && x.j.board.pours.length === 2);
  x = await bpost({ op: "admin-login", password: "not the password" });
  check("a wrong admin password is refused", x.status === 403 && !x.j.admin);
  x = await bpost({ op: "admin-login", password: TEST_ADMIN_PASSWORD });
  const adminKey = x.j.admin;
  check("the admin password earns a key that is not the password", x.status === 200 && /^\d{13}\.[0-9a-f]{64}$/.test(adminKey || "") && !adminKey.includes(TEST_ADMIN_PASSWORD));
  x = await bpost({ op: "remove", opId: id(), pid: "pourone1", admin: adminKey });
  check("a delete without the word DELETE is refused", x.status === 400 && x.j.board.pours.length === 2);
  x = await bpost({ op: "remove", opId: id(), pid: "pourone1", admin: adminKey.slice(0, -1) + (adminKey.endsWith("0") ? "1" : "0"), confirm: "DELETE" });
  check("a forged key is refused", x.status === 403 && x.j.board.pours.length === 2);
  check("a key past its year is refused", !(await beerIsAdmin(env4, await beerAdminKey(env4, Date.now() - 400 * 86400000), Date.now())));
  check("a secret stored with a trailing line break still matches", await beerAdminPassword({ BEER_ADMIN_HASH: TEST_ADMIN_HASH + "\r\n" }, TEST_ADMIN_PASSWORD));
  const unset = await new BeerBoard({ storage: new FakeStorage(), getWebSockets: () => [] }, { VOTES: new FakeKV() }).fetch(new Request("https://beerboard" + BEER_ROUTE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "admin-login", password: TEST_ADMIN_PASSWORD }) }));
  check("with no admin password set up, sign-in says so and nobody can delete", unset.status === 503 && /not set up/.test((await unset.json()).error));
  check("a key made under another password is refused", !(await beerIsAdmin({ BEER_ADMIN_HASH: TEST_ADMIN_HASH.replace(/.$/, c => (c === "0" ? "1" : "0")) }, adminKey, Date.now())));
  x = await bpost({ op: "remove", opId: id(), pid: "pourone1", admin: adminKey, confirm: "DELETE" });
  check("taking a pour off the board clears it as the surprise", x.j.board.pours.length === 1 && x.j.board.surprise === null);
  const live = env4._beer.get("goldens-guzzlers").storage;
  const kept = [...(await live.list({ prefix: "removed:" })).values()];
  check("a pour taken off the board is kept for recovery", kept.length === 1 && kept[0].pour.name === "Hop Goblin");

  x = await bpost({ op: "clear", opId: id(), admin: adminKey });
  check("clearing the board takes the word DELETE", x.status === 400 && x.j.board.pours.length === 1);
  x = await bpost({ op: "clear", opId: id(), confirm: "DELETE" });
  check("clearing without the admin's key is refused", x.status === 403 && x.j.board.pours.length === 1);
  const before = x.j.board.rev;
  x = await bpost({ op: "clear", opId: id(), confirm: "DELETE", admin: adminKey });
  const arch = [...(await live.list({ prefix: "archive:" })).values()];
  check("a cleared board empties and its pours are archived", x.j.board.pours.length === 0 && x.j.board.rev === before + 1 && arch.length === 1 && arch[0].board.pours.length === 1);
  const pullerBefore = x.j.board.nextPuller;
  await bpost({ op: "pour", opId: id(), pid: "pourthr3" });
  await bpost({ op: "vote", opId: id(), pid: "pourthr3", name: "Bill", v: "up" });
  x = await bpost({ op: "remove", opId: id(), pid: "pourthr3", admin: adminKey, confirm: "DELETE" });
  check("a pour deleted while still in its coozie hands the pull back", x.status === 200 && x.j.board.pours.length === 0 && x.j.board.nextPuller === pullerBefore);

  x = await bpost({ op: "explode", opId: id() });
  check("an unknown change is refused", x.status === 400);
  x = await bpost(null, { raw: "op=pour", type: "application/x-www-form-urlencoded" });
  check("a form post to the beer board is refused", x.status === 415);
  x = await bpost(null, { raw: JSON.stringify({ op: "puller", name: "Mike", pad: "x".repeat(5000) }) });
  check("a change past four kilobytes is refused", x.status === 413);
  x = await bpost({ op: "puller", opId: "bad id!", name: "Mike" });
  check("a change id that is not an id is refused", x.status === 400);

  await bpost({ op: "pour", opId: id(), pid: "testpour1" }, { test: true });
  const tb = await bget(true), lb = await bget();
  check("the test board never touches the real one", tb.board.pours.length === 1 && lb.board.pours.length === 0);

  const codes = [];
  for (let i = 0; i < BEER_WRITES + 2; i++) codes.push((await bpost({ op: "puller", opId: id(), name: i % 2 ? "Bill" : "Mike" }, { ip: "203.0.113.44" })).status);
  check("one address is cut off after the beer write cap", codes.slice(0, BEER_WRITES).every(c => c === 200) && codes.slice(BEER_WRITES).every(c => c === 429));
  x = await bpost({ op: "puller", opId: id(), name: "AJ" }, { ip: "198.51.100.44" });
  check("another address still writes to the board", x.status === 200 && x.j.board.nextPuller === "AJ");
  check("the board carries no address", !JSON.stringify(await bget()).includes("203.0.113"));

  await bpost({ op: "reveal", opId: id(), pid: "testpour1", name: "Test beer" }, { test: true });
  for (let i = 1; i < BEER_MAX_POURS; i++) {
    const pid = "fill" + String(i).padStart(4, "0");
    await bpost({ op: "pour", opId: id(), pid }, { test: true });
    await bpost({ op: "reveal", opId: id(), pid, name: "Beer " + i }, { test: true });
  }
  x = await bpost({ op: "pour", opId: id(), pid: "onetoomany" }, { test: true });
  check("a pull past the pour cap is refused", x.status === 400 && x.j.board.pours.length === BEER_MAX_POURS);

  for (let i = 0; i < BEER_ADMIN_FAILS; i++) await bpost({ op: "admin-login", password: "guess number " + i }, { test: true });
  x = await bpost({ op: "admin-login", password: TEST_ADMIN_PASSWORD }, { test: true });
  check("after eight wrong passwords admin sign-in pauses, even for the right one", x.status === 429 && !x.j.admin);
  x = await bpost({ op: "admin-login", password: TEST_ADMIN_PASSWORD });
  check("the pause on one board leaves the other board's sign-in working", x.status === 200 && !!x.j.admin);

  check("beerText keeps one space at a time and drops control characters", beerText("  Two\u0000  Spires\n Brewing ", 80) === "Two Spires Brewing");
  const h = await worker.fetch(new Request("https://yesandeverything.com" + HOUSE_ROUTE), env4).then(r => r.json());
  const pl = await worker.fetch(new Request("https://yesandeverything.com" + PLAN_ROUTE), env4).then(r => r.json());
  check("the beer board never reaches the house marks or the plan", !JSON.stringify(h).includes("pour") && !JSON.stringify(pl).includes("pour"));
}

// The yearly record: each year's board kept for good, the beer log's bring-back list and stash.
{
  const env5 = makeEnv(new FakeKV());
  const ybase = "https://yesandeverything.com" + BEER_ROUTE;
  let n5 = 0;
  const id = () => "yearchg" + String(++n5).padStart(8, "0");
  const ypost = (body, test) => worker.fetch(new Request(ybase + (test ? "?board=test" : ""), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env5).then(async r => ({ status: r.status, j: await r.json() }));
  const yget = q => worker.fetch(new Request(ybase + (q || "")), env5).then(r => r.json());

  let g = await yget();
  check("the board starts on 2026", g.year === 2026 && JSON.stringify(g.years) === "[2026]" && g.board.year === 2026);
  await ypost({ op: "pour", opId: id(), pid: "yearone1", y: 2026 });
  await ypost({ op: "vote", opId: id(), pid: "yearone1", name: "Mike", v: "up", y: 2026 });
  let x = await ypost({ op: "stash-add", opId: id(), sid: "stash0001", name: "Hop  Goblin", brewery: "Bramblewood Brewing Co.", who: "Brennan" });
  check("a beer goes in the stash, with who has it", x.status === 200 && x.j.libRev === 1);
  await ypost({ op: "reveal", opId: id(), pid: "yearone1", name: "Hop Goblin", brewery: "Bramblewood Brewing", style: "Hazy IPA", provider: "Gannan", y: 2026 });
  let lib = await yget("?view=library");
  check("a revealed beer that was in a stash comes off it as poured", lib.stash[0].pouredYear === 2026 && lib.stash[0].pouredPour === 1 && lib.stash[0].who === "Brennan");
  check("brewery words like Brewing and Co. do not split one beer in two", beerKey("Hop Goblin", "Bramblewood Brewing Co.") === beerKey("hop  goblin", "Bramblewood"));
  await ypost({ op: "bringback", opId: id(), name: "Hop Goblin", brewery: "Bramblewood Brewing", on: true });
  lib = await yget("?view=library");
  check("a beer can be marked to bring back", lib.marks.bringBack[beerKey("Hop Goblin", "Bramblewood")].name === "Hop Goblin");
  x = await ypost({ op: "bringback", opId: id(), name: "Hop Goblin", brewery: "Bramblewood", on: "yes" });
  check("bring back is on or off, nothing else", x.status === 400);

  const k5 = (await ypost({ op: "admin-login", password: TEST_ADMIN_PASSWORD })).j.admin;
  x = await ypost({ op: "newyear", opId: id(), year: 2027, confirm: "new year" });
  check("only the admin can start a new year", x.status === 403 && x.j.year === 2026);
  x = await ypost({ op: "newyear", opId: id(), year: 2027, admin: k5 });
  check("a new year needs its confirming words", x.status === 400 && x.j.year === 2026);
  x = await ypost({ op: "newyear", opId: id(), year: 2026, confirm: "new year", admin: k5 });
  check("a new year has to come after this one", x.status === 400);
  x = await ypost({ op: "newyear", opId: id(), year: 2027, confirm: "new year", admin: k5 });
  check("starting 2027 gives an empty board on 2027", x.status === 200 && x.j.year === 2027 && x.j.board.pours.length === 0 && JSON.stringify(x.j.years) === "[2026,2027]");
  g = await yget("?year=2026");
  check("2026 stays saved after 2027 starts", g.board.year === 2026 && g.board.pours.length === 1 && g.board.pours[0].name === "Hop Goblin" && g.board.pours[0].votes.Mike === "up");
  x = await ypost({ op: "vote", opId: id(), pid: "yearone1", name: "Bill", v: "down", y: 2026 });
  check("a change meant for 2026 is turned away once 2027 has started", x.status === 409 && x.j.year === 2027);
  g = await yget("?year=2026");
  check("and 2026 is untouched by it", !("Bill" in g.board.pours[0].votes));
  lib = await yget("?view=library");
  check("the log holds every year's board", Object.keys(lib.boards).join(",") === "2026,2027" && lib.boards["2026"].pours[0].name === "Hop Goblin");
  x = await ypost({ op: "stash-remove", opId: id(), sid: "stash0001", confirm: "DELETE" });
  check("only the admin can take a beer out of the stash", x.status === 403 && x.j.libRev === lib.libRev);
  x = await ypost({ op: "stash-remove", opId: id(), sid: "stash0001", admin: k5 });
  check("taking a beer out of the stash takes the word DELETE", x.status === 400 && x.j.libRev === lib.libRev);
  x = await ypost({ op: "stash-remove", opId: id(), sid: "stash0001", admin: k5, confirm: "DELETE" });
  check("a stash entry can be taken out", x.status === 200 && x.j.libRev > lib.libRev);
  lib = await yget("?view=library");
  check("and it is gone from the stash", lib.stash.length === 0);

  // Banning is the admin's alone, needs no DELETE, and keeps a beer out of every future stash.
  const hg = beerKey("Hop Goblin", "Bramblewood");
  await ypost({ op: "bringback", opId: id(), name: "Hop Goblin", brewery: "Bramblewood", on: true });
  x = await ypost({ op: "ban", opId: id(), name: "Hop Goblin", brewery: "Bramblewood", on: true });
  check("only the admin can ban a beer", x.status === 403);
  x = await ypost({ op: "ban", opId: id(), name: "Hop Goblin", brewery: "Bramblewood Brewing", style: "Hazy IPA", on: true, admin: k5 });
  lib = await yget("?view=library");
  check("a ban needs no DELETE, and a banned beer leaves the bring-back list", x.status === 200 && lib.marks.banned[hg].name === "Hop Goblin" && !lib.marks.bringBack[hg]);
  x = await ypost({ op: "stash-add", opId: id(), sid: "banned01", name: "hop  goblin", brewery: "Bramblewood Brewing Co." });
  check("a banned beer cannot go in the stash, and the answer says it is banned", x.status === 400 && /banned/.test(x.j.error));
  x = await ypost({ op: "stash-add", opId: id(), sid: "banned02", name: "Hop Goblin" });
  check("leaving the brewery off does not slip a banned beer past", x.status === 400);
  x = await ypost({ op: "stash-add", opId: id(), sid: "banned03", name: "Hop Goblin", brewery: "Other Barn Ales" });
  check("the same name from another brewery can still be stashed", x.status === 200);
  x = await ypost({ op: "bringback", opId: id(), name: "Hop Goblin", brewery: "Bramblewood", on: true });
  check("a banned beer cannot be marked to bring back", x.status === 400 && /banned/.test(x.j.error));
  x = await ypost({ op: "ban", opId: id(), name: "Hop Goblin", brewery: "Bramblewood", on: "yes", admin: k5 });
  check("a ban is on or off, nothing else", x.status === 400);
  await ypost({ op: "ban", opId: id(), name: "Hop Goblin", brewery: "Bramblewood", on: false, admin: k5 });
  x = await ypost({ op: "stash-add", opId: id(), sid: "banned04", name: "Hop Goblin", brewery: "Bramblewood" });
  lib = await yget("?view=library");
  check("once unbanned it can be stashed again", x.status === 200 && !lib.marks.banned[hg]);
  const r404 = await worker.fetch(new Request(ybase + "?year=2031"), env5);
  check("a year with no board answers not found", r404.status === 404);

  const st = new FakeStorage();
  await st.put("board", { v: 1, rev: 3, nextPuller: "AJ", surprise: null, pours: [{ id: "oldpour1", n: 1, puller: "Mike", votes: {}, guesses: {}, revealed: true, name: "Old One", brewery: "", style: "", provider: "" }] });
  const old = await new BeerBoard({ storage: st }).fetch(new Request("https://beerboard" + BEER_ROUTE)).then(r => r.json());
  check("a board from before years moves under 2026 with its pours", old.year === 2026 && old.board.pours[0].name === "Old One" && !(await st.get("board")) && (await st.get("board:2026")).rev === 3);

  x = await ypost({ op: "wipe", opId: id(), confirm: "wipe the test board" });
  check("the real board cannot be wiped", x.status === 400 && x.j.years.length === 2);
  await ypost({ op: "pour", opId: id(), pid: "testwipe1" }, true);
  x = await ypost({ op: "wipe", opId: id(), confirm: "wipe the test board" }, true);
  g = await yget("?board=test");
  check("the test board wipes clean", x.status === 200 && g.board.pours.length === 0 && JSON.stringify(g.years) === "[2026]");
}

// Live connections, the journal, and the snapshots kept outside the board's own storage.
{
  const kv6 = new FakeKV();
  const env6 = makeEnv(kv6);
  const b6 = "https://yesandeverything.com" + BEER_ROUTE;
  let n6 = 0;
  const id = () => "livechg" + String(++n6).padStart(8, "0");
  const post6 = (body, test) => worker.fetch(new Request(b6 + (test ? "?board=test" : ""), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env6).then(async r => ({ status: r.status, j: await r.json() }));
  const get6 = (q, admin) => worker.fetch(new Request(b6 + (q || ""), admin ? { headers: { "x-beer-admin": admin } } : undefined), env6).then(r => r.json());
  await get6();
  const k6 = (await post6({ op: "admin-login", password: TEST_ADMIN_PASSWORD })).j.admin;
  const slot = env6._beer.get("goldens-guzzlers");
  const phone = () => ({ sent: [], send(m) { this.sent.push(m); } });
  const phoneA = phone(), phoneB = phone();
  slot.sockets.push(phoneA, phoneB);
  const last = p => JSON.parse(p.sent[p.sent.length - 1] || "{}");
  await post6({ op: "pour", opId: id(), pid: "livepour1", y: 2026 });
  check("every open phone hears a change the moment it lands", last(phoneA).type === "state" && last(phoneA).board.pours[0].id === "livepour1" && last(phoneB).board.pours.length === 1);
  await post6({ op: "vote", opId: id(), pid: "livepour1", name: "Mike", v: "up", y: 2026, by: "Mike" });
  check("and hears the next one too", last(phoneB).board.pours[0].votes.Mike === "up" && phoneB.sent.length === 2);
  await post6({ op: "vote", opId: id(), pid: "livepour1", name: "Mike", v: "up", y: 2026 });
  check("a change that changes nothing sends nothing", phoneB.sent.length === 3 || phoneB.sent.length === 2);
  const r426 = await worker.fetch(new Request("https://yesandeverything.com" + BEER_LIVE_ROUTE), env6);
  check("the live address takes only a live connection", r426.status === 426);
  const jr = await get6("?view=journal", k6);
  check("every change is in the journal, newest first, without its change id", jr.entries[0].op.op === "vote" && jr.entries[jr.entries.length - 1].op.op === "pour" && !("opId" in jr.entries[0].op) && jr.entries[0].year === 2026);
  check("the journal says who sent each change", jr.entries[1].op.by === "Mike" && !("by" in jr.entries[0].op));
  const jr403 = await worker.fetch(new Request(b6 + "?view=journal"), env6);
  check("only the admin can read the journal", jr403.status === 403);
  await post6({ op: "vote", opId: id(), pid: "livepour1", name: "Bill", v: "up", y: 2026, by: "Zed" });
  await post6({ op: "stash-add", opId: id(), sid: "keepme01", name: "Lake Fog Pils", by: "Brennan" });
  const lib6 = await get6("?view=library");
  check("the stash shown to every phone never says who stashed a beer", lib6.stash.length === 1 && !JSON.stringify(lib6.stash).includes("Brennan"));
  await post6({ op: "stash-remove", opId: id(), sid: "keepme01", admin: k6, confirm: "DELETE", by: "Nick" });
  const keptStash = [...(await slot.storage.list({ prefix: "removedStash:" })).values()];
  check("a beer taken out of the stash is kept for recovery", keptStash.length === 1 && keptStash[0].entry.name === "Lake Fog Pils");
  const jr2 = await get6("?view=journal", k6);
  check("a name that is not at the table is left off the journal", jr2.entries[2].op.op === "vote" && !("by" in jr2.entries[2].op));
  check("the admin's key and password never reach the journal", !JSON.stringify(jr2).includes(k6) && !JSON.stringify(jr2).includes(TEST_ADMIN_PASSWORD) && !("admin" in jr2.entries[0].op));
  check("a change schedules a snapshot", typeof (await slot.storage.getAlarm()) === "number");
  await slot.obj.alarm();
  const snap = JSON.parse(await kv6.get("goldens-guzzlers:live:latest"));
  check("the snapshot holds every year and both lists", snap.boards["2026"].pours[0].id === "livepour1" && Array.isArray(snap.stash) && snap.board === "live");
  const today = new Date().toISOString().slice(0, 10);
  check("and a copy is kept for the day", !!(await kv6.get("goldens-guzzlers:live:day:" + today)));
  const bk = await get6("?view=backups");
  check("the backups view lists the snapshots and counts the journal", bk.keys.includes("latest") && bk.keys.includes("day:" + today) && bk.snapshotAt > 0 && bk.journal === 6);
  const sn = await post6({ op: "snapshot", opId: id() }, true);
  check("a snapshot can be taken on demand, and the test board's goes under its own name", sn.status === 200 && sn.j.snapshotAt > 0 && !!(await kv6.get("goldens-guzzlers:test:latest")));
  check("the journal and the snapshots carry no address", !JSON.stringify(jr).includes("203.0.113") && !(await kv6.get("goldens-guzzlers:live:latest")).includes("cf-connecting-ip"));
}

// Secret ballots, and a photo of the can kept with its pour.
{
  const kv7 = new FakeKV();
  const env7 = makeEnv(kv7);
  const b7 = "https://yesandeverything.com" + BEER_ROUTE;
  let n7 = 0;
  const id = () => "ballots" + String(++n7).padStart(8, "0");
  const post7 = body => worker.fetch(new Request(b7, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env7).then(async r => ({ status: r.status, j: await r.json() }));
  await post7({ op: "pour", opId: id(), pid: "secret01", y: 2026 });
  let x = await post7({ op: "vote", opId: id(), pid: "secret01", name: "Mike", v: "up", y: 2026, by: "Bill" });
  check("a phone cannot vote for someone else", x.status === 400 && /Switch/.test(x.j.error) && !x.j.board.pours[0].votes.Mike);
  x = await post7({ op: "vote", opId: id(), pid: "secret01", name: "Bill", v: "down", y: 2026, by: "Bill" });
  check("a phone votes for whoever is holding it", x.status === 200 && x.j.board.pours[0].votes.Bill === "down");
  x = await post7({ op: "guess", opId: id(), pid: "secret01", name: "Mike", who: "Nick", y: 2026, by: "Bill" });
  check("a phone cannot guess for someone else", x.status === 400);
  x = await post7({ op: "guess", opId: id(), pid: "secret01", name: "Bill", who: "Nick", y: 2026, by: "Bill" });
  check("a phone guesses for whoever is holding it", x.status === 200 && x.j.board.pours[0].guesses.Bill === "Nick");

  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]);
  const up = (pid, body, type = "image/jpeg", extra = "") => worker.fetch(new Request(b7 + "?photo=" + pid + extra, { method: "POST", headers: { "content-type": type }, body }), env7).then(async r => ({ status: r.status, j: await r.json() }));
  x = await up("secret01", jpeg, "image/jpeg", "&by=Bill");
  check("a photo of the can lands on its pour", x.status === 200 && x.j.board.pours[0].photo > 0);
  const img = await worker.fetch(new Request(b7 + "?photo=secret01"), env7);
  const got = new Uint8Array(await img.arrayBuffer());
  check("the photo reads back as the same image", img.status === 200 && img.headers.get("content-type") === "image/jpeg" && got.length === jpeg.length && got.every((b, i) => b === jpeg[i]));
  check("a spare copy of the photo goes to the key-value store", !!kv7.m.get("goldens-guzzlers:live:photo:secret01"));
  x = await up("secret01", new Uint8Array(BEER_PHOTO_MAX + 1));
  check("a photo past the size cap is refused", x.status === 413);
  x = await up("secret01", jpeg, "text/plain");
  check("a photo that is not an image is refused", x.status === 415);
  x = await up("nosuchpour", jpeg);
  check("a photo for a pour not on the board is refused", x.status === 400);
  x = await post7({ op: "photo", opId: id(), pid: "secret01" });
  check("a photo cannot be claimed without the image", x.status === 400);
  const none = await worker.fetch(new Request(b7 + "?photo=nophoto1"), env7);
  check("a pour with no photo answers not found", none.status === 404);
  const k7 = (await post7({ op: "admin-login", password: TEST_ADMIN_PASSWORD })).j.admin;
  const jr7 = await worker.fetch(new Request(b7 + "?view=journal", { headers: { "x-beer-admin": k7 } }), env7).then(r => r.json());
  check("the journal notes the photo, and who sent it, without the image", jr7.entries[0].op.op === "photo" && jr7.entries[0].op.by === "Bill" && !("bytes" in jr7.entries[0].op));
}

// The scorekeeper's tablet, and the label reader.
{
  const env8 = makeEnv(new FakeKV());
  const b8 = "https://yesandeverything.com" + BEER_ROUTE;
  let n8 = 0;
  const id = () => "keeper0" + String(++n8).padStart(8, "0");
  const post8 = body => worker.fetch(new Request(b8, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env8).then(async r => ({ status: r.status, j: await r.json() }));
  const k8 = (await post8({ op: "admin-login", password: TEST_ADMIN_PASSWORD })).j.admin;
  await post8({ op: "pour", opId: id(), pid: "tablet01", y: 2026 });
  let x = await post8({ op: "vote", opId: id(), pid: "tablet01", name: "Mike", v: "up", y: 2026, by: "Nick", admin: k8 });
  check("the admin's tablet enters someone else's vote", x.status === 200 && x.j.board.pours[0].votes.Mike === "up");
  x = await post8({ op: "guess", opId: id(), pid: "tablet01", name: "Gannan", who: "Bill", y: 2026, by: "Nick", admin: k8 });
  check("and someone else's guess", x.status === 200 && x.j.board.pours[0].guesses.Gannan === "Bill");
  x = await post8({ op: "vote", opId: id(), pid: "tablet01", name: "Bill", v: "up", y: 2026, by: "Nick", keeper: true });
  check("a phone cannot claim to keep score without the key", x.status === 400 && !x.j.board.pours[0].votes.Bill);
  const jr8 = await worker.fetch(new Request(b8 + "?view=journal", { headers: { "x-beer-admin": k8 } }), env8).then(r => r.json());
  check("the journal shows the scorekeeper entered the vote, without the key", jr8.entries.some(e => e.op.op === "vote" && e.op.name === "Mike" && e.op.by === "Nick" && e.op.keeper === true) && !JSON.stringify(jr8).includes(k8));

  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 8, 7, 6, 0xff, 0xd9]);
  const read = (body, type = "image/jpeg", extra = "") => worker.fetch(new Request(b8 + "?read=label" + extra, { method: "POST", headers: { "content-type": type }, body }), env8).then(async r => ({ status: r.status, j: await r.json() }));
  x = await read(jpeg);
  const call = env8.AI.calls[env8.AI.calls.length - 1];
  const sent = call && call.input.messages[1].content[1].image_url.url;
  check("a photo of a can comes back as what the label prints", x.status === 200 && x.j.label.name === "Hop Goblin" && x.j.label.brewery === "" && x.j.label.style === "Hazy IPA");
  check("and as what the reader recognizes, kept apart so the page can mark it a guess", x.j.known.brewery === "Bramblewood Brewing" && x.j.known.name === "Hop Goblin");
  check("the reader gets the photo itself, as a data address", call.model === "@cf/meta/llama-4-scout-17b-16e-instruct" && sent === "data:image/jpeg;base64," + Buffer.from(jpeg).toString("base64"));
  check("the token count comes back so the cost can be measured", x.j.tokens && x.j.tokens.input === 1500 && x.j.tokens.output === 30);
  check("the snap gets an address of its own for a picture search", /^\d{13}[a-z0-9]{4}$/.test(x.j.snap || ""));
  const snapRes = await worker.fetch(new Request(b8 + "?snap=" + x.j.snap), env8);
  const snapBytes = new Uint8Array(await snapRes.arrayBuffer());
  check("and that address serves the photo back", snapRes.status === 200 && snapRes.headers.get("content-type") === "image/jpeg" && snapBytes.length === jpeg.length);
  env8.AI.reply = { response: 'Here it is: {"name": "Lake  Fog\\u0007 Pils", "brewery": "Test Brewing", "style": ""}' };
  x = await read(jpeg);
  check("an answer with words around its JSON is still read, and cleaned", x.status === 200 && x.j.label.name === "Lake Fog Pils" && x.j.label.style === "" && x.j.known.name === "");
  env8.AI.reply = { response: "I cannot read this label." };
  x = await read(jpeg);
  check("an answer with no JSON says to type it in", x.status === 502 && /Type it in/.test(x.j.error));
  env8.AI.reply = null;
  env8.AI.fail = true;
  x = await read(jpeg);
  check("a reader that is down says to type it in, and the snap is still there to search by", x.status === 502 && /^\d{13}[a-z0-9]{4}$/.test(x.j.snap || ""));
  env8.AI.fail = false;
  x = await read(jpeg, "text/plain");
  check("a label read takes only an image", x.status === 415);
  const slot8 = env8._beer.get("goldens-guzzlers");
  await slot8.storage.put("reads:" + new Date().toISOString().slice(0, 10), 120);
  x = await read(jpeg);
  check("the reads stop for the day at the cap", x.status === 429 && /today/.test(x.j.error) && !!x.j.snap);
  const slotSnaps = [...(await slot8.storage.list({ prefix: "snap:" })).values()];
  const oldSnap = slotSnaps[0];
  oldSnap.at = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const oldKey = [...(await slot8.storage.list({ prefix: "snap:" })).keys()][0];
  await slot8.storage.put(oldKey, oldSnap);
  const gone = await worker.fetch(new Request(b8 + "?snap=" + oldKey.slice(5)), env8);
  check("a snap older than a day is gone", gone.status === 404);
  check("reading a label stores no photo on the board and changes no pour", !(await slot8.storage.list({ prefix: "photo:" })).size && (await worker.fetch(new Request(b8), env8).then(r => r.json())).board.pours[0].photo === undefined);
}

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("family-votes self-test passed");
