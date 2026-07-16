"""Otterly backend end-to-end tests, iteration 2 (auth + entitlements + rate limits)."""
import os
import time
import uuid
import json
import hmac
import hashlib
from pathlib import Path

import pytest
import requests

# Resolve base URL from env / frontend .env
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    env = Path("/app/frontend/.env").read_text()
    for line in env.splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"')
            break
BASE_URL = (BASE_URL or "").rstrip("/")

# Match backend .env
RC_SECRET = "test_secret_123"

# Two devices for isolation testing
DEV_A = f"TEST-devA-{uuid.uuid4().hex[:8]}"
DEV_B = f"TEST-devB-{uuid.uuid4().hex[:8]}"


def hdr(device_id: str) -> dict:
    return {"Content-Type": "application/json", "X-Device-Id": device_id}


@pytest.fixture(scope="session")
def api():
    return requests.Session()


# ---------- Health ----------
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("ok") is True and j.get("app") == "otterly"


# ---------- Identity gating ----------
class TestIdentityGating:
    def test_tasks_missing_identity_401(self, api):
        r = api.get(f"{BASE_URL}/api/tasks", timeout=15)
        assert r.status_code == 401

    def test_access_missing_identity_401(self, api):
        r = api.get(f"{BASE_URL}/api/me/access", timeout=15)
        assert r.status_code == 401

    def test_anonymous_device_id_works(self, api):
        r = api.get(f"{BASE_URL}/api/tasks", headers=hdr(DEV_A), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Access endpoint ----------
class TestAccess:
    def test_access_anonymous_shape(self, api):
        r = api.get(f"{BASE_URL}/api/me/access", headers=hdr(DEV_A), timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["premium"] is False
        assert j["plan"] == "free"
        lim = j["limits"]
        for k in ("shrinks_today", "shrinks_cap", "braindumps_today",
                  "braindumps_cap", "room_today", "room_cap"):
            assert k in lim
        assert lim["shrinks_cap"] == 3
        assert lim["braindumps_cap"] == 5
        assert lim["room_cap"] == 20


# ---------- Auth endpoint stubs ----------
class TestAuthEndpoints:
    def test_auth_me_no_token_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_auth_me_bad_token_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me",
                    headers={"Authorization": "Bearer garbage"}, timeout=15)
        assert r.status_code == 401

    def test_auth_session_bad_token_401(self, api):
        r = api.post(f"{BASE_URL}/api/auth/session",
                     json={"session_token": "not-a-valid-emergent-token"},
                     timeout=30)
        assert r.status_code == 401

    def test_auth_logout_always_ok(self, api):
        r = api.post(f"{BASE_URL}/api/auth/logout", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- RevenueCat Webhook ----------
def _sign(body: bytes, secret: str = RC_SECRET, ts: int | None = None) -> str:
    ts = ts or int(time.time())
    signed = f"{ts}.".encode() + body
    digest = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={ts},v1={digest}"


class TestWebhook:
    def test_no_signature_401(self, api):
        r = api.post(f"{BASE_URL}/api/webhooks/revenuecat",
                     data=json.dumps({"event": {"id": "x"}}),
                     headers={"Content-Type": "application/json"},
                     timeout=15)
        assert r.status_code == 401

    def test_bad_signature_401(self, api):
        r = api.post(f"{BASE_URL}/api/webhooks/revenuecat",
                     data=json.dumps({"event": {"id": "x"}}),
                     headers={"Content-Type": "application/json",
                              "X-RevenueCat-Webhook-Signature": "t=1,v1=deadbeef"},
                     timeout=15)
        assert r.status_code == 401

    def test_valid_signature_upserts_entitlement(self, api):
        # We seed a stable user_id so the premium test below can rely on it
        user_id = f"TEST_user_{uuid.uuid4().hex[:8]}"
        pytest.premium_user_id = user_id
        body = json.dumps({
            "event": {
                "id": f"evt_{uuid.uuid4().hex}",
                "type": "INITIAL_PURCHASE",
                "app_user_id": user_id,
                "product_id": "otter_lifetime",
                "entitlement_ids": ["premium"],
                "expiration_at_ms": None,
            }
        }).encode()
        sig = _sign(body)
        r = api.post(f"{BASE_URL}/api/webhooks/revenuecat",
                     data=body,
                     headers={"Content-Type": "application/json",
                              "X-RevenueCat-Webhook-Signature": sig},
                     timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True


# ---------- Data isolation between two devices ----------
class TestDataIsolation:
    def test_devices_isolated(self, api):
        # Create task for A
        rA = api.post(f"{BASE_URL}/api/tasks",
                      json={"title": "TEST_ isolation A"},
                      headers=hdr(DEV_A), timeout=15)
        assert rA.status_code == 200
        tid_a = rA.json()["id"]

        # Create task for B
        rB = api.post(f"{BASE_URL}/api/tasks",
                      json={"title": "TEST_ isolation B"},
                      headers=hdr(DEV_B), timeout=15)
        assert rB.status_code == 200
        tid_b = rB.json()["id"]

        # A cannot see B's task
        listA = api.get(f"{BASE_URL}/api/tasks", headers=hdr(DEV_A), timeout=15).json()
        assert any(t["id"] == tid_a for t in listA)
        assert all(t["id"] != tid_b for t in listA)

        # B cannot see A's task
        listB = api.get(f"{BASE_URL}/api/tasks", headers=hdr(DEV_B), timeout=15).json()
        assert any(t["id"] == tid_b for t in listB)
        assert all(t["id"] != tid_a for t in listB)

        # Delete A's task using device B — must NOT affect A
        api.delete(f"{BASE_URL}/api/tasks/{tid_a}", headers=hdr(DEV_B), timeout=15)
        listA_after = api.get(f"{BASE_URL}/api/tasks", headers=hdr(DEV_A), timeout=15).json()
        assert any(t["id"] == tid_a for t in listA_after), "Device B deleted device A's task!"


# ---------- Rate limits ----------
class TestRateLimits:
    """Fresh device to guarantee counter starts at 0."""
    DEV = f"TEST-rate-{uuid.uuid4().hex[:8]}"

    def test_shrink_rate_limit(self, api):
        # Create a task
        r = api.post(f"{BASE_URL}/api/tasks",
                     json={"title": "TEST_ rate limit task"},
                     headers=hdr(self.DEV), timeout=15)
        assert r.status_code == 200
        tid = r.json()["id"]

        # Do 3 shrinks (should all succeed)
        for i in range(3):
            r = api.post(f"{BASE_URL}/api/tasks/{tid}/shrink",
                         json={"difficulty": "easy"},
                         headers=hdr(self.DEV), timeout=90)
            assert r.status_code == 200, f"shrink {i+1} failed: {r.status_code} {r.text[:200]}"

        # 4th shrink should be 429
        r = api.post(f"{BASE_URL}/api/tasks/{tid}/shrink",
                     json={"difficulty": "easy"},
                     headers=hdr(self.DEV), timeout=90)
        assert r.status_code == 429, f"expected 429, got {r.status_code}"

        # /me/access should reflect shrinks_today
        acc = api.get(f"{BASE_URL}/api/me/access", headers=hdr(self.DEV), timeout=15).json()
        assert acc["limits"]["shrinks_today"] == 3


# ---------- Deep Shrink premium gate ----------
class TestDeepShrink:
    def test_deep_shrink_402_for_non_premium(self, api):
        dev = f"TEST-deep-{uuid.uuid4().hex[:8]}"
        r = api.post(f"{BASE_URL}/api/tasks",
                     json={"title": "TEST_ deep shrink gate"},
                     headers=hdr(dev), timeout=15)
        tid = r.json()["id"]
        r = api.post(f"{BASE_URL}/api/tasks/{tid}/shrink",
                     json={"difficulty": "medium", "deep": True},
                     headers=hdr(dev), timeout=30)
        assert r.status_code == 402, f"expected 402, got {r.status_code}: {r.text[:200]}"


# ---------- Premium bypasses limits (direct Mongo seed) ----------
class TestPremiumBypasses:
    """Seed entitlement doc directly in mongo, then create a valid session so
    Bearer auth resolves to that premium user_id, then do 4+ shrinks."""

    def test_premium_unlimited_shrink(self, api):
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        from datetime import datetime, timezone, timedelta

        MONGO_URL = "mongodb://localhost:27017"
        DB_NAME = "otterly"

        premium_uid = f"TEST_prem_{uuid.uuid4().hex[:8]}"
        session_token = f"TEST_sess_{uuid.uuid4().hex}"

        async def seed():
            c = AsyncIOMotorClient(MONGO_URL)
            db = c[DB_NAME]
            await db.users.insert_one({
                "user_id": premium_uid,
                "email": f"{premium_uid}@test.local",
                "name": "Prem Tester",
            })
            await db.entitlements.insert_one({
                "user_id": premium_uid,
                "premium": {"active": True, "product_id": "otter_lifetime"},
            })
            await db.user_sessions.insert_one({
                "session_token": session_token,
                "user_id": premium_uid,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc),
            })
            c.close()

        async def cleanup():
            c = AsyncIOMotorClient(MONGO_URL)
            db = c[DB_NAME]
            await db.users.delete_one({"user_id": premium_uid})
            await db.entitlements.delete_one({"user_id": premium_uid})
            await db.user_sessions.delete_one({"session_token": session_token})
            await db.tasks.delete_many({"owner": premium_uid})
            await db.steps.delete_many({"owner": premium_uid})
            c.close()

        asyncio.run(seed())
        try:
            auth = {"Content-Type": "application/json", "Authorization": f"Bearer {session_token}"}

            # /me/access should say premium
            acc = api.get(f"{BASE_URL}/api/me/access", headers=auth, timeout=15).json()
            assert acc["premium"] is True
            assert acc["limits"]["shrinks_cap"] == -1  # unlimited

            # Create task
            r = api.post(f"{BASE_URL}/api/tasks",
                         json={"title": "TEST_ premium shrink"},
                         headers=auth, timeout=15)
            assert r.status_code == 200
            tid = r.json()["id"]

            # 5 shrinks should all succeed (free tier caps at 3)
            for i in range(5):
                r = api.post(f"{BASE_URL}/api/tasks/{tid}/shrink",
                             json={"difficulty": "easy"},
                             headers=auth, timeout=90)
                assert r.status_code == 200, f"premium shrink {i+1} failed: {r.status_code}"

            # Deep shrink should also succeed for premium
            r = api.post(f"{BASE_URL}/api/tasks/{tid}/shrink",
                         json={"difficulty": "medium", "deep": True},
                         headers=auth, timeout=120)
            assert r.status_code == 200, f"premium deep shrink failed: {r.status_code}"
        finally:
            asyncio.run(cleanup())


# ---------- Cleanup ----------
def teardown_module(module):
    try:
        s = requests.Session()
        for dev in (DEV_A, DEV_B):
            lst = s.get(f"{BASE_URL}/api/tasks", headers=hdr(dev), timeout=10)
            if lst.status_code == 200:
                for t in lst.json():
                    s.delete(f"{BASE_URL}/api/tasks/{t['id']}", headers=hdr(dev), timeout=10)
    except Exception:
        pass
