"""Re-shrink must not silently destroy finished steps.

shrink_task ran delete_many unconditionally, so a user 3 steps into 6 lost visible
progress with no confirm and no undo, while db.activity kept counting the work.

Run: cd backend && ./.venv/bin/python tests/test_reshrink_guard.py
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
os.environ.setdefault("EMERGENT_LLM_KEY", "x")
os.environ.setdefault("CORS_ORIGINS", "*")

chat_mod = types.ModuleType("emergentintegrations.llm.chat")


class _Chat:
    def __init__(self, *a, **k):
        pass

    def with_model(self, *a, **k):
        return self

    async def send_message(self, msg):
        return "{}"


chat_mod.LlmChat = _Chat
chat_mod.UserMessage = lambda text=None, **k: text
sys.modules["emergentintegrations"] = types.ModuleType("emergentintegrations")
sys.modules["emergentintegrations.llm"] = types.ModuleType("emergentintegrations.llm")
sys.modules["emergentintegrations.llm.chat"] = chat_mod

import server  # noqa: E402
from fastapi import HTTPException  # noqa: E402

GOOD = {"steps": [{"text": "Open the doc", "minutes": 2}, {"text": "Type the first line", "minutes": 5}]}


class _Coll:
    def __init__(self, done_count=0, task=True):
        self.done_count = done_count
        self.task = task
        self.deleted = False

    async def find_one(self, *a, **k):
        return {"id": "t1", "title": "File the taxes", "note": None} if self.task else None

    async def count_documents(self, *a, **k):
        return self.done_count

    async def delete_many(self, *a, **k):
        self.deleted = True

    async def insert_many(self, *a, **k):
        return None

    async def update_one(self, *a, **k):
        return None


class _DB:
    def __init__(self, done_count=0):
        self.steps = _Coll(done_count)
        self.tasks = _Coll()

    def __getattr__(self, _):
        return _Coll()


def _await(v):
    async def _c():
        return v
    return _c()


async def call(done_count, force):
    db = _DB(done_count)
    llm_calls = []

    async def fake_llm(sid, system, text, deep=False):
        llm_calls.append(text)
        return GOOD

    with patch.object(server, "db", db), \
         patch.object(server, "get_entitlement", lambda *a, **k: _await({"active": True})), \
         patch.object(server, "_llm_json", fake_llm):
        try:
            await server.shrink_task(
                "t1", server.ShrinkRequest(difficulty="medium", force=force), who=("o1", "u1")
            )
            return None, db, llm_calls
        except HTTPException as e:
            return e, db, llm_calls


async def run():
    rows = []

    # No finished steps: proceeds, no confirm needed.
    exc, db, _ = await call(done_count=0, force=False)
    rows.append(("clean re-shrink proceeds", exc is None, repr(exc and exc.detail)))

    # Finished steps + no force: refuse, and DO NOT delete.
    exc, db, calls = await call(done_count=3, force=False)
    rows.append(("finished steps -> 409", exc is not None and exc.status_code == 409,
                 repr(exc and (exc.status_code, exc.detail))))

    # The 409 detail is user-facing copy. "1 finished steps would be lost" shipped
    # to a real screen before anyone read it.
    exc1, _, _ = await call(done_count=1, force=False)
    rows.append(("409 copy is singular at 1", exc1 is not None and "1 finished step would" in exc1.detail,
                 repr(exc1 and exc1.detail)))
    rows.append(("409 copy is plural at 3", exc is not None and "3 finished steps would" in exc.detail,
                 repr(exc and exc.detail)))
    rows.append(("409 destroys nothing", not db.steps.deleted, f"deleted={db.steps.deleted}"))
    # Checked before the LLM call, so a refusal costs no API call and no free-tier shrink.
    rows.append(("409 costs no LLM call", len(calls) == 0, f"llm_calls={len(calls)}"))

    # Finished steps + force: the user confirmed, proceed.
    exc, db, _ = await call(done_count=3, force=True)
    rows.append(("force overrides the 409", exc is None, repr(exc and exc.detail)))
    rows.append(("force does delete", db.steps.deleted, f"deleted={db.steps.deleted}"))

    # too_big must change the ask, not just the number.
    db2 = _DB(0)
    calls = []

    async def fake_llm(sid, system, text, deep=False):
        calls.append(text)
        return GOOD

    with patch.object(server, "db", db2), \
         patch.object(server, "get_entitlement", lambda *a, **k: _await({"active": True})), \
         patch.object(server, "_llm_json", fake_llm):
        await server.shrink_task(
            "t1", server.ShrinkRequest(difficulty="easy", too_big=True), who=("o1", "u1")
        )
    rows.append(("too_big reaches the prompt", "smaller first actions" in calls[0], repr(calls[0][:90])))

    return rows


def main() -> int:
    rows = asyncio.run(run())
    fails = [(n, d) for n, ok, d in rows if not ok]
    for n, ok, _ in rows:
        print(f"{'OK  ' if ok else 'FAIL'} {n}")
    print()
    if fails:
        print(f"{len(fails)} FAILED")
        for n, d in fails:
            print(f"  - {n}\n      got: {d}")
        return 1
    print(f"{len(rows)} checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
