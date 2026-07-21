# Otterly submission pack — paste-ready

App: `com.getotterly.app` · App Store Connect app id `6792152908` · v1.0.0

Everything below is a value to paste. Section 1 is the worklist. Sections 2-8 are the backup detail and the reasoning, if a reviewer or you ever ask why.

Two things I could not produce for you (see §7 and §9): the voucher code itself, and confirmation of Apple's exact current age-rating question wording.

---

## 1. THE CHECKLIST — work top to bottom

### A. App Store Connect > your app > App Information

| Field | Paste this |
|---|---|
| Name | `Otterly: Start, Not Alone` (25 chars) |
| Subtitle | `Calm ADHD task starter` (22 chars) |
| Primary category | Productivity |
| Secondary category | Health & Fitness |
| Content Rights | Select **"No, it does not contain, show, or access third-party content"** |
| Age Rating | Click Edit, answer per §3 below |

Do NOT pick `Medical` as a category.

### B. App Information > Age Rating (the questionnaire)

Answers in §3. Summary: every content question is **None**, every capability question is **No**, expected result **4+**. If Apple's wording forces a Yes anywhere, §3 tells you what to do.

### C. Version 1.0.0 > App Store tab

| Field | Paste this |
|---|---|
| Promotional Text | see §4 |
| Description | already drafted in `docs/2026-07-17-app-store-copy.md` §3, paste unchanged |
| Keywords | `adhd,task,focus,timer,productivity,pomodoro,anxiety,calm,break,shrink,body,double,neurodivergent` (96 chars) |
| Support URL | `https://getotterly.com/support` |
| Marketing URL | `https://getotterly.com` |
| Privacy Policy URL | `https://getotterly.com/privacy` |
| Screenshots, 6.9" iPhone | 1320 x 2868 px portrait. See §6 for the 5 shots and captions |
| Copyright | `2026 Fernando Academia` |
| What's New | already drafted in `docs/2026-07-17-app-store-copy.md` §5, paste unchanged |

No iPad set. `frontend/app.json:12` has `"supportsTablet": false`.

### D. Version 1.0.0 > App Review Information

| Field | Paste this |
|---|---|
| Sign-in required | **Yes** |
| Demo account | leave blank, the notes explain Sign in with Apple |
| Notes | §5, after you drop the voucher code in |
| Contact first / last / phone / email | your own |
| Attachment | none |

### E. Subscriptions (the auto-renewable `otter_monthly`)

Two places want a Terms of Use link. Paste Apple's standard EULA in both:

```
https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

- App Information > **License Agreement**: leave on "Apple's Standard License Agreement" (do not upload a custom one).
- Subscription Group > localization > **Terms of Use** / any "Terms of Use (EULA)" field on the version page: paste the URL above.

Detail and the alternative in §8.

### F. Before you hit Submit

- [ ] Voucher minted against **production** (§7) and one redeemed on TestFlight to prove it works
- [ ] A **different, unredeemed** code pasted into the review notes
- [ ] `expo.ios.buildNumber` bumped, build processed and selected
- [ ] `getotterly.com/privacy` and `/support` both load
- [ ] `EXPO_PUBLIC_REVENUECAT_IOS_KEY` is the `appl_` key, not `test_`
- [ ] Manual release toggle set the way you want it

---

## 2. What the app actually does (the evidence the rest of this doc rests on)

- The Room is chat with an LLM, not with people. `backend/server.py:1394` `ROOM_SYSTEM`, `server.py:1408` `POST /api/room/message`. Messages are stored per-owner in `db.room_messages` and are never shown to another user.
- Task text goes to Anthropic Claude via Emergent's proxy. No user sees another user's text.
- Self-harm disclosure appends a hotline referral, it does not route away. `server.py:362` `SELF_HARM_RE`, `server.py:374` `ensure_referral`.
- The Shrinker refuses to decompose medical, crisis, and harm-to-others tasks *before* the LLM runs. `server.py:432` `classify_task_safety`, refusal strings at `server.py:412-418`.
- The medical gate catches treatment **alteration** only, and deliberately lets routine care admin through. `server.py:392` `MEDICAL_RE` with the comment at `:388-391`: "take my meds", "book a doctor", "schedule therapy" must NOT match.
- Crisis screen is a list of hotline numbers that dial out via `tel:`. `frontend/app/crisis.tsx:20-22`, and it says in copy: "Otterly is a companion, not a therapist."
- No in-app browser. Repo-wide the only two outbound links are `tel:` (`crisis.tsx:30`) and the privacy policy (`you.tsx:440`). No `WebView`, no `openBrowserAsync`.
- No ads, no analytics SDK, no gambling, no violence, no user profiles, no feed, no sharing.

---

## 3. Age rating questionnaire — exact answers

**Caveat, read this.** Apple rebuilt this questionnaire in 2025 and added new age bands (13+, 16+, 18+) plus a set of "capability" questions. I am giving you the answer for each question by *what it asks*, not by a memorised label, because the labels move. If a question on your screen does not match one below, match on meaning and use the reasoning. Verify the resulting rating in the console before you save.

### Content questions — all None

| Question | Answer | Why |
|---|---|---|
| Cartoon or Fantasy Violence | None | No violence anywhere. The Shrinker actively refuses harm tasks, `server.py:405` `HARM_RE` |
| Realistic Violence | None | Same |
| Prolonged Graphic or Sadistic Realistic Violence | None | Same |
| Sexual Content or Nudity | None | No such content, and no way for a user to see another user's text |
| Profanity or Crude Humor | None | The app produces none. A user can type anything into their own private notes, which Apple does not rate. See the note below |
| Alcohol, Tobacco, or Drug Use or References | None | Never referenced. The medical gate at `server.py:392` refuses tasks about medication changes rather than discussing them |
| Mature or Suggestive Themes | None | See the note below |
| Horror or Fear Themes | None | The design brief is explicitly low-stimulation and calm |
| Simulated Gambling | None | No mechanics of any kind |
| Contests | None | None |
| **Medical or Treatment Information** | **None** | The reasoning is below. This is the one to get right |

### Medical or Treatment Information — why None

Otterly gives no treatment information, makes no health claim, and structurally refuses to. Three pieces of code say so:

1. `server.py:392` `MEDICAL_RE` is a hard gate that runs **before** the LLM (`server.py:1046`) and blocks any task about stopping, tapering, dosing, or self-medicating. It returns a fixed refusal, `server.py:413`: "This one is medical, and I'm not the right tool for it. Please talk to a doctor or pharmacist."
2. `ROOM_SYSTEM` at `server.py:1394` instructs: "Never diagnose, never give medical advice."
3. `frontend/app/crisis.tsx:53` says in the product itself: "Otterly is a companion, not a therapist."

Crisis hotline numbers are a **referral out**, not treatment information. That is the same thing a note app does when it links 988. Apple's question is about apps that provide medical or treatment content, and Otterly's entire safety architecture is the refusal to.

The word ADHD appears in the description. That is an audience descriptor, not a treatment claim. The description already carries the disclaimer: "Otterly is not a mental health app."

**If you want to be conservative**, answering `Infrequent/Mild` here pushes the rating up one band. It costs nothing in the product and closes the argument. My recommendation is still None, because a Yes here invites the question "what treatment information do you provide?" and the honest answer is "none".

### Capability questions — the ones that trip people

| Question | Answer | Why |
|---|---|---|
| Does the app include **messaging or chat between users**? | **No** | The Room is one user and an LLM. `server.py:1408` stores messages per `owner` and never serves another owner's rows. There is no user-to-user path in the codebase |
| Does the app include **user-generated content** that users share or that others can see? | **No** | Users write tasks, braindumps, Room messages. All private to their own account. No feed, no profiles, no sharing, no export-to-public |
| **Unrestricted web access** | **No** | No `WebView`, no in-app browser. The only outbound links are `tel:` hotline dials (`crisis.tsx:30`) and one fixed privacy URL (`you.tsx:440`) |
| Advertisements | No | No ad SDK in the tree |
| In-app purchases | Yes | `otter_lifetime` and `otter_monthly` |
| Made for Kids | No | Adult audience |
| Real-money gambling | No | — |

**If Apple's messaging question is worded without "between users"** (some versions just say "messaging or chat"), answer **Yes** and add this line to the review notes: "The Room is a text chat with an AI companion only. There is no user-to-user communication anywhere in the app." Same for the UGC question: if it does not mention sharing or visibility, answer Yes and lean on the same note.

**Expected outcome: 4+.** The prior draft in `docs/2026-07-17-app-store-copy.md` §7 argued for 12+ and answered several of these Infrequent/Mild. That draft was reasoning about user-typed private text as if Apple rates it. Apple rates what the app presents. I recommend the answers above. If a 4+ makes you nervous given the subject matter, the single cheapest hedge is Medical/Treatment = Infrequent/Mild.

---

## 4. Content rights + promotional text

**Content Rights Declaration:** answer **No, it does not contain, show, or access third-party content.** All art is original (regenerated 2026-07-17, per `docs/EMERGENT-DEPLOY-CHECKLIST.md` §5), all copy is yours, and LLM output generated for the user under a commercial API license is not third-party content in Apple's sense. Public crisis hotline numbers are facts, not licensed content.

**Promotional Text** (146 chars, fits 170):

```
For days you can't start. Otterly picks one small step for you, then sits with you while you do it. No streaks that shame you. No lists that grow.
```

---

## 5. Subtitle

| Option | Chars | Note |
|---|---|---|
| **`Calm ADHD task starter`** | 22 | Recommended. The 2026-07-17 doc claimed 29, it is actually 22 |
| `Calm task starter for ADHD` | 26 | Reads more like a sentence, same keywords |
| `ADHD task starter, no lists` | 27 | Adds the wedge ("no lists"), spends the comma |

All three fit the 30 limit and all three carry `adhd` + `task` for ASO. Keep the recommended one and move on.

---

## 6. Review notes — paste this

Replace the one bracketed slot. Nothing else needs editing.

```
SIGN-IN IS REQUIRED to test premium features. Sign in with Apple is the
primary auth on this build and works with any Apple ID. Google sign-in is
available as an alternative. Browsing the free tier does not require an
account.

TESTING PREMIUM WITHOUT A PURCHASE

We have minted a voucher code for App Review. To use it:

  1. Open the app. Complete or skip onboarding.
  2. Go to the "You" tab (bottom right).
  3. Sign in with Apple. The voucher row only appears once signed in.
  4. Tap "Have a voucher?"
  5. Enter this code and submit:

        >>> VOUCHER CODE: ______________________  <<<

  6. Premium unlocks immediately. Deep Shrink appears in the Shrinker and
     the daily caps are removed.

The code is single-use. If it does not work, email support@getotterly.com
and we will send a fresh one within the hour.

WHAT THE APP IS

A task-starter for adults with ADHD. Two core features: the Shrinker breaks
one task into small physical steps, and the Room is a text chat with an AI
companion that sits with the user while they work.

There is no user-to-user communication anywhere in the app. The Room is the
user and an AI only. Tasks, notes, and Room messages are private to the
account that wrote them and are never shown to anyone else.

AI DISCLOSURE

The Shrinker and the Room use Anthropic Claude via Emergent's API.
Voice-to-text uses OpenAI Whisper. Neither provider trains on data sent
through this API.

SAFETY

Otterly is not a mental health app and provides no medical or treatment
information. The Shrinker refuses to break down any task involving
medication changes, self-harm, or harm to others, and returns a referral
instead (backend/server.py, classify_task_safety). If a Room message
mentions self-harm, the reply appends crisis hotline numbers. A crisis
screen with hotlines for US, PH, UK, CA and AU is reachable in-app.

IN-APP PURCHASES

  otter_lifetime  non-consumable, $29
  otter_monthly   auto-renewable, $4.99/month

The paywall gates only Deep Shrink and the daily caps. Everything shown in
the free tier stays free.

ACCOUNT DELETION

You tab > Delete account. Removes all user-written data within minutes.
Complies with 5.1.1(v).

SUPPORT

support@getotterly.com is monitored throughout review.
```

Why the rewrite: the old notes said "No account is required" and then told the reviewer to redeem a voucher. Redemption is gated on `status === "authed"` at `frontend/app/(tabs)/you.tsx:346`, so the voucher row does not render until sign-in. A reviewer following the old notes would have looked for a row that was not on screen and filed a 2.1.

---

## 7. Voucher code — what to run

**There is no admin endpoint. By design.** `backend/scripts/mint_vouchers.py` is the entire privileged surface, stated in its own docstring and in `docs/EMERGENT-DEPLOY-CHECKLIST.md` §3. Redemption is `POST /api/vouchers/redeem` at `backend/server.py:717`, gated on `require_user`.

The script writes to whatever `MONGO_URL` its shell has. Your laptop does not have the production one, and `backend/.venv` does not exist locally. **This must run in a shell on the deployed backend.**

Run this there:

```
cd backend && ./.venv/bin/python scripts/mint_vouchers.py \
    --count 3 --batch apple-review --expires 2027-12-31
```

It prints three codes as `OTTER-XXXX-XXXX`. Then:

1. Redeem **one** on the TestFlight build to prove the production DB, the production backend, and the app all agree.
2. Paste a **different** one into the review notes slot in §5.
3. Keep the third as the spare you mention in support email.

**I did not run this and did not touch production.**

**One thing to check first:** the repo carries both `fly.toml` (app `otterly-api`, region `sin`) and an Emergent deploy checklist. I could not verify from the repo which one is actually serving production today. Whichever it is, the shell command is the same:

- Fly: `fly ssh console -a otterly-api` then the command above
- Emergent: open the deployment shell in the Emergent dashboard, then the command above

If `./.venv/bin/python` does not exist in the container, use plain `python scripts/mint_vouchers.py ...` — the Dockerfile installs deps into the system environment, not a venv.

---

## 8. Screenshots

**Size:** 6.9" iPhone, **1320 x 2868 px** portrait (or 2868 x 1320 landscape). 1290 x 2796 is also accepted in the 6.9" slot. RGB, no alpha channel, no rounded corners, no device frame required.

**Count:** Apple accepts up to **10**. As of the 2025 change only the 6.9" set is required and other sizes are auto-generated from it. The minimum is **1**, but the product page shows the first **3** on the install sheet, so ship 5. *Verify the minimum in the console — Apple has moved this number more than once.*

**The five shots, in order.** First three carry the whole pitch because they are what people see without scrolling.

| # | Screen | Caption |
|---|---|---|
| 1 | Next tab (home), one task showing | One thing. Never a list. |
| 2 | Shrinker, steps view, a real task broken down | The hard thing, cut into small ones. |
| 3 | The Room, mid-conversation | A quiet otter sits with you while you work. |
| 4 | Braindump / Inbox after a dump | Dump the noise. Get a short list back. |
| 5 | You tab, soft streak showing an incomplete week | You showed up 4 of 7 days. That is enough. |

The Shrinker is the wedge and the Room is the differentiator, so they take slots 2 and 3. Do not screenshot the paywall.

---

## 9. Terms of Use

Guideline 3.1.2 requires a functional Terms of Use link with an auto-renewable subscription. `getotterly.com/terms` currently redirects to the homepage, so it cannot be used.

**Zero-work option, do this:** paste Apple's standard EULA URL in every Terms of Use field:

```
https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

And leave App Information > License Agreement set to Apple's Standard License Agreement. This is explicitly the path Apple documents for developers who do not have their own EULA. It is not a workaround.

**The alternative** is writing your own terms and deploying them at `getotterly.com/terms` on the same Cloudflare Pages site that already serves `/privacy` and `/support`. Half a day of work and a document you then own forever. Not worth it today.

**Flag, worth 10 minutes after submission:** the app binary has a privacy link (`you.tsx:440`) but no Terms link, and `frontend/app/paywall.tsx` has neither. Apple has rejected apps for 3.1.2 over a missing in-binary Terms link on the purchase screen. It did not block this submission in the audit, but if you get a 3.1.2 rejection, adding two links under the buy buttons in `paywall.tsx` is the fix.
