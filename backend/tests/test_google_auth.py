"""POST /api/auth/google — self-owned Google Sign-In (replaces the Emergent-proxied
Google path; /api/auth/session is untouched and out of scope here).

This is a SECURITY test, not a smoke test. It mints RS256 identity tokens LOCALLY
with `cryptography` and monkeypatches `_google_jwks.get_signing_key_from_jwt` to hand
back our own public key. No Google, no device, no network. The aud/iss/wrong-key/exp
cases are the point: they prove jwt.decode actually verifies the signature and claims.
Without them, a hollow endpoint that skips verification would pass a happy-path smoke
test. Mirrors tests/test_apple_auth.py's pattern exactly.

Needs a REAL mongod (the partial-index case can't be faked). Points at the docker
container on localhost:27099, uses a disposable db, drops it when done. Skips with
a reason if unreachable.

Run: cd backend && ./.venv/bin/python tests/test_google_auth.py
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
DB_NAME = f"otterly_test_google_{uuid.uuid4().hex[:8]}"


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
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")

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

# --- Local Google-key simulation -------------------------------------------------
# KEY_A is "Google": its public half is what our monkeypatched JWKS lookup returns,
# so a token signed by PRIV_A verifies. KEY_B is an attacker key — a token signed
# by it must be rejected, proving the signature is actually checked.
KEY_A = rsa.generate_private_key(public_exponent=65537, key_size=2048)
KEY_B = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _fake_signing_key(token):
    return types.SimpleNamespace(key=KEY_A.public_key())


server._google_jwks.get_signing_key_from_jwt = _fake_signing_key


def make_token(sub, *, name=None, picture=None, email=None, email_verified=None,
               aud=None, iss=None, exp=None, sign_key=None):
    now = datetime.now(timezone.utc)
    claims = {
        "iss": iss or server.GOOGLE_ISSUERS[0],
        "aud": aud or server.GOOGLE_CLIENT_ID,
        "sub": sub,
        "iat": now,
        "exp": exp or (now + timedelta(minutes=10)),
    }
    if name is not None:
        claims["name"] = name
    if picture is not None:
        claims["picture"] = picture
    if email is not None:
        claims["email"] = email
    if email_verified is not None:
        claims["email_verified"] = email_verified
    return jwt.encode(claims, sign_key or KEY_A, algorithm="RS256")


async def call(token, *, device_id=None):
    return await server.auth_google(
        server.GoogleAuthRequest(id_token=token, device_id=device_id)
    )


async def status_of(token, **kw):
    """Returns the status_code, or 200 on success."""
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
    await server._startup_indexes()  # creates the partial-email + google_sub indexes

    # --- happy path -----------------------------------------------------------
    await clear()
    r = await call(make_token("google_sub_happy", name="Happy Person", picture="https://p/1.jpg",
                              email="happy@gmail.com", email_verified=True))
    out.append(("happy path: 200 with session_token",
                bool(r.get("session_token")), repr({k: r.get(k) for k in ("user_id", "email", "session_token")})))
    out.append(("happy path: name from claims",
                r["name"] == "Happy Person", repr(r["name"])))
    out.append(("happy path: picture from claims",
                r["picture"] == "https://p/1.jpg", repr(r["picture"])))

    # --- re-auth, same sub → same user, no duplicate insert --------------------
    await clear()
    first = await call(make_token("google_sub_reauth", name="Reauth User",
                                  email="reauth@gmail.com", email_verified=True))
    second = await call(make_token("google_sub_reauth", email="reauth@gmail.com", email_verified=True))
    out.append(("re-auth: same user_id",
                first["user_id"] == second["user_id"], f'{first["user_id"]} vs {second["user_id"]}'))
    out.append(("re-auth: name intact (never overwritten with None)",
                second["name"] == "Reauth User", repr(second["name"])))

    # --- aud wrong → 401 (audience checked) -----------------------------------
    await clear()
    st = await status_of(make_token("s_aud", email="a@gmail.com", email_verified=True, aud="evil-client-id"))
    out.append(("aud wrong → 401", st == 401, f"status {st}"))

    # --- iss wrong → 401 (issuer checked, list membership) ---------------------
    st = await status_of(make_token("s_iss", email="i@gmail.com", email_verified=True,
                                    iss="https://evil.example.com"))
    out.append(("iss wrong → 401", st == 401, f"status {st}"))

    # --- both valid Google issuer forms are accepted ("accounts.google.com" and
    # "https://accounts.google.com") -------------------------------------------
    await clear()
    st1 = await status_of(make_token("s_iss_bare", email="bare@gmail.com", email_verified=True,
                                     iss="accounts.google.com"))
    st2 = await status_of(make_token("s_iss_https", email="https@gmail.com", email_verified=True,
                                     iss="https://accounts.google.com"))
    out.append(("iss 'accounts.google.com' accepted", st1 == 200, f"status {st1}"))
    out.append(("iss 'https://accounts.google.com' accepted", st2 == 200, f"status {st2}"))

    # --- exp in the past → 401 -------------------------------------------------
    st = await status_of(make_token("s_exp", exp=datetime.now(timezone.utc) - timedelta(minutes=5)))
    out.append(("exp past → 401", st == 401, f"status {st}"))

    # --- token signed by a DIFFERENT key → 401 (signature checked) ------------
    st = await status_of(make_token("s_sig", email="s@gmail.com", email_verified=True, sign_key=KEY_B))
    out.append(("wrong signing key → 401", st == 401, f"status {st}"))

    # --- email_verified false with matching email → does NOT merge (takeover) -
    await clear()
    await server.db.users.insert_one({
        "user_id": "user_apple_1", "email": "shared@gmail.com",
        "name": "Apple Person", "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    r = await call(make_token("google_sub_unverif", email="shared@gmail.com", email_verified=False))
    out.append(("email_verified false: does NOT merge (new user_id)",
                r["user_id"] != "user_apple_1", repr(r["user_id"])))
    apple_user = await server.db.users.find_one({"user_id": "user_apple_1"}, {"_id": 0})
    out.append(("email_verified false: existing user's google_sub untouched",
                apple_user.get("google_sub") is None, repr(apple_user.get("google_sub"))))

    # --- email_verified "true" (STRING) with matching email → merges ----------
    await clear()
    await server.db.users.insert_one({
        "user_id": "user_apple_2", "email": "merge@gmail.com",
        "name": "Paid Person", "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    r = await call(make_token("google_sub_merge", email="merge@gmail.com", email_verified="true"))
    out.append(('email_verified "true" string: merges to same user_id',
                r["user_id"] == "user_apple_2", repr(r["user_id"])))
    merged = await server.db.users.find_one({"user_id": "user_apple_2"}, {"_id": 0})
    out.append(('email_verified "true": google_sub set on the existing user',
                merged.get("google_sub") == "google_sub_merge", repr(merged.get("google_sub"))))
    out.append(('email_verified "true": existing name preserved',
                merged.get("name") == "Paid Person", repr(merged.get("name"))))

    # --- two Google users, neither with email → both insert, no duplicate-key -
    await clear()
    r1 = await call(make_token("google_sub_noemail_1"))
    dup_err = None
    try:
        r2 = await call(make_token("google_sub_noemail_2"))
    except Exception as e:  # a duplicate-key on null email would raise here
        dup_err = repr(e)
        r2 = None
    out.append(("two email-less Google users: both insert, no duplicate-key",
                dup_err is None and r2 and r1["user_id"] != r2["user_id"],
                dup_err or f'{r1["user_id"]} / {r2["user_id"] if r2 else None}'))
    both = await server.db.users.count_documents(
        {"google_sub": {"$in": ["google_sub_noemail_1", "google_sub_noemail_2"]}})
    out.append(("two email-less Google users: two rows present", both == 2, f"count {both}"))
    has_email_key = await server.db.users.count_documents(
        {"google_sub": {"$in": ["google_sub_noemail_1", "google_sub_noemail_2"]}, "email": {"$exists": True}})
    out.append(("two email-less Google users: no email key written (omit, not null)",
                has_email_key == 0, f"docs with email key: {has_email_key}"))

    # --- device data migration is wired on the Google path ---------------------
    await clear()
    dev = f"dev:{uuid.uuid4().hex[:8]}"
    device_id = dev.split(":", 1)[1]
    await server.db.tasks.insert_one({"owner": dev, "title": "orphan"})
    r = await call(make_token("google_sub_migrate"), device_id=device_id)
    migrated = await server.db.tasks.find_one({"title": "orphan"}, {"_id": 0})
    out.append(("device data migrated to the new user_id",
                migrated["owner"] == r["user_id"], repr(migrated["owner"])))

    return out


async def run_all() -> list:
    try:
        return await run_checks()
    finally:
        await server.client.drop_database(DB_NAME)


def _assert_source_and_model() -> list:
    """Static checks that don't need mongod: GoogleAuthRequest shape, the handler's
    audience/issuer/key wiring, and the INDEX_SPECS entry."""
    src = (BACKEND / "server.py").read_text()
    out = []

    # (a) GoogleAuthRequest requires id_token
    try:
        server.GoogleAuthRequest()
        out.append(("GoogleAuthRequest requires id_token", False, "no error raised"))
    except Exception:
        out.append(("GoogleAuthRequest requires id_token", True, "raised as expected"))
    req = server.GoogleAuthRequest(id_token="tok")
    out.append(("GoogleAuthRequest.id_token round-trips", req.id_token == "tok", repr(req.id_token)))
    out.append(("GoogleAuthRequest has no full_name field",
                "full_name" not in server.GoogleAuthRequest.model_fields, "full_name field present"))

    # (b) handler decodes with audience=GOOGLE_CLIENT_ID, issuer=GOOGLE_ISSUERS, keys on google_sub
    out.append(("handler uses audience=GOOGLE_CLIENT_ID", "audience=GOOGLE_CLIENT_ID" in src, "not found"))
    out.append(("handler uses issuer=GOOGLE_ISSUERS", "issuer=GOOGLE_ISSUERS" in src, "not found"))
    out.append(("GOOGLE_ISSUERS is the two-form list",
                server.GOOGLE_ISSUERS == ["accounts.google.com", "https://accounts.google.com"],
                repr(server.GOOGLE_ISSUERS)))
    out.append(('handler keys on "google_sub"', '{"google_sub": sub}' in src, "not found"))
    out.append(("bare except Exception is never used around the decode",
                "except Exception:\n        raise HTTPException(401, \"invalid Google" not in src,
                "found a bare-Exception guard"))

    # (c) INDEX_SPECS entry present
    out.append(('INDEX_SPECS has ("users", "google_sub", unique=True, sparse=True)',
                ("users", "google_sub", dict(unique=True, sparse=True)) in server.INDEX_SPECS,
                repr(server.INDEX_SPECS)))

    # Emergent path untouched
    out.append(("emergent path: token line intact",
                'server_token = data.get("session_token") or payload.session_token' in src,
                "line missing"))

    return out


def main() -> int:
    static_rows = _assert_source_and_model()
    fails = [(name, detail) for name, ok, detail in static_rows if not ok]
    for name, ok, _ in static_rows:
        print(f"{'OK  ' if ok else 'FAIL'} {name}")

    print(f"\nserver module imports OK (booted against real mongod at {MONGO_URL}, db={DB_NAME})")
    dyn_rows = asyncio.run(run_all())
    for name, ok, _ in dyn_rows:
        print(f"{'OK  ' if ok else 'FAIL'} {name}")
    fails += [(name, detail) for name, ok, detail in dyn_rows if not ok]

    print()
    if fails:
        print(f"{len(fails)} FAILED")
        for name, detail in fails:
            print(f"  - {name}\n      got: {detail}")
        return 1
    print(f"{len(static_rows) + len(dyn_rows)} checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
