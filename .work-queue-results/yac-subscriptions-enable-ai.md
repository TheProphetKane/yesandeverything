# yac-subscriptions-enable-ai - verification pass, 2026-06-11 overnight drain

## Finding: code side is DONE. Remainder is entirely the activation runbook, all user-side.

Everything this gate needs in the repo shipped in 0.32.0 and is verified present:

- Worker billing endpoints live at the dispatcher (worker/src/index.js:267-271):
  POST /api/billing/checkout, /api/billing/portal, /api/billing/webhook.
  Handlers return 503 not_configured until Stripe env vars exist; stub mode is
  the documented default, so deploying changed nothing user-visible.
- Subscription gate in the recommender path (worker/src/index.js:4297):
  enforcement keyed on SUBSCRIPTION_GATE_ENFORCE === "true", off by default.
- Frontend gate complete: src/subscription.ts (227 lines) - cached state,
  loadMySubscription, requireSubscriptionOrPrompt, upgrade modal, startCheckout,
  openBillingPortal, auth-change refresh. Wired into src/caddy.ts (line 70).
- Migration file exists: supabase/migrations/0016_subscription.sql (additive,
  idempotent: 3 profile columns, unique index on stripe_customer_id,
  my_subscription_status() function).
- Runbook exists: docs/stripe-setup.md, paste-ready, 6 steps.
- Final flip: src/caddy.ts:62 `export const CHAINS_VISIBLE = false` (Decision 28).

## Verified NOT done (read-only, via Supabase MCP, project byghvbfpsteqovuhseay)

public.profiles has NO subscription_status, subscription_renews_at, or
stripe_customer_id columns. Migration 0016 is NOT applied. Notably 0017
(course_admins + course_admin_requests) IS applied, so 0016 was skipped
deliberately, consistent with the feature staying hidden.

Worker secrets state could not be read from the sandbox (Cloudflare MCP
workers_get_worker errored; live-probe of the 503/400 config tell is blocked by
fetch provenance rules). Irrelevant to sequencing: with 0016 unapplied, webhook
sync has no columns to write, so the gate cannot be activated regardless of
secrets state.

## Why no autonomous slice was taken

Applying 0016 to production Supabase is the obvious next step, but the YaC
ROADMAP escalation block lists Supabase migrations as escalate-to-Nick, and the
queue item yac-mnew-roadmap-escalation-clarify confirms that policy is still on
the books pending Nick's call. Flipping CHAINS_VISIBLE is a product-launch
decision (Decision 28). Stripe product creation and wrangler secrets need
account access the agent does not have. Agent-side units are exhausted.

## Remainder (Nick, ~30 min, docs/stripe-setup.md in order)

1. Stripe dashboard: create Chains AI product + recurring price (test mode
   first); copy price ID + secret key.
2. Apply supabase/migrations/0016_subscription.sql (dashboard SQL editor;
   verified idempotent).
3. wrangler secret put x5: STRIPE_SECRET_KEY, STRIPE_PRICE_ID,
   STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
4. Point Stripe webhook at https://caddy-api.theprophetkane.workers.dev/api/billing/webhook.
5. Smoke test in stub mode, then SUBSCRIPTION_GATE_ENFORCE=true.
6. Flip CHAINS_VISIBLE to true in src/caddy.ts (one line), release.

After step 6 both 92-percent-to-done gate items (this + yac-store-launch) are
in the same state: agent work exhausted, launch actions pending.
