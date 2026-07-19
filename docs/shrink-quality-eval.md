# Shrink quality eval: the trap suite

## What this is, and is not

`backend/tests/quality_traps.json` is a trap suite: 33 fixture decompositions with big margins. Clearly good plans, clearly bad plans (impossible steps, abstract monoliths, reversed order, filler, dishonest minutes, shame language), three prompt-injection attacks, and English language-ID cases.

It is NOT a statistical benchmark. At this size a score of 84 vs 87 means nothing. The suite answers one question: does the Shrinker (and the judge watching it) still catch the failures a human would catch in five seconds? Big margins only. Borderline cases are deliberately absent because at ~zero users we have no ground truth to settle them.

## The two layers

Run: `cd backend && python3 tests/test_shrink_quality.py`

1. Deterministic gate (hard-fails, CI-safe). No network, no keys. Checks: the injection guard regex catches every marked attack and zero clean tasks, English tasks carry English steps (function-word ratio, no dependency), and the suite itself is structurally sound (30+ cases, 3+ injections, both verdict classes represented, well-formed steps). Nonzero exit on any failure.

2. LLM judge (log-only). Add `--judge` with `OPENAI_API_KEY` set. Scores each case on six dimensions, 1-5: relevant, sound, ordered, complete, right_sized, honest. Median of 3 samples per case. Prints a report and flags any big-margin trap the judge got wrong (bad plan scored above 2.5, good plan below 3.5, injection not flagged). It never changes the exit code.

## Judge design

- Cross-family. The generator is Claude. A Claude judge shares its blind spots and its stylistic priors, so the judge is OpenAI (`gpt-5-mini` default, `OTTERLY_JUDGE_MODEL` to override). Paid tier: no training on task text.
- Log-only. A judge miss on this suite means the judge prompt or the fixture is wrong, not that the build is broken. Blocking CI on an LLM opinion invites flaky reds and silent rubber-stamping. The deterministic layer gates; the judge informs.
- Injection-hardened. The rubric prompt (`backend/tests/quality_judge_prompt.txt`) states that everything inside `<task>` and `<plan>` tags is data. An instruction found there is evidence for a low score plus `injection_detected: true`. The three `inj_*` fixtures verify the judge holds this line.
- Calibrated. The prompt carries one clearly-1 and one clearly-5 exemplar with their scores, and behavioral anchors per dimension.

## The ritual

Before trusting judge output the first time (and after any prompt change): hand-score 5 cases blind, expected field covered. Compare with the judge. Disagreement on a big-margin case means fix the prompt or the fixture before reading anything into the numbers.

## The Goodhart rule

Never tune the generator to raise the judge score. The judge exists to catch regressions a human would catch, not to define quality. The moment the generator prompt is edited "because the judge prefers it," the judge measures nothing. Generator changes are motivated by user behavior and hand review. The judge then confirms nothing obvious broke.

## Deferred until scale

- Human rating panel and inter-rater agreement (kappa/alpha) to validate the rubric.
- A 300+ item set with real user tasks, stratified by task type and difficulty.
- Judge ensembles and position/order bias controls.
- Borderline cases and score-distribution tracking over time.

Each of these needs real users or real raters. Building them now would be measuring with a ruler we have not checked against anything.
