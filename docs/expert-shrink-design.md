# Expert Shrink — Design Document

Status: DESIGN ONLY. Approved concept, not scheduled. Builds after the current seven-item quality batch ships. Nothing in this doc is implemented.

Model routing (decided): standard shrink on Sonnet 5. Deep Shrink (premium) on Opus 4.8. Expert Shrink on Fable 5.

## The one constraint that shapes everything

The core Shrinker exists for a frozen, high-arousal user who cannot take friction. An interview is friction. Those two facts do not reconcile. So Expert Shrink is not a bigger Shrinker. It is a different tool for a different moment: a calm-mode, deliberate session for one big task the user chooses to go deep on. The user opts in with a purchase. That purchase is the proof of calm. A frozen user never sees this feature. Every section below inherits this constraint.

## 1. Positioning

One-line pitch: "Ten quiet questions become a plan built around your actual life."

Shorter, for the store card: "A short conversation. A plan made for you."

What it is: a paid session where Otterly asks two to four short questions about one big task, then produces a plan tailored to the user's real blocker, resources, and deadline. The single biggest lever on plan quality is input quality. The interview gets the context the model otherwise guesses.

Who it is for:
- A user in a settled moment with one large, important task. Renew the passport. Ship the client deck. Clear the BIR backlog. Write the eulogy.
- A user whose standard shrink did not land. They tapped "Still too big," or they abandoned the plan, and the task still matters.
- A user who flagged a task as big or important at creation.

Who it is NOT for, stated as product law:
- A frozen user who needs one step now. They get the standard Shrinker. Instantly. No upsell in that path.
- Small and medium tasks. The standard shrink already wins there, and an interview on "empty the dishwasher" is insulting.
- Onboarding. A new user has earned zero trust and is likeliest to be overwhelmed.
- The Room. The Room is a companion, not a sales surface.

Expert Shrink competes with a blank notebook and a Sunday-night spiral, not with the free Shrinker.

## 2. The interview

### Shape

Two to four questions. Adaptive, not a form. Fable picks the next question from the prior answers and skips anything already known from the task title, note, and difficulty. The whole exchange targets under three minutes.

Rules that make it relief instead of homework:
- One question per turn. One line of warm framing, then the question. No preamble stacks.
- Every question offers tap-chips plus free text. Chips carry the common answers so typing is optional.
- Every question shows "Skip." A "Shrink with what I have" button is visible on every turn. Skipping never degrades tone and never gets mentioned again.
- Answers are accepted as given. No follow-up interrogation of an answer. No "tell me more" unless the answer was a chip that requires one disambiguation.
- Fable reflects before it asks. "Deadline Friday, and the numbers are the scary part. One more question." The user should feel heard, not processed.
- The emotional question is always optional, always last, and always chip-first. The interview asks about the task. It invites, and never digs for, feeling.

### What the interview elicits

Priority order. Fable asks for the highest-value missing items and stops at four questions total.

1. The real blocker. What actually stops the start. Not the task, the snag.
2. Deadline and hard constraints. Dates, dependencies, office hours, other people.
3. Resources at hand. Documents, logins, people who can help, money available.
4. What has been tried. Prevents the plan from re-prescribing a failed approach.
5. Energy and emotional weight. Optional. Calibrates step size and tone.

### Example flows

Work deliverable. Task: "Finish the Q3 board deck."

- Q1 (blocker): "What part of the deck stops you when you open it?" Chips: The numbers / The story / The design / Starting at all.
- User taps The numbers, types "finance hasn't sent the actuals."
- Q2 (constraint, adapted): "When does it need to leave your hands, and can anyone else chase finance?" Chips: This week / Next week / It's late already.
- User: "Board is Thursday. My manager could chase but I haven't asked."
- Q3 (tried): "What have you already done on it?" Chips: Nothing yet / An outline / A messy draft.
- Fable skips Q4. It has a blocker, a date, a delegation path, and a state. "Thursday, blocked on finance, a draft exists. I can work with that." Generate.

Dreaded admin task. Task: "Renew my passport."

- Q1 (blocker): "What's the part you've been dreading?" Chips: The DFA appointment site / Missing documents / Taking a day off / I don't know the steps.
- User taps The DFA appointment site.
- Q2 (constraint): "Any date you must have it by, like a trip?" Chips: Yes, a trip / No, just expired / Not sure it's expired.
- User: "Flight in October."
- Q3 (resources): "Do you know where your old passport and PSA birth certificate are?" Chips: Yes both / One of them / No idea.
- Generate. The plan can now front-load the appointment hunt, park document retrieval as a parallel track, and size urgency honestly against October.

Emotionally loaded personal task. Task: "Sort Papa's things."

- Q1 (blocker, softened): "Is the hard part the deciding, the memories, or the sheer amount?" Chips: Deciding what to keep / The memories / How much there is / Other people's opinions.
- User taps The memories.
- Q2 (resources, adapted): "Would you want company for it, or is this one you do alone?" Chips: Someone with me / Alone / Alone, but with the Room open.
- Q3 (energy, optional, offered because the load is visible): "How are you carrying this right now?" Chips: Okay / Heavy / Skip this one.
- Fable stops at three. The plan that follows uses shorter sessions, builds in stopping points, and offers the Room by name. No fourth question. Restraint is the feature.

## 3. Safety on interview inputs

An interview draws out more disclosure than a task title ever will. The dreaded-admin question and the emotional question are open doors. So safety runs harder here, not softer.

Enforcement across the multi-turn interview:

1. Every answer, every turn, passes the deterministic gate before anything else. The same `classify_task_safety()` taxonomy the Shrinker uses (crisis / harm / medical / ok) runs on the raw answer text server-side, before the answer joins the transcript and before Fable sees it. Not once at the start. Every turn.
2. A crisis verdict ends the interview immediately into the calm SafetyPause with the right resource (988 US, 116 123 UK, NCMH 1553 PH). No further questions. Nothing generated. The purchase is not consumed, and the credit stays on the account. A safety stop must never cost the user money.
3. A medical verdict on an answer deflects that thread ("that part belongs with your doctor") and the interview continues on the task if the task itself is ok-class. Treatment alteration and dosage content never enter the generation brief.
4. `ensure_referral()` runs on every Fable interviewer reply, same as the Room. If the model misses a cue the append backstop does not.
5. Fable's interviewer persona inherits the Room's rules verbatim: no shame, no diagnosis, no clinical advice, no cheerleading, crisis routing on disclosure. Additions specific to this surface: never probe an emotional answer deeper, never ask a second emotional question, accept "Skip" as a complete answer.
6. The compiled generation brief is gated once more as a whole before the shrink call, because meaning can assemble across answers that each pass alone.
7. Transcript handling: interview transcripts store with the same retention and deletion behavior as Room messages, and delete-account removes them. They exist to build one plan, not to profile the user.

The output side is unchanged and non-negotiable: everything Fable generates still passes `_validate_steps`, `STEP_UNSAFE_RE`, and the shame regex. Expert Shrink gets a better brief, never a looser harness.

## 4. The generation handoff

The transcript does not go to the model raw. The interview closes by compiling a structured brief:

```
task: <title + note + difficulty>
blocker: <answer or "unknown">
deadline: <answer or "none stated">
constraints: <answers or "none stated">
resources: <answers or "unknown">
tried: <answer or "nothing yet">
state: <answer or "not asked">
```

Skipped questions compile to explicit unknowns. The system prompt instructs Fable to plan around an unknown, never to invent an answer for it.

The brief plus an `EXPERT_SHRINK_SYSTEM` prompt (a superset of `SHRINK_SYSTEM`, all existing rules intact) goes to Fable 5. How the output differs from a standard shrink:

- Depth. A standard shrink is one flat run of 2 to 6 steps. An Expert Shrink may return phases, each phase its own 2 to 6 step run with a name and its own activation step. The client still shows one step at a time. Progressive disclosure carries the size, exactly as it does today. Phases live behind "Phase 2 of 3: Documents" the way steps live behind "4 more steps."
- Tailoring. Steps name the user's actual world. "Message your manager to chase finance today" beats "follow up on the data." The activation step is calibrated to stated energy: a "heavy" answer gets a smaller, gentler first move.
- The blocker gets attacked first. The plan's early steps route around or through the named blocker, because that is the thing that actually stops the start.
- Contingency. Where the blocker involves another person or an external system, one step is the fallback ("If no reply by Wednesday noon, send the deck with last quarter's numbers flagged as pending").
- Honest scope. The interview finally gives the harness what section 6.4 of the guardrail spec says it cannot enforce: scope truth. Fable knows what has been tried and how much task there really is, so "Write the report" at 25 minutes stops surviving on ignorance.

Every phase's steps pass the same validator and the same one-shot repair loop. Same harness, richer input, better plan. That is the whole thesis.

## 5. The IAP

Options considered:

- Included in a higher tier. Rejected. Unlimited Fable inside a subscription is a cost hole, and a third tier complicates a two-SKU paywall the app has not even launched with yet.
- One-time unlock, use forever. Rejected for the same cost reason, worse: one $X purchase funding unbounded Fable sessions inverts unit economics permanently.
- Credits, sold in packs. Close, but rejected at v1. A credit balance creates a meta-decision ("is this task worth spending a credit?") and a hoarding loop. Both are executive-function taxes on the exact population the app serves.

Recommendation: a single-session consumable. Buy one Expert Shrink at the moment you choose the task. No balance, no packs, no meta-decision. The purchase and the commitment are the same tap. RevenueCat already handles the two existing products, and a consumable slots in beside them.

Price thinking: launch at $4.99 / ₱249 tier-equivalent per session. Reasoning:
- The stance is raise price for best outcomes. This is the best outcome in the app, on the most expensive model, for the task the user says matters most. It should not be cheap.
- Anchoring: one Expert Shrink equals one month of premium. That reads as "this task is worth a month of the app," which is exactly the framing. It also protects the subscription: premium stays the obvious value buy for everyday use.
- Philippines reality: ₱249 is a real spend, roughly a delivery meal for two. The buyer is not paying for minutes of compute. They are paying to finally start the passport renewal that has cost them three months of dread. Anchor the copy to the outcome, never to the AI.
- Fable cost per session (interview turns plus a deep generation) is bounded by the four-question cap, so a fixed price per session holds a predictable margin.
- Premium subscribers pay the same at v1. A discount is an open question below, not a launch feature.

Price is a hypothesis. The consumable makes it cheap to test moves in either direction.

## 6. Trigger and discovery

The rule before the mechanics: Expert Shrink is never pushed at a frozen user. The offer appears only in calm surfaces, only after evidence, and only once per task.

Offer triggers, in priority order:
1. A standard shrink did not land, twice. Two signals on the same task from: a "Still too big" regranulation, a re-shrink, or an abandonment (shrink created, zero steps done in 24 hours, task reopened). Two, not one. One bad shrink is noise.
2. The user marks a task big or important at creation, once that affordance exists.
3. Passive: a quiet "Expert Shrink" row in the task's own detail menu, always available, never highlighted.

Offer mechanics:
- The offer is one calm card shown when the user opens the qualifying task in a settled context: task open from the Inbox, not mid-shrink, not on an error screen, not after a gate fired.
- One card, one dismissal, gone for that task. Dismissal is not a negotiation.
- Copy names the evidence without shame: "This one keeps coming back. Want to take ten quiet minutes and break it properly, together?" Never "you failed," never "you've been avoiding this."
- Hard exclusions: never in onboarding, never in the Room, never on the 422 safety screen, never attached to a 402/429/502 error state, never on a task's first shrink. The guardrail spec killed the pattern where an error path monetizes a frozen user. That law extends here.

## 7. Success metric and proof

Expert Shrink must demonstrably beat the standard shrink at getting tasks done, measured on the telemetry shipping in the current batch: initiation, completion, abandonment, regranulation. Every event carries a `plan_type` dimension (`standard` / `deep` / `expert`) so the comparison is one query, not a new pipeline.

Primary metric: step initiation within 24 hours of the shrink, and plan completion within 7 days, for Expert Shrink plans versus standard shrinks on comparable tasks (matched on difficulty and the prior-failure trigger, since Expert Shrink selects for tasks that already failed once, which biases against it and makes a win more convincing).

Secondary: regranulation rate on Expert plans should drop toward zero. A tailored plan that still earns "Still too big" taps is not tailored.

The guardrail against feeling thorough: satisfaction is not a success metric here. A beautiful, deeply personalized plan the user admires and never starts is the feature's signature failure mode, and it would score five stars while failing completely. So the proof is behavioral only. Initiation and completion, from the telemetry, against the standard-shrink baseline. A satisfaction prompt may exist for copy tuning, but it never counts as proof.

Interview health metrics, watched but not success criteria: interview completion rate, per-question skip rate, "Shrink with what I have" bail rate, median interview duration. A bail rate over roughly a third says the interview is homework, and the fix is fewer questions, not better copy.

Kill criterion, set now while nobody is attached: at 100 completed Expert Shrink sessions, if 7-day completion does not beat the matched standard-shrink baseline, the feature does not scale. Refund handling and a quiet retirement path get designed before launch, not after.

## 8. Open questions, risks, build outline

### Open questions
- Premium subscriber pricing: same price, discount, or one included session per month? One-per-month is elegant but reintroduces a credit-shaped balance. Decide on data.
- Interview surface: a dedicated chat-like flow, or a themed mode of the Room screen? Reusing the Room's UI is cheaper but blurs the companion/tool boundary the positioning depends on.
- Re-runs: does a purchased session include one free regeneration if the plan misses? Recommend yes, once, since the transcript already exists and a paid miss is trust-fatal.
- Taglish: the deterministic gate is English-anchored. An interview invites longer, more natural, more Taglish disclosure than a task title does. Does Expert Shrink wait for the Taglish pattern set, or launch English-only?
- Store review: consumables tied to AI output need clean "what you get" copy for App Review. Draft early.

### Risks
- Friction leak. The biggest risk is drift: the offer card creeping into hot paths because it converts. The section 6 exclusions need to be encoded as review-checkable rules, not vibes.
- Disclosure liability. More elicitation means more crisis-adjacent text through the system. Mitigated by per-turn gating and the no-charge safety stop, but the volume of gated events needs monitoring from day one.
- Fable cost drift. Longer interviews or retries erode margin silently. Cap turns hard, log cost per session.
- Selection bias undermining proof. Expert Shrink sees the hardest tasks by design. Without the matched-baseline comparison in section 7, the raw numbers will look bad and the feature will be misjudged in either direction.
- A great plan for the wrong task. The interview surfaces what the user believes blocks them, which is sometimes not the real blocker. Accepted at v1. The regeneration re-run is the pressure valve.

### Build outline and dependencies

Depends on, from the current seven-item batch:
- Telemetry events (initiation, completion, abandonment, regranulation) live and stable. This is the hard dependency. Without the baseline running for a few weeks first, section 7 has no control group. Ship telemetry, wait, then build.
- The regranulation and abandonment signals double as the trigger inputs in section 6.
- The 409/502 error-path work, since the offer-card exclusions reference those states.

Build order, once cleared to start:
1. Backend: interview session endpoint with per-turn gating, transcript storage with Room-grade retention, brief compiler.
2. `EXPERT_SHRINK_SYSTEM` prompt plus Fable 5 routing beside the existing `deep` flag, phase-aware validator extension (same rules, applied per phase).
3. RevenueCat consumable product and entitlement check on the interview endpoint, with the not-consumed-on-safety-stop rule.
4. Frontend: interview flow (chips, skip, bail button), phase-aware plan rendering on the existing progressive-disclosure surface, the offer card with its exclusion rules.
5. Telemetry tagging (`plan_type=expert`) and the comparison query.
6. Eval: extend the safety test set with interview-answer fixtures (crisis mid-interview, medical answer on an ok task, cross-answer assembly) before launch. The eval is the specification.
