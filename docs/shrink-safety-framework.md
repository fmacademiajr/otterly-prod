# Otterly Shrink Safety Framework

The framework that makes the task Shrinker safe on the inside. This is an engineering and clinical-safety contract, not a marketing claim. Otterly is a calm task-starter, not a treatment, and makes no medical claims. The goal here is narrower and load-bearing: when the Shrinker turns a task into an actionable, step-by-step plan, that plan must be sound, kind, and never decompose something it should refuse.

Audience: engineers extending the pipeline, and any clinician reviewing what the pipeline guarantees.

## Why the Shrinker specifically

The Room is a companion; its worst output is a bad sentence. The Shrinker is different. It takes a task and returns an ordered set of physical actions a frozen person will follow with lowered judgment. A step-by-step plan for the wrong task is the highest-leverage failure surface in the app. So the Shrinker gets the strictest gate.

## Grounding

The step design encodes an existing four-tier model (see `docs/design-handoff/psychology-and-product.md` and the framework PDF). In order:

1. Physiological downregulation. The breath comes before structure, because acute stress degrades prefrontal function and a plan lands badly on a disconnected planning cortex.
2. Task structuralization. Externalize the task, then produce a single next physical action below the freeze threshold (the activation step).
3. Choice simplification. Never present a list to size or choose from. One step at a time.
4. Reappraisal and self-compassion. No shame, no "should have," no time pressure.

Research base these lean on: self-determination theory (competence, autonomy, relatedness); paced breathing and vagal tone; executive function under acute stress; body-doubling as co-regulation. Cite these when defending any output, and keep the citations current in the psychology-and-product doc.

The Shrinker system prompt (`SHRINK_SYSTEM` in `backend/server.py`) operationalizes tiers 2 to 4: activation step first, physical verbs, one action per step, honest minute estimates, no shame words.

## Safety taxonomy

Every task is classified before it is decomposed. Four categories, each with a required response.

| Category | What it covers | Required response |
| --- | --- | --- |
| crisis | Self-harm or suicidal intent; self-injury by method; overdose. | Do NOT decompose. Return the crisis referral (988 US, 116 123 UK, NCMH 1553 PH). |
| harm | Violence or harm toward another person; weapons. | Do NOT decompose. Calm refusal pointing to a crisis line / authorities. |
| medical | Altering or stopping prescribed medication; dosage manipulation; disordered eating; rapid/extreme weight loss; self-medication. | Do NOT decompose. Deflect to a doctor or pharmacist; offer the Room for company. |
| ok | Everything else, including routine health admin. | Decompose normally. |

The line inside "medical" is deliberate and clinically informed: routine adherence and care are healthy and shrinkable and must NOT be gated — "take my meds," "refill my prescription," "book a doctor," "schedule therapy," "go for a run," "lose weight" (with no number or urgency). Only treatment alteration, dosage manipulation, and disordered/rapid-loss patterns gate. A tool that lectures an ADHD user for wanting to take their medication has done its own harm.

Priority is crisis > harm > medical, so "starve myself until Friday" routes to the crisis referral, not the medical deflection.

## The layered harness (defense in depth)

No single layer is trusted. Each owns a specific guarantee.

1. Deterministic input gate — `classify_task_safety()` in `backend/server.py`. Runs BEFORE the LLM on the task title and note. Regex-anchored, so it is guaranteed and free (no API call, no free-tier shrink consumed). This is the primary guarantee. It is anchored to keep healthy tasks and workplace metaphor ("kill the presentation," "attack the backlog") out of the gate. Ceiling: it catches explicit phrasings, not every paraphrase — it backstops the model, it does not replace it.
2. Prompt-encoded rules — `SHRINK_SYSTEM` and `BRAINDUMP_SYSTEM` instruct the model to refuse the same classes and return empty. Catches paraphrase the regex misses.
3. Deterministic output backstop — `STEP_UNSAFE_RE`, checked first in `_validate_steps()`. No step naming self-harm or violence reaches the database even if the model emits one. Anchored so "cut the onions" and "shoot the video" stay clear.
4. Repair — the existing one-shot repair retry regenerates when validation flags problems.
5. Referral enforcement — `ensure_referral()` still guarantees the crisis resource is appended to Room replies on disclosure.

On a gated task the client shows the calm message (HTTP 422) with no "try again," and offers the Room instead of a re-shrink.

## What this does NOT do, on purpose

- It does not diagnose, treat, or claim clinical efficacy.
- It does not position Otterly as a medical device or a substitute for care.
- It does not attempt perfect paraphrase detection deterministically; that is the model's job, backstopped by the gate.
- The input gate is English-anchored today. Taglish and other locales are a named follow-up (see below).

## Eval and regression gate

`backend/tests/test_shrink_safety.py` runs the live rules from `server.py` (not a copy) against an adversarial set: crisis, harm, and medical tasks that must gate, plus the healthy/metaphor tasks that must NOT. It also checks the output backstop. Every message on a gated verdict must be non-empty. This is the regression gate: change a regex, and the eval tells you what you broke. `test_safety_referral.py` and `test_shrink_guardrail.py` cover the Room referral and the format validator.

Run: `cd backend && python3 tests/test_shrink_safety.py`

Add a case to the eval before adding a pattern to a regex. The eval is the specification.

## Clinician review checklist

For a licensed reviewer (ADHD-focused psychologist or OT). The point of review is that a practitioner is comfortable with the outputs, not that we assert it ourselves.

1. Read this framework and the four-tier grounding.
2. Review the taxonomy: are the four categories and the healthy/gated line right? Especially the medical boundary.
3. Read the refusal messages (`REFERRAL`, `REFUSAL_MEDICAL`, `REFUSAL_HARM`): tone, accuracy, and the resources named for the PH-first audience.
4. Review a sample of real Shrinker outputs for the no-shame, activation-first, honest-estimate properties.
5. Flag any category or phrasing that a frozen, ashamed user could read as pressure or judgment.

## Known gaps / follow-ups

- Onboarding S3: a crisis disclosure typed into the first-run task field currently falls through to the cached "Stand up." fallback rather than surfacing the referral, because onboarding runs the shrink with a silent fallback. The main-app Shrinker and the Room are both gated; onboarding is the one path that can swallow a disclosure. Fix: run `classify_task_safety` in the onboarding shrink and surface the referral. Tracked, not yet built.
- Locale: the gate is English-anchored. A Taglish pattern set is needed before a PH-language launch.
- Paraphrase: deterministic layers catch explicit phrasings only. Consider an LLM safety classifier as a fifth layer if eval coverage shows gaps.
- The crisis resource also needs a permanent home in Settings and the App Store listing, per the onboarding flow spec's open decisions.
