// Offline self-test for the family vote Worker, against a stand-in key-value store.
//     node workers/family-votes/src/worker.selftest.mjs
import worker, { cleanDevice, ROUTE } from "./worker.js";

class FakeKV {
  constructor() { this.m = new Map(); }
  async getWithMetadata(k) { const e = this.m.get(k); return e ? { value: e.value, metadata: e.metadata } : { value: null, metadata: null }; }
  async put(k, value, opts = {}) { this.m.set(k, { value, metadata: opts.metadata || null }); }
  async delete(k) { this.m.delete(k); }
  async list({ prefix = "" } = {}) {
    const keys = [...this.m.entries()].filter(([k]) => k.startsWith(prefix)).map(([name, e]) => ({ name, metadata: e.metadata }));
    return { keys, list_complete: true };
  }
}

let failed = 0;
function check(label, ok) { if (!ok) { failed++; console.error("FAIL " + label); } else console.log("ok   " + label); }

const env = { VOTES: new FakeKV() };
const base = "https://yesandeverything.com" + ROUTE;
const A = "deviceAAAAAAAAAAAAAAAA", B = "deviceBBBBBBBBBBBBBBBB";
const post = body => worker.fetch(new Request(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env);

check("device id accepted", cleanDevice(A) === A);
check("short id refused", cleanDevice("abc") === null);
check("odd characters refused", cleanDevice("<script>aaaaaaaaaaaaaaa") === null);

let r = await post({ device: A, option: "npb-pair", value: 1 });
let j = await r.json();
check("vote saved", r.status === 200 && j.mine["npb-pair"] === 1 && j.tallies["npb-pair"].up === 1);
r = await post({ device: A, option: "npb-pair", value: -1 });
j = await r.json();
check("same device changes its vote", j.tallies["npb-pair"].up === 0 && j.tallies["npb-pair"].down === 1);
r = await post({ device: B, option: "npb-pair", value: -1 });
j = await r.json();
check("second device counts separately", j.tallies["npb-pair"].down === 2);
r = await post({ device: B, option: "npb-pair", value: 0 });
j = await r.json();
check("clearing the only vote removes the device", j.tallies["npb-pair"].down === 1 && !env.VOTES.m.has("tg26:d:" + B));
r = await post({ device: A, option: "not-a-listing", value: 1 });
check("unknown listing refused", r.status === 400);
r = await post({ option: "npb-pair", value: 1 });
check("missing device refused", r.status === 400);
r = await worker.fetch(new Request(base, { method: "POST", body: "x=1" }), env);
check("form post refused", r.status === 415);
r = await worker.fetch(new Request(base + "?device=" + A), env);
j = await r.json();
check("tally reads back with this device's votes", j.mine["npb-pair"] === -1 && j.tallies["npb-pair"].down === 1);
check("no device ids in the answer", !JSON.stringify(j).includes(A));
// A lagging list() must not hide a device's own vote from that device.
env.VOTES.list = async () => ({ keys: [], list_complete: true });
r = await worker.fetch(new Request(base + "?device=" + A), env);
j = await r.json();
check("own vote survives a lagging list", j.mine["npb-pair"] === -1 && j.tallies["npb-pair"].down === 1);
r = await worker.fetch(new Request("https://yesandeverything.com/thanksgiving-2026/api/other"), env);
check("other paths 404", r.status === 404);

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("family-votes self-test passed");
