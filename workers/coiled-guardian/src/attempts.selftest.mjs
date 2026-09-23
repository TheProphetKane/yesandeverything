// Self-test for the gate attempt counter (bar-raise security-03).
//
//   node workers/gated-docs/src/attempts.selftest.mjs
//
// Both gates paid a flat 600 millisecond cost per wrong password and kept no
// state, so a run from one address could keep guessing all day and nothing
// recorded that it happened. These pin the counter's contract, including the
// two parts that matter more than the counting: it fails open when the store
// is unreachable, and a correct password clears the count.

import {
  ATTEMPT_MAX, ATTEMPT_WINDOW_S, clearFailures, lockedOut, recordFailure,
} from "./attempts.mjs";

let failures = 0;
const ok = (name, cond) => {
  console.log(`  ${cond ? "ok   " : "FAIL "} ${name}`);
  if (!cond) failures++;
};

// A key-value stand-in. `broken` makes every call throw, which is the outage case.
function store({ broken = false } = {}) {
  const m = new Map();
  return {
    m,
    get: async (k) => { if (broken) throw new Error("kv down"); return m.has(k) ? m.get(k) : null; },
    put: async (k, v) => { if (broken) throw new Error("kv down"); m.set(k, v); },
    delete: async (k) => { if (broken) throw new Error("kv down"); m.delete(k); },
  };
}

const req = (ip = "203.0.113.7") => new Request("https://example.invalid/x/login", {
  method: "POST",
  headers: { "cf-connecting-ip": ip },
});

// --- counting ---------------------------------------------------------------
{
  const kv = store();
  ok("a fresh caller is not locked out", (await lockedOut(kv, "doc", req())) === false);

  let n = 0;
  for (let i = 0; i < ATTEMPT_MAX; i++) n = await recordFailure(kv, "doc", req());
  ok(`${ATTEMPT_MAX} wrong passwords count up to the allowance`, n === ATTEMPT_MAX);
  ok("and the caller is locked out at the allowance", (await lockedOut(kv, "doc", req())) === true);
}

// --- one caller's count is their own -----------------------------------------
{
  const kv = store();
  for (let i = 0; i < ATTEMPT_MAX; i++) await recordFailure(kv, "doc", req("203.0.113.7"));
  ok("a second address is unaffected by the first's lockout",
    (await lockedOut(kv, "doc", req("198.51.100.4"))) === false);
}

// --- one document's count is its own ------------------------------------------
{
  const kv = store();
  for (let i = 0; i < ATTEMPT_MAX; i++) await recordFailure(kv, "hordes", req());
  ok("a lockout on one document does not lock the other",
    (await lockedOut(kv, "cg", req())) === false);
}

// --- a correct password clears it ---------------------------------------------
{
  const kv = store();
  await recordFailure(kv, "doc", req());
  await recordFailure(kv, "doc", req());
  await clearFailures(kv, "doc", req());
  ok("a correct password clears the count, so two typos do not follow the reader",
    (await recordFailure(kv, "doc", req())) === 1);
}

// --- the outage case ----------------------------------------------------------
{
  const broken = store({ broken: true });
  ok("an unreachable store never locks anybody out", (await lockedOut(broken, "doc", req())) === false);
  ok("and recording a failure against it does not throw", (await recordFailure(broken, "doc", req())) === 0);
  await clearFailures(broken, "doc", req());   // must not throw
  ok("no store at all is the same as an unreachable one", (await lockedOut(null, "doc", req())) === false);
}

// --- the window rolls over -----------------------------------------------------
{
  const kv = store();
  const real = Date.now;
  try {
    for (let i = 0; i < ATTEMPT_MAX; i++) await recordFailure(kv, "doc", req());
    ok("locked out inside the window", (await lockedOut(kv, "doc", req())) === true);
    const later = real() + (ATTEMPT_WINDOW_S + 5) * 1000;
    Date.now = () => later;
    ok("and free again in the next window", (await lockedOut(kv, "doc", req())) === false);
  } finally {
    Date.now = real;
  }
}

console.log(failures === 0 ? "\nselftest passed" : `\nselftest FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
