# Handoff to Emergent — Otterly, App Store submission

**Read this before touching the repo.** It records what changed on 2026-07-17, why, and the decisions behind it. Several changes look arbitrary and are not. One of them is irreversible if you undo it.

Baseline before this session: `55a6c84`. Everything below is on `main` unless noted.

---

## 0. THE ONE THING YOU MUST NOT UNDO

**`frontend/app.json` bundleIdentifier and package MUST read `com.getotterly.app`.**

They previously read `com.emergent.otterlynext.u9tal9` — a scaffold id, in a namespace Fernando does not own. Changed in `310803f`.

Why this is different from every other change here:

- `eas build:configure` registers this id on the App ID **silently**, during credential setup.
- Once published, the id is **permanent**. Changing it later does not update the app; it creates a *different* app. Orphaned installs, ratings reset to zero, IAP products recreated, receipts unrestorable across the boundary.
- If Emergent owns the `com.emergent.*` prefix, registration under it would fail outright.

**If any regeneration of `app.json` reverts this, stop and fix it before running `eas build`.** Check:

```
grep bundleIdentifier frontend/app.json     # must be com.getotterly.app
```

Also in `ios`: `"config": { "usesNonExemptEncryption": false }`. Without it every upload parks on "Missing Compliance".

---

## 1. Ship state

### Blockers cleared

| ID | What it was | Commit |
|---|---|---|
| B1 | Scaffold bundle id, permanent once built | `310803f` |
| B2 | **No purchase ever granted premium** | `310803f` |
| B3 | No account deletion (Apple 5.1.1(v)) | `ec5ea83` |
| B6 | Paywall sold three features that do not exist | `ec8a1ae` |
| N1 | Webhook **revoked** premium from paying customers | `a50ad2e` |
| N2 | A dropped EXPIRATION meant premium forever | `a50ad2e` |

### Still open — these block submission

| ID | What | Owner |
|---|---|---|
| B4 | Privacy policy is written (`docs/privacy-policy.md`) but **not hosted**, and not linked in-app | Fernando + this repo |
| B5 | **Sign in with Apple** — Guideline 4.8. Google-only login is a deterministic rejection | in progress |
| B7 | Four broken art assets, incl. an **Apple logo** in `otter-focus.png` | Fernando / designer |

---

## 2. The money path — read this twice

Three separate bugs, all in the entitlement system, all shipped, **none ever observed working**. The system has never once functioned end to end. It was invisible because `EXPO_PUBLIC_REVENUECAT_IOS_KEY` is absent, which makes `canRunNativeIAP` false and IAP inert.

**B2 — nobody could buy in.** `AuthProvider` starts `status: "loading"` with `user: null`. `RevenueCatBootstrap` fired on mount with `undefined`, so `configure({appUserID: null})` minted an **anonymous** `$RCAnonymousID` and latched `configured = true`. When auth resolved, the effect re-ran and bailed at the guard. `logIn` did not exist anywhere in the repo. The webhook keyed entitlements on the anonymous id; `get_entitlement` looked up the real `user_id`. They never matched. The payer saw "You're in. Thanks for backing Otterly." and stayed free. **100% of purchases.**
Fixed: `initRevenueCat` is now `identify()` — configure once with the real id, then `logIn`/`logOut` on change. The caller waits for `status !== "loading"`.

**N1 — the webhook revoked premium from people who had paid.** The classifier ended in `else: is_active = event_type in active_types` and ran the upsert unconditionally. `BILLING_ISSUE`, `TRANSFER`, `SUBSCRIPTION_PAUSED`, `SUBSCRIPTION_EXTENDED` and every event RevenueCat ships in future all resolved to `False` and switched premium **off**. A card hiccup revoked access while RevenueCat was still in its grace period.
Fixed: `classify_event` is pure and three-valued — grant, revoke, or **None = leave it alone**. Unknown never revokes. `EXPIRATION` is the only event that may. `TRANSFER` logs and does nothing (no correct auto-behaviour exists without a second identity, and revoking is strictly worse than nothing).
**Do not "simplify" this back to a boolean.** `backend/tests/test_entitlement_events.py` fails on 8 event types if you do.

**N2 — a dropped EXPIRATION meant premium forever.** `get_entitlement` read only the `active` boolean and never the `expires_at_ms` the webhook faithfully wrote. Now checked, with the lifetime tier explicitly safe: absent `expires_at_ms` means never expires, not expired at epoch 0.

### Nothing here is verified

**No real payment has ever completed.** B2's fix is traced through code and typechecked, never observed. The acceptance test needs a device:

1. TestFlight sandbox purchase.
2. RevenueCat dashboard → Customers → must show the real `user_id`, **not** `$RCAnonymousID:...`.
3. `GET /api/me/access` must return `premium: true`.

**This is the single most important thing to test once a build exists.** If the customer is anonymous, `identify()` is not being reached before purchase.

Also: if `REVENUECAT_WEBHOOK_SECRET` is unset in prod, `_verify_rc_signature` fails closed and the webhook 401s **every** event. Entitlement would be dead, not merely buggy, and B2 would look unfixed while the code is correct. Set it.

---

## 3. Decisions that look arbitrary and are not

**The paywall sells only what `server.py` gates.** A repo-wide grep for template, workflow, ambient, mood, insight returns exactly one non-doc hit each: the paywall's own string array. `expo-audio` is record-only — zero playback, zero audio assets — so "ambient backgrounds" had no implementation of any kind. "Progress insights" described `/streak`, which is free and ungated. Meanwhile the list omitted **Deep Shrink**, the only thing behind a hard 402.
**Rule: do not add a bullet without a server-side gate first.** Each bullet carries its anchor in a comment.

**Prices come from RevenueCat, not constants.** They were hardcoded display strings, so App Store Connect could charge anything and the app would keep showing "$29.99" — and showed USD to everyone regardless of region. Now `product.priceString`. The constants survive only as a fallback for Expo Go and web.

**The yearly tier is deleted.** At $29.99/year against a $29 lifetime it was strictly dominated — nobody should ever have bought it — and a third option that is never the right answer is the exact choice overload this app exists to reduce. **Two IAP products, not three:** `otter_lifetime` ($29 non-consumable), `otter_monthly` ($4.99 auto-renew).

**Shrink quality is enforced in code, not in the prompt.** `SHRINK_SYSTEM` said 'Never generic ("plan it out")' and `shrink_task` only checked `if step.text:`, so `{"text": "Plan it out"}` persisted and rendered. `_validate_steps` now sits between the LLM and the database. The denylist is a **denylist of abstract verbs on purpose**: a physical-verb allowlist scored 20/20 on fixtures and then false-rejected 18/18 real chore steps ("Mail the check", "Water the plants"). Physical verbs are an open class; planning verbs are closed.
**Known ceiling, documented, do not "fix" it:** this enforces grammar, shape and honest labels. It does **not** enforce scope. "Write the report" at 25 minutes passes every rule and always will.

**Self-harm disclosure has a code-level backstop.** Detection was one advisory line in `ROOM_SYSTEM`. `ensure_referral` now appends the hotline in `room_message` and `braindump`. **It appends, never routes** — a false positive costs one extra sentence on a kind reply, so the failure direction is harmless by construction. `BRAINDUMP_SYSTEM` says "Skip pure feelings", so braindump needed a `referral` response field before a disclosure had anywhere to land.

**No arousal gate before shrink.** The research says structure lands badly on a disconnected prefrontal cortex, which reads as "gate the shrink". Rejected: nothing here can read arousal. There is no sensor, asking is the cognitive load tiers 2-3 exist to remove, and inferring from typing latency or the clock is noise. A gate that cannot detect the state it gates on is not a safety feature. Instead: a **non-blocking** Room offer on the shrink screen. Nothing is withheld, the `List[Step]` contract is untouched, same append-never-subtract shape as `ensure_referral`.

**The illustrated otter is canon.** `DESIGNER_BRIEF.md` says "Deliberately not a cartoon mascot" and "a line-drawing icon, not a face with eyes". That line is **stale and should be amended, not obeyed** — the line-drawing alternative (`LineOtter` in `OtterMascot.tsx`) is placeholder-grade and the brief itself admits it. Ripping out charming art to ship an admitted placeholder makes the app worse.
**The rule that replaces it: the otter's expression may reflect the present SESSION. It may never reflect the user's RECORD.** `you.tsx` mapped the mascot's mood to streak count — five days active got a celebrating otter, zero got a *sleeping* one, on a screen titled "Your Progress Profile." That is guilt contingency, the exact Finch mechanic the brief says this audience quit. The copy on that screen was already correct ("You showed up 1 of 7 days"); the shame was smuggled in through the art.
`crown` is fine — it appears once, on the paywall, as a purchase-tier emblem. It is never earned by behaviour. **If it ever migrates to a profile, streak or completion surface, it becomes the thing the brief banned.**

**`webhook_events` is deliberately excluded from account deletion.** It is keyed on `event_id` only, holds an event id and a timestamp, and stores no RevenueCat payload. No person key, unreachable per-user, no PII. This is a decision, not an oversight.

---

## 4. Landmines

**The index block is a bomb, and it was proven, not theorised.** `_startup_indexes` wraps thirteen `create_index` calls in ONE try/except that only logs a warning. Against a real mongod, changing the `users.email` index to a partial one raised `IndexOptionsConflict` and **silently destroyed 5 of 5 critical indexes**: session-token uniqueness, the `expires_at` TTL, `rate_counters` uniqueness, `webhook_events` idempotency, `entitlements` uniqueness. The app boots normally. Sessions never expire. Duplicate webhooks double-apply.
Being fixed by giving every index its own try/except. **Never add an index to that block without isolating its failure.**

**`resolve_owner` silently degrades an expired session to anonymous.** It does not 401. Sessions hard-expire at 7 days with no refresh (`server.py:364`, TTL at `:973`). So **every signed-in user starts writing tasks, braindumps and Room transcripts under `dev:<id>` again on day 8**, and migration only ever runs at sign-in. Those rows are mental-health-adjacent free text. This is why `DELETE /api/account` takes an `X-Device-Id` header — it is a correctness requirement, not a nicety. The session-slide fix (S2) is still open.

**`buildHeaders()` is Bearer XOR X-Device-Id, never both.** Any call needing both must pass the header explicitly in `opts.headers`; `req()` merges them over the built ones.

**Using the wrong collection key silently no-ops.** `owner`-keyed: tasks, steps, activity, room_messages, rate_counters. `user_id`-keyed: users, entitlements, user_sessions. A wrong key matches nothing and reports success. `backend/tests/test_account_delete.py` derives the collection set from `server.py` source, so a tenth collection mapped nowhere fails the test.

**`Alert.alert` is a no-op on React Native Web.** Any confirm must branch on `Platform.OS === "web"`.

---

## 5. What Fernando must do (console, cannot be done in code)

1. **Fill `frontend/eas.json`** → `submit.production.ios`: `appleId`, `ascAppId`, `appleTeamId`. See `frontend/EAS-SETUP.md`.
2. **Two IAP products** (not three): `otter_lifetime` $29 non-consumable, `otter_monthly` $4.99 auto-renew.
3. **RevenueCat**: create the App Store app bound to `com.getotterly.app`. Use the **`appl_`** key, not a `test_` one — `test_` is the sandbox Test Store and will not resolve real purchases.
4. **Env**: `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (frontend), `REVENUECAT_WEBHOOK_SECRET` (backend — unset means entitlement is dead).
5. **Spend cap on `EMERGENT_LLM_KEY`.** Five minutes and it bounds every abuse finding absolutely. No app code substitutes for it.
6. **Host the privacy policy**, then link it in-app. Two open questions inside `docs/privacy-policy.md`:
   - `support@getotterly.com` is a placeholder. The policy promises deletion-by-email as the fallback for anyone who cannot open the app, so a dead address makes that a false statement.
   - **The training claim.** A line saying Anthropic and OpenAI do not train on this data was removed because it could not be verified. Their public API terms say so, but **Otterly never calls them directly** — every call goes through Emergent's proxy on Emergent's key, so **Emergent's agreement governs**. Confirm what that contract actually says, then state it plainly. Do not restore the stronger claim on assumption.
7. **Regenerate four art assets** (see §6).
8. Support URL, screenshots (6.7" + 5.5"), description, age rating (flag AI-generated + mental-health honestly), Sentry DSNs.

---

## 6. Broken art — all four visually confirmed

| File | Problem | Renders where |
|---|---|---|
| `otter-focus.png` | **Apple logo on the MacBook lid.** Trademark exposure in review. | `room.tsx:149`, at 130px — the Room's resting state, the largest mascot in the app |
| `otter-focused.png` | AI-artifact text "active time running" **and the otter is scowling** | the shrink timer header — an angry companion during focus time |
| `otter-working.png` | "...workin' on stuff..." baked into the laptop screen | Room, while sending |
| `otter-celebrate.png` | Human teeth, arms raised — visual cheerleading, which the brief bans in words | shrink completion |

Regenerate to match `otter-default.png` / `otter-float.png`: closed-mouth calm, muted browns and sand, no text, no third-party marks.
**Interim mitigation if art slips:** swap `room.tsx:149` off the `focus` variant to remove the trademark exposure. Does not fix the scowl in the timer.

---

## 7. Verification — what is proven and what is not

**Proven.** Backend suite is green and each test was checked for teeth by reintroducing the bug it guards:
```
cd backend
python3 tests/test_shrink_guardrail.py       # 20 fixtures + invariants
python3 tests/test_safety_referral.py        # 17 cases + 2 invariants
python3 tests/test_entitlement_events.py     # 15 event types + regression guard
./.venv/bin/python tests/test_referral_wiring.py   # 6 wiring checks
./.venv/bin/python tests/test_reshrink_guard.py    # 9 checks
./.venv/bin/python tests/test_account_delete.py    # 11 checks
```
Account deletion was additionally verified against a **real mongod**: all 8 person-keyed collections → 0 rows on unfiltered counts, `dev:` orphans purged, `webhook_events` untouched.

**Not proven, and do not let a green suite imply otherwise:**
- **No device build has ever existed.** No `eas.json` until `c4021fa`.
- **No real payment has ever completed.** B2 is the highest-risk unverified thing in the repo.
- `backend/tests/test_otterly_api.py` is integration-style against a live `BASE_URL` and **has never run** in any environment we control.
- Sign in with Apple's UI cannot be exercised on web by design (`isAvailableAsync()` is false there).
- The Emergent auth handshake was never exercised. `demobackend.emergentagent.com` returns 404 for a bogus session id, which proves the host is live and nothing else. Whether session ids are scoped per app is **open, and only Emergent can answer it**.
- `EMERGENT_LLM_KEY` spend caps are unknown. That single unknown decides whether the abuse findings are launch-week or a footnote.

---

## 8. Reference documents

| File | What |
|---|---|
| `docs/2026-07-17-launch-readiness-audit.md` | 41-agent audit, 33 confirmed findings |
| `docs/2026-07-17-launch-plan.md` | Ranked blockers, execution order, what nobody verified |
| `docs/2026-07-17-shrink-guardrails-spec.md` | Why shrink enforcement is a harness, not a prompt |
| `docs/2026-07-17-design-review.md` | 16 findings against the brief, the tokens, and the research |
| `docs/2026-07-17-account-apple-tasks.md` | Task plan for deletion + Apple, with every trap named |
| `docs/privacy-policy.md` | Ready to host, two open questions inside |
| `frontend/EAS-SETUP.md` | Build and submit steps |
| `DESIGNER_BRIEF.md` | Authoritative design intent. **Stale on the otter and the yearly tier** — see §3 |
