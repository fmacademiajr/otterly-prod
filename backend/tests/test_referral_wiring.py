"""The referral must actually reach the response body.

test_safety_referral.py proves ensure_referral() is correct in isolation. This
proves the endpoints CALL it. That distinction matters: if this wiring regresses,
a real disclosure silently gets no hotline and every other test still passes.

Boots the real server module against stub LLM + stub db.
Run: cd backend && ./.venv/bin/python tests/test_referral_wiring.py
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

# Stub emergentintegrations, Emergent's private package. We are testing our wiring,
# not their client.
mod = types.ModuleType("emergentintegrations")
chat_mod = types.ModuleType("emergentintegrations.llm.chat")


class _Chat:
    def __init__(self, *a, **k):
        pass

    def with_model(self, *a, **k):
        return self

    async def send_message(self, msg):
        return _Chat.reply

    reply = "I'm here with you."


chat_mod.LlmChat = _Chat
chat_mod.UserMessage = lambda text=None, **k: text
sys.modules["emergentintegrations"] = mod
sys.modules["emergentintegrations.llm"] = types.ModuleType("emergentintegrations.llm")
sys.modules["emergentintegrations.llm.chat"] = chat_mod

import server  # noqa: E402  (import proves the module loads with our constants)


class _Coll:
    """Minimal async mongo stand-in. Records nothing, answers everything."""
    async def insert_one(self, *a, **k):
        return None

    async def insert_many(self, *a, **k):
        return None

    async def find_one(self, *a, **k):
        return None

    async def update_one(self, *a, **k):
        return None

    async def delete_many(self, *a, **k):
        return None

    async def count_documents(self, *a, **k):
        return 0

    def find(self, *a, **k):
        return self

    def sort(self, *a, **k):
        return self

    async def to_list(self, *a, **k):
        return []


class _DB:
    def __getattr__(self, _):
        return _Coll()


DISCLOSURE = "i can't do any of this. honestly i want to die."
FIGURE_OF_SPEECH = "this tax deadline is killing me"


async def run() -> list:
    """Returns [(check_name, ok, detail)] — one row per check, no cross-matching."""
    out = []
    ent = {"active": True}

    async def room(text):
        return await server.room_message(
            server.RoomMessage(session_id="s1", text=text), who=("owner1", "user1")
        )

    with patch.object(server, "db", _DB()), \
         patch.object(server, "get_entitlement", lambda *a, **k: _await(ent)):

        # --- Room: model omits the referral, harness must add it ---
        _Chat.reply = "I'm here with you."
        r = await room(DISCLOSURE)
        out.append(("room: disclosure gets referral", "988" in r.reply, repr(r.reply)))
        out.append(("room: model reply preserved", "I'm here with you" in r.reply, repr(r.reply)))

        # --- Room: model already gave the referral, must not double up ---
        _Chat.reply = f"I hear you. {server.REFERRAL}"
        r = await room(DISCLOSURE)
        out.append(("room: no double referral", r.reply.count("988") == 1, repr(r.reply)))

        # --- Room: ordinary venting must NOT get a hotline ---
        _Chat.reply = "That sounds heavy. I'm here."
        r = await room(FIGURE_OF_SPEECH)
        out.append(("room: silent on figure of speech", "988" not in r.reply, repr(r.reply)))

        # --- Braindump: 'Skip pure feelings' drops the disclosure, referral must survive ---
        with patch.object(server, "_llm_json", lambda *a, **k: _await({"tasks": ["File the taxes"]})):
            b = await server.braindump(
                server.BraindumpRequest(text=DISCLOSURE), who=("owner1", "user1")
            )
            out.append(("braindump: disclosure gets referral",
                        bool(b.referral) and "988" in b.referral, repr(b.referral)))

            b = await server.braindump(
                server.BraindumpRequest(text=FIGURE_OF_SPEECH), who=("owner1", "user1")
            )
            out.append(("braindump: silent on figure of speech", not b.referral, repr(b.referral)))

    return out


def _await(v):
    async def _c():
        return v
    return _c()


def main() -> int:
    print("server module imports OK")
    rows = asyncio.run(run())
    fails = [(name, detail) for name, ok, detail in rows if not ok]
    for name, ok, _ in rows:
        print(f"{'OK  ' if ok else 'FAIL'} {name}")
    print()
    if fails:
        print(f"{len(fails)} FAILED")
        for name, detail in fails:
            print(f"  - {name}\n      got: {detail}")
        return 1
    print(f"{len(rows)} wiring checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
