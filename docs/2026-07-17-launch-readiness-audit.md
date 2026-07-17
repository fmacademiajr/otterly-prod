# Otterly Launch Readiness

## 1. THE VERDICT

No. Six blockers stand between this build and a shipped app, and the worst one is silent: RevenueCat is configured with a null appUserID before auth resolves and never calls `logIn`, so every purchase lands on an anonymous RevenueCat id the backend can never match. The payer sees "You're in. Thanks for backing Otterly." and stays on the free tier forever. Money leaves, product never arrives, 100% of the time. Three more are hard App Store rejections (no account deletion, no privacy policy, Google-only login), one is irreversible the moment a build ships (the Emergent scaffold bundle id), and one is deception at the point of sale (a paywall selling three features that exist nowhere in the code). The app itself is in better shape than the blocker count suggests. Owner scoping is clean on all 11 data routes. The entitlement gate is server-side and never client-asserted. There is no nag mechanic, no guilt manufacture, no hard dead end in any screen. The engineering is sound. The shipping apparatus around it is not.

## 2. BLOCKERS

**1. No purchase ever grants premium.**
`frontend/src/lib/revenuecat.ts:38`. AuthProvider starts at `status: "loading"` with `user: null`, so `RevenueCatBootstrap` (`frontend/app/_layout.tsx:22`) fires first with `undefined` and configures RC anonymously, latching `configured = true`. The post-sign-in re-run bails at the guard. `logIn` appears nowhere in the repo. The webhook writes entitlements keyed on `app_user_id` (`backend/server.py:470`), `get_entitlement` reads `user_id` (`backend/server.py:232`). The lookup never matches.
Fix: replace `initRevenueCat` with an `identify()` that configures once then `logIn`/`logOut` on change, and gate the effect on `status !== "loading"` so the first configure carries the real id. Keep the `status !== "authed"` guard at `paywall.tsx:85`, it is what keeps purchases off anonymous ids given the webhook has no TRANSFER branch.
Size: 30 minutes to code. Verify in TestFlight: the RevenueCat customer must show your real `user_id`, and `GET /api/me/access` must return `premium: true`. The success toast lies today.

**2. Bundle id is the Emergent scaffold id, and it bakes permanently on first build.**
`frontend/app.json:13` and `:24` both read `com.emergent.otterlynext.u9tal9`. No `eas.json`, no `app.config.js`, no prebuild dirs, so app.json is the sole authority. `com.getotterly.app` appears nowhere in the repo. EAS auto-registers the id from app.json during credential setup, silently. Once published, a new id is a new app: orphaned installs, ratings from zero, IAP products recreated, receipts unrestorable across the boundary. The other branch is worse, `com.emergent.*` is a namespace Fernando does not own, and if Emergent claimed the prefix, registration fails outright.
Fix: set both lines to `com.getotterly.app` before the first `eas build`. Then register the App ID, create the Play listing, and bind the RevenueCat apps and three products to it.
Size: 2 minutes to edit. An hour for the console work. Do it first.

**3. No account deletion exists.**
`backend/server.py:399`. The app creates accounts (`auth/session` inserts email, name, picture at `server.py:354-361`, reachable from a live button at `you.tsx:110`). The only teardown is `/auth/logout`, which deletes one session row. Grep across all branches: no delete endpoint has ever existed. App Store 5.1.1(v) is a hard rejection. GDPR Art.17 failure over health-adjacent data.
Fix: add `DELETE /api/account` behind `require_user`. Two groups, because the key field is not uniform: delete by `owner` on tasks, steps, activity, room_messages, rate_counters; delete by `user_id` on entitlements, user_sessions, users (last). Do not use `{"owner": ...}` on the second group, those docs have no owner field and the query silently no-ops. Wire a confirm dialog in `you.tsx` next to signOut.
Size: 1 hour.

**4. No privacy policy, and undisclosed sharing to three processors.**
`frontend/app/(tabs)/you.tsx:93`. Braindump text, room chat, and task titles go to Anthropic via Emergent's key proxy (`server.py:265-272`). Voice audio uploads to `integrations.emergentagent.com` and on to OpenAI Whisper (`server.py:854-857`). Repo-wide grep for privacy, terms, policy: zero hits. Apple 5.1.1 gates submission on an in-app policy link for any data-collecting app, and this one collects email, voice, and mental-health-adjacent free text.
Fix: write the policy naming Emergent, Anthropic and OpenAI, what each receives, and retention. Link it from the settings group in `you.tsx` and from `onboarding/welcome.tsx`. Two `Linking.openURL` rows.
Size: 3 hours for the policy, 15 minutes for the links. The Play Data Safety form and Apple nutrition label are console work, not verifiable from the repo, track separately.

**5. Google-only login. Guideline 4.8.**
`frontend/src/auth/AuthProvider.tsx:106`. `signIn()` opens `auth.emergentagent.com` and is the only auth path. `you.tsx:114` renders the literal string "Sign in with Google", so the 4.8 exemption for a developer's own sign-in system cannot be claimed. No `expo-apple-authentication`. Purchases sit behind `status === "authed"` (`paywall.tsx:85`), so a blocked reviewer also cannot test IAP, inviting a second rejection under 2.1. This is deterministic, not a coin flip, the reviewer sees the login screen on first launch.
Fix: add Sign in with Apple alongside Google on iOS. Do not route it through `api.exchangeSession`, that posts to `/api/auth/session` which hands the token to Emergent's demobackend as an `X-Session-ID` header and will 401 an Apple JWT every time. You need a new `POST /api/auth/apple` that verifies the identity token against `appleid.apple.com/auth/keys` (signature, iss, aud, exp), then reuses the session-store logic at `server.py:363-374`. Key on Apple's `sub`, not email. Apple returns email only on first authorization, and `auth_session` hard-fails without it (`server.py:339-340`), so an email-keyed path 400s on every re-auth. Capture `fullName` on that first call too or the display name is permanently empty.
Size: a full day. This is the largest blocker.

**6. The paywall sells three features that do not exist.**
`frontend/app/paywall.tsx:51-53`. "Customizable micro-step workflows & templates", "Detailed progress insights & mood tracking", "Exclusive gentle sounds and ambient backgrounds". The strings template, workflow, ambient, mood, insight appear nowhere in the codebase except these three lines. expo-audio is record-only, zero playback. The one progress surface that exists (`/streak`, `server.py:935`) has no entitlement check and is free. Meanwhile the paywall never mentions Deep Shrink, the one genuinely gated premium feature (`server.py:641`). Reachable from `you.tsx:125` and `shrink/[id].tsx:157`.
Fix: replace the array with what `server.py` gates. Unlimited focus companions, Deep Shrink, unlimited shrinks/braindumps/voice notes, unlimited room time, ad-free. Drop "progress insights" entirely, do not reword it, the streak is free. Confirm the App Store Connect product descriptions carry the same bullets, or the false claim just moves one surface over.
Size: 10 minutes.

## 3. SHOULD-FIX BEFORE LAUNCH

**No `eas.json`.** Nothing in this repo can build or submit today. `npx eas-cli login` then `build:configure` in `frontend/`, after the bundle id edit. Hand-add the `submit.production` block, `build:configure` does not write one. 20 minutes.

**Sessions hard-expire at 7 days with no refresh.** `backend/server.py:364`. Every signed-in user hits a blank anonymous inbox on a fixed timer, because sign-in already migrated their data to `user_id` (`server.py:379-382`) and the TTL index at `:973` reaps the session doc outright. This is a server deploy, not a binary release, so ship the app and deploy the slide before cohort 1 reaches day 7. In `resolve_owner` after `:194`, if `expires < now + 6d`, push `expires_at` to `now + 7d`. The 6-day threshold caps the write at once per user per day. 15 minutes.

**Otterly stores a third party's token as its own session credential.** `backend/server.py:343`. `server_token = data.get("session_token") or payload.session_token`. Replace with `secrets.token_urlsafe(32)` so the bearer secret is Otterly's own. Also wrap the httpx call at `:333-336` in try/except and raise 503, right now a demobackend outage returns 500. Move `EMERGENT_SESSION_DATA_URL` to an env var. Side effect to accept: the upsert at `:366` keys on `session_token`, so a random token always inserts. Harmless, sessions expire in 7 days. Separately, ask Emergent whether that host is production-backed and whether session ids are scoped per app. That is diligence, not code, and no edit here removes the dependency. 20 minutes.

**Device id comes from `Math.random`.** `frontend/src/lib/identity.ts:20`. It is the sole bearer credential for every anonymous user and the server trusts it raw (`server.py:197-198`). `npx expo install expo-crypto`, use `Crypto.randomUUID()`, drop the unused `uuid` dep at `package.json:62`. Existing installs keep their stored id. 5 minutes.

**The webhook revokes premium on a billing hiccup and never enforces expiry.** `backend/server.py:481`. `is_active = event_type in active_types` means BILLING_ISSUE writes `active = False` while the store still keeps the customer entitled through grace. Mirror defect: `get_entitlement` (`:236`) never reads `expires_at_ms`, so every CANCELLATION is one dropped EXPIRATION webhook away from permanent free Opus. Invert the classifier so only EXPIRATION revokes and unknown types early-return untouched, and make expiry authoritative in `get_entitlement`. 30 minutes.

**Free-tier caps are decorative, and `/next` has no cap at all.** Root cause: `owner_id` is a client-chosen header (`server.py:198`), so a script rotates it for a fresh quota. `/next` (`server.py:755`) never calls `check_rate` at all and loops on a stable id forever. Lead with the platform, not the app: set a hard spend cap and billing alert on `EMERGENT_LLM_KEY`. No header rotation beats that, and it covers all five routes at once. If it turns out Emergent already caps that key, most of this drops to post-launch. Then add a `"next": 30` counter that falls back to the pure-DB pick at `:785` instead of 429ing, and fix the "unlimited next-picks" comment at `:10` or the next reviewer re-blesses the hole. Skip the per-IP cap, PH carriers run heavy CGNAT and it would false-block real users. 45 minutes.

**Braindump, room, and task text are unbounded.** `backend/server.py:124`, `:135-136`, `:81-82`. Add `max_length` to all four. Optional fields must keep `default=None` explicitly or Field makes them required: `goal: Optional[str] = Field(default=None, max_length=200)`. Getting that wrong 422s every room message after the first and takes the Room down. 10 minutes.

**`/transcribe` reads the whole upload into RAM before any check.** `backend/server.py:848`. Starlette does not cap file parts. Add `if audio.size and audio.size > 25*1024*1024: raise HTTPException(413)` above the read. 25MB is whisper's own ceiling. 5 minutes.

**`/next` dies when the LLM does.** `backend/server.py:776`. `_llm_json` only catches `json.JSONDecodeError`, so any 429 or timeout returns 500 and the post-onboarding home screen shows "Otterly couldn't reach the server" while shrunk steps sit in Mongo. The deterministic fallback already exists nine lines down, and `shrink` already applies this exact rule at `:692-695` with the author's own comment "Never hard-fail when good steps exist." Wrap the call, collapse the no-step_id and unknown-step_id cases into the existing `min(candidates, ...)` fallback. Highest-value 3 lines in the audit. 15 minutes.

**Shrink screen reports a network failure as "No steps yet."** `frontend/app/shrink/[id].tsx:53`. try/finally with no catch. The screen asserts the task legitimately has no steps, and every recovery affordance is gated on `steps.length > 0`. Add a catch that sets a `"reload"` banner routing back to `load()`. Do not route it to `doShrink`, that deletes and regenerates existing unfinished steps (`server.py:699`) and burns a shrink from the cap. 20 minutes.

**First-run shrink fails silently.** `frontend/app/onboarding/firstshrink.tsx:52`. try/finally, no catch. Any 5xx or cold-start timeout, not just offline, leaves the button flickering with no message on the first thing a new user ever does. Copy the pattern already in `inbox.tsx:56-62`. 10 minutes.

**Step timer counts JS ticks, not wall-clock.** `frontend/app/shrink/[id].tsx:179`, duplicated at `:197`. iOS suspends the JS thread on background, so the countdown freezes for exactly the time the user spends doing the step. Leaving the app is the success path here. Store a deadline ref, compute from `Date.now()`, add an AppState listener. Fix the shared helper, not just `startTimer`, or resume stays broken. 45 minutes.

**`create_task` is the only unguarded free-text sink.** `backend/server.py:501`. Braindump and Room both check `SELF_HARM_RE`. Quick-add (the default Inbox mode), voice, and onboarding first-shrink all reach `create_task` raw. Type "I want to die, I can't do any of this", get a to-do row. Guard once in `create_task` so all three inherit it. Do not add `referral` to `Task`, `server.py:504` inserts `task.dict()` into Mongo and it would persist into every doc. Use a separate `TaskCreated(Task)` response model. The client render block already exists at `inbox.tsx:252-260`. 30 minutes.

**The crisis screen contradicts the backend on the UK number.** `frontend/app/crisis.tsx:17` says 111. `server.py:310` and `:889` both say 116 123. A UK user reads one number in the Room reply and sees a different one on the crisis screen. Both reach real help, NHS 111 has a mental-health option, so file this on the contradiction alone, not on "wrong number". One line: `number: "116 123", tel: "116123"`. 1 minute. Do this first, it is the cheapest thing in the report.

**The Reminder time field is wired to nothing.** `frontend/app/(tabs)/you.tsx:173-185`. Persists to storage, nothing ever reads it, `expo-notifications` is not installed. Delete the row (172-185), the state at `:31`, the read at `:42-43`, the write at `:52-54`. Remove the divider at 172, not 186. 5 minutes.

**Paywall prices are hardcoded USD.** `frontend/app/paywall.tsx:179`. `pkg.product.priceString` is never read, so a PH user sees "$4.99" and Apple's sheet shows a PHP tier price. Otterly targets PH, so this hits the core audience. `{pkg?.product?.priceString ?? p.price}`. Also drop or compute "Save 50%" at `:44`. 10 minutes.

**Mic string implies on-device dictation.** `frontend/app.json:15`. Name the egress without promising retention Fernando does not control: "Otterly turns voice notes into text using a transcription service outside the app. Otterly does not keep the recording." Android has no purpose-string surface, so add one static line under the mic row at `inbox.tsx:215`. 5 minutes.

**Raw LLM output logged at WARNING reaches Sentry.** `backend/server.py:291`. Default LoggingIntegration turns it into a breadcrumb on the 502 raised the next line. Braindump-derived content leaves the box to a fourth undisclosed processor. Log `len(raw)` and the error only. Fixes the plaintext platform logs in the same edit. 1 minute.

## 4. POST-LAUNCH

- `/auth/session` migrates any device's data on an unproven `device_id` claim (`server.py:377`). No cheap correct fix exists, the header-match idea is theater. Real fix is server-minted anonymous identity, which also closes the pre-existing read exposure.
- Room transcripts retained forever with no per-conversation clear (`server.py:903`). Account deletion gives the data its exit, this is granularity on top.
- Failed delete silently ignores the tap (`inbox.tsx:87`). Next focus reload reconciles.
- No export compliance key, so every upload parks on "Missing Compliance" (`app.json:11-16`). Add `"config": { "usesNonExemptEncryption": false }`.

## 5. WHAT I COULD NOT ASSESS

This audit read code. It ran nothing.

- **`backend/tests/test_otterly_api.py` never ran.** It is an integration suite against a live `BASE_URL` and has never been executed in this environment. The unit and wiring tests are green, and they do not touch any of this.
- **No device build exists.** Nobody has run `eas build`, because no `eas.json` exists to build with. Everything about the native surface (StoreKit product resolution, App Attest, the mic permission prompt, notification entitlements) is inferred from config files.
- **No real payment has ever completed.** The RevenueCat blocker is traced through code, not observed. `IOS_KEY` is absent from the tree, so `canRunNativeIAP` is false and IAP is inert today regardless. Whether the three products exist under the right offering is unverified.
- **The Emergent auth handshake was never exercised.** I probed `demobackend.emergentagent.com` and got a 404 for a bogus session id. That says the host is live. It says nothing about whether session ids are scoped per app. The cross-app impersonation question is open and only Emergent can answer it.
- **`EMERGENT_LLM_KEY` spend caps are unknown.** Nothing in the repo says whether Emergent bounds spend on that key. That single unknown decides whether the abuse findings are a launch-week item or a footnote. Check the dashboard.
- **Console state is invisible from here.** The Play Data Safety declaration, the Apple privacy nutrition label, whether `com.getotterly.app` is actually registered, and whether the App Store Connect product descriptions match the paywall are all asserted nowhere in this repo.
- **No `.env` in the tree.** Sentry DSN, RevenueCat keys, webhook secret. If `REVENUECAT_WEBHOOK_SECRET` is unset in prod, the webhook 401s everything and the entire entitlement path is dead, not merely buggy.
- **No proxy or ingress config in the repo.** `.emergent/emergent.yml` is three fields. Whether anything in front of the API caps request bodies or rate-limits is unknowable from source.

A clean dimension verdict here means "I read every line of that path and found no defect." It does not mean anyone watched it work.

## 6. THE ORDER

If he has one day:

1. **Bundle id, `app.json:13` and `:24` → `com.getotterly.app`.** Two lines, first, before anything else touches EAS. It is the only irreversible item in the report, and `eas build:configure` bakes it into the project the moment it runs. Everything downstream registers under the right identity.
2. **`eas build:configure`, then register the App ID and Play listing.** If registration collides, he needs to know now, not after a day of code.
3. **RevenueCat `logIn`, 30 minutes.** Do it while the App Store Connect record is being created, because verifying it needs a TestFlight build and a real purchase, and that is the longest feedback loop in the day. Start the clock early.
4. **The one-line safety and honesty fixes, batched: UK number, paywall bullets, mic string, Sentry log line, `expo-crypto`, dead Reminder row.** Twenty-five minutes total, and they clear two blockers' worth of exposure. Do them together while the first build compiles.
5. **`DELETE /api/account`, 1 hour.** Backend, deploys independently, blocks submission.
6. **Privacy policy plus the two links, 3 hours.** The writing is the slow part and nothing else waits on it. Hand it off or draft it while builds run.
7. **Sign in with Apple, the rest of the day.** It is the largest blocker and the only one that needs a new backend endpoint plus a config plugin plus an entitlement. Leaving it last is deliberate: if the day runs out, this is the one that slips, and it slips alone rather than dragging five cheaper fixes with it.
8. **Backend hardening in whatever remains, in this order:** session slide (`server.py:364`), `/next` fallback (`:776`), `secrets.token_urlsafe` for the session token (`:343`), webhook classifier inversion (`:481`), `max_length` fields, transcribe size check. All server-side, all deployable after the binary ships, none of them gate submission.
9. **Set the spend cap on `EMERGENT_LLM_KEY` in the Emergent dashboard.** Five minutes, bounds every abuse finding absolutely, and no amount of app code substitutes for it.

The logic: irreversible first, then long-feedback-loop, then one-line wins while things compile, then the big build. The frontend reliability fixes (shrink screen, timer, firstshrink) are real and worth a second day, but none of them stops a launch and all of them need a new binary anyway.