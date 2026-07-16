"""Otterly backend end-to-end tests (public URL)."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    # fallback to frontend .env
    from pathlib import Path
    env = Path("/app/frontend/.env").read_text()
    for line in env.splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"')
            break
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


created_task_ids = []


# ---------- Health ----------
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("ok") is True
        assert j.get("app") == "otterly"


# ---------- Task CRUD ----------
class TestTasks:
    def test_create_task(self, api):
        r = api.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_ Draft weekly report"}, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["title"] == "TEST_ Draft weekly report"
        assert j["shrunk"] is False
        assert "id" in j
        created_task_ids.append(j["id"])

    def test_list_tasks(self, api):
        r = api.get(f"{BASE_URL}/api/tasks", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert isinstance(j, list)
        assert any(t["id"] in created_task_ids for t in j)

    def test_delete_task(self, api):
        r = api.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_ delete me"}, timeout=15)
        tid = r.json()["id"]
        d = api.delete(f"{BASE_URL}/api/tasks/{tid}", timeout=15)
        assert d.status_code == 200
        # verify gone
        lst = api.get(f"{BASE_URL}/api/tasks", timeout=15).json()
        assert all(t["id"] != tid for t in lst)


# ---------- Shrink (AI) ----------
class TestShrink:
    @pytest.fixture(scope="class")
    def task_id(self, api):
        r = api.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_ File tax return"}, timeout=15)
        tid = r.json()["id"]
        created_task_ids.append(tid)
        return tid

    def test_shrink_medium(self, api, task_id):
        r = api.post(f"{BASE_URL}/api/tasks/{task_id}/shrink", json={"difficulty": "medium"}, timeout=90)
        assert r.status_code == 200, r.text
        steps = r.json()
        assert 3 <= len(steps) <= 10, f"expected 3-10 steps, got {len(steps)}"
        for s in steps:
            assert s["minutes"] in (5, 10, 25), f"unexpected minutes {s['minutes']}"
            assert s["text"].strip()
            assert s["task_id"] == task_id
            assert s["done"] is False

    def test_steps_persisted(self, api, task_id):
        r = api.get(f"{BASE_URL}/api/tasks/{task_id}/steps", timeout=15)
        assert r.status_code == 200
        steps = r.json()
        assert len(steps) >= 3


# ---------- Step toggle + streak ----------
class TestStepToggleAndStreak:
    @pytest.fixture(scope="class")
    def prepared(self, api):
        r = api.post(f"{BASE_URL}/api/tasks", json={"title": "TEST_ Book dentist"}, timeout=15)
        tid = r.json()["id"]
        created_task_ids.append(tid)
        sh = api.post(f"{BASE_URL}/api/tasks/{tid}/shrink", json={"difficulty": "easy"}, timeout=90)
        assert sh.status_code == 200
        steps = sh.json()
        return {"task_id": tid, "step_id": steps[0]["id"]}

    def test_streak_before(self, api, prepared):
        r = api.get(f"{BASE_URL}/api/streak", timeout=15)
        assert r.status_code == 200
        prepared["before"] = r.json()

    def test_toggle_done(self, api, prepared):
        sid = prepared["step_id"]
        r = api.patch(f"{BASE_URL}/api/steps/{sid}", json={"done": True}, timeout=15)
        assert r.status_code == 200
        assert r.json()["done"] is True
        assert r.json()["completed_at"]

    def test_streak_increments(self, api, prepared):
        r = api.get(f"{BASE_URL}/api/streak", timeout=15)
        after = r.json()
        assert after["todays_steps"] >= prepared["before"]["todays_steps"] + 1

    def test_toggle_undone(self, api, prepared):
        sid = prepared["step_id"]
        r = api.patch(f"{BASE_URL}/api/steps/{sid}", json={"done": False}, timeout=15)
        assert r.status_code == 200
        assert r.json()["done"] is False


# ---------- Next pick (energy aware) ----------
class TestNext:
    def test_next_low(self, api):
        r = api.post(f"{BASE_URL}/api/next", json={"energy": "low"}, timeout=90)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "reason" in j
        assert "empty" in j
        if not j["empty"]:
            assert j["step"] is not None
            # low energy -> prefer 5 or 10 minutes
            assert j["step"]["minutes"] in (5, 10, 25)

    def test_next_good(self, api):
        r = api.post(f"{BASE_URL}/api/next", json={"energy": "good"}, timeout=90)
        assert r.status_code == 200
        j = r.json()
        assert "reason" in j


# ---------- Braindump ----------
class TestBraindump:
    def test_braindump_paragraph(self, api):
        text = (
            "I really need to file my BIR return next week, and I've been meaning to "
            "reply to Mom about the wedding. Also the dentist keeps texting me. Ugh, I feel bad."
        )
        r = api.post(f"{BASE_URL}/api/braindump", json={"text": text}, timeout=90)
        assert r.status_code == 200
        tasks = r.json()["tasks"]
        assert isinstance(tasks, list)
        assert len(tasks) >= 2, f"expected multiple, got {tasks}"

    def test_braindump_empty(self, api):
        r = api.post(f"{BASE_URL}/api/braindump", json={"text": "   "}, timeout=15)
        assert r.status_code == 200
        assert r.json()["tasks"] == []


# ---------- Room ----------
class TestRoom:
    session_id = f"TEST_room_{uuid.uuid4().hex[:8]}"

    def test_room_send(self, api):
        r = api.post(
            f"{BASE_URL}/api/room/message",
            json={"session_id": self.session_id, "text": "hi, I'm going to work on my report"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        reply = r.json()["reply"]
        assert isinstance(reply, str) and len(reply) > 0

    def test_room_history(self, api):
        r = api.get(f"{BASE_URL}/api/room/history/{self.session_id}", timeout=15)
        assert r.status_code == 200
        hist = r.json()
        assert len(hist) >= 2
        roles = {m["role"] for m in hist}
        assert "user" in roles and "otter" in roles


# ---------- Cleanup ----------
def teardown_module(module):
    try:
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        for tid in created_task_ids:
            s.delete(f"{BASE_URL}/api/tasks/{tid}", timeout=10)
    except Exception:
        pass
