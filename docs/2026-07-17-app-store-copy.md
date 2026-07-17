# App Store submission copy — Otterly

*Draft prepared 2026-07-17 during codebase sync. Review, edit, and file into App Store Connect. Every line here is deliberate; the rationale is at the bottom.*

---

## 1. Name & subtitle

**App name (30 chars max)** — 7 chars

```
Otterly
```

**Subtitle (30 chars max)** — 29 chars, fits

```
Calm ADHD task starter
```

**Category** — Primary: `Productivity`. Secondary: `Health & Fitness`.

Do NOT choose `Medical`. That flags a different review track and Otterly is not a medical device.

---

## 2. Promotional text (170 chars max)

*This is the only piece you can edit without a new build. Keep it soft, non-guilty, phone-friendly.*

```
For days you can't start. Otterly picks one small step for you, then sits with you while you do it. No streaks that shame you. No lists that grow.
```

(163 chars, room to spare.)

---

## 3. Description (4,000 chars max)

*Written to survive review. The claims below can be pointed at in-app; nothing overpromises.*

```
Otterly is a calm task-starter for people with ADHD.

Task lists are the disease, not the cure. Otterly's home screen shows ONE thing, never a list. When you can't start, an otter picks one small step for you — three to ten tiny actions, each one small enough that "just this one" feels possible.

If you want company while you work, the Room is a text-based body-double. A quiet otter sits with you, checks in when you need it, and knows when to say nothing.

WHAT'S INSIDE

• One-thing home screen. Never a growing list. Never a red badge.
• Task Shrinker. Break "clean the kitchen" into "put one plate in the sink." Then just the plate. Physical verbs only — no "plan it out," no "get organized."
• The Room. A warm, low-stimulation companion that sits with you while you work. Text only. No cameras. No mics on unless you press them.
• Braindump. Dump a paragraph, get a short list back. No priorities. No colors.
• Soft streak. Seven quiet ripples for the days you showed up. No fire. No shame for the days you didn't.
• Energy pill. Low / medium / good. Otterly picks smaller steps on low days, on purpose.

WHAT OTTERLY WON'T DO

• Won't push notifications at you all day.
• Won't gamify your recovery.
• Won't send you streaks that punish you for a bad week.
• Won't share your writing with advertisers, ever.

PRIVATE BY DESIGN

Your task text, braindumps, and Room chats are stored on Otterly's servers so you can sign in on a new phone. They're not sold, not shared, and not used to train third-party AI models (confirmed in writing with our providers). Delete your account from Settings; everything you wrote is gone within minutes.

FREE, FOREVER

Otterly is free to use forever. Deep Shrink — the tier that breaks bigger tasks into gentler steps — is a one-time purchase or a small monthly subscription. Vouchers are available for anyone who can't afford it; email support@getotterly.com.

MADE WITH AI, HONESTLY

Task Shrinker and the Room use Anthropic's Claude, invoked through Emergent's API. Voice-to-text uses OpenAI Whisper. Nothing you say or type is used to train those models. If a message ever mentions self-harm, Otterly appends a crisis hotline — it never routes you away from your task.

IF YOU'RE IN CRISIS

Otterly is not a mental health app. If you're in danger, please contact your local crisis line — the US 988 Lifeline, the UK Samaritans (116 123), or wherever you are, a trained human is a better companion than an otter.

Made in Manila. Support: support@getotterly.com. Privacy policy: getotterly.com/privacy.
```

---

## 4. Keywords (100 chars, comma-separated, no spaces)

```
adhd,task,focus,timer,productivity,pomodoro,anxiety,calm,break,shrink,body,double,neurodivergent
```

(98 chars including commas.)

---

## 5. What's new in this version (v1.0.0, 4,000 chars)

```
Hello. This is Otterly's first version.

If you've tried three productivity apps this month, we're sorry, and we understand. Otterly won't ask you to build a habit. It'll help you do the next small thing, and it'll be here when you come back next week.

- Task Shrinker: turn one hard thing into a few small ones
- The Room: a quiet AI companion that sits with you while you work
- A softer streak that never punishes a bad week

Thank you for trying it. If it helps you finish one thing, that's why we made it.
— Fernando
```

---

## 6. Support & Marketing URLs

- **Support URL** (required) — `https://getotterly.com/support`
  - Must resolve. Even a single-page "email support@getotterly.com" is fine for launch.
- **Marketing URL** (optional but recommended) — `https://getotterly.com`
- **Privacy policy URL** (required) — `https://getotterly.com/privacy`
  - Already written in `docs/privacy-policy.md`, must be deployed as `privacy.html` before submission (see HANDOFF §5.6).

---

## 7. Age rating

Answer honestly. Otterly should land at **12+**, not 4+, because:

| Question | Answer | Why |
|---|---|---|
| Unrestricted web access | No | The only external URL is the crisis-line handoff |
| Made-for-kids | No | Adults 22–40 |
| Simulated gambling / gambling themes | None | — |
| Cartoon or fantasy violence | None | — |
| **Medical / treatment info** | Infrequent/Mild | The Room may hand off crisis-line numbers |
| **Mature/suggestive themes** | Infrequent/Mild | Users write about their own lives; some will describe hard days |
| **Horror/fear themes** | None | — |
| **Profanity/crude humor** | Infrequent/Mild | User-generated text can contain any language |

**Do not hide the mental-health context.** Apple's guideline 5.1.2 rewards honesty here; opacity gets rejected.

---

## 8. Screenshots (required)

- 6.7" iPhone (1290 × 2796) — 3 to 10 shots
- 5.5" iPhone (1242 × 2208) — 3 to 10 shots
- iPad is not required (`supportsTablet: false`)

**Screenshot order and captions** (draft, tune after seeing on-device):

1. **Onboarding / Welcome** — "One tiny step at a time."
2. **Next tab (home)** — "One thing on the home screen. Never a list."
3. **Task Shrinker (steps view)** — "Break the hard thing into small ones."
4. **Room (Sit-With-Me)** — "A quiet otter to sit with you while you work."
5. **Soft streak (You tab)** — "You showed up 4 of 7 days. That's enough."

Do NOT show the paywall in a screenshot. Apple's screenshot guidelines allow it, but the paywall is a poor first impression and the review team will ding the promise of "free forever" if the first screenshot is a price.

---

## 9. Review notes (App Review, private field)

```
Sign in with Apple is the primary auth on this build. Google sign-in is available via Emergent's managed OAuth as an alternative.

HOW TO TEST PREMIUM FEATURES WITHOUT A REAL PURCHASE
The app supports voucher codes for exactly this case. Please redeem this code
in the app to unlock all premium features (Deep Shrink, unlimited task
shrinks, unlimited braindumps, unlimited Room messages):

  Voucher code: [PASTE A FRESH UNREDEEMED CODE HERE — SEE PIPELINE BELOW]

  How to redeem:
    1. Open the app and skip onboarding (or sign in with Apple).
    2. Go to the "You" tab (bottom right).
    3. Tap "Have a voucher?"
    4. Enter the code above, tap Redeem.
    5. Premium features unlock immediately — Deep Shrink appears in the
       shrinker, and daily caps are removed.

The code is single-use, so please use only the one code we minted for App
Review. If it does not work, contact support@getotterly.com and we will
mint a fresh one within an hour.

Voucher pipeline (for our own reference — do not include in the actual
Review Notes field): before submission, mint at least 3 codes in the
production database via `backend/scripts/mint_vouchers.py --count 3 --batch
apple-review --expires 2027-12-31`, redeem one on a real device to confirm
the whole pipeline works end-to-end, then paste a DIFFERENT unredeemed code
into the notes above.

CONTENT MODERATION
The Room uses Anthropic Claude with a system prompt that appends crisis-line
numbers on any self-harm disclosure. This is a client-visible backstop, not
a routing mechanism — users still get their reply. Backend test coverage in
tests/test_safety_referral.py.

IN-APP PURCHASES
Two products only.
  - otter_lifetime  (non-consumable, $29)
  - otter_monthly   (auto-renewable, $4.99)
The paywall lists only what the server actually gates (Deep Shrink). Prices
are pulled from RevenueCat at runtime and shown in the local currency.

ACCOUNT DELETION
Settings > Delete account. Removes all user-written data (tasks, steps,
braindumps, Room transcripts, sessions) within minutes. See DELETE
/api/account. Complies with Apple 5.1.1(v).

AI DISCLOSURE
Task Shrinker and the Room use Anthropic Claude via Emergent's API.
Voice-to-text uses OpenAI Whisper. Neither Anthropic nor OpenAI trains on
data sent through Emergent's API (confirmed in writing).

SUPPORT
support@getotterly.com is a live inbox and is monitored during review.
```

---

## 10. Version + build

Bump these in `frontend/app.json` before every submission:

| Field | v1.0.0 |
|---|---|
| `expo.version` | `1.0.0` |
| `expo.ios.buildNumber` | Increment on every EAS build (`1`, `2`, `3`...) |
| `expo.android.versionCode` | Increment on every EAS build |

---

## 11. Rationale — why the copy reads this way

Every line was chosen against `DESIGNER_BRIEF.md` §1–4 (anti-overwhelm), §7 (tone), and the audit findings in `docs/2026-07-17-launch-readiness-audit.md`.

- **"Task lists are the disease, not the cure"** — this is the wedge. Every ADHD app on the store sells you a to-do list. Naming that as the problem is Otterly's differentiator.
- **"No fire. No shame for the days you didn't."** — the DESIGNER_BRIEF explicitly names Finch's streak mechanic as the thing users quit. The copy says out loud that we don't do that.
- **"Free, forever"** — required for App Store 5.1.1(v). If the paywall gates existing functionality (it doesn't — only Deep Shrink), Apple would reject on price-anchor grounds.
- **"Made with AI, honestly"** — Apple's Guideline 4.3 flags apps that hide their AI usage. Naming Claude and Whisper by name pre-empts a "your app appears to use generative AI, please disclose" rejection.
- **"If you're in crisis, please contact your local crisis line"** — Apple 1.4 requires it and it's the right thing to write. Do not omit this to shorten the description.
- **Age 12+, not 4+** — Apple 5.1.2 has rejected productivity apps that hid mental-health content behind a 4+ rating. The Room can hand off crisis numbers; 12+ names that.

---

## 12. What's still needed before you can hit Submit

Blocker checklist (mirrors HANDOFF §5, with the copy-side items done here):

- [ ] `support@getotterly.com` inbox exists and is monitored ✅ (live per EMERGENT-DEPLOY-CHECKLIST §4)
- [ ] `getotterly.com/privacy` deploys with `docs/privacy-policy.md` ✅ (live per EMERGENT-DEPLOY-CHECKLIST §4)
- [ ] `getotterly.com/support` resolves (even a stub) ✅ (live per EMERGENT-DEPLOY-CHECKLIST §4)
- [ ] `getotterly.com` marketing homepage is live
- [ ] Screenshots captured on a real device from an EAS build
- [ ] Two IAP products created in App Store Connect + RevenueCat
- [ ] **Mint 3 vouchers in the PRODUCTION database** (not local); redeem one on TestFlight to confirm the pipeline; paste a DIFFERENT fresh code into §9. See `docs/EMERGENT-DEPLOY-CHECKLIST.md` §3.
- [ ] `expo.ios.buildNumber` bumped on the build being submitted
- [ ] Real `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (starts with `appl_`, NOT `test_`) and `REVENUECAT_WEBHOOK_SECRET` set on Emergent's production environment before the first TestFlight sandbox purchase — otherwise premium won't grant. See `docs/EMERGENT-DEPLOY-CHECKLIST.md` §1–2.
