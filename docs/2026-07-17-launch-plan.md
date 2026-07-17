# Otterly App Store Launch Plan

Source: `docs/2026-07-17-launch-readiness-audit.md` (41-agent audit, 33 confirmed findings), Fable mascot verdict, Fernando's 12-item submission list.

Audience: an agent executing this, or Fernando checking state. Written for precision, not voice. Anything that becomes user-facing copy follows house style and is marked `COPY:`.

Status legend: `[ ]` todo · `[x]` done · `[!]` blocker · `[~]` needs a human/console (agent cannot do it).

---

## 0. Review of the original 12-item list

The list is good on console work and wrong on two things that matter. It is also missing five blockers.

| # | Original item | Verdict |
|---|---|---|
| 1 | Apple Developer account, 1-3 days | **KEEP, START TODAY.** 1-3 day approval is the real long pole. Everything else is code. Nothing downstream can happen without it. |
| 2 | Create app, bundle `com.emergent.otterlynext.u9tal9` | **WRONG AND IRREVERSIBLE.** That is Emergent's scaffold namespace. See B1. Must be `com.getotterly.app` before any `eas build`. Do not create the App Store Connect record around the scaffold id. |
| 3 | 3 IAP products | KEEP. Blocked on B1 (the id they bind to). |
| 4 | RevenueCat entitlement + offering | KEEP but **INSUFFICIENT**. Correct RC config does not fix B2. Purchases still will not grant. |
| 5 | "Set real keys, 5 min" | KEEP, understated. No `.env` exists in the tree. If `REVENUECAT_WEBHOOK_SECRET` is unset in prod the webhook 401s everything and entitlement is dead, not merely buggy. |
| 6 | Privacy policy, 2 hrs | KEEP, closer to 3 hrs. Must name Emergent, Anthropic, OpenAI by name. Needs an in-app link, not just a URL. See B4. |
| 7 | Support URL | KEEP. |
| 8 | Screenshots via TestFlight | KEEP. Blocked on B1 + S1 (no `eas.json` exists, nothing can build today). |
| 9 | Description + keywords | KEEP. Draft in house style. Must not repeat the false paywall claims (B6). |
| 10 | Age rating questionnaire | KEEP. Answer AI-generated content + mental-health honestly. |
| 11 | Sentry, 2 projects | KEEP. Also fix the PII log line (S8). |
| 12 | TestFlight on device | KEEP. Blocked on B1 + S1. This is where B2 gets verified. |

**Missing from the list, all blockers:** Sign in with Apple (B5), account deletion (B3), the paywall selling features that do not exist (B6), `eas.json` (S1), the RevenueCat identity bug (B2), four broken art assets (B7), export compliance key (S9).

---

## 1. BLOCKERS

### [!] B1. Bundle id is Emergent's scaffold id — IRREVERSIBLE ONCE BUILT
- **Anchor:** `frontend/app.json:13` (ios.bundleIdentifier), `frontend/app.json:24` (android.package). Both read `com.emergent.otterlynext.u9tal9`.
- **Why blocker:** `eas build:configure` auto-registers this id silently. Once published, a new id is a new app: orphaned installs, ratings reset, IAP products recreated, receipts unrestorable. Worse, `com.emergent.*` is a namespace Fernando does not own; if Emergent claimed the prefix, registration fails outright. No `eas.json`, no `app.config.js`, no prebuild dirs, so `app.json` is the sole authority.
- **Fix:** set both to `com.getotterly.app`.
- **Acceptance:** `grep -c "com.emergent.otterlynext" frontend/app.json` returns 0. Bundle id matches the App Store Connect record and both RevenueCat apps.
- **Size:** 2 min edit. ~1 hr console.
- **Do first. Nothing else touches EAS until this lands.**

### [!] B2. No purchase ever grants premium — VERIFIED END TO END
- **Anchors:** `frontend/src/lib/revenuecat.ts:36-45` · `frontend/app/_layout.tsx:19-26` · `frontend/src/auth/AuthProvider.tsx:55` · `backend/server.py:470` (webhook writes) · `backend/server.py:232` (entitlement reads).
- **The chain (each link confirmed):**
  1. `AuthProvider` initialises `status: "loading"`, `user: null`.
  2. `RevenueCatBootstrap` useEffect dep is `[user?.user_id]` → fires on mount with `undefined`.
  3. `initRevenueCat(undefined)` → `configure({ appUserID: undefined ?? null })` → RC mints an anonymous `$RCAnonymousID:*`. `configured = true` latches.
  4. Auth resolves, effect re-runs, `if (!p || configured) return;` bails. Never re-identifies.
  5. `logIn` / `logOut` appear NOWHERE in the repo (grep confirms empty).
  6. Webhook keys entitlement on `event.get("app_user_id")` = the anonymous id.
  7. `get_entitlement` queries `{"user_id": user_id}` = the real id. Never matches.
- **User-visible result:** payment succeeds, toast says "You're in. Thanks for backing Otterly.", user stays free tier permanently. 100% of purchases.
- **Fix:** replace `initRevenueCat` with `identify()`: configure once, then `logIn` / `logOut` on identity change. Gate the effect on `status !== "loading"` so the first configure carries the real id. **Keep** the `status !== "authed"` guard at `paywall.tsx:85` — it is what keeps purchases off anonymous ids, since the webhook has no TRANSFER branch.
- **Acceptance:** in TestFlight with a real sandbox purchase, the RevenueCat dashboard customer shows the real `user_id` (not `$RCAnonymousID`), AND `GET /api/me/access` returns `premium: true`.
- **Size:** 30 min code. Verification needs a TestFlight build + real purchase — the longest feedback loop in the plan. **Start it early even though it is not first.**
- **Note:** inert today (`IOS_KEY` absent → `canRunNativeIAP` false), which is why nobody has noticed.

### [!] B3. No account deletion — App Store 5.1.1(v) hard rejection
- **Anchor:** `backend/server.py:399` (only `/auth/logout` exists, deletes one session row). Account creation is live and reachable: `server.py:354-361`, button at `you.tsx:110`.
- **Fix:** `DELETE /api/account` behind `require_user`. **Two groups, the key field is not uniform:**
  - delete by `owner`: tasks, steps, activity, room_messages, rate_counters
  - delete by `user_id`: entitlements, user_sessions, users (last)
  - Using `{"owner": ...}` on the second group silently no-ops — those docs have no `owner` field.
- **UI:** confirm dialog in `you.tsx` next to signOut. `COPY:` house style, non-alarming, states what is deleted and that it cannot be undone.
- **Acceptance:** delete, then sign in fresh — zero rows across all 8 collections for that identity.
- **Size:** 1 hr. Backend deploys independently of the binary.

### [!] B4. No privacy policy + undisclosed sharing to three processors
- **Anchors:** `frontend/app/(tabs)/you.tsx:93` (settings group, no policy row) · `backend/server.py:265-272` (text → Anthropic via Emergent proxy) · `backend/server.py:854-857` (voice → `integrations.emergentagent.com` → OpenAI Whisper). Repo-wide grep for privacy/terms/policy: zero hits.
- **Why blocker:** Apple 5.1.1 gates submission on an in-app policy link for any data-collecting app. This one collects email, voice, and mental-health-adjacent free text.
- **Fix:** policy must name **Emergent, Anthropic, and OpenAI**, what each receives, and retention. Link from `you.tsx` settings group and `onboarding/welcome.tsx`. Two `Linking.openURL` rows.
- **`COPY:` house style.** Include the crisis-line liability disclaimer per the original list item 6.
- **Acceptance:** policy URL live, both in-app links open it, Play Data Safety + Apple nutrition label filled (console, track separately).
- **Size:** 3 hrs writing, 15 min links.

### [!] B5. Google-only login — Guideline 4.8. LARGEST BLOCKER
- **Anchors:** `frontend/src/auth/AuthProvider.tsx:106` (`signIn()` → `auth.emergentagent.com`, the only auth path) · `you.tsx:114` renders the literal string "Sign in with Google", so the 4.8 exemption for a developer's own sign-in system cannot be claimed. No `expo-apple-authentication` anywhere.
- **Compounding:** purchases sit behind `status === "authed"` (`paywall.tsx:85`), so a blocked reviewer also cannot test IAP → second rejection under 2.1. Deterministic, not a coin flip: the reviewer hits the login screen on first launch.
- **Fix:** add Sign in with Apple on iOS. **Do NOT route through `api.exchangeSession`** — it posts to `/api/auth/session`, which hands the token to Emergent's demobackend as `X-Session-ID` and will 401 an Apple JWT every time. Need a new `POST /api/auth/apple` that verifies the identity token against `appleid.apple.com/auth/keys` (signature, iss, aud, exp), then reuses session-store logic at `server.py:363-374`.
  - **Key on Apple's `sub`, NOT email.** Apple returns email only on first authorization, and `auth_session` hard-fails without it (`server.py:339-340`), so an email-keyed path 400s on every re-auth.
  - Capture `fullName` on that first call or the display name is permanently empty.
- **Acceptance:** fresh install → Sign in with Apple → signed in. Sign out, sign in again (no email returned) → same account, name intact.
- **Size:** full day. Needs backend endpoint + config plugin + entitlement.
- **Sequence last deliberately:** if the day runs out this slips alone, rather than dragging five cheaper fixes with it.

### [!] B6. Paywall sells three features that do not exist
- **Anchor:** `frontend/app/paywall.tsx:51-53`. Claims "Customizable micro-step workflows & templates", "Detailed progress insights & mood tracking", "Exclusive gentle sounds and ambient backgrounds".
- **Evidence:** the strings template/workflow/ambient/mood/insight appear nowhere else in the codebase. `expo-audio` is record-only, zero playback. `/streak` (`server.py:935`) has no entitlement check — it is free.
- **Also:** the paywall never mentions Deep Shrink, the one genuinely gated premium feature (`server.py:641`).
- **Fix:** replace the array with what `server.py` actually gates: Deep Shrink, unlimited shrinks/braindumps/voice notes, unlimited room time. **Drop "progress insights" entirely — do not reword it.** The streak is free.
- **`COPY:` house style.** Mirror the same bullets into the App Store Connect product descriptions, or the false claim just moves one surface over.
- **Acceptance:** every paywall bullet maps to a real entitlement check in `server.py`.
- **Size:** 10 min.

### [!] B7. Four broken art assets (Fable verdict, all visually confirmed)
- `assets/otter/otter-focus.png` — **Apple logo on the MacBook lid.** Trademark exposure. Renders at 130px as the Room's resting state (`room.tsx:149`), the largest mascot in the app.
- `assets/otter/otter-focused.png` — AI-artifact text "active time running" **and the otter is scowling.** Renders in the shrink timer header. An angry companion during focus time is a shame vector for this audience.
- `assets/otter/otter-working.png` — "...workin' on stuff..." baked into the laptop. Untranslatable, cutesy register the copy rules ban.
- `assets/otter/otter-celebrate.png` — human teeth, arms raised. Visual cheerleading, banned in copy.
- **Fix:** regenerate all four. Needs a human/image tool. Match `otter-default.png` / `otter-float.png` register: closed-mouth calm, muted browns and sand, no text, no third-party marks.
- **Acceptance:** no third-party marks, no baked text, no scowl, no teeth.
- **Interim if art slips:** swap `room.tsx:149` off `focus` to remove the trademark exposure. Does not fix the scowl in the timer.

---

## 2. SHOULD-FIX BEFORE LAUNCH

- [ ] **S1. No `eas.json` — nothing can build or submit today.** `npx eas-cli login`, then `build:configure` in `frontend/`, **after B1**. Hand-add the `submit.production` block; `build:configure` does not write one. 20 min.
- [ ] **S2. Sessions hard-expire at 7 days, no refresh.** `server.py:364`, TTL index `:973`. Every signed-in user hits a blank anonymous inbox on a fixed timer (sign-in already migrated data to `user_id`, `:379-382`). Add a slide in `resolve_owner` after `:194`. Server deploy, not a binary — ship the app, deploy this before cohort 1 reaches day 7. 45 min.
- [ ] **S3. `/next` dies when the LLM does.** `server.py:776`. `_llm_json` only catches `json.JSONDecodeError`, so any 429/timeout returns 500 and the post-onboarding home shows a server error while shrunk steps sit in Mongo. The deterministic fallback already exists nine lines down, and `shrink` already applies this exact rule at `:692-695`. **Highest-value 3 lines in the audit.** 15 min.
- [ ] **S4. `create_task` is the only unguarded free-text sink.** `server.py:501`. Braindump and Room both check `SELF_HARM_RE`. Quick-add (the **default** Inbox mode), voice, and onboarding first-shrink all reach `create_task` raw. Type a disclosure, get a to-do row. Guard once in `create_task` so all three inherit it. **Do not add `referral` to `Task`** — `server.py:504` inserts `task.dict()` into Mongo and it would persist into every doc. Use a separate `TaskCreated(Task)` response model. 30 min.
- [ ] **S5. Unbounded text inputs.** `server.py:124`, `:135-136`, `:81-82`. Add `max_length` to all four. **Optional fields must keep `default=None` explicitly** or Field makes them required: `goal: Optional[str] = Field(default=None, max_length=200)`. Getting that wrong 422s every room message after the first and takes the Room down. 10 min.
- [ ] **S6. `/transcribe` reads the whole upload into RAM before any check.** `server.py:848`. Starlette does not cap file parts. Add `if audio.size and audio.size > 25*1024*1024: raise HTTPException(413)` above the read. 5 min.
- [ ] **S7. Shrink screen reports network failure as "No steps yet."** `shrink/[id].tsx:53`, try/finally with no catch. Every recovery affordance is gated on `steps.length > 0`. Add a catch setting a reload banner routing to `load()`. **Do not route to `doShrink`** — it deletes and regenerates unfinished steps (`server.py:699`) and burns a shrink from the cap. 20 min.
- [ ] **S8. Sentry PII log line.** Part of item 11. Do not ship user text to Sentry.
- [ ] **S9. Export compliance.** `app.json:11-16`. Add `"config": { "usesNonExemptEncryption": false }` or every upload parks on "Missing Compliance". 2 min.
- [ ] **S10. First-run shrink fails silently.** `onboarding/firstshrink.tsx:52`, try/finally, no catch. Any 5xx or cold-start timeout leaves the button flickering on the first thing a new user ever does. Copy the pattern from `inbox.tsx:56-62`. 10 min.
- [ ] **S11. Step timer counts JS ticks, not wall-clock.** `shrink/[id].tsx:179`, duplicated at `:197`. iOS suspends the JS thread on background, so the countdown freezes for exactly the time the user spends doing the step — and leaving the app is the success path here. Store a deadline ref, compute from `Date.now()`, add an AppState listener. **Fix the shared helper, not just `startTimer`**, or resume stays broken. 45 min.
- [ ] **S12. Set the spend cap on `EMERGENT_LLM_KEY`** in the Emergent dashboard. 5 min. **Bounds every abuse finding absolutely.** No app code substitutes for it.

---

## 3. POST-LAUNCH

- `/auth/session` migrates any device's data on an unproven `device_id` claim (`server.py:377`). Real fix is server-minted anonymous identity. The header-match idea is theater.
- Room transcripts retained forever, no per-conversation clear (`server.py:903`). B3 gives the data its exit; this is granularity on top.
- Failed task delete silently ignores the tap (`inbox.tsx:87`). Next focus reload reconciles.
- Amend `DESIGNER_BRIEF.md` §3 and §8: illustrated otter is canon, expression is session-state only, never record-state. Otherwise the next designer relitigates it.
- Delete `LineOtter`, `LineOtterPeek`, `FallbackOtter` from `OtterMascot.tsx`. Dead code, zero callers, retired by the Fable verdict.

---

## 4. EXECUTION ORDER

Logic: irreversible first → long-feedback-loop early → one-line wins while things compile → big build last.

| Step | Item | Why here |
|---|---|---|
| 0 | `[~]` **Apple Developer account (list item 1)** | 1-3 day approval. THE long pole. Start today, everything below waits on it. |
| 1 | `[!]` **B1 bundle id** | Only irreversible item. `eas build:configure` bakes it. 2 min. |
| 2 | `[~]` **S1 `eas build:configure` + register App ID + Play listing** | If registration collides, know now, not after a day of code. |
| 3 | `[!]` **B2 RevenueCat `logIn`** | 30 min code, but verification needs TestFlight + real purchase = longest loop. Start the clock early. |
| 4 | `[!]` **Batch the one-liners:** B6 paywall bullets, S9 export compliance, S8 Sentry line, mic string | ~25 min total, clears two blockers' worth of exposure. Do while the first build compiles. |
| 5 | `[!]` **B3 `DELETE /api/account`** | 1 hr. Backend, deploys independently, blocks submission. |
| 6 | `[!]` **B4 privacy policy + 2 links** | 3 hrs. Writing is the slow part, nothing else waits on it. Hand off or draft while builds run. |
| 7 | `[!]` **B5 Sign in with Apple** | Rest of the day. Largest. Slips alone if the day runs out. |
| 8 | `[ ]` **Backend hardening:** S2 session slide → S3 `/next` fallback → S4 create_task guard → S5 max_length → S6 transcribe cap | All server-side, deployable after the binary ships, none gate submission. |
| 9 | `[~]` **S12 spend cap** | 5 min, bounds all abuse findings. |
| 10 | `[~]` **B7 art regeneration** | Parallel, needs a human. Blocks nothing but the trademark risk is real. |
| 11 | `[~]` **List items 3,4,5,7,9,10,11 (console)** | After B1 lands. Items 8 + 12 (screenshots, TestFlight) need step 2 done. |

**Frontend reliability (S7, S10, S11) is a real second day.** None stops a launch; all need a new binary anyway.

---

## 5. WHAT NOBODY HAS VERIFIED

The audit read code. It ran nothing. State this plainly rather than let a green checklist imply coverage.

- `backend/tests/test_otterly_api.py` has **never run** — integration against a live `BASE_URL`. Unit + wiring tests are green and touch none of this.
- **No device build exists.** No `eas.json`. StoreKit product resolution, App Attest, mic prompt, notification entitlements — all inferred from config.
- **No real payment has ever completed.** B2 is traced through code, not observed. `IOS_KEY` absent → IAP inert today. Whether the 3 products exist under the right offering is unverified.
- **Emergent auth handshake never exercised.** `demobackend.emergentagent.com` returns 404 for a bogus session id, which proves the host is live and nothing else. Cross-app impersonation scoping is open and only Emergent can answer.
- **`EMERGENT_LLM_KEY` spend caps unknown.** That single unknown decides whether the abuse findings are launch-week or a footnote. Check the dashboard.
- **Console state invisible:** Play Data Safety, Apple nutrition label, whether `com.getotterly.app` is registered, whether ASC product descriptions match the paywall.
- **No `.env` in tree.** If `REVENUECAT_WEBHOOK_SECRET` is unset in prod, the webhook 401s everything and entitlement is dead, not merely buggy.
- **No proxy/ingress config in repo.** `.emergent/emergent.yml` is three fields. Whether anything caps request bodies or rate-limits upstream is unknowable from source.

A clean verdict means "I read every line of that path and found no defect." It does not mean anyone watched it work.
