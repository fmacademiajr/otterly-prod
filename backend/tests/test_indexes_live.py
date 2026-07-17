"""The bomb: db.users.email switching from a plain-unique index to a
partial-unique one raises IndexOptionsConflict against the OLD index, and
_startup_indexes wrapped every create_index call in ONE try/except — so that
one conflict silently aborted every index after it, including the
user_sessions.expires_at TTL, session_token uniqueness, rate_counters
uniqueness, and webhook_events idempotency. The app booted normally with
none of it. See .superpowers/sdd/task-3-brief.md.

Needs a REAL mongod. mongomock does not reproduce IndexOptionsConflict (code
85), so it would be false confidence for exactly the failure this guards
against. Points at the docker container on localhost:27099, uses a
disposable db, drops it when done. Skips with a reason if unreachable.

Run: cd backend && ./.venv/bin/python tests/test_indexes_live.py
"""
import asyncio
import os
import sys
import types
import uuid
from pathlib import Path
from unittest.mock import patch

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

MONGO_URL = "mongodb://localhost:27099"
DB_NAME = f"otterly_test_indexes_{uuid.uuid4().hex[:8]}"


def _mongo_reachable() -> bool:
    try:
        from pymongo import MongoClient
        MongoClient(MONGO_URL, serverSelectionTimeoutMS=800).admin.command("ping")
        return True
    except Exception as e:
        print(f"SKIP: no mongod reachable at {MONGO_URL} ({e}) — "
              "IndexOptionsConflict needs a real mongod, never mongomock.")
        return False


if not _mongo_reachable():
    sys.exit(0)

os.environ["MONGO_URL"] = MONGO_URL
os.environ["DB_NAME"] = DB_NAME
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

import server  # noqa: E402  (boots the real module against the real docker mongod)


async def _seed_old_email_index() -> None:
    """The CURRENT-prod state on every existing deployment: a plain unique
    index on email, named email_1 by mongo's default convention. This is
    exactly what _startup_indexes' drop_index("email_1") targets."""
    await server.db.users.create_index("email", unique=True)


class _DropSpy:
    """Wraps the real users collection. Counts drop_index calls so the test
    can assert the migration guard actually skipped the drop on the second
    boot — not just infer it from the end state, which would look identical
    whether the guard worked or the drop merely no-op'd."""

    def __init__(self, real_coll):
        self._real = real_coll
        self.drop_calls = 0

    async def drop_index(self, *a, **k):
        self.drop_calls += 1
        return await self._real.drop_index(*a, **k)

    def __getattr__(self, name):
        return getattr(self._real, name)


async def run_checks() -> list:
    out = []
    await _seed_old_email_index()
    before = await server.db.users.index_information()
    out.append(("seed: old plain-unique email_1 present", "email_1" in before, repr(sorted(before))))

    # First boot: the seeded email_1 lacks partialFilterExpression, so the
    # migration guard drops it, then the new partial index is created in its
    # place (also named email_1 — Mongo names indexes from key shape, so the
    # drop-then-create is required, create_index alone can't replace one
    # index option set with another under the same name).
    spy = _DropSpy(server.db.users)
    with patch.object(server.db, "users", spy):
        await server._startup_indexes()
    out.append(("first boot: migration guard actually dropped the old index",
                spy.drop_calls == 1, f"drop_index called {spy.drop_calls} times"))

    # Second boot: email_1 now HAS partialFilterExpression, so the guard must
    # NOT drop it again — this proves the migration is genuinely one-time,
    # not a drop/rebuild on every boot (which would itself be a version of
    # the bomb: a window with no unique constraint on email, every boot).
    spy2 = _DropSpy(server.db.users)
    with patch.object(server.db, "users", spy2):
        await server._startup_indexes()
    out.append(("second boot: migration guard did NOT re-drop the already-migrated index",
                spy2.drop_calls == 0, f"drop_index called {spy2.drop_calls} times"))

    users_idx = await server.db.users.index_information()
    sessions_idx = await server.db.user_sessions.index_information()
    rate_idx = await server.db.rate_counters.index_information()
    webhook_idx = await server.db.webhook_events.index_information()

    email_spec = users_idx.get("email_1")
    out.append(("users.email: partial unique index survived", email_spec is not None, repr(users_idx)))
    if email_spec:
        out.append(("users.email: unique", email_spec.get("unique") is True, repr(email_spec)))
        out.append(("users.email: partialFilterExpression set",
                     email_spec.get("partialFilterExpression") == {"email": {"$type": "string"}},
                     repr(email_spec)))

    apple_spec = users_idx.get("apple_sub_1")
    out.append(("users.apple_sub: unique+sparse index survived", apple_spec is not None, repr(users_idx)))
    if apple_spec:
        out.append(("users.apple_sub: unique", apple_spec.get("unique") is True, repr(apple_spec)))
        out.append(("users.apple_sub: sparse", apple_spec.get("sparse") is True, repr(apple_spec)))

    token_spec = sessions_idx.get("session_token_1")
    out.append(("user_sessions.session_token: unique index survived — THE BOMB",
                token_spec is not None and token_spec.get("unique") is True,
                repr(sessions_idx)))

    ttl_spec = sessions_idx.get("expires_at_1")
    out.append(("user_sessions.expires_at: TTL index survived — THE BOMB",
                ttl_spec is not None and "expireAfterSeconds" in ttl_spec,
                repr(sessions_idx)))

    rate_spec = next((v for k, v in rate_idx.items() if k != "_id_"), None)
    out.append(("rate_counters: compound unique index survived — THE BOMB",
                rate_spec is not None and rate_spec.get("unique") is True,
                repr(rate_idx)))

    webhook_spec = webhook_idx.get("event_id_1")
    out.append(("webhook_events.event_id: unique index survived — THE BOMB",
                webhook_spec is not None and webhook_spec.get("unique") is True,
                repr(webhook_idx)))

    return out


async def run_all() -> list:
    try:
        return await run_checks()
    finally:
        # Same event loop as everything above — motor's client is loop-bound.
        await server.client.drop_database(DB_NAME)


def main() -> int:
    print(f"server module imports OK (booted against real mongod at {MONGO_URL}, db={DB_NAME})")
    rows = asyncio.run(run_all())
    fails = [(name, detail) for name, ok, detail in rows if not ok]
    for name, ok, _ in rows:
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
