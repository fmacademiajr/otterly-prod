"""
Mint free-access voucher codes (press, beta testers, early supporters).

No admin HTTP endpoint by design — this backend's only auth is an Emergent
passthrough, and adding a privileged route days before submission is a new
attack surface for no benefit. This is the entire privileged surface: a CLI
script Fernando runs by hand.

A voucher grants premium until a per-batch expiry date, set here at mint
time. Not forever, not N-days-from-redemption.

Run:
  cd backend && ./.venv/bin/python scripts/mint_vouchers.py \\
      --count 20 --batch press-2026-07 --expires 2027-01-31

Codes print one per line in the human-readable OTTER-XXXX-XXXX form, ready to
paste into a sheet. The db stores the normalised form (same alphabet, no
dashes) — that's what /api/vouchers/redeem compares against after it strips
whitespace and dashes from whatever the user typed.
"""
import argparse
import secrets
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

BACKEND = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND / ".env")

import os  # noqa: E402  (after load_dotenv, so MONGO_URL/DB_NAME are populated)

# Unambiguous alphabet — no I, l, 1, O, 0. People read these off a screen and
# mistype them, and a misread code just looks broken to Fernando, not to us.
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def _one_code() -> str:
    body = "".join(secrets.choice(ALPHABET) for _ in range(8))
    return f"OTTER{body}"  # normalised (no dashes) — what's stored and compared


def _display(code: str) -> str:
    body = code[len("OTTER"):]
    return f"OTTER-{body[:4]}-{body[4:]}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--count", type=int, required=True, help="how many codes to mint")
    ap.add_argument("--batch", required=True, help="batch label, e.g. press-2026-07")
    ap.add_argument("--expires", required=True, help="grant end date, YYYY-MM-DD (UTC end of day)")
    args = ap.parse_args()

    if args.count < 1:
        print("--count must be at least 1", file=sys.stderr)
        return 1

    try:
        expires_date = datetime.strptime(args.expires, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        print(f"--expires must be YYYY-MM-DD, got {args.expires!r}", file=sys.stderr)
        return 1
    # End of that day, not the start — a code minted "good through 2027-01-31"
    # should still work on the 31st.
    expires_at_ms = int((expires_date.timestamp() + 86_400 - 1) * 1000)

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = MongoClient(mongo_url)
    db = client[db_name]
    db.vouchers.create_index("code", unique=True)

    now_iso = datetime.now(timezone.utc).isoformat()
    minted = []
    while len(minted) < args.count:
        code = _one_code()
        try:
            db.vouchers.insert_one({
                "code": code,
                "batch": args.batch,
                "expires_at_ms": expires_at_ms,
                "redeemed_by": None,
                "redeemed_at": None,
                "created_at": now_iso,
            })
        except DuplicateKeyError:
            continue  # collision on the unique index — retry, never silently drop one
        minted.append(code)

    for code in minted:
        print(_display(code))

    print(f"\nminted {len(minted)} codes | batch={args.batch} | expires={args.expires} (UTC end of day)", file=sys.stderr)
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
