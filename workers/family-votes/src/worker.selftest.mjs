// Offline self-test for the family vote Worker, against a stand-in key-value store.
//     node workers/family-votes/src/worker.selftest.mjs
import worker, { cleanName, voterKey, ROUTE } from "./worker.js";

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
const post = body => worker.fetch(new Request(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env);

check("name accepted", cleanName("  Mary Jo ") === "Mary Jo");
check("markup refused", cleanName("<b>x</b>") === null);
check("long name refused", cleanName("x".repeat(31)) === null);
check("key folds case", voterKey("Alexia") === voterKey("alexia"));

let r = await post({ name: "Alexia", option: "npb-pair", value: 1 });
let j = await r.json();
check("vote saved", r.status === 200 && j.me.v["npb-pair"] === 1);
r = await post({ name: "alexia", option: "jupiter-6br", value: -1 });
j = await r.json();
check("same person, second vote", j.voters.length === 1 && j.voters[0].v["jupiter-6br"] === -1 && j.voters[0].name === "Alexia");
r = await post({ name: "Brennan", option: "npb-pair", value: 1 });
j = await r.json();
check("two voters", j.voters.length === 2);
r = await post({ name: "Brennan", option: "npb-pair", value: 0 });
j = await r.json();
check("clearing the only vote removes the voter", j.voters.length === 1 && !env.VOTES.m.has("tg26:brennan"));
r = await post({ name: "Alexia", option: "not-a-listing", value: 1 });
check("unknown listing refused", r.status === 400);
r = await post({ name: "Alexia", option: "npb-pair", value: 5 });
check("bad value refused", r.status === 400);
r = await worker.fetch(new Request(base, { method: "POST", body: "name=x" }), env);
check("form post refused", r.status === 415);
r = await worker.fetch(new Request(base), env);
j = await r.json();
check("tally reads back", r.status === 200 && j.voters.length === 1 && !("key" in j.voters[0]));
r = await worker.fetch(new Request("https://yesandeverything.com/thanksgiving-2026/api/other"), env);
check("other paths 404", r.status === 404);

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("family-votes self-test passed");
