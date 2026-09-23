// Per-visitor attempt counting for a password gate (bar-raise security-03).
//
// Both gates already pay a flat 600 millisecond cost per wrong password, which
// makes a guessing run expensive without keeping any state. That is the right
// floor and it is not a ceiling: a run from one address can still spend all day
// at roughly ninety guesses a minute, and nothing anywhere records that it
// happened.
//
// This adds the counter, and keeps it deliberately small. A fixed window per
// address, a count, and a lockout once the count passes the allowance. Fixed
// rather than rolling, because a rolling window needs a list of timestamps per
// caller, which is a second stored value and a second thing to get wrong, and
// the failure mode of the loose direction here is a few extra guesses while the
// failure mode of the tight direction is locking out the one person who owns the
// document.
//
// It fails OPEN. A key-value outage must not lock the author out of their own
// book, and the 600 millisecond delay is still there underneath as the floor
// this was only ever meant to raise.

export const ATTEMPT_MAX = 8;          // wrong passwords allowed inside one window
export const ATTEMPT_WINDOW_S = 900;   // fifteen minutes
export const LOCKOUT_S = 900;          // and how long the lockout lasts

function keyFor(scope, req, window) {
  const who = req.headers.get("cf-connecting-ip") || "unknown";
  return `gate:attempts:${scope}:${who}:${window}`;
}

/* Is this caller locked out right now? Called before the password is checked,
 * so a locked-out caller never reaches the comparison at all. */
export async function lockedOut(kv, scope, req) {
  if (!kv) return false;
  const window = Math.floor(Date.now() / 1000 / ATTEMPT_WINDOW_S);
  try {
    const n = Number((await kv.get(keyFor(scope, req, window))) || "0");
    return n >= ATTEMPT_MAX;
  } catch {
    return false;   // fail open: an outage must not lock the author out
  }
}

/* Record one wrong password. Returns the new count, or 0 when it could not be
 * recorded, so the caller can log a lockout without a second read. */
export async function recordFailure(kv, scope, req) {
  if (!kv) return 0;
  const window = Math.floor(Date.now() / 1000 / ATTEMPT_WINDOW_S);
  const key = keyFor(scope, req, window);
  try {
    const n = Number((await kv.get(key)) || "0") + 1;
    await kv.put(key, String(n), { expirationTtl: LOCKOUT_S + ATTEMPT_WINDOW_S });
    return n;
  } catch {
    return 0;
  }
}

/* Clear the count on a correct password, so somebody who mistyped twice and
 * then got it right does not carry those two into their next visit. */
export async function clearFailures(kv, scope, req) {
  if (!kv) return;
  const window = Math.floor(Date.now() / 1000 / ATTEMPT_WINDOW_S);
  try {
    await kv.delete(keyFor(scope, req, window));
  } catch {
    // Nothing to do. The count expires on its own.
  }
}
