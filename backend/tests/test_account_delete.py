"""DELETE /api/account must delete every PII collection under the right key.

Blocker B3 (Apple 5.1.1(v)): account creation without a delete path is a
submission blocker. The collection key map is the real risk: using the wrong
key (owner vs user_id) silently matches nothing and the endpoint still
reports success. This test exists to catch exactly that.

Run: cd backend && ./.venv/bin/python tests/test_account_delete.py
"""
import asyncio
import inspect
import os
import sys
import types
from pathlib import Path
from unittest.mock import patch

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

# ---- Part 1: pin the collection maps without booting the app (needs no MONGO_URL) ----
src = (BACKEND / "server.py").read_text()
block = src[src.index("OWNER_COLLECTIONS = ("):src.index('@api.delete("/account")')]
ns = {}
exec(block, ns)
OWNER_COLLECTIONS = ns["OWNER_COLLECTIONS"]
USER_ID_COLLECTIONS = ns["USER_ID_COLLECTIONS"]

EXPECTED_OWNER = ("tasks", "steps", "activity", "room_messages", "rate_counters")
EXPECTED_USER_ID = ("entitlements", "user_sessions")
ALL_NINE = {
    "tasks", "steps", "activity", "room_messages", "rate_counters",
    "entitlements", "user_sessions", "users", "webhook_events",
}


def check_maps() -> list:
    out = []
    out.append(("OWNER_COLLECTIONS exact", tuple(OWNER_COLLECTIONS) == EXPECTED_OWNER,
                repr(OWNER_COLLECTIONS)))
    out.append(("USER_ID_COLLECTIONS exact", tuple(USER_ID_COLLECTIONS) == EXPECTED_USER_ID,
                repr(USER_ID_COLLECTIONS)))
    union = set(OWNER_COLLECTIONS) | set(USER_ID_COLLECTIONS) | {"users", "webhook_events"}
    out.append(("union covers all 9 collections, no strays", union == ALL_NINE, repr(union)))
    return out


# ---- Part 2: boot the real module against a fake db, prove the wiring ----
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("EMERGENT_LLM_KEY", "x")
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

import server  # noqa: E402  (import proves the module loads with our constants)


class _Result:
    def __init__(self, n):
        self.deleted_count = n


class _RecordingColl:
    """Records every delete_many filter under its own collection name."""
    def __init__(self, name, calls):
        self._name = name
        self._calls = calls

    async def delete_many(self, filt):
        self._calls.append((self._name, dict(filt)))
        return _Result(1)


class _RecordingDB:
    """db[name] and db.name must resolve to the SAME recording collection —
    the endpoint uses db[name] for the mapped groups and db.users directly."""
    def __init__(self):
        self.calls = []

    def __getitem__(self, name):
        return _RecordingColl(name, self.calls)

    def __getattr__(self, name):
        return self[name]


async def _run_delete():
    db = _RecordingDB()
    user = server.UserProfile(user_id="user_abc123", email="a@b.com", name="A")
    with patch.object(server, "db", db):
        await server.delete_account(user=user, x_device_id="dev1")
    return db.calls


def check_dependency() -> list:
    """The whole point of require_user over resolve_owner is that deletion is
    never reachable by device id alone. Calling delete_account directly (as
    check_wiring does) bypasses FastAPI's Depends() resolution, so a swap to
    resolve_owner would NOT be caught by the filter assertions below. Catch
    it here instead, from the function's own dependency declaration."""
    out = []
    param = inspect.signature(server.delete_account).parameters["user"]
    dep = getattr(param.default, "dependency", None)
    out.append(("delete_account depends on require_user, not resolve_owner",
                dep is server.require_user, repr(dep)))
    return out


def check_wiring() -> list:
    out = []
    calls = asyncio.run(_run_delete())
    by_coll = {}
    for name, filt in calls:
        by_coll.setdefault(name, []).append(filt)

    ent_calls = by_coll.get("entitlements", [])
    out.append(("entitlements queried by user_id",
                ent_calls == [{"user_id": "user_abc123"}], repr(ent_calls)))
    out.append(("entitlements NOT queried by owner",
                all("owner" not in f for f in ent_calls), repr(ent_calls)))

    owner_filter = {"owner": {"$in": ["user_abc123", "dev:dev1"]}}
    owner_ok = all(by_coll.get(name) == [owner_filter] for name in EXPECTED_OWNER)
    out.append(("owner-keyed collections filter on owner $in [uid, dev:id]", owner_ok,
                repr({n: by_coll.get(n) for n in EXPECTED_OWNER})))

    out.append(("user_sessions deletes by user_id (all devices, not one token)",
                by_coll.get("user_sessions") == [{"user_id": "user_abc123"}],
                repr(by_coll.get("user_sessions"))))

    order = [name for name, _ in calls]
    out.append(("users deleted LAST", bool(order) and order[-1] == "users", repr(order)))
    out.append(("users queried by user_id",
                by_coll.get("users") == [{"user_id": "user_abc123"}],
                repr(by_coll.get("users"))))

    return out


def main() -> int:
    print("server module imports OK")
    rows = check_maps() + check_dependency() + check_wiring()
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
