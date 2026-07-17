# Otterly Guardrail Spec v2

Verified against `backend/server.py`, `frontend/app/shrink/[id].tsx`, and `Overwhelm and Unproductivity Framework.md` (278 lines, read in full). Every number below came from running code, not reading it.

STATUS 2026-07-17: ship items 1-9 are ALL IMPLEMENTED in `backend/server.py` and the frontend. Uncommitted. The four taste decisions in section 6 are still open, except #1 ("Still too big"), which shipped bounded to one tap per the recommendation and is trivially reverted. The proposal file this spec was drafted against is deleted, its logic now lives in `server.py` and the fixtures moved to `backend/tests/fx.json`.

Checks (all green): `cd backend && python3 tests/test_shrink_guardrail.py` (20 fixtures + invariants), `python3 tests/test_safety_referral.py` (17 cases + 2), `./.venv/bin/python tests/test_referral_wiring.py` (6 wiring), `./.venv/bin/python tests/test_reshrink_guard.py` (7 checks). The last two need the venv and stub Emergent's private `emergentintegrations` package. `tests/test_otterly_api.py` is integration-style against a live BASE_URL and was NOT run.

Deviation from this spec, deliberate: the 409 check runs BEFORE the LLM call, not after validation, so a refusal costs no API call and no free-tier shrink. The inbox cap and the step list reveal what they hide ("N more") rather than truncating silently.

---

## 1. TLDR

Harness. Every quality rule Otterly claims today lives in prompt prose and nothing checks it: `SHRINK_SYSTEM:510` says `Never generic ("plan it out")` and `shrink_task:561` only checks `if step.text:`, so `[{"text":"Plan it out","minutes":10}]` persists and renders today. A bigger model shrinks that tail and never closes it, and `deep=True` already routes to Opus behind a paywall (`:261`), so the model lever does not exist on the path that matters. The prompt asks, the harness enforces, the UX decides what the user sees.

Scope caveat stated once, up front, because v1 overclaimed it: this harness enforces grammar, shape, and honest labels. It does not enforce scope. "Write the report" at 25 minutes passes every rule and always will.

---

## 2. What's broken today, ranked

| # | Gap | Anchor | Severity |
|---|---|---|---|
| 1 | Self-harm disclosure gets zero inspection. `room_message` stores user text and forwards it to the LLM. Detection is one advisory line in `ROOM_SYSTEM:752`. Model misses the cue or drifts across the 20-message window, nothing catches it. | `server.py:752, 765, 768` | severe |
| 2 | `BRAINDUMP_SYSTEM` says "Skip pure feelings". The one surface where a user pours out raw affect discards a disclosure silently. No referral, no trace. | `server.py:668` | severe |
| 3 | LLM output trusted blind. Truncate to 12, clamp minutes, non-empty check, insert. Generic/shamed/duplicate steps persist. | `server.py:557-567` | high |
| 4 | `delete_many` runs before every re-shrink. No confirm, no undo. A user 3 steps into 6 taps a difficulty pill and loses visible progress. `db.activity` rows survive, so the streak counts work the user can no longer see. Inverts SDT competence (line 158). | `server.py:554` | high |
| 5 | All steps render at once. `steps.map(...)` is a wall. | `shrink/[id].tsx:261` | high |
| 6 | Difficulty picker is theatre. `load():54` auto-shrinks with `t?.difficulty \|\| "medium"` before the user touches a pill. | `shrink/[id].tsx:54, 210` | med |
| 7 | `load()` catches only 429. Any other error leaves `steps` empty under "No steps yet. Tap the ↻ to shrink." | `shrink/[id].tsx:59` | med |
| 8 | `doShrink` routes every non-429/402 into `testID="shrink-error-upgrade"`, which reads "See Otter Premium →" and pushes `/paywall`. | `shrink/[id].tsx:239` | med |
| 9 | `focusStep` is dead. `next.tsx:89` pushes it, nobody reads it. | `shrink/[id].tsx:28` | low |

Gaps 7 and 8 are why the harness cannot ship alone. Add a 502 and gap 7 renders a screen telling a frozen user to tap a button. Add a 409 and gap 8 monetizes the guardrail firing.

---

## 3. The guardrail

### 3.1 The centerpiece decision, and the measurement that flipped it

The llm-adversary's headline was "replace `BANNED_PREFIX` with a `PHYSICAL_VERBS` allowlist (~70 words), highest-leverage single change." I built it. It scored 20/20 on the fixture set. Then I tested it against physical verbs no fixture used:

```
false rejects: 18/18
REJECT Mail the check      REJECT Water the plants    REJECT Chop the onions
REJECT Vacuum the rug      REJECT Iron the shirt      REJECT Mop the floor      ...
```

"Mail the check" is the task title of the `genuinely_two_step` fixture. The allowlist inverts to the unbounded side: physical verbs are an open class, planning verbs are a closed one. The 20/20 was an artifact of fixtures written with in-list verbs.

Shipped instead: a 23-word abstract denylist + 13 non-imperative stopwords + 5 idioms. **20/20 fixtures, 0/23 false rejects, 41 words against 90.** Smaller and strictly better. A denylist cannot express "starts with a verb", so `NON_IMPERATIVE` covers it from the other side. No English imperative starts with "the".

### 3.2 Drop-in

```python
# ponytail: denylist of ABSTRACT verbs, not an allowlist of physical ones.
# Measured: a 90-word physical allowlist false-rejected 18/18 real chore steps.
# This list false-rejects 0/23. Ceiling: cannot catch scope. Upgrade = a classifier.
ABSTRACT_VERBS = {
    "plan", "figure", "think", "decide", "consider", "brainstorm", "organize",
    "research", "identify", "clarify", "assess", "determine", "evaluate",
    "ascertain", "map", "outline", "strategize", "understand", "define",
    "explore", "reflect", "conceptualize", "ideate",
}
NON_IMPERATIVE = {"the","your","a","an","it","this","that","you","there","its","my","i","we"}
VAGUE_IDIOM = ("sort out", "get started", "run through", "check in on", "go over")

# ponytail: anchored. Unanchored \bfinally\b ate "Type the finally block" (try/finally)
# and \bjust\s+\w+ ate "Open the Just Eat app". Shame shames sentence-initially.
SHAME_RE = re.compile(
    r"^just\s+\w+|^simply\b|^finally\b|^at last\b|all you have to do|"
    r"should(?:'ve| have)\b|shouldn't have|why didn't you|\bobviously\b|it's easy|"
    r"you have been avoiding|been putting (?:this|it) off|you neglected", re.I)

# ponytail: minute ceilings are a product guess, not a research finding. Tune on completion data.
MAX_MINUTES = {"activation": 5, "easy": 5, "medium": 10, "hard": 25}
LADDER = [1, 2, 5, 10, 25]

def _clamp_minutes(minutes, bucket):
    """Asymmetric: over-ceiling never reaches here, it is a `problem` instead."""
    allowed = [x for x in LADDER if x <= MAX_MINUTES[bucket]]
    return min(allowed, key=lambda x: abs(x - minutes))

def _norm(t): return re.sub(r"[^a-z0-9 ]", "", t.lower()).strip()
def _has_shame(t): return bool(SHAME_RE.search(t))

def _validate_steps(raw_steps, difficulty):
    """Returns (clean, problems). Never raises. Caller inserts clean only.
    Enforces grammar, shape and honest labels. Does NOT enforce scope."""
    clean, problems, seen = [], [], set()
    for i, s in enumerate(raw_steps[:12]):
        text = str(s.get("text", "")).strip()
        if not text: continue
        n = _norm(text)
        first = n.split(" ")[0] if n else ""
        bucket = "activation" if i == 0 else difficulty   # keyed on i, NOT len(clean)
        want = int(s.get("minutes") or 10)

        if first in NON_IMPERATIVE:
            problems.append(f'step {i+1} "{text}" is not an instruction, start with a verb')
        elif first in ABSTRACT_VERBS:
            problems.append(f'step {i+1} "{text}" starts with "{first}", name a physical action')
        elif any(p in n for p in VAGUE_IDIOM):
            problems.append(f'step {i+1} "{text}" is vague, name the physical action')
        elif len(n.split()) > 10:
            problems.append(f'step {i+1} "{text}" is too long or chains actions')
        elif n in seen:
            problems.append(f'step {i+1} "{text}" duplicates an earlier step')
        elif _has_shame(text):
            problems.append(f'step {i+1} "{text}" carries shame language')
        elif want > MAX_MINUTES[bucket]:
            problems.append(f'step {i+1} "{text}" needs {want} min, must fit under {MAX_MINUTES[bucket]} min')
        else:
            seen.add(n)
            clean.append({"text": text, "minutes": _clamp_minutes(want, bucket)})

    if not clean and not problems:
        problems.append("return 2 to 6 concrete steps")
    return clean, problems
```

Three fixes here that only surfaced by running it:

- `bucket` keys on `i`, not `len(clean)`. v1 keyed on `len(clean)`, so a rejected step 1 promoted step 2 into the activation bucket and silently rewrote its duration. v1's own `demo()` passed for the wrong reason.
- The clamp is asymmetric. Over-ceiling raises a problem instead of relabeling. v1 turned "Draft the whole intro paragraph" (25 min) into a 2-minute promise, and turned an honest 25-minute step at `easy` into a 5-minute lie on every "Still too big" tap. A big step wearing an honest label is survivable. A big step wearing a label the app fabricated teaches the user their own read of their capacity is wrong.
- Word cap at 10 replaces the `" then "` / `";"` chain rule. Vocabulary-free, catches the comma chain the old rule missed, never eats domain jargon.

### 3.3 Caller, replacing `server.py:550-567`

```python
    clean, problems = _validate_steps(data.get("steps") or [], payload.difficulty)

    if problems:
        # ponytail: exactly one repair, and its failure is not the user's problem.
        try:
            data = await _llm_json(
                f"shrink-{task_id}-{uuid.uuid4()}", SHRINK_SYSTEM,
                prompt + "\n\nYour last answer had problems:\n- " + "\n- ".join(problems)
                       + "\nReturn corrected JSON.",
                deep=payload.deep)
            repaired, _ = _validate_steps(data.get("steps") or [], payload.difficulty)
            if len(repaired) >= len(clean):
                clean = repaired
        except Exception as e:
            logger.warning("shrink repair failed, keeping %d survivors: %s", len(clean), e)

    if not clean:
        raise HTTPException(502, "AI returned no usable steps")

    done_count = await db.steps.count_documents({"task_id": task_id, "owner": owner_id, "done": True})
    if done_count and not payload.force:
        raise HTTPException(409, f"this shrink has {done_count} finished steps")

    await db.steps.delete_many({"task_id": task_id, "owner": owner_id})
    steps = [Step(task_id=task_id, order=i, **c) for i, c in enumerate(clean)]
    await db.steps.insert_many([{**s.dict(), "owner": owner_id} for s in steps])
```

Never hard-fail when good steps exist. 502 only when `clean` is empty. The repair is wrapped, so a flaky repair call keeps the survivors instead of converting a working shrink into an error. That matters on the Gemini free tier.

### 3.4 Room safety, shipping now, not deferred

v1 deferred this while flagging "the status quo is itself the risk". The flag was right and the deferral rested on a false dichotomy: "a list that fires on 'killing me' ships a hotline to every stressed user" is only true if the list **routes**. Append instead. A false positive costs one extra sentence at the end of a kind message. That is fail-safe by construction and it dissolves the decision.

```python
SELF_HARM_RE = re.compile(
    r"\bkill (?:myself|me now)\b|\bend (?:my life|it all)\b|\bwant to die\b|"
    r"\bsuicide\b|\bsuicidal\b|\bkilling myself\b|\bnot worth living\b|\bhurt myself\b", re.I)
REFERRAL = ("I care that you told me. Please reach a real person - "
            "988 (US), 116 123 (UK), or NCMH 1553 (PH).")

def ensure_referral(reply, user_text):
    if SELF_HARM_RE.search(user_text or "") and "988" not in reply:
        return reply.rstrip(". ") + ". " + REFERRAL
    return reply
```

Verified: `killing me` / `dying under this deadline` / `murder me for this` do not match. `want to die` / `killing myself` / `not worth living` do. Wire at `room_message:776` (`reply_text = ensure_referral(reply_text, payload.text)`) and at `braindump:678` on `payload.text` before extraction, which closes gap 2 for two lines.

`_scrub_shame` is **deleted** from `room_message` and `next_action`. v1 shipped it there and said missing those two sites was "easy to miss". Inverted. `SHAME_RE` validates short imperatives, and both those surfaces are prose. Run against realistic Room replies it scrubs three of four warm paraphrases of the referral, replacing them with "I'm here." A user discloses, the model does the right thing, the harness deletes the hotline number because the sentence contained "just". Scoped to shrink steps only.

### 3.5 SHRINK_SYSTEM, full replacement

```python
SHRINK_SYSTEM = """You are Otterly, a calm ADHD-friendly companion. You help people with ADHD start tasks by breaking them into tiny concrete micro-steps.

Rules:
- Return STRICT JSON only. No prose, no fenced code.
- 2 to 6 micro-steps. Fewer is better if the task allows. Never pad a small task.
- Step 1 is the activation step: one physical movement or app-open, under 5 minutes, requiring zero decisions. It exists to get the body moving, not to make progress.
- Every other step is a single concrete physical action.
- Steps start with a physical verb ("Open", "Walk to", "Type", "Send"). Never "The", "Your", "It".
- One action per step. Never two joined by "and", "then", or a comma chain. Keep each step under 10 words.
- Never generic ("plan it out", "figure out the intro", "sort out the receipts"). Always concrete ("Open Gmail").
- Never a duplicate of another step.
- Give each step an HONEST minute estimate. Do not shrink the number to fit a limit. If the work is 25 minutes, say 25 and make the step smaller instead.
- Tone: warm, brief, no shame. Never mention how the user 'should' have done this earlier. Never open a step with "Just", "Simply", or "Finally".
- Step size for steps 2 and up: "easy" = under 5 min each. "medium" = under 10 min. "hard" = under 25 min. This never applies to step 1.

Return JSON shape:
{"steps": [{"text": "Open the doc", "minutes": 2}, {"text": "Type the first paragraph", "minutes": 10}]}
"""
```

Changes: 3-10 → 2-6 (padding a real 2-step task adds element interactivity to reduce it). The compound exemplar `"Open Gmail and start a draft to Jane"` violated the single-action rule stated one line above it, now `"Open Gmail"`. Honest-minutes rule added, because the harness now flags over-ceiling instead of silently relabeling, and the model needs to know the correct response is a smaller step and not a smaller number. Shame words named. Activation step named.

---

## 4. The fixture set

20/20. The 12 v1 fixtures + 4 harm/adversary regressions + 4 attack payloads.

| Fixture | Expect | Rule that fires | Was v1 |
|---|---|---|---|
| `generic_plan_it_out` | reject | abstract verb | pass |
| `not_verb_first` ("The doc needs opening") | reject | non-imperative | **FALSE ACCEPT** |
| `vague_one_word_task` ("Sort out the receipts") | reject | vague idiom | pass |
| `duplicate_steps` ("open gmail!") | reject | normalized dupe | pass |
| `shame_language` | reject | shame | pass |
| `A1_vacuous_verb_first` (Identify/Clarify/Assess) | reject | abstract verb | **FALSE ACCEPT** |
| `A6_synonym_dodge` (Map out/Outline) | reject | abstract verb | **FALSE ACCEPT** |
| `A7_comma_chain` | reject | word cap | **FALSE ACCEPT** |
| `A4_stance_shame` ("you have been avoiding") | reject | shame | **FALSE ACCEPT** |
| `activation_step_too_big` | reject | asymmetric clamp | **relabeled to 2 min** |
| `honest_25_at_easy` | reject | asymmetric clamp | **relabeled to 5 min** |
| `wall_of_10` | accept | cap 12 | **silently amputated to 5** |
| `genuinely_two_step_task` | accept | floor gone | **FALSE REJECT** |
| `honest_25_minute_step` | accept | hard ceiling 25 | pass |
| `start_dishwasher_false_reject` | accept | "start" not banned | **FALSE REJECT** |
| `finally_block_shame` (try/finally) | accept | anchored `^finally` | **FALSE REJECT** |
| `just_eat_cascade` (Just Eat app) | accept | anchored `^just` | **FALSE REJECT** |
| `domain_jargon_not_generic` | accept | silent | pass |
| `call_mom_emotionally_loaded` | accept | silent | pass |
| `secret_project_step` ("Write the report") | **accept** | none, honest ceiling | pass |

`secret_project_step` expects accept. Scope is not enforceable in a word list. Marking it "reject" would be a rule we cannot write.

```
$ cd backend && python3 tests/test_shrink_guardrail.py
demo ok
OK   wall_of_10                       accept  clean=10
OK   generic_plan_it_out              reject  clean=0
... 20/20
```

`demo()` covers the two bugs a fixture table cannot see: bucket keyed on `i` (a rejected step 1 must not re-label step 2), and 0 false rejects on six physical verbs the lists never saw.

---

## 5. Cut list

v1 was 60 lines of harness plus 13 ship items. This is 41 lines plus 9. What went, and why.

| Cut | Reason |
|---|---|
| **`PHYSICAL_VERBS` allowlist (~90 words)** | Measured 18/18 false rejects on real chore verbs. Replaced by a 41-word denylist that scores 0/23. |
| **5-step cap** | No research support. Doc line 51 is "process 3 to 4 chunks of **novel** information **simultaneously**". A stored ordered checklist is none of those. Line 257 calls externalizing working memory the **remedy**: Kanban boards "offload executive planning... freeing up cognitive capacity". Nobody caps a Kanban board at 5. Back to the existing `[:12]`. Progressive disclosure carries the load. |
| **`wall_of_10` truncate-problem machinery** | Unneeded once the cap is 12. Ten honest tax steps just pass. |
| **`" then "` / `";"` chain rule** | Replaced by the word cap, which is vocabulary-free and catches the comma chain too. |
| **Floor of 3** | Broke the spec's own "never hard-fail when good steps exist" rule. "Mail the rent check" is two correct steps and v1 502'd it, worse than status quo. `not clean` already covers the lazy-model case. |
| **`_scrub_shame` in `room_message` + `next_action`** | Deletes hotline numbers from warm prose. Severe. |
| **Item 5, `last_shrink_at` / `shrink_count`** | "Record now, branch later" for a branch the spec says not to build. YAGNI. |
| **Items 10 + 11, `exclude` filter + `parked_until` + `POST /tasks/{id}/park`** | New model field, new endpoint, new filter, for unobserved needs. |
| **`MINUTE_LADDER` gated table** | Collapsed to `MAX_MINUTES` + one asymmetric clamp. |

Research citations stripped, not softened. v1 cited line 255 for "`[1,2]`, must bypass the prefrontal threshold" — line 255 gives two examples and a mechanism, no duration, no number of any kind. It cited line 247 for "6 breaths/min x 10 breaths = 100 seconds" — line 247 gives a **rate** (4 to 6 breaths/min) and no **dose**. The "10 breaths" was invented, multiplied by the rate, and presented as derived arithmetic. It cited lines 230-241 for "rung 1 vs. crisis" — those lines are the four-rung pyramid and contain no crisis, no emergency, no hotline. The doc has zero hits for 988, hotline, suicide, self-harm, or crisis, including its 68-source bibliography. Guessing is fine. Laundering a guess through a citation is not. The minute ceilings stay as a `ponytail:` calibration knob with no citation.

What the research does support, kept: line 47 (Response to Scaffolding: executive dysfunction is "highly responsive to... micro-stepping", ADHD task paralysis "requires immediate physiological downregulation before any structure can be utilized") → the chronicity fork stays deferred. Line 256 (Next-Action Method) + line 257 (Externalizing) → progressive disclosure, and the pair reconciles only because it is a disclosure and not a deletion. Line 105 (analysis paralysis = "over-evaluation of asymmetric information") → delete the picker. Lines 152 + 272 for the shame rules, not line 130: line 152 is introjected regulation ("I am doing this to avoid feeling guilty"), line 272 is self-compassion "interrupt[ing] the shame-and-avoidance feedback loop". Line 130's shame is self-generated and the doc never studies whether tool language triggers it.

### Ship order

| # | Change | Layer | File |
|---|---|---|---|
| 1 | `ensure_referral` in `room_message` + `braindump`. Delete `_scrub_shame` from both. | harness | `server.py:678, 776` |
| 2 | 409/502 copy. Route them out of the paywall banner. Confirm dialog on 409. | ux | `shrink/[id].tsx:59, 239` |
| 3 | `_validate_steps` + wrapped repair + SHRINK_SYSTEM rewrite | harness+prompt | `server.py:503, 550-567` |
| 4 | Re-shrink 409 + `force: bool = False` on `ShrinkRequest` | harness | `server.py:103, 554` |
| 5 | Progressive disclosure: one active step, rest behind "4 more steps" | ux | `shrink/[id].tsx:261` |
| 6 | Consume `focusStep` | ux | `shrink/[id].tsx:28` |
| 7 | Delete the DIFF pill row, add one "Still too big" below the steps | ux | `shrink/[id].tsx:210-231` |
| 8 | Delete the header re-shrink icon, move Deep Shrink upsell off-screen | ux | `shrink/[id].tsx:189, 339` |
| 9 | Inbox slice to 7, drop "Today's Focus" | ux | `inbox.tsx:243` |

2 before 3, and both before 7 and 8. Item 2 is not polish. Items 7 and 8 delete the ↻ and the pills, which are the only affordances the empty state names, and item 3 adds two new error paths that reach that state. Ship 3 first and a 502 renders "Tap the ↻ to shrink" at a button that still exists. Ship 7/8 first and it renders at nothing. Item 4's 409 lands in `testID="shrink-error-upgrade"` reading "See Otter Premium →" unless item 2 goes first, which monetizes a guardrail firing on a frozen user.

The inbox slice keeps the line-103 citation. The inbox is a menu, you pick one task from many, that is the jam booth. `_validate_steps` does not, because a shrink is an ordered sequence and nobody chooses step 3 over step 7.

---

## 6. Taste decisions

Four. Everything else is decided.

**1. Does "Still too big" bound to one tap?** Recommend yes. v1 cited satisficing (line 265, "select the first option that meets those standards", the move is **stopping** the search) for a button that **restarts** the search. That is a maximizer affordance (line 95: "compelled to seek out and evaluate every available option") wearing the satisficing citation. Bounded to one tap it is line 264, the Binary Choice Rule, which is what it actually is. `easy` is the floor, so a second tap has nowhere to go. Also send the current step text into the re-shrink prompt as "these were too big, return smaller first actions" — the clamp changes the number, only the prompt changes the work.

**2. Arousal gate before shrink.** Recommend keep deferred. It forces `ShrinkResponse{mode: steps|regulate}`, breaking the `List[Step]` contract and every client. The real cost is the false positive: a calm user asks for help and gets a breathing exercise. Pick the failure direction before writing code. Section 1.4 of v1 was right on the conclusion and wrong on the citation: do not wire shrink to `/crisis`. That is clinical common sense, not a research finding, and the doc is silent on the entire topic.

**3. Chronicity branch.** Recommend keep deferred, and note v1 cut the data collection that would have fed it (item 5). That was deliberate. Line 47 is the best-supported claim in the whole spec and the 2-shrinks / 15-min / 0-activity thresholds are still a guess. Build the branch when you have a reason to believe a threshold, then add the two-line write.

**4. Scope.** Recommend accept the hole, out loud, in the copy. "Write the report" (25 min), "Hire the band" (25 min), "Clean the garage" (25 min) all pass every rule. No word list closes it, because the difference between "Write the first line" and "Write the report" is scope, not vocabulary. The honest close is UX, not harness: progressive disclosure plus a working "Still too big" makes a project-per-step shrink recoverable in one tap, because the user has the information the code does not, which is whether they can actually do it. That only works if the asymmetric clamp lands first, which is why item 7 is load-bearing and v1's version of it was broken.

---

Files: `backend/server.py` (implemented), `backend/tests/fx.json`, `backend/tests/test_shrink_guardrail.py`, `backend/tests/test_safety_referral.py`, `backend/tests/test_referral_wiring.py`

skipped: the arousal gate, the breathing surface, the chronicity branch. All three infer state. Add when Fernando picks the false-positive direction.