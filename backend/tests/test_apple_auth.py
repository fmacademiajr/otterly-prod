"""POST /api/auth/apple — the security test for Sign in with Apple (Blocker B5,
App Store Guideline 4.8).

This is a SECURITY test, not a smoke test. It mints RS256 identity tokens
LOCALLY with `cryptography` and monkeypatches `_apple_jwks.get_signing_key_from_jwt`
to hand back our own public key. No Apple, no device, no network. The aud/iss/
wrong-key/exp cases are the point: they prove jwt.decode actually verifies the
signature and claims. Without them, a hollow endpoint that skips verification
would pass a happy-path smoke test.

Needs a REAL mongod (the partial-index case can't be faked). Points at the docker
container on localhost:27099, uses a disposable db, drops it when done. Skips with
a reason if unreachable.

Run: cd backend && ./.venv/bin/python tests/test_apple_auth.py
"""
import asyncio
import os
import sys
import types
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

MONGO_URL = "mongodb://localhost:27099"
DB_NAME = f"otterly_test_apple_{uuid.uuid4().hex[:8]}"


def _mongo_reachable() -> bool:
    try:
        from pymongo import MongoClient
        MongoClient(MONGO_URL, serverSelectionTimeoutMS=800).admin.command("ping")
        return True
    except Exception as e:
        print(f"SKIP: no mongod reachable at {MONGO_URL} ({e}) — the partial-index "
              "case needs a real mongod, never mongomock.")
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

import jwt  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402
from fastapi import HTTPException  # noqa: E402

import server  # noqa: E402  (boots the real module against the real docker mongod)

# --- Local Apple-key simulation -------------------------------------------------
# KEY_A is "Apple": its public half is what our monkeypatched JWKS lookup returns,
# so a token signed by PRIV_A verifies. KEY_B is an attacker key — a token signed
# by it must be rejected, proving the signature is actually checked.
KEY_A = rsa.generate_private_key(public_exponent=65537, key_size=2048)
KEY_B = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _fake_signing_key(token):
    return types.SimpleNamespace(key=KEY_A.public_key())


server._apple_jwks.get_signing_key_from_jwt = _fake_signing_key


def make_token(sub, *, email=None, email_verified=None, aud=None, iss=None,
               exp=None, sign_key=None):
    now = datetime.now(timezone.utc)
    claims = {
        "iss": iss or server.APPLE_ISSUER,
        "aud": aud or server.APPLE_BUNDLE_ID,
        "sub": sub,
        "iat": now,
        "exp": exp or (now + timedelta(minutes=10)),
    }
    if email is not None:
        claims["email"] = email
    if email_verified is not None:
        claims["email_verified"] = email_verified
    return jwt.encode(claims, sign_key or KEY_A, algorithm="RS256")


async def call(token, *, full_name=None, device_id=None):
    return await server.auth_apple(
        server.AppleAuthRequest(identity_token=token, full_name=full_name, device_id=device_id)
    )


async def status_of(token, **kw):
    """Returns (status_code_or_200)."""
    try:
        await call(token, **kw)
        return 200
    except HTTPException as e:
        return e.status_code


async def clear():
    await server.db.users.delete_many({})
    await server.db.user_sessions.delete_many({})


async def run_checks() -> list:
    out = []
    await server._startup_indexes()  # creates the partial-email + apple_sub indexes

    # --- happy path -----------------------------------------------------------
    await clear()
    r = await call(make_token("apple_sub_happy", email="happy@icloud.com", email_verified=True))
    out.append(("happy path: 200 with session_token",
                bool(r.get("session_token")), repr({k: r.get(k) for k in ("user_id", "email", "session_token")})))

    # --- re-auth with NO email in claims → same user, name intact (core trap) --
    await clear()
    first = await call(make_token("apple_sub_reauth", email="reauth@icloud.com",
                                  email_verified=True), full_name="Reauth User")
    second = await call(make_token("apple_sub_reauth"))  # Apple omits email on re-auth
    out.append(("re-auth (no email): same user_id",
                first["user_id"] == second["user_id"], f'{first["user_id"]} vs {second["user_id"]}'))
    out.append(("re-auth (no email): name intact",
                second["name"] == "Reauth User", repr(second["name"])))

    # --- full_name on first call only → name survives the second call ---------
    await clear()
    a = await call(make_token("apple_sub_name", email="name@icloud.com",
                              email_verified=True), full_name="Fernando A")
    b = await call(make_token("apple_sub_name"), full_name=None)  # later sign-in, no name
    out.append(("full_name first-call-only: name survives",
                b["name"] == "Fernando A" and a["name"] == "Fernando A", repr(b["name"])))

    # --- aud wrong → 401 (audience checked) -----------------------------------
    await clear()
    st = await status_of(make_token("s_aud", email="a@icloud.com", email_verified=True, aud="com.evil.app"))
    out.append(("aud wrong → 401", st == 401, f"status {st}"))

    # --- iss wrong → 401 (issuer checked) -------------------------------------
    st = await status_of(make_token("s_iss", email="i@icloud.com", email_verified=True,
                                    iss="https://evil.example.com"))
    out.append(("iss wrong → 401", st == 401, f"status {st}"))

    # --- exp in the past → 401 -------------------------------------------------
    st = await status_of(make_token("s_exp", exp=datetime.now(timezone.utc) - timedelta(minutes=5)))
    out.append(("exp past → 401", st == 401, f"status {st}"))

    # --- token signed by a DIFFERENT key → 401 (signature checked) ------------
    st = await status_of(make_token("s_sig", email="s@icloud.com", email_verified=True, sign_key=KEY_B))
    out.append(("wrong signing key → 401", st == 401, f"status {st}"))

    # --- email_verified false with matching email → does NOT merge (takeover) -
    await clear()
    await server.db.users.insert_one({
        "user_id": "user_google_1", "email": "shared@gmail.com",
        "name": "Google Person", "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    r = await call(make_token("apple_sub_unverif", email="shared@gmail.com", email_verified=False))
    out.append(("email_verified false: does NOT merge (new user_id)",
                r["user_id"] != "user_google_1", repr(r["user_id"])))
    goog = await server.db.users.find_one({"user_id": "user_google_1"}, {"_id": 0})
    out.append(("email_verified false: google user's apple_sub untouched",
                goog.get("apple_sub") is None, repr(goog.get("apple_sub"))))

    # --- email_verified "true" (STRING) with matching email → merges ----------
    await clear()
    await server.db.users.insert_one({
        "user_id": "user_google_2", "email": "merge@gmail.com",
        "name": "Paid Person", "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    r = await call(make_token("apple_sub_merge", email="merge@gmail.com", email_verified="true"))
    out.append(('email_verified "true" string: merges to same user_id',
                r["user_id"] == "user_google_2", repr(r["user_id"])))
    merged = await server.db.users.find_one({"user_id": "user_google_2"}, {"_id": 0})
    out.append(('email_verified "true": apple_sub set on the existing user',
                merged.get("apple_sub") == "apple_sub_merge", repr(merged.get("apple_sub"))))
    out.append(('email_verified "true": existing name preserved',
                merged.get("name") == "Paid Person", repr(merged.get("name"))))

    # --- two Apple users, neither with email → both insert, no duplicate-key --
    await clear()
    r1 = await call(make_token("apple_sub_noemail_1"))
    dup_err = None
    try:
        r2 = await call(make_token("apple_sub_noemail_2"))
    except Exception as e:  # a duplicate-key on null email would raise here
        dup_err = repr(e)
        r2 = None
    out.append(("two email-less Apple users: both insert, no duplicate-key",
                dup_err is None and r2 and r1["user_id"] != r2["user_id"],
                dup_err or f'{r1["user_id"]} / {r2["user_id"] if r2 else None}'))
    both = await server.db.users.count_documents({"apple_sub": {"$in": ["apple_sub_noemail_1", "apple_sub_noemail_2"]}})
    out.append(("two email-less Apple users: two rows present", both == 2, f"count {both}"))
    # neither wrote an email key (the omit-not-null requirement)
    has_email_key = await server.db.users.count_documents(
        {"apple_sub": {"$in": ["apple_sub_noemail_1", "apple_sub_noemail_2"]}, "email": {"$exists": True}})
    out.append(("two email-less Apple users: no email key written (omit, not null)",
                has_email_key == 0, f"docs with email key: {has_email_key}"))

    # --- device data migration is wired on the Apple path ---------------------
    await clear()
    dev = f"dev:{uuid.uuid4().hex[:8]}"
    device_id = dev.split(":", 1)[1]
    await server.db.tasks.insert_one({"owner": dev, "title": "orphan"})
    r = await call(make_token("apple_sub_migrate"), device_id=device_id)
    migrated = await server.db.tasks.find_one({"title": "orphan"}, {"_id": 0})
    out.append(("device data migrated to the new user_id",
                migrated["owner"] == r["user_id"], repr(migrated["owner"])))

    return out


async def run_all() -> list:
    try:
        return await run_checks()
    finally:
        await server.client.drop_database(DB_NAME)


def _assert_source_untouched() -> list:
    """The Emergent path is not ours to refactor. Assert its load-bearing line
    survives and migrate_device_data is called exactly twice (once per auth path)."""
    src = (BACKEND / "server.py").read_text()
    out = []
    out.append(("emergent path: token line intact",
                'server_token = data.get("session_token") or payload.session_token' in src,
                "line missing"))
    n = src.count("migrate_device_data(")  # 1 def + 2 calls == 3 occurrences of the name
    calls = src.count("await migrate_device_data(")
    out.append(("migrate_device_data called exactly twice (both paths)",
                calls == 2, f"call sites: {calls}, name occurrences: {src.count('migrate_device_data')}"))
    return out


def main() -> int:
    print(f"server module imports OK (booted against real mongod at {MONGO_URL}, db={DB_NAME})")
    rows = _assert_source_untouched() + asyncio.run(run_all())
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
