# Emergent deploy checklist — Otterly

This is the short, ordered list of what has to happen in **Emergent's environment** (the deployed backend and its production database) before Otterly can be submitted to the App Store. It is separate from `HANDOFF-TO-EMERGENT.md`, which explains the whole codebase and the decisions behind it. Read that one for context. This one is the do-list.

Everything here needs the **production** backend and its **production MongoDB**, which live on Emergent. None of it can be done from a laptop, because the production `MONGO_URL` and the API keys are only set in Emergent's environment.

---

## 0. Before anything: confirm the bundle id survived

```
grep bundleIdentifier frontend/app.json     # MUST print com.getotterly.app
```

If it says `com.emergent.otterlynext.u9tal9`, a scaffold regeneration reverted it. **Fix it before building.** A bundle id is permanent once published: changing it later is a different app, orphaned installs, ratings from zero, receipts unrestorable. This is the single most expensive mistake available in this repo.

---

## 1. Production environment variables

Set these in the deployed backend. Several are silent killers if missing.

| Var | Where | If unset |
|---|---|---|
| `MONGO_URL` | backend | app cannot start |
| `DB_NAME` | backend | app cannot start |
| `EMERGENT_LLM_KEY` | backend | shrink, room, braindump all fail |
| `REVENUECAT_WEBHOOK_SECRET` | backend | **the webhook 401s every event and entitlement is DEAD.** A paid purchase never grants premium, and it looks like the code is broken when it is not. |
| `APPLE_BUNDLE_ID` | backend | defaults to `com.getotterly.app` in code, but set it explicitly. A wrong value 401s every Sign in with Apple. |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | frontend build env | IAP is inert, no purchases resolve. Must be the **`appl_`** key from RevenueCat, NOT a `test_` key. |
| `SENTRY_DSN` | backend + frontend | optional, crash reporting only |

Also put a **spend cap on `EMERGENT_LLM_KEY`** in the Emergent dashboard. Five minutes, and it bounds every abuse and cost risk absolutely. No app code substitutes for it.

---

## 2. RevenueCat and IAP (App Store Connect + RevenueCat dashboard)

- Create the App Store Connect app record with bundle id `com.getotterly.app`.
- Create **two** in-app purchases (not three, the yearly tier was dropped):
  - `otter_lifetime` — $29 non-consumable
  - `otter_monthly` — $4.99 auto-renewable
- In RevenueCat: create the App Store app bound to `com.getotterly.app`, add both products to the default offering, define the `premium` entitlement covering both.
- Copy the **`appl_`** public key into `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
- In RevenueCat webhooks: set the webhook to the deployed `/api/webhooks/revenuecat` and copy its secret into `REVENUECAT_WEBHOOK_SECRET`.

**The purchase path has never been observed working.** It had a bug where every purchase landed on an anonymous RevenueCat id the backend could never match, so the payer saw a success message and stayed on the free tier. It is fixed in code. On the first TestFlight build, do a real sandbox purchase and confirm:
- RevenueCat dashboard shows the customer with the **real `user_id`**, NOT `$RCAnonymousID:...`
- `GET /api/me/access` returns `premium: true`

If the customer is anonymous, `identify()` is not being reached before the purchase. This is the highest-risk unverified thing in the whole project.

---

## 3. THE VOUCHER FOR APP REVIEW — this is the one people miss

The App Review team must be able to test premium features (Deep Shrink, unlimited shrinks) without a real purchase. The app supports this through voucher codes, and the code goes in the App Review Notes field. **But the voucher only works if it exists in the PRODUCTION database.**

The voucher pipeline is verified working end to end (mint, redeem, normalisation, entitlement grant all confirmed). The catch is purely environmental: the mint script writes to whatever `MONGO_URL` its shell has, and only the deployed backend has the production one.

### Do this, in order, in the deployed backend environment:

**Step 1 — mint against production.** In a shell on the deployed backend (where the real `MONGO_URL` is set):
```
cd backend && ./.venv/bin/python scripts/mint_vouchers.py \
    --count 3 --batch apple-review --expires 2027-12-31
```
It prints three codes in `OTTER-XXXX-XXXX` form. Three, so the reviewer has spares. The `apple-review` batch tag lets you revoke them later.

**Step 2 — confirm one works in the live app.** Install the TestFlight build, open the You tab, tap "Have a voucher?", enter one of the three codes. Confirm premium unlocks (Deep Shrink becomes available). This proves the production backend, the production database, and the app all agree.

**Step 3 — put a DIFFERENT code in App Review Notes.** In App Store Connect, the version's App Review Information > Notes field already has a draft (see the metadata Fernando prepared). Replace `[PASTE A VOUCHER CODE]` with one of the two codes you did NOT redeem in step 2. Use an unused one, because a redeemed voucher is single-use and the reviewer needs a fresh one.

### Why not an admin endpoint or a seeded code?

Deliberate. The backend's only auth is an Emergent passthrough, and adding a privileged HTTP route to mint vouchers is new attack surface days before submission. The CLI is the entire privileged surface, and it runs where the credentials already are. Do not add an endpoint for this.

### Voucher facts worth knowing

- A voucher grants premium **until the batch expiry date** (set at mint time, `--expires`). Not forever, not N days from redemption.
- Codes are single-use. One code, one account. `redeemed_by` is the lock, enforced atomically so two people cannot redeem the same code.
- Redemption is rate-limited (10/day/user) so the endpoint cannot be brute-forced.
- Vouchers live in their own `db.vouchers` collection and never touch `db.entitlements`. `get_entitlement` resolves a real paid subscription first, then a voucher, so a payer is never downgraded by a lapsed voucher.
- Deleting an account burns its voucher (does not release it for reuse).
- To hand vouchers to press, beta testers, or supporters later, run the same command with a different `--batch` and `--expires`. People redeem in the app under You > Have a voucher.

---

## 4. Privacy, support, and the web (already done, confirm only)

These are live as of 2026-07-18, hosted on Cloudflare Pages, not on Emergent. Confirm they resolve:
- `https://getotterly.com/privacy` — the privacy policy (App Store Privacy Policy URL)
- `https://getotterly.com/support` — support page (App Store Support URL)
- `support@getotterly.com` — live inbox, the deletion-by-email channel the policy promises

The privacy policy names Emergent, Anthropic, OpenAI, RevenueCat, Sentry, and Apple as data processors, and states that Anthropic and OpenAI do not train on the data (Fernando confirmed this against the Emergent contract). If that contract changes, the training line in `docs/privacy-policy.md` is the first thing that becomes false.

---

## 5. Still needs a human, not Emergent

- **Four art assets** must be regenerated before submission. `otter-focus.png` has an **Apple logo** on the laptop (trademark exposure) and renders as the Room's resting state. See `HANDOFF-TO-EMERGENT.md` section 6.
- **Screenshots** for the App Store listing, captured from a TestFlight or simulator build (6.5" iPhone minimum, first 3 show on the install sheet).
- **Age rating** questionnaire, answered honestly (AI-generated content + mental-health themes, lands at 12+ or 17+).
- App Store Connect contact info, and the manual-release toggle.

---

## The two things nobody has verified, restated because they matter

1. **No real payment has ever completed.** Section 2's TestFlight sandbox purchase is the test.
2. **Sign in with Apple's UI has never run** (`isAvailableAsync()` is false on web, and no device build existed). The backend is fully tested; the button wiring needs a device. First-build check: sign in with Apple, sign out, sign in again (Apple sends no email the second time), confirm it is the same account with the name intact.

A green backend test suite proves the logic. It does not prove anyone watched money move or a button work. Those two need the build.
