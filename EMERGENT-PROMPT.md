# The prompt to paste into Emergent

Copy everything inside the fence. It is written to be read by Emergent's agent, not by a person.

---

```
Before you change anything in this repo, read HANDOFF-TO-EMERGENT.md in full. It records
what changed on 2026-07-17, why, and which changes will silently break the app if you
undo them. Do not skip it. Several things in this codebase look wrong and are deliberate,
and the reasoning is written down.

Your goal: get Otterly submitted to the App Store. Do not refactor. Do not modernise. Do
not "clean up" anything you were not asked to touch. This app is days from submission and
every diff is risk.

=== RULES THAT OVERRIDE YOUR DEFAULTS ===

1. frontend/app.json bundleIdentifier and package MUST stay "com.getotterly.app".
   They previously read "com.emergent.otterlynext.u9tal9". If your scaffold regenerates
   app.json and reverts this, FIX IT BEFORE BUILDING. A bundle id is permanent once
   published: changing it later creates a different app, orphaning every install, every
   rating and every receipt. This is the single most expensive mistake available in this
   repo. Verify with: grep bundleIdentifier frontend/app.json

2. Do not change the RevenueCat webhook classifier in backend/server.py.
   classify_event returns three values on purpose: True (grant), False (revoke), None
   (leave the stored value alone). It looks like it should be a boolean. It must not be.
   The previous boolean version silently revoked premium from paying customers on
   BILLING_ISSUE, TRANSFER and SUBSCRIPTION_PAUSED. backend/tests/test_entitlement_events.py
   fails on 8 event types if you collapse it.

3. Do not add a paywall bullet without a server-side gate for it first.
   frontend/app/paywall.tsx previously advertised three features that existed nowhere in
   the codebase. Every bullet now carries its server.py anchor in a comment. A false claim
   on a store listing is a rejection.

4. Do not add an index to _startup_indexes without its own try/except.
   That block previously wrapped thirteen create_index calls in one try. Against a real
   mongod, one conflict silently destroyed FIVE critical indexes including the session TTL
   and webhook idempotency. The app boots fine when this happens. You will not notice.

5. Do not add expo-av. expo-audio is the current API and there is a guard script enforcing it.

6. User-facing copy follows a strict house style: short sentences, active voice, no em
   dashes, no semicolons, no exclamation marks. Warm, brief, never shaming. This is not
   cosmetic. The app's entire thesis is not shaming people with ADHD, and the design review
   found that every shame defect in this app arrived as a number, an icon or a font size
   rather than a sentence. Hold that line.

=== WHAT TO DO ===

Work only on what is listed as open in HANDOFF-TO-EMERGENT.md section 1. As of handoff:

- B4: host the privacy policy (docs/privacy-policy.md) and link it from you.tsx settings
  and onboarding/welcome.tsx. Read the two open questions in the file first — one of them
  is about YOUR contract with Anthropic and OpenAI and only Emergent can answer it.
- B5: Sign in with Apple, if not already complete on the branch. Guideline 4.8. Read
  docs/2026-07-17-account-apple-tasks.md Task 4 and 5 — every trap is named, including the
  unique email index, the sub-not-email key, and the fact that Apple returns email only on
  first authorization.
- B7: regenerate four otter assets. otter-focus.png has an APPLE LOGO on the laptop and
  renders at 130px as the Room's resting state. That is trademark exposure in review.

=== BEFORE YOU SUBMIT ===

Run the backend suite. Every test in it was verified to fail when its bug is reintroduced,
so a green run means something:

  cd backend
  python3 tests/test_shrink_guardrail.py
  python3 tests/test_safety_referral.py
  python3 tests/test_entitlement_events.py
  ./.venv/bin/python tests/test_referral_wiring.py
  ./.venv/bin/python tests/test_reshrink_guard.py
  ./.venv/bin/python tests/test_account_delete.py

Then the one thing that actually matters and has never been done:

  A REAL SANDBOX PURCHASE IN TESTFLIGHT.

No payment has ever completed in this app's history. The purchase path had a bug where
every purchase landed on an anonymous RevenueCat id the backend could never match, so the
payer saw a success message and stayed on the free tier forever. It is fixed in code and
has never been observed working. Verify:
  - RevenueCat dashboard shows the customer with the real user_id, NOT $RCAnonymousID
  - GET /api/me/access returns premium: true
If the customer is anonymous, identify() is not being reached before purchase.

Also confirm REVENUECAT_WEBHOOK_SECRET is set in the backend env. If it is unset the
webhook 401s every event and entitlement is dead, not merely buggy — and the purchase bug
will look unfixed while the code is correct.

=== WHAT NOT TO TRUST ===

The test suite covers the backend. It does not cover: any device build, any real payment,
Sign in with Apple's UI, or the Emergent auth handshake. backend/tests/test_otterly_api.py
is integration-style against a live BASE_URL and has never run anywhere. A green suite here
means "the logic is right", never "someone watched it work".
```

---

## Notes for Fernando, not for Emergent

- Paste the fenced block as your first message in the Emergent session. It front-loads the irreversible rule (bundle id) before Emergent can touch anything.
- If Emergent pushes an `Auto-generated changes` commit that reverts `app.json`, that is the failure this prompt exists to prevent. Check it before every build.
- The two questions in `docs/privacy-policy.md` are genuinely for Emergent to answer. One is about their contract with Anthropic and OpenAI, which governs your privacy policy because every LLM call goes through their proxy on their key. You cannot state the training claim truthfully without their answer.
