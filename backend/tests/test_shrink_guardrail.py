"""Improper shrinks must not reach the database.

Runs the fixture set against the rules as they exist in server.py, not against a
copy. If someone edits the denylist in server.py, this fails here.

Run: cd backend && python3 tests/test_shrink_guardrail.py
"""
import json
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent

# Extract the guardrail block from server.py without booting the app
# (server.py reads MONGO_URL / ANTHROPIC_API_KEY at import time).
src = (BACKEND / "server.py").read_text()
block = src[src.index("ABSTRACT_VERBS = {"):src.index("SHRINK_SYSTEM = ")]
ns = {"re": re, "Tuple": tuple, "List": list}
exec(block, ns)
_validate_steps = ns["_validate_steps"]
_clamp_minutes = ns["_clamp_minutes"]


def check_invariants() -> list:
    """The two bugs a fixture table cannot see."""
    fails = []

    # 1. bucket keys on i, not len(clean). A rejected step 1 must not promote step 2
    #    into the activation bucket and silently rewrite its duration.
    clean, probs = _validate_steps([
        {"text": "Plan it out", "minutes": 10},      # rejected, abstract verb
        {"text": "Open the doc", "minutes": 1},
        {"text": "Type the first line", "minutes": 5},
    ], "hard")
    if [c["minutes"] for c in clean] != [1, 5]:
        fails.append(f"bucket leaked to a later step after a rejection: {clean}")

    # 2. The clamp is asymmetric. Over-ceiling is a problem, never a silent relabel.
    #    A big step wearing a label the app fabricated teaches the user their own
    #    read of their capacity is wrong.
    _, p = _validate_steps([
        {"text": "Open the doc", "minutes": 2},
        {"text": "Type each receipt into the rows", "minutes": 25},
    ], "easy")
    if not p or "must fit under 5 min" not in p[0]:
        fails.append(f"over-ceiling step was relabeled instead of flagged: {p}")

    # 3. Zero false rejects on physical verbs no fixture uses.
    for t in ["Mail the check", "Water the plants", "Start the dishwasher",
              "Vacuum the rug", "Chop the onions", "Iron the shirt", "Mop the floor",
              "Type the finally block", "Open the Just Eat app"]:
        # first_is_activation=False: these check verb/grammar acceptance as mid-list
        # steps, not the 2-min activation ceiling (which a single 5-min step would trip).
        if _validate_steps([{"text": t, "minutes": 5}], "easy", first_is_activation=False)[1]:
            fails.append(f"false reject on a real physical step: {t!r}")

    return fails


def main() -> int:
    fx = json.load(open(Path(__file__).resolve().parent / "fx.json"))
    fails = []
    for f in fx:
        clean, probs = _validate_steps(json.loads(f["llm_output"])["steps"], f.get("diff", "hard"))
        got = "reject" if probs else "accept"
        ok = got == f["expected"]
        if not ok:
            fails.append(f'{f["name"]}: expected {f["expected"]}, got {got}')
        print(f'{"OK  " if ok else "FAIL"} {f["name"]:34} {got:7} clean={len(clean)}')

    print()
    inv = check_invariants()
    for i in inv:
        print(f"FAIL invariant: {i}")
    if not inv:
        print("OK   invariants (bucket-on-i, asymmetric clamp, 9 physical verbs)")

    fails += inv
    print()
    if fails:
        print(f"{len(fails)} FAILED")
        for f in fails:
            print(f"  - {f}")
        return 1
    print(f"{len(fx)} fixtures + invariants passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
