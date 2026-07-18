"""_startup_indexes must never let one index's create_index failure abort the
rest. Cheapest honest version, no database: monkeypatch create_index to raise
on the FIRST spec, run _startup_indexes(), and assert every remaining spec
was still attempted. That is the bomb (task-3-brief.md), tested with no
mongod. test_indexes_live.py proves the same thing against a real mongod
with the actual IndexOptionsConflict.

Run: cd backend && ./.venv/bin/python tests/test_indexes.py
"""
import asyncio
import os
import sys
import types
from pathlib import Path
from unittest.mock import patch

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test")
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

import server  # noqa: E402  (import proves the module loads; no mongod is contacted below)


class _RaisingColl:
    """First create_index call raises. Every call after it (on this or any
    other collection) must still be attempted — that's the whole point.
    index_information() reports an OLD-style plain email_1 (no
    partialFilterExpression) so _startup_indexes' migration guard decides to
    call drop_index — which then also raises, to prove that failure is
    isolated too."""

    def __init__(self, calls, fail_once):
        self._calls = calls
        self._fail_once = fail_once

    async def index_information(self, *a, **k):
        return {"email_1": {"v": 2, "key": [("email", 1)], "unique": True}}

    async def drop_index(self, *a, **k):
        raise Exception("simulated drop failure")

    async def create_index(self, keys, **opts):
        self._calls.append(keys)
        if self._fail_once and len(self._calls) == 1:
            raise Exception("IndexOptionsConflict (simulated)")
        return "ok"


class _RaisingDB:
    def __init__(self, calls, fail_once=True):
        self._calls = calls
        self._fail_once = fail_once

    def __getitem__(self, name):
        return _RaisingColl(self._calls, self._fail_once)

    def __getattr__(self, name):
        return self[name]


async def check_all_specs_attempted_despite_first_failure() -> list:
    out = []
    calls = []
    with patch.object(server, "db", _RaisingDB(calls, fail_once=True)):
        await server._startup_indexes()  # must not raise — every spec has its own try/except

    expected = len(server.INDEX_SPECS)
    out.append((
        "every spec in INDEX_SPECS was attempted despite the first raising",
        len(calls) == expected,
        f"expected {expected} create_index calls, got {len(calls)}",
    ))
    return out


async def check_drop_index_failure_does_not_block_creates() -> list:
    """The migration guard sees an old-style email_1 (no partialFilterExpression)
    and calls drop_index, which raises here. That must not prevent a single
    create_index call from running."""
    out = []
    calls = []
    with patch.object(server, "db", _RaisingDB(calls, fail_once=False)):
        await server._startup_indexes()

    expected = len(server.INDEX_SPECS)
    out.append((
        "drop_index raising doesn't block any create_index call",
        len(calls) == expected,
        f"expected {expected} create_index calls, got {len(calls)}",
    ))
    return out


async def run_all() -> list:
    rows = []
    rows += await check_all_specs_attempted_despite_first_failure()
    rows += await check_drop_index_failure_does_not_block_creates()
    return rows


def main() -> int:
    print("server module imports OK (no mongod contacted, db is monkeypatched)")
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
