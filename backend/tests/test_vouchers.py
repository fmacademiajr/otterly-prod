"""Voucher redemption: schema, resolution order, and the race.

db.vouchers holds ONE doc per CODE (not per redemption). A voucher must NEVER
write into db.entitlements — that's the RevenueCat webhook's row, different
lifecycle, different source of truth, no shared row (see server.py's
"Vouchers" section comment).

Needs a REAL mongod. mongomock does not model MongoDB's document-level write
isolation, and that isolation is the entire mechanism under test in the race
case. Points at the docker container on localhost:27099, uses a disposable
db, drops it when done. Skips with a reason if that mongod isn't reachable —
never mongomock's the race case.

Run: cd backend && ./.venv/bin/python tests/test_vouchers.py
"""
import asyncio
import inspect
import os
import sys
import types
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

MONGO_URL = "mongodb://localhost:27099"
DB_NAME = f"otterly_test_vouchers_{uuid.uuid4().hex[:8]}"


def _mongo_reachable() -> bool:
    try:
        from pymongo import MongoClient
        MongoClient(MONGO_URL, serverSelectionTimeoutMS=800).admin.command("ping")
        return True
    except Exception as e:
        print(f"SKIP: no mongod reachable at {MONGO_URL} ({e}) — "
              "the race case needs a real mongod, never mongomock.")
        return False


if not _mongo_reachable():
    sys.exit(0)

os.environ["MONGO_URL"] = MONGO_URL
os.environ["DB_NAME"] = DB_NAME
os.environ.setdefault("ANTHROPIC_API_KEY", "x")
os.environ.setdefault("OPENAI_API_KEY", "x")
os.environ.setdefault("CORS_ORIGINS", "*")

# Stub emergentintegrations, Emergent's private package. Not under test here.
mod = types.ModuleType("emergentintegrations")
chat_mod = types.ModuleType("emergentintegrations.llm.chat")


class _Chat:
    def __init__(self, *a, **k):
        pass

    def with_model(self, *a, **k):
        return self

    async def send_message(self, msg):
        return "ok"


chat_mod.LlmChat = _Chat
chat_mod.UserMessage = lambda text=None, **k: text
sys.modules["emergentintegrations"] = mod
sys.modules["emergentintegrations.llm"] = types.ModuleType("emergentintegrations.llm")
sys.modules["emergentintegrations.llm.chat"] = chat_mod

import server  # noqa: E402  (boots the real module against the real docker mongod)
from fastapi import HTTPException  # noqa: E402


def _user(uid: str) -> "server.UserProfile":
    return server.UserProfile(user_id=uid, email=f"{uid}@test.local", name="Tester")


def _future_ms(days=30) -> int:
    return int((datetime.now(timezone.utc) + timedelta(days=days)).timestamp() * 1000)


def _past_ms(days=1) -> int:
    return int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp() * 1000)


async def _reset():
    await server.db.vouchers.delete_many({})
    await server.db.entitlements.delete_many({})
    await server.db.rate_counters.delete_many({})


async def _mint(code: str, expires_at_ms, batch="test-batch", redeemed_by=None) -> None:
    await server.db.vouchers.insert_one({
        "code": code,
        "batch": batch,
        "expires_at_ms": expires_at_ms,
        "redeemed_by": redeemed_by,
        "redeemed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


def check_dependency() -> list:
    """require_user, never resolve_owner — a grant must attach to a real
    account, not a device."""
    out = []
    param = inspect.signature(server.redeem_voucher).parameters["user"]
    dep = getattr(param.default, "dependency", None)
    out.append(("redeem_voucher depends on require_user, not resolve_owner",
                dep is server.require_user, repr(dep)))
    return out


async def check_valid_redeem() -> list:
    out = []
    await _reset()
    await _mint("OTTERAAAA1111", _future_ms())
    resp = await server.redeem_voucher(server.VoucherRedeem(code="OTTER-AAAA-1111"), user=_user("u1"))
    out.append(("valid redeem: ok", resp.ok is True, repr(resp)))
    out.append(("valid redeem: plan == voucher", resp.plan == "voucher", repr(resp)))
    ent = await server.get_entitlement("u1", "u1")
    out.append(("valid redeem: premium active via get_entitlement",
                ent == {"active": True, "plan": "voucher"}, repr(ent)))
    return out


async def check_second_user_conflict() -> list:
    out = []
    await _reset()
    await _mint("OTTERBBBB2222", _future_ms())
    r1 = await server.redeem_voucher(server.VoucherRedeem(code="OTTERBBBB2222"), user=_user("first"))
    out.append(("first user redeems ok", r1.ok is True, repr(r1)))
    try:
        await server.redeem_voucher(server.VoucherRedeem(code="OTTERBBBB2222"), user=_user("second"))
        out.append(("second user redeem raises 409", False, "did not raise"))
    except HTTPException as e:
        out.append(("second user redeem raises 409", e.status_code == 409, repr((e.status_code, e.detail))))
    ent_first = await server.get_entitlement("first", "first")
    ent_second = await server.get_entitlement("second", "second")
    out.append(("first user keeps the grant", ent_first["active"] is True, repr(ent_first)))
    out.append(("second user gets nothing", ent_second["active"] is False, repr(ent_second)))
    return out


async def check_idempotent_same_user() -> list:
    out = []
    await _reset()
    await _mint("OTTERCCCC3333", _future_ms())
    r1 = await server.redeem_voucher(server.VoucherRedeem(code="OTTERCCCC3333"), user=_user("same"))
    r2 = await server.redeem_voucher(server.VoucherRedeem(code="otter cccc 3333"), user=_user("same"))
    out.append(("first tap ok", r1.ok is True, repr(r1)))
    out.append(("second tap by same user is 200, not an error", r2.ok is True, repr(r2)))
    doc = await server.db.vouchers.find_one({"code": "OTTERCCCC3333"}, {"_id": 0})
    out.append(("still redeemed by that one user", doc.get("redeemed_by") == "same", repr(doc)))
    return out


async def check_expired_batch() -> list:
    out = []
    await _reset()
    await _mint("OTTERDDDD4444", _past_ms())
    try:
        await server.redeem_voucher(server.VoucherRedeem(code="OTTERDDDD4444"), user=_user("u2"))
        out.append(("expired code raises 410", False, "did not raise"))
    except HTTPException as e:
        out.append(("expired code raises 410", e.status_code == 410, repr((e.status_code, e.detail))))
    ent = await server.get_entitlement("u2", "u2")
    out.append(("no grant from an expired code", ent["active"] is False, repr(ent)))
    return out


async def check_unknown_code() -> list:
    out = []
    await _reset()
    try:
        await server.redeem_voucher(server.VoucherRedeem(code="OTTERNOPE0000"), user=_user("u3"))
        out.append(("unknown code raises 404", False, "did not raise"))
    except HTTPException as e:
        out.append(("unknown code raises 404", e.status_code == 404, repr((e.status_code, e.detail))))
    return out


async def check_resolution_order() -> list:
    """The case that matters most: a real payer must never be downgraded by a
    voucher. entitlements is checked FIRST and wins outright, whether the
    voucher on file for that same user is expired or still valid."""
    out = []
    await _reset()
    await server.db.entitlements.insert_one({
        "user_id": "payer",
        "premium": {"active": True, "product_id": "otter_lifetime"},
    })
    await _mint("OTTEREEEE5555", _past_ms(), redeemed_by="payer")
    ent = await server.get_entitlement("payer", "payer")
    out.append(("paid entitlement wins over an expired voucher on the same user",
                ent == {"active": True, "plan": "otter_lifetime"}, repr(ent)))

    await server.db.vouchers.update_one({"code": "OTTEREEEE5555"}, {"$set": {"expires_at_ms": _future_ms()}})
    ent2 = await server.get_entitlement("payer", "payer")
    out.append(("paid entitlement wins over a still-valid voucher too — entitlements checked first, full stop",
                ent2 == {"active": True, "plan": "otter_lifetime"}, repr(ent2)))
    return out


async def check_normalization() -> list:
    out = []
    await _reset()
    await _mint("OTTERFFFF6666", _future_ms())
    resp = await server.redeem_voucher(server.VoucherRedeem(code="  otter-ffff-6666  "), user=_user("u4"))
    out.append(("lowercase + spaced + dashed input finds the code", resp.ok is True, repr(resp)))
    return out


class _GatedVouchers:
    """Wraps the real vouchers collection. find_one behaves normally but then
    blocks at a 2-party barrier before returning — this forces BOTH concurrent
    redeem_voucher() calls to complete their existence/expiry read (both seeing
    redeemed_by=None, since neither has written yet) before EITHER is allowed
    to proceed to its update_one. That is the exact check-then-act window a
    find-then-write bug lives in. Without this, two coroutines racing a real
    mongod over loopback essentially never land in that window on their own —
    proven empirically: a plain (no-delay) find-then-write passed this suite
    3/3 runs before this barrier was added. A test that only catches a bug
    when the bug is *also* artificially slowed down has tested nothing."""

    def __init__(self, real_coll, barrier):
        self._real = real_coll
        self._barrier = barrier

    async def find_one(self, *a, **k):
        res = await self._real.find_one(*a, **k)
        await self._barrier.wait()
        return res

    def __getattr__(self, name):
        return getattr(self._real, name)


class _DBProxy:
    """Same db for everything except vouchers, which is gated. Patched in for
    the two concurrent calls only — the post-race verification read happens
    OUTSIDE this proxy, or that lone find_one would block forever waiting for
    a second party that never arrives at the barrier."""

    def __init__(self, real_db, gated_vouchers):
        self._real = real_db
        self._gated_vouchers = gated_vouchers

    @property
    def vouchers(self):
        return self._gated_vouchers

    def __getattr__(self, name):
        return getattr(self._real, name)


async def check_race() -> list:
    """Two concurrent redemptions of ONE code by two DIFFERENT users, forced
    into the check-then-act window by the barrier above. Exactly one must
    win. The guard under test is MongoDB's document-level write isolation on
    the {"code": ..., "redeemed_by": None} update filter — not anything on
    the Python side, which is why the interleaving must be forced, not hoped
    for."""
    out = []
    await _reset()
    await _mint("OTTERRACE7777", _future_ms())

    async def attempt(uid):
        try:
            r = await server.redeem_voucher(server.VoucherRedeem(code="OTTERRACE7777"), user=_user(uid))
            return ("ok", uid, r)
        except HTTPException as e:
            return ("err", uid, e.status_code)

    barrier = asyncio.Barrier(2)
    gated = _GatedVouchers(server.db.vouchers, barrier)
    with patch.object(server, "db", _DBProxy(server.db, gated)):
        results = await asyncio.gather(attempt("racer_a"), attempt("racer_b"))

    kinds = [k for k, _, _ in results]
    out.append(("exactly one winner", kinds.count("ok") == 1, repr(results)))
    out.append(("exactly one loser gets 409",
                kinds.count("err") == 1 and next(v for k, _, v in results if k == "err") == 409,
                repr(results)))

    winner_uid = next(uid for k, uid, _ in results if k == "ok")
    doc = await server.db.vouchers.find_one({"code": "OTTERRACE7777"}, {"_id": 0})
    out.append(("db state matches the reported winner, never overwritten by the loser",
                doc.get("redeemed_by") == winner_uid, repr(doc)))
    return out


async def run_all() -> list:
    rows = check_dependency()
    try:
        for fn in (
            check_valid_redeem,
            check_second_user_conflict,
            check_idempotent_same_user,
            check_expired_batch,
            check_unknown_code,
            check_resolution_order,
            check_normalization,
            check_race,
        ):
            rows += await fn()
    finally:
        # Same event loop as everything above — motor's client is loop-bound,
        # a second top-level asyncio.run() for cleanup reopens a closed loop.
        await server.client.drop_database(DB_NAME)
    return rows


def main() -> int:
    print(f"server module imports OK (booted against real mongod at {MONGO_URL}, db={DB_NAME})")
    rows = asyncio.run(run_all())
    fails = [(name, detail) for name, ok, detail in rows if not ok]
    for name, ok, detail in rows:
        print(f"{'OK  ' if ok else 'FAIL'} {name}")
    print()
    if fails:
        print(f"{len(fails)} FAILED")
        for name, detail in fails:
            print(f"  - {name}\n      got: {detail}")
        return 1
    print(f"{len(rows)} checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
