# Otterly first-run onboarding. Seven screens. Final.

Built from the B1 brief. Walks a new user down the four intervention tiers in order. Filter-passed against the ADHD/PH checklist and house style.

Flow rules carried throughout. Muted low-stimulation palette, slow cross-fades, no sound unless noted. No progress bar and no step counter. A progress indicator is a list, and no list is ever visible anywhere in the flow. Exactly three user decisions exist: the task named on S3, done or not now on S5, and the check-in binary on S7. Every other screen has one soft continue. Tier 3 runs through the whole flow as absence: no categories, no menus, no settings, no list. The otter first appears on S4, delivering the shrink, so relatedness and structure land in the same moment. The otter speaks in first person from S4 on and is never chatty.

---

## S1. Arrival

Headline: Can't start? You're not broken.

Support: Stress takes your planning brain offline. Otterly holds the plan for you.

The one action: Continue. Single soft button labeled Okay.

Micro-interaction notes: Slow fade in from the app's calm base color. Headline appears first, support follows after a beat. No logo splash, no illustration, no carousel dots, no sign-in prompt. The button sits low, soft, full-width. Nothing animates while the user reads.

Labels: Tier 4 seed. Mechanism: felt state first, permission-to-not-be-broken. Task paralysis framed as regulatory failure, not character flaw, grounded in the chemistry-over-circuitry finding that acute stress chemically disconnects the prefrontal cortex. SDT need: none yet. This screen only lowers threat.

---

## S2. The breath

Headline: One breath first.

Support: Ten seconds. Long, slow exhale.

The one action: None required. The breath plays on its own.

Micro-interaction notes: A single pale circle expands for about four seconds and contracts for about six, cueing one prolonged sighing exhale, inside the framework's 4 to 6 breaths per minute band. One cycle, then auto-advance. A single soft haptic on the exhale is a build decision, not a user setting. No toggle appears anywhere in the flow. No sound by default. Skip sits in a corner, low contrast, labeled only Skip. No confirmation, no comment if tapped. Tapping it fades forward with the same warmth as finishing. No countdown numbers, no science copy on screen.

Labels: Tier 1. Mechanism: vagal stimulation via paced breathing with a prolonged sighing exhalation, downregulating arousal before any structure is offered. SDT need: none. This screen serves the body.

---

## S3. One thing in

Headline: What's the one thing you can't start?

Support: Type it or say it. Your words are enough.

The one action: Enter the task. Single text field with a mic button. Decision one of three.

Micro-interaction notes: Keyboard opens on arrival. Large type, warm placeholder in a real register, for example "reply to that email". Mic button beside the field, press and hold to speak. Mic permission is requested only on first press, never before. No categories, no due date, no priority, no character counter, no suggestions. Whatever they enter is accepted as written. The soft continue, labeled Okay, activates when anything is entered.

Labels: Tier 2 begins. Mechanism: externalizing working memory, moving the task out of the head and into the app. SDT need: autonomy, fully satisfied here. Their task, their words, untouched.

---

## S4. The shrink

Headline: The first tiny step, in their context. Example: Open the email.

Support: I'm holding the rest. You only ever see one thing.

The one action: Continue. Soft button labeled Okay.

Micro-interaction notes: The otter appears here for the first time, small, lower corner. It slides the step into view like it is handing it over, then settles. The step is Shrinker-generated, always a physical verb, under ten words, shown in large type with generous space. The full step path is computed and stored but never rendered. No step counter, no "1 of 6", no preview of what follows. If generation takes more than a beat, the otter waits calmly, no spinner.

Labels: Tier 2. Mechanisms: micro-stepping and the next-action method, pushing element interactivity below the freeze threshold. SDT needs: competence is set up, relatedness begins. The otter delivers the structure so both land in one moment.

---

## S5. Sit with me

Headline: I'll sit with you while you do it.

Support: No timer. No watching. Tap Done whenever you get back.

The one action: Done. Decision two of three. A quiet Not now sits below, low contrast, no confirmation, no follow-up copy.

Micro-interaction notes: Screen dims slightly. The step remains visible above in smaller type. The otter settles into a quiet idle loop, breathing slowly, an occasional slow blink, saying nothing. No countdown, no pulsing button, no camera, mic stays off. Done is large, calm, always reachable. If the app is backgrounded, nothing scolds on return. Done and Not now lead to the same gentle transition.

Labels: Tier 2 execution with Tier 1 co-regulation. Mechanism: body-doubling as co-regulation, the Room introduced in miniature, answering the loneliness-to-impairment link in the framework. SDT need: relatedness. Someone is here, asking nothing.

---

## S6. The win

Headline: That counts.

Support: You started. That was the hard part.

The one action: Continue. Soft button labeled Okay.

Micro-interaction notes: One quiet ripple spreads outward from the center and settles, slow easing. No confetti, no sound spike, no points, no score, no share prompt. A single soft haptic here is a build decision, not a user setting. The otter gives one small nod and returns to stillness. If the user chose Not now on S5, the headline becomes Still here. That counts. and the support line becomes The step will wait. The ripple appears either way, because ripples mark showing up, not finishing.

Labels: Tier 4. Mechanisms: competence through a completed micro-step, self-compassion, shame-loop interrupt. Celebrating smallness plainly keeps the win from being appraised as a fluke. SDT need: competence.

---

## S7. How Otterly behaves

Headline: No lists. No badges. No nagging.

Support: Want me to check in gently sometimes? Either answer is right.

The one action: The binary. Decision three of three. Two buttons of equal size and weight: Check in gently and Stay quiet. Neither is preselected. Stay quiet costs nothing and triggers no follow-up.

Micro-interaction notes: After the tap, crossfade straight to the one-thing home screen. It shows the single next step of their named task and the otter resting in the corner. No tour, no tooltips, no feature carousel, no account wall. Onboarding ends inside the product, not at a signup form. The promise on this screen is the product behaving.

Labels: Tier 3 made visible once, the binary choice rule, with choice load held near zero everywhere else. Tier 4 tone throughout. Mechanisms: autonomy through opt-in contact, anti-hustle positioning, stating what Otterly will never do. SDT need: autonomy. They set the terms of contact.

---

## Open product decisions for Fernando

1. Sign-in placement. The brief bars an account gate before the win. If auth is required for sync or server-side shrinking, it lands after S6 at the earliest, ideally deferred to the second session. Needs an engineering answer on whether the first shrink can run anonymous or fully local.
2. Shrink latency and offline fallback. The first win must land inside 60 seconds of the shrink appearing. If generation can exceed roughly two seconds or the user is offline, ship a cached universal first step, for example "Stand up." A frozen user cannot wait.
3. Mic permission timing. The mic button on S3 triggers the iOS dialog mid-flow. Recommend keyboard-first with the permission prompt deferred to the first deliberate mic press. Confirm.
4. Notification permission timing. If the user picks Check in gently, recommend deferring the iOS notification prompt to the first real check-in moment, not S7. Confirm.
5. Taglish at launch. PH-first. Decide whether S1, S3, and S5, where register lands hardest, ship a Taglish string set selected silently by device locale, with no language question added to the flow.
6. Skip branch behavior. After Not now, decide whether the S7 home screen shows the same step or a smaller regenerated one on next open.
7. Breath recurrence. This flow covers first run only. Decide whether the ten-second breath also opens later cold starts, and whether that is default or opt-in.
8. Energy pill stays out of first run per the three-decision cap. Confirm it introduces itself on day two or later.
9. Crisis resource placement. The ethical checklist requires the PH crisis line, National Center for Mental Health 1553 or (02) 7989-USAP, to be named in wellness content. It cannot enter the seven screens without breaking the no-list and low-load rules. Decide where it lives: App Store listing, a quiet row in settings, or both. It must exist somewhere before launch.
10. S3 stall path. S3 is the only screen with no zero-cost exit. A user who freezes at the empty field has no way forward. Decide the fallback, for example the placeholder becoming tappable after a long idle, accepted as their task. Any fallback must not read as a suggestion list.

---

## Copy trade-offs still on the table

1. S6 support "That was the hard part." claims the rest is easier. If a user stalls on step two, the line can read back as a broken promise. Airtight alternative: "Starting is the hardest part." Present tense, general truth, no claim about their remaining steps. Kept as written because past tense lands the win harder. Your call.
2. Skip-state support "The step will wait." personifies the step as waiting on the user. For a PH reader sensitive to obligation, waiting can carry a faint debt tone. Alternative: "It keeps until you want it." Confirm.
3. S3 continue label Okay keeps the flow's single continue label, but Okay after typing your own task may feel flat in Taglish. If the Taglish string set ships, this label is the one most worth localizing.
