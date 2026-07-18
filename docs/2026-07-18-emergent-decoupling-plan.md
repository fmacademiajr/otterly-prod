# Emergent decoupling plan — launch Otterly on our own stack

Written 2026-07-18. Stress-tested with an Opus + Fable adversarial pass (see the
attribution at the bottom). The blocker is Emergent credits, not code. The
standard plan is exhausted, the app burns credits daily, and the production
backend lives on Emergent, so no credits means no reachable backend and no
launch. This plan gets Otterly off the credit meter and shipped.

## What is verified

The coupling below was grepped against the real `otterly-prod` repo on
2026-07-18, not assumed. The line numbers and call sites are confirmed. The
review pass could not see the repo and flagged a wrong-codebase risk because old
project memory records an Expo/Supabase/Gemini Otterly. That older build is a
different project. This one is FastAPI + MongoDB + Emergent + Claude + Whisper,
confirmed in code.

## The coupling is shallow in logic, but it reaches the dependency graph too

Three runtime call sites, plus two dependency-source hooks that the "three call
sites" framing missed until the review caught them.

| Hook | Where | Action |
|---|---|---|
| Claude call | `server.py:315` `LlmChat(api_key=EMERGENT_LLM_KEY)` | Rewrite to a direct call. |
| Whisper call | `server.py:1150` OpenAI SDK + `base_url=".../emergentagent.com/llm"` | Change key, drop base_url. |
| Google auth | `server.py:390` exchanges an Emergent token at `demobackend.emergentagent.com` | Ship Apple-only, idle it. |
| `emergentintegrations` import | `server.py:42` top-level, unconditional | Remove the import entirely. |
| `litellm` package source | `requirements.txt:56` pinned to a `customer-assets.emergentagent.com` wheel | Repin to PyPI, or drop for the `anthropic` SDK. |

The last two matter. Leaving Google idle does not decouple, because the
`emergentintegrations` import runs at module load whether or not the endpoint is
called, and `litellm` installs from an Emergent-hosted URL. On a new host without
Emergent's package index, `pip install` or app boot can fail. The Claude swap has
to remove both, not just the call.

## Apple auth is already ours, and already secure

Confirmed in code, `server.py:447`. The Apple path verifies the identity token
signature against Apple's JWKS (`PyJWKClient`), checks `audience=com.getotterly.app`
and `issuer=appleid.apple.com`, verifies exp/iat, catches only `PyJWTError` so no
signature-skip can hide, keys on Apple's `sub`, and mints its own
`secrets.token_urlsafe(32)` session. Zero Emergent calls.

This resolves what the review flagged as security risks. The weak reused-token
credential exists only on the Google path (`server.py:343`). Shipping Apple-only
idles that path, so launch ships the strong-token flow and never the weak one.
Apple-only is more secure here, not a shortcut.

## The premise tension, resolved honestly

The review's sharpest catch: "no credits means no backend" collides with "export
the Mongo data from Emergent." If the backend is already dead you cannot dump the
data. If you can dump it, the backend is not fully dead.

Resolution: extract the data FIRST, before anything else. A one-time minimal
top-up purely to run a `mongodump` is acceptable and is not the same as staying
on the meter. You pay once to get your data out, then you are gone. If there is
no production data worth keeping (few or no real users yet), skip the export and
start Atlas clean. Confirm which before you spend a cent.

## Cost

Fixed cost drops to near zero. Variable cost is real and worth naming, the review
was right that "near zero" only described fixed cost.

- Host: Railway a few dollars a month, or Fly's free allowance.
- MongoDB: Atlas free M0 tier, zero.
- Whisper: 0.006 USD per audio minute. A 15s note is 0.0015 USD.
- Claude: depends on the model. A Sonnet-class shrink or Room turn runs roughly
  0.005 to 0.01 USD. A heavy daily user (5 shrinks, 10 Room turns, a few voice
  notes) lands around 0.05 to 0.15 USD per active day. Model choice is the lever,
  a Haiku-class model for the Shrinker cuts that severalfold.

At launch scale (tens of users) that is a few dollars a day, capped by us, and
cheaper than Emergent. At real scale it grows with engagement, so the spend cap
and model choice are the cost controls, not an afterthought.

---

## TIER 1 — the minimum to launch (do now, in this order)

### 0. Get the data out first
Confirm the Emergent Mongo is reachable. If it holds real users, run `mongodump`
now (top up minimally if that is the only way to reach it). If it holds nothing
worth keeping, note that and start Atlas empty. Do this before any other step.

### 1. Own keys, with alerts not just caps
Anthropic key at console.anthropic.com, OpenAI key at platform.openai.com. Set a
spend cap AND an alert threshold below it. A bare cap hard-fails: hit it mid-month
and voice plus the coach die for every user at once with no fallback. The alert
makes the cutoff a decision, not a surprise. Consider a soft "try again in a bit"
path in the app for a 429, the Shrinker already has a deterministic fallback to
lean on.

### 2. Swap Whisper (2 lines)
`server.py:1150`. Real OpenAI key, delete the `base_url` line. The SDK call shape
does not change.

### 3. Swap Claude, and cut the dependency (one function + requirements)
`server.py:315`. Replace `LlmChat` with a direct `anthropic` SDK call (cleaner and
smaller than litellm). Remove the `server.py:42` import. In `requirements.txt`,
drop `emergentintegrations` and the Emergent-hosted `litellm` wheel, add
`anthropic` from PyPI. This is not purely mechanical: `emergentintegrations` pins
a specific Anthropic model version and has its own message and system-prompt
handling, and Otterly's retrained persona (charge dial, emotion-first intro) is
sensitive to exactly that. Pin the model id explicitly and confirm the message
and system-prompt shape against the live Anthropic API reference at
implementation time.

### 4. Ship Apple-only auth, and hide the Google button
Server side is done (see above). The client must remove or hide the Google
sign-in button, or App Review rejects a visibly broken auth option. Decide on
existing Google users: if any real ones exist (beta testers count), they get
orphaned by an Apple-only launch, their `user_id` and entitlement become
unreachable. Either accept that loss explicitly or add account linking. Confirm
whether any exist before deciding.

### 5. Pick ONE durable host and finalize the backend domain BEFORE building
`EXPO_PUBLIC_BACKEND_URL` is compiled into the app bundle at EAS build time.
After you build and submit, you cannot change it without a new build and another
App Store review. So the backend URL must be final before the build.

Use Railway or Fly, not the VPS. The 4GB VPS already runs Hermes, content-engine,
and the dashboard under a shared-session board, and it gets stopped and
experimented on. Co-hosting a consumer app's production uptime there invites
outages unrelated to Otterly. Keep it off that box.

Point the build at a stable domain you control, `api.getotterly.com`, via a CNAME
to the host or a Cloudflare Tunnel. Never bake a `*.up.railway.app` or
`*.fly.dev` host URL into the build, that welds you to one host forever.

### 6. MongoDB to Atlas
Create a free M0 cluster. Import the dump from step 0 (or start clean). Point
`MONGO_URL` at it. The startup index migration runs itself on first boot, verify
the full index catalogue survives (the cascade bug there is fixed on main).

### 7. Repoint RevenueCat, set secrets, then build
- In the RevenueCat dashboard, repoint the webhook URL to
  `https://api.getotterly.com/api/webhooks/revenuecat`. Miss this and purchases
  succeed but premium never grants.
- Set `REVENUECAT_WEBHOOK_SECRET`, the `appl_` RevenueCat key, and your own
  Sentry DSN on the new host. Sentry is Tier 1, not later: launching on a brand
  new host with zero error visibility is flying blind through the riskiest hour.
- Set `EXPO_PUBLIC_BACKEND_URL=https://api.getotterly.com` in the EAS build env.
- Build and submit per `frontend/EAS-SETUP.md`.

### Tier 1 exit test
- App on a device reaches the new backend. Shrink, Room, Braindump all return.
- Shrink a real task end to end and read the steps. Confirm the coach tone and
  step quality match the current build, the Claude swap is the riskiest rewrite
  and "it returned something" is not the test. This IS the product.
- A voice note transcribes (Whisper on the real OpenAI key).
- Sign in with Apple works, sign out, sign in again, same account.
- A TestFlight sandbox purchase grants premium with the real `user_id`, not
  `$RCAnonymousID`, and `GET /api/me/access` returns `premium: true`.
- Grep the new host's logs for `emergentagent.com`. Zero hits, or something is
  still calling home.

---

## TIER 2 — after launch, no rush

- Self-owned Google OAuth. Stand up our own client, replace the exchange at
  `server.py:390`, restore the Google button, retire `demobackend.emergentagent.com`.
- Delete the reused-token path at `server.py:343` once Google is off Emergent
  (Apple already mints strong tokens, so this is cleanup, not a live risk at an
  Apple-only launch).
- Delete the `.emergent/` directory. Verified disposable: no server-side
  scheduler exists, `.emergent/cron` is generic Emergent webhook-dispatch
  scaffolding with no Otterly jobs registered, and reminders are not wired to any
  notification path on the client. Nothing of ours rides it.

---

## The honest risk on speed

The earlier claim that this is "1 to 2 days with no extra risk" was too clean, and
the review was right to hit it.

- App Store review adds 1 to 3 or more days after the build, and can reject. So
  migration time is not launch time. Budget for the review queue.
- This changes the host, the LLM provider, the transcription provider, the auth
  surface, and the database at once. If launch breaks, the cause is spread across
  five subsystems and hard to isolate.

De-risk it by not making the store build the first test. Stand up the new backend,
do the Claude and Whisper swaps, and drive the app against
`https://api.getotterly.com` from a local or internal preview build FIRST. Get the
exit test green off the critical path. Only then cut the production store build.
That turns a big-bang into a staged migration where the store submission is the
last known-good step, not the moment of discovery.

Net: the direction is sound, topping up buys a dying asset, and the coupling is
genuinely thin. But sequence it. Data out first, host and domain finalized before
the build, LLM swap proven behaviorally, and the store build last.

---

## Review attribution

Stress-tested 2026-07-18 with `fable-ab-verify` (Opus 4.8 primary + Claude Fable 5
second opinion, Opus reconciler). Both passes agreed the direction is right and
the artifact as first drafted was not safe to execute. Folded in: the data-egress
premise conflict, the build-time-baked backend URL, the import-graph and
pip-source coupling, spend-cap hard-fail, the Claude persona regression risk,
Sentry and the RevenueCat webhook repoint promoted to Tier 1, the shared-VPS
option dropped, and the softened speed claim. Fable's two unique catches (Apple
JWKS signature/audience verification, and the transitive litellm dependency) were
verified against the code: the Apple path already verifies correctly, and the
litellm repin is now explicit in step 3. The "cron kills reminders" concern was
checked and cleared, no such cron exists here.
