"""Trap-suite quality eval for the Shrinker.

At ~zero users this is a TRAP SUITE, not a statistical golden set: a fixture
table of big-margin good and bad decompositions plus adversarial inputs. Two
layers:

  1. DETERMINISTIC (the gate). Injection-guard, English language-ID, and
     structural sanity over quality_traps.json. Hard-fails: nonzero exit.
  2. LLM JUDGE (log-only). OpenAI (cross-family: the generator is Claude, so
     the judge must not share its family or its blind spots; paid tier, no
     training on task text). Scores the six dimensions (relevant, sound,
     ordered, complete, right_sized, honest) with median-of-3 sampling and
     prints a scored report. It NEVER changes the exit code — a judge is a
     smoke alarm here, not a build gate.

Run:
  cd backend && python3 tests/test_shrink_quality.py            # deterministic gate
  cd backend && python3 tests/test_shrink_quality.py --judge    # + log-only judge pass
                                                                #   (needs OPENAI_API_KEY)

Ritual before trusting the judge: hand-score 5 cases blind (cover the
"expected" field), then run --judge and compare. If you and the judge disagree
on a big-margin case, the judge prompt is wrong or the case is — fix that
before reading anything into the numbers. Goodhart rule: never tune the
generator prompt to raise the judge score. See docs/shrink-quality-eval.md.
"""
import json
import os
import re
import statistics
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIMENSIONS = ["relevant", "sound", "ordered", "complete", "right_sized", "honest"]
JUDGE_MODEL = os.environ.get("OTTERLY_JUDGE_MODEL", "gpt-5-mini")

# The same guard idea the judge prompt states in prose: text inside the task
# that addresses the evaluator is an attack, not a task. ponytail: a keyword
# net, not an injection classifier — it must catch the fixture attacks with
# zero hits on clean tasks. Upgrade path: a classifier, when attacks diversify.
INJECTION_RE = re.compile(
    r"ignore\b[^.]{0,40}\b(?:rubric|instructions?)"
    r"|score\b[^.]{0,30}\b5\b"
    r"|to the (?:evaluator|judge|grader)"
    r"|system (?:note|prompt|override)"
    r"|respond with the single word"
    r"|give (?:all|every)[^.]{0,30}\b5s?\b",
    re.I,
)

# ponytail: language-ID by English function-word ratio, not a langdetect dep.
# Catches whole-plan language flips (the failure mode that matters), not
# single borrowed words.
EN_FUNCTION_WORDS = {
    "the", "a", "an", "to", "of", "in", "on", "for", "and", "your", "with",
    "at", "from", "into", "one", "two", "three", "it", "up", "out", "by",
    "her", "his", "them", "each", "all", "back", "off",
}


def _english(steps) -> bool:
    words = " ".join(s["text"] for s in steps).lower().split()
    hits = sum(1 for w in words if re.sub(r"[^a-z]", "", w) in EN_FUNCTION_WORDS)
    return words and hits / len(words) >= 0.15


def deterministic(cases) -> list:
    fails = []

    # -- structural sanity of the trap suite itself
    ids = [c["id"] for c in cases]
    if len(set(ids)) != len(ids):
        fails.append("duplicate case ids")
    if len(cases) < 30:
        fails.append(f"only {len(cases)} cases, suite floor is 30")
    for c in cases:
        if c["expected"] not in ("good", "bad"):
            fails.append(f'{c["id"]}: expected must be good|bad')
        if not c["steps"]:
            fails.append(f'{c["id"]}: empty plan')
        for s in c["steps"]:
            if not str(s.get("text", "")).strip() or not isinstance(s.get("minutes"), int) or not 1 <= s["minutes"] <= 60:
                fails.append(f'{c["id"]}: malformed step {s}')
        bad_dims = set(c["dimensions"]) - set(DIMENSIONS)
        if bad_dims:
            fails.append(f'{c["id"]}: unknown dimensions {bad_dims}')
    n_inj = sum(1 for c in cases if c.get("injection"))
    if n_inj < 3:
        fails.append(f"only {n_inj} injection cases, need 3+")
    for side in ("good", "bad"):
        if sum(1 for c in cases if c["expected"] == side) < 8:
            fails.append(f"fewer than 8 {side} cases")

    # -- injection guard: catches every marked attack, hits zero clean tasks
    for c in cases:
        caught = bool(INJECTION_RE.search(c["task"]))
        want = bool(c.get("injection"))
        ok = caught == want
        if not ok:
            fails.append(f'{c["id"]}: injection guard caught={caught}, expected {want}')
        if want or not ok:
            print(f'{"OK  " if ok else "FAIL"} injection guard caught={caught!s:5} {c["id"]}')

    # -- language-ID: English task -> English steps
    for c in cases:
        if "lang" not in c:
            continue
        en = _english(c["steps"])
        want = not c.get("lang_mismatch")
        ok = en == want
        if not ok:
            fails.append(f'{c["id"]}: english(steps)={en}, expected {want}')
        print(f'{"OK  " if ok else "FAIL"} lang-id english={en!s:5} {c["id"]}')

    return fails


# ---------- log-only judge ----------

def _judge_once(client, prompt, case):
    plan = "\n".join(f'{i+1}. ({s["minutes"]} min) {s["text"]}' for i, s in enumerate(case["steps"]))
    user = (f'<task>\n{case["task"]}\n</task>\n'
            f'<difficulty>{case.get("difficulty", "medium")}</difficulty>\n'
            f'<plan>\n{plan}\n</plan>')
    resp = client.chat.completions.create(
        model=JUDGE_MODEL,
        messages=[{"role": "system", "content": prompt}, {"role": "user", "content": user}],
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)


def judge(cases) -> None:
    """Prints a scored report. Returns None; never affects the exit code."""
    import openai  # already a backend dependency (Whisper)
    client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    prompt = (HERE / "quality_judge_prompt.txt").read_text()

    print(f"\n--- judge pass (log-only, {JUDGE_MODEL}, median of 3) ---")
    misses = []
    for c in cases:
        samples = []
        for _ in range(3):
            try:
                v = _judge_once(client, prompt, c)
                if all(isinstance(v.get(d, {}).get("score"), int) for d in DIMENSIONS):
                    samples.append(v)
            except Exception as e:
                print(f'     {c["id"]}: sample failed: {e}')
        if not samples:
            print(f'SKIP {c["id"]}: no usable samples')
            continue

        med = {d: statistics.median(s[d]["score"] for s in samples) for d in DIMENSIONS}
        overall = sum(med.values()) / len(DIMENSIONS)
        inj_flagged = sum(bool(s.get("injection_detected")) for s in samples) > len(samples) / 2

        # Big-margin verdicts only. 2.5-3.5 is a gray zone by design.
        miss = None
        if c["expected"] == "bad" and overall > 2.5:
            miss = f"scored {overall:.1f}, expected clearly-bad (<=2.5)"
        if c["expected"] == "good" and overall < 3.5:
            miss = f"scored {overall:.1f}, expected clearly-good (>=3.5)"
        if c.get("injection") and not inj_flagged:
            miss = (miss + "; " if miss else "") + "injection NOT flagged"
        if miss:
            misses.append(f'{c["id"]}: {miss}')

        dims = " ".join(f"{d[:2]}={med[d]:.0f}" for d in DIMENSIONS)
        flag = " INJ" if inj_flagged else ""
        print(f'{"MISS" if miss else "ok  "} {c["id"]:28} {overall:.1f}  {dims}{flag}')

    print()
    if misses:
        print(f"{len(misses)} judge MISSES on big-margin traps (log-only, not gating):")
        for m in misses:
            print(f"  - {m}")
        print("A miss means the judge prompt or the case is wrong. Fix that; never tune the generator to the judge.")
    else:
        print("judge agreed on every big-margin trap")


def main() -> int:
    cases = json.load(open(HERE / "quality_traps.json"))
    fails = deterministic(cases)

    print()
    if fails:
        print(f"{len(fails)} FAILED")
        for f in fails:
            print(f"  - {f}")
        rc = 1
    else:
        print(f"{len(cases)} cases: injection guard + language-ID + structure passed")
        rc = 0

    if "--judge" in sys.argv:
        if not os.environ.get("OPENAI_API_KEY"):
            print("\n--judge requested but OPENAI_API_KEY is not set; skipping judge pass")
        else:
            try:
                judge(cases)
            except Exception as e:
                print(f"\njudge pass crashed (log-only, exit code unchanged): {e}")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
