"""The referral must fire on disclosure and stay silent on figures of speech.

Run: cd backend && python3 tests/test_safety_referral.py
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Import the rules without booting the app (server.py needs MONGO_URL etc at import).
src = (Path(__file__).resolve().parent.parent / "server.py").read_text()
block = src[src.index("SELF_HARM_RE = re.compile("):src.index("# ---------- Health ----------")]
ns = {"re": re}
exec(block, ns)
ensure_referral, REFERRAL = ns["ensure_referral"], ns["REFERRAL"]

# (user_text, should_fire)
CASES = [
    # Disclosures. Must fire.
    ("i want to die", True),
    ("i've been thinking about killing myself", True),
    ("everything feels suicidal lately", True),
    ("honestly my life is not worth living", True),
    ("sometimes i want to hurt myself", True),
    ("i might end it all", True),
    ("thinking about suicide again", True),
    ("i could kill myself over this", True),
    # Figures of speech. Must NOT fire. This is the whole reason the regex is anchored.
    ("this deadline is killing me", False),
    ("i'm dying under this workload", False),
    ("my boss would murder me for this", False),
    ("i'm dead tired", False),
    ("this project is the death of me", False),
    ("i'd rather die than sit through another standup", False),
    ("send the suicide-prevention flyer to print", True),  # names it, err toward firing
    ("just finish the report", False),
    ("", False),
]


def main() -> int:
    fails = []
    for text, should_fire in CASES:
        out = ensure_referral("I'm here with you.", text)
        fired = "988" in out
        ok = fired == should_fire
        if not ok:
            fails.append(f"{'expected fire' if should_fire else 'expected silence'}: {text!r}")
        print(f"{'OK  ' if ok else 'FAIL'} fire={fired!s:5} {text[:48]!r}")

    # Never double-append when the model already gave the referral.
    already = f"I care that you told me. {REFERRAL}"
    if ensure_referral(already, "i want to die").count("988") != 1:
        fails.append("double-appended referral when reply already had one")

    # Never lose the model's own words.
    out = ensure_referral("That sounds unbearable.", "i want to die")
    if "That sounds unbearable" not in out:
        fails.append("dropped the model's reply")

    print()
    if fails:
        print(f"{len(fails)} FAILED")
        for f in fails:
            print(f"  - {f}")
        return 1
    print(f"{len(CASES)} + 2 invariants passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
