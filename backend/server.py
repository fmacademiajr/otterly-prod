"""
Otterly backend — calm ADHD task-starter, v2 (auth + entitlements + rate limits).

Identity model:
  - Signed-in users: Bearer session_token → user_id
  - Anonymous users: X-Device-Id header → device_id
Data scoping: every task / step / activity / room_message carries "owner" (user_id or device_id).

Rate limits (per-day, per-owner):
  - free tier:  3 shrinks, 5 braindumps, 20 room messages, unlimited next-picks
  - premium:    unlimited

Endpoints all under /api. Auth endpoints:
  POST   /api/auth/session       exchange Emergent session_token → app session
  GET    /api/auth/me            current user profile
  POST   /api/auth/logout        drop server session
  GET    /api/me/access          entitlement snapshot { premium: bool, plan: str, limits }
  POST   /api/webhooks/revenuecat  RevenueCat webhook (HMAC-signed)
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Depends, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import re
import hmac
import hashlib
import time
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Tuple
import uuid
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
REVENUECAT_WEBHOOK_SECRET = os.environ.get("REVENUECAT_WEBHOOK_SECRET", "")
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")

# Sentry — only wires if a real DSN is set (never the "placeholder" value).
if SENTRY_DSN and SENTRY_DSN != "placeholder":
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.1,
            send_default_pii=False,
        )
    except Exception:
        pass  # never let observability break the app

EMERGENT_SESSION_DATA_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("otterly")

app = FastAPI(title="Otterly API")
api = APIRouter(prefix="/api")

# ---------- Models ----------

Energy = Literal["low", "medium", "good"]
Difficulty = Literal["easy", "medium", "hard"]


class TaskCreate(BaseModel):
    title: str = Field(max_length=200)
    note: Optional[str] = Field(default=None, max_length=2000)


class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    note: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    shrunk: bool = False
    difficulty: Optional[Difficulty] = None


class Step(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    order: int
    text: str
    minutes: int = 5
    done: bool = False
    completed_at: Optional[str] = None


class ShrinkRequest(BaseModel):
    difficulty: Difficulty = "medium"
    deep: bool = False  # premium: use Opus-4-8 for a deeper shrink
    force: bool = False  # re-shrink even though finished steps will be destroyed
    too_big: bool = False  # the last steps were too big, ask for smaller first actions


class NextRequest(BaseModel):
    energy: Energy = "medium"
    minutes: Optional[int] = None


class NextResponse(BaseModel):
    step: Optional[Step] = None
    task: Optional[Task] = None
    reason: str = ""
    empty: bool = False


class BraindumpRequest(BaseModel):
    text: str = Field(max_length=5000)


class BraindumpResponse(BaseModel):
    tasks: List[str]
    # ponytail: braindump discards feelings by design, so a disclosure had nowhere to land.
    referral: Optional[str] = None


class RoomMessage(BaseModel):
    session_id: str
    text: str = Field(max_length=2000)
    goal: Optional[str] = Field(default=None, max_length=200)


class RoomResponse(BaseModel):
    reply: str


class RoomMessageDoc(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: Literal["user", "otter"]
    text: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StreakStats(BaseModel):
    days_this_week: int
    total_days: int
    todays_steps: int


class SessionExchangeRequest(BaseModel):
    session_token: str
    device_id: Optional[str] = None


class UserProfile(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None


class AccessResponse(BaseModel):
    premium: bool
    plan: str  # "free" | "otter_monthly" | "otter_lifetime" (yearly dropped pre-launch)
    limits: dict  # {"shrinks_today": int, "shrinks_cap": int, ...}


# ---------- Auth helpers ----------

async def resolve_owner(
    authorization: Optional[str] = Header(default=None),
    x_device_id: Optional[str] = Header(default=None),
) -> Tuple[str, Optional[str]]:
    """
    Returns (owner_id, user_id).
    - Signed-in: owner_id == user_id (also returned as second element)
    - Anonymous: owner_id == device_id, user_id == None
    """
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if session_doc:
            expires = session_doc.get("expires_at")
            if isinstance(expires, datetime):
                if expires.tzinfo is None:
                    expires = expires.replace(tzinfo=timezone.utc)
                if expires > datetime.now(timezone.utc):
                    uid = session_doc["user_id"]
                    return uid, uid
    if x_device_id:
        return f"dev:{x_device_id}", None
    raise HTTPException(401, "missing identity (Authorization Bearer or X-Device-Id required)")


async def require_user(
    authorization: Optional[str] = Header(default=None),
) -> UserProfile:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "sign in required")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(401, "invalid session")
    expires = session.get("expires_at")
    if isinstance(expires, datetime):
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires <= datetime.now(timezone.utc):
            raise HTTPException(401, "session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "user not found")
    return UserProfile(**user)


# ---------- Entitlement ----------

FREE_LIMITS = {"shrinks": 3, "braindumps": 5, "room_messages": 20}


async def get_entitlement(owner_id: str, user_id: Optional[str]) -> dict:
    """Return {'active': bool, 'plan': str}."""
    if not user_id:
        return {"active": False, "plan": "free"}
    doc = await db.entitlements.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return {"active": False, "plan": "free"}
    prem = doc.get("premium") or {}
    active = bool(prem.get("active"))

    # ponytail: the webhook writes expires_at_ms and nothing ever read it, so one
    # dropped EXPIRATION meant premium forever. Belt and braces on top of the
    # webhook, not instead of it.
    # The lifetime tier has NO expires_at_ms — absent must mean "never expires",
    # never "expired at epoch 0".
    expires_ms = prem.get("expires_at_ms")
    if active and expires_ms:
        if float(expires_ms) < datetime.now(timezone.utc).timestamp() * 1000:
            active = False

    return {"active": active, "plan": prem.get("product_id") or "free"}


async def check_rate(owner_id: str, kind: str, cap: int) -> Tuple[bool, int]:
    """Returns (allowed, current_count)."""
    today = datetime.now(timezone.utc).date().isoformat()
    key = {"owner": owner_id, "kind": kind, "date": today}
    doc = await db.rate_counters.find_one(key, {"_id": 0, "count": 1})
    count = int(doc.get("count") if doc else 0)
    return count < cap, count


async def bump_rate(owner_id: str, kind: str):
    today = datetime.now(timezone.utc).date().isoformat()
    await db.rate_counters.update_one(
        {"owner": owner_id, "kind": kind, "date": today},
        {"$inc": {"count": 1}, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


async def counts_today(owner_id: str) -> dict:
    today = datetime.now(timezone.utc).date().isoformat()
    docs = await db.rate_counters.find({"owner": owner_id, "date": today}, {"_id": 0}).to_list(20)
    return {d["kind"]: int(d.get("count", 0)) for d in docs}


# ---------- LLM helpers ----------

def _llm_chat(session_id: str, system: str, deep: bool = False) -> LlmChat:
    model = "claude-opus-4-8" if deep else "claude-sonnet-4-6"
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model("anthropic", model)


async def _llm_json(session_id: str, system: str, user_text: str, deep: bool = False) -> dict:
    chat = _llm_chat(session_id, system, deep=deep)
    raw = await chat.send_message(UserMessage(text=user_text))
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].lstrip("\n").lstrip()
        if text.endswith("```"):
            text = text[:-3].rstrip()
    for i, ch in enumerate(text):
        if ch in "{[":
            text = text[i:]
            break
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning("LLM JSON parse failed: %s | raw=%r", e, raw)
        raise HTTPException(status_code=502, detail="AI returned an unusable response — please try again.")


# ---------- Safety ----------

# ponytail: append-only, never routes. A false positive costs one extra sentence
# at the end of a kind message, so the failure direction is harmless by construction.
# Anchored to disclosure phrasings: "killing me", "dying under this deadline" and
# "this project is murder" must NOT match. Ceiling: no paraphrase or metaphor is
# caught. This backstops the model, it does not replace it.
SELF_HARM_RE = re.compile(
    r"\bkill (?:myself|me now)\b|\bend (?:my life|it all)\b|\bwant to die\b|"
    r"\bsuicide\b|\bsuicidal\b|\bkilling myself\b|\bnot worth living\b|\bhurt myself\b",
    re.I,
)

REFERRAL = (
    "I care that you told me. Please reach a real person - "
    "988 (US), 116 123 (UK), or NCMH 1553 (PH)."
)


def ensure_referral(reply: str, user_text: str) -> str:
    """Guarantee the referral when a disclosure is present. The prompt asks, this enforces."""
    if SELF_HARM_RE.search(user_text or "") and "988" not in reply:
        return reply.rstrip(". ") + ". " + REFERRAL
    return reply


# ---------- Health ----------

@api.get("/")
async def root():
    return {"ok": True, "app": "otterly"}


# ---------- Auth endpoints ----------

@api.post("/auth/session")
async def auth_session(payload: SessionExchangeRequest):
    """Client hands us the emergent session_token from redirect, we verify and store a server session."""
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(EMERGENT_SESSION_DATA_URL, headers={"X-Session-ID": payload.session_token})
    if r.status_code != 200:
        raise HTTPException(401, "invalid session token")
    data = r.json()
    email = data.get("email")
    if not email:
        raise HTTPException(400, "no email in session data")
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    server_token = data.get("session_token") or payload.session_token

    # Upsert user by email
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Store session (upsert to avoid duplicates)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": server_token},
        {"$set": {
            "session_token": server_token,
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )

    # Migrate device data → user_id
    if payload.device_id:
        old = f"dev:{payload.device_id}"
        await db.tasks.update_many({"owner": old}, {"$set": {"owner": user_id}})
        await db.steps.update_many({"owner": old}, {"$set": {"owner": user_id}})
        await db.activity.update_many({"owner": old}, {"$set": {"owner": user_id}})
        await db.room_messages.update_many({"owner": old}, {"$set": {"owner": user_id}})

    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "session_token": server_token,
        "expires_at": expires_at.isoformat(),
    }


@api.get("/auth/me", response_model=UserProfile)
async def auth_me(user: UserProfile = Depends(require_user)):
    return user


@api.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ---------- Entitlement ----------

@api.get("/me/access", response_model=AccessResponse)
async def me_access(who=Depends(resolve_owner)):
    owner_id, user_id = who
    ent = await get_entitlement(owner_id, user_id)
    counts = await counts_today(owner_id)
    return AccessResponse(
        premium=ent["active"],
        plan=ent["plan"] if ent["active"] else "free",
        limits={
            "shrinks_today": counts.get("shrink", 0),
            "shrinks_cap": FREE_LIMITS["shrinks"] if not ent["active"] else -1,
            "braindumps_today": counts.get("braindump", 0),
            "braindumps_cap": FREE_LIMITS["braindumps"] if not ent["active"] else -1,
            "room_today": counts.get("room", 0),
            "room_cap": FREE_LIMITS["room_messages"] if not ent["active"] else -1,
        },
    )


# ---------- RevenueCat webhook ----------

def _verify_rc_signature(raw_body: bytes, header: Optional[str]) -> bool:
    if not REVENUECAT_WEBHOOK_SECRET or not header:
        return False
    parts = dict(part.split("=", 1) for part in header.split(",") if "=" in part)
    ts = parts.get("t")
    v1 = parts.get("v1")
    if not ts or not v1:
        return False
    if abs(int(time.time()) - int(ts)) > 300:
        return False
    signed = f"{ts}.".encode() + raw_body
    digest = hmac.new(REVENUECAT_WEBHOOK_SECRET.encode(), signed, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, v1)


# ponytail: pure and separately tested. Returns True (grant), False (revoke), or
# None (this event says nothing about entitlement, leave the stored value alone).
#
# The old classifier ended in `else: is_active = event_type in active_types` and
# then ran the upsert unconditionally, so BILLING_ISSUE, TRANSFER,
# SUBSCRIPTION_PAUSED and every event RevenueCat ships in future all resolved to
# False and switched premium OFF for people who had paid. Unknown must mean
# "don't touch", never "revoke".
GRANT_EVENTS = {
    "INITIAL_PURCHASE",
    "RENEWAL",
    "UNCANCELLATION",
    "PRODUCT_CHANGE",
    "NON_RENEWING_PURCHASE",  # the lifetime tier
    "CANCELLATION",  # cancelled, but paid through the current period
}
REVOKE_EVENTS = {"EXPIRATION"}  # the only event that legitimately ends access


def classify_event(event_type: str) -> Optional[bool]:
    """True = grant, False = revoke, None = leave `active` untouched.

    BILLING_ISSUE and SUBSCRIPTION_PAUSED deliberately return None: RevenueCat's
    grace period is authoritative and a card hiccup is not an expiry. TRANSFER
    returns None because there is no correct automatic behaviour without a second
    identity, and revoking is strictly worse than doing nothing.
    """
    if event_type in REVOKE_EVENTS:
        return False
    if event_type in GRANT_EVENTS:
        return True
    return None


# ---------- RevenueCat webhook END ----------


@api.post("/webhooks/revenuecat")
async def revenuecat_webhook(request: Request):
    raw = await request.body()
    sig = (
        request.headers.get("X-RevenueCat-Webhook-Signature")
        or request.headers.get("X-RevenueCat-Signature")
    )
    if not _verify_rc_signature(raw, sig):
        raise HTTPException(401, "bad signature")

    payload = json.loads(raw)
    event = payload.get("event") or {}
    event_id = event.get("id")
    if not event_id:
        raise HTTPException(400, "no event id")

    # idempotency
    seen = await db.webhook_events.find_one({"event_id": event_id})
    if seen:
        return {"ok": True, "dedup": True}
    await db.webhook_events.insert_one({
        "event_id": event_id,
        "at": datetime.now(timezone.utc).isoformat(),
    })

    user_id = event.get("app_user_id")
    if not user_id:
        return {"ok": True, "no_user": True}
    event_type = event.get("type", "")
    is_active = classify_event(event_type)

    # Metadata is always worth recording. `active` is only touched when the event
    # actually says something about it, so an unknown type can never revoke.
    fields = {
        "premium.last_event_id": event_id,
        "premium.updated_at": datetime.now(timezone.utc).isoformat(),
    }
    for key, value in (
        ("premium.product_id", event.get("product_id")),
        ("premium.expires_at_ms", event.get("expiration_at_ms")),
        ("premium.entitlements", event.get("entitlement_ids")),
    ):
        # Never blank a known value because an unrelated event omitted it.
        if value is not None:
            fields[key] = value

    if is_active is None:
        logger.info("rc webhook: %s leaves entitlement untouched for %s", event_type or "<empty>", user_id)
    else:
        fields["premium.active"] = is_active

    await db.entitlements.update_one({"user_id": user_id}, {"$set": fields}, upsert=True)
    return {"ok": True, "active_changed": is_active is not None}


# ---------- Task endpoints ----------

@api.post("/tasks", response_model=Task)
async def create_task(payload: TaskCreate, who=Depends(resolve_owner)):
    owner_id, _ = who
    task = Task(title=payload.title.strip(), note=(payload.note or "").strip() or None)
    doc = task.dict()
    doc["owner"] = owner_id
    await db.tasks.insert_one(doc)
    return task


@api.get("/tasks", response_model=List[Task])
async def list_tasks(who=Depends(resolve_owner)):
    owner_id, _ = who
    docs = await db.tasks.find({"owner": owner_id}, {"_id": 0, "owner": 0}).sort("created_at", -1).to_list(500)
    return [Task(**d) for d in docs]


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, who=Depends(resolve_owner)):
    owner_id, _ = who
    await db.tasks.delete_one({"id": task_id, "owner": owner_id})
    await db.steps.delete_many({"task_id": task_id, "owner": owner_id})
    return {"ok": True}


@api.get("/tasks/{task_id}/steps", response_model=List[Step])
async def list_steps(task_id: str, who=Depends(resolve_owner)):
    owner_id, _ = who
    docs = await db.steps.find({"task_id": task_id, "owner": owner_id}, {"_id": 0, "owner": 0}).sort("order", 1).to_list(200)
    return [Step(**d) for d in docs]


# ---------- Shrink ----------

# ponytail: denylist of ABSTRACT verbs, not an allowlist of physical ones.
# The physical-verb space is open and huge (mail/water/vacuum/chop/iron/mop...).
# The planning-verb space is small and closed. Measured: a 90-word physical
# allowlist false-rejected 18/18 real chore steps. This list false-rejects 0/23.
# Ceiling: cannot catch scope ("Write the report" passes). Upgrade = a classifier.
ABSTRACT_VERBS = {
    "plan", "figure", "think", "decide", "consider", "brainstorm", "organize",
    "research", "identify", "clarify", "assess", "determine", "evaluate",
    "ascertain", "map", "outline", "strategize", "understand", "define",
    "explore", "reflect", "conceptualize", "ideate",
}
# No English imperative starts with these, so this is the verb-first check a denylist can express.
NON_IMPERATIVE = {"the", "your", "a", "an", "it", "this", "that", "you", "there", "its", "my", "i", "we"}
# Physical verb + abstract particle. The verb is fine, the idiom is not.
VAGUE_IDIOM = ("sort out", "get started", "run through", "check in on", "go over")

# ponytail: anchored. Unanchored \bfinally\b ate "Type the finally block" (try/finally)
# and \bjust\s+\w+ ate "Open the Just Eat app". Shame shames sentence-initially.
SHAME_RE = re.compile(
    r"^just\s+\w+|^simply\b|^finally\b|^at last\b|all you have to do|"
    r"should(?:'ve| have)\b|shouldn't have|why didn't you|\bobviously\b|it's easy|"
    r"you have been avoiding|been putting (?:this|it) off|you neglected",
    re.I,
)

# ponytail: minute ceilings are a product guess, not a research finding. Tune on completion data.
MAX_MINUTES = {"activation": 5, "easy": 5, "medium": 10, "hard": 25}
LADDER = [1, 2, 5, 10, 25]


def _clamp_minutes(minutes: int, bucket: str) -> int:
    """Asymmetric: over-ceiling never reaches here, it is a `problem` instead.
    Under-labeling is harmless. Over-labeling makes a frozen user fail against a
    promise the app invented."""
    allowed = [x for x in LADDER if x <= MAX_MINUTES[bucket]]
    return min(allowed, key=lambda x: abs(x - minutes))


def _norm(t: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", t.lower()).strip()


def _validate_steps(raw_steps: list, difficulty: str) -> Tuple[List[dict], List[str]]:
    """Returns (clean, problems). Never raises. Caller inserts clean only.
    Enforces grammar, shape and honest labels. Does NOT enforce scope."""
    clean: List[dict] = []
    problems: List[str] = []
    seen = set()
    for i, s in enumerate(raw_steps[:12]):
        text = str(s.get("text", "")).strip()
        if not text:
            continue
        n = _norm(text)
        first = n.split(" ")[0] if n else ""
        bucket = "activation" if i == 0 else difficulty  # keyed on i, NOT len(clean)
        want = int(s.get("minutes") or 10)

        if first in NON_IMPERATIVE:
            problems.append(f'step {i+1} "{text}" is not an instruction, start with a verb')
        elif first in ABSTRACT_VERBS:
            problems.append(f'step {i+1} "{text}" starts with "{first}", name a physical action')
        elif any(p in n for p in VAGUE_IDIOM):
            problems.append(f'step {i+1} "{text}" is vague, name the physical action')
        elif len(n.split()) > 10:
            problems.append(f'step {i+1} "{text}" is too long or chains actions')
        elif n in seen:
            problems.append(f'step {i+1} "{text}" duplicates an earlier step')
        elif SHAME_RE.search(text):
            problems.append(f'step {i+1} "{text}" carries shame language')
        elif want > MAX_MINUTES[bucket]:
            problems.append(f'step {i+1} "{text}" needs {want} min, must fit under {MAX_MINUTES[bucket]} min')
        else:
            seen.add(n)
            clean.append({"text": text, "minutes": _clamp_minutes(want, bucket)})

    if not clean and not problems:
        problems.append("return 2 to 6 concrete steps")
    return clean, problems


SHRINK_SYSTEM = """You are Otterly, a calm ADHD-friendly companion. You help people with ADHD start tasks by breaking them into tiny concrete micro-steps.

Rules:
- Return STRICT JSON only. No prose, no fenced code.
- 2 to 6 micro-steps. Fewer is better if the task allows. Never pad a small task.
- Step 1 is the activation step: one physical movement or app-open, under 5 minutes, requiring zero decisions. It exists to get the body moving, not to make progress.
- Every other step is a single concrete physical action.
- Steps start with a physical verb ("Open", "Walk to", "Type", "Send"). Never "The", "Your", "It".
- One action per step. Never two joined by "and", "then", or a comma chain. Keep each step under 10 words.
- Never generic ("plan it out", "figure out the intro", "sort out the receipts"). Always concrete ("Open Gmail").
- Never a duplicate of another step.
- Give each step an HONEST minute estimate. Do not shrink the number to fit a limit. If the work is 25 minutes, say 25 and make the step smaller instead.
- Tone: warm, brief, no shame. Never mention how the user 'should' have done this earlier. Never open a step with "Just", "Simply", or "Finally".
- Step size for steps 2 and up: "easy" = under 5 min each. "medium" = under 10 min. "hard" = under 25 min. This never applies to step 1.

Return JSON shape:
{"steps": [{"text": "Open the doc", "minutes": 2}, {"text": "Type the first paragraph", "minutes": 10}]}
"""


@api.post("/tasks/{task_id}/shrink", response_model=List[Step])
async def shrink_task(task_id: str, payload: ShrinkRequest, who=Depends(resolve_owner)):
    owner_id, user_id = who
    ent = await get_entitlement(owner_id, user_id)

    # Deep Shrink is premium-only
    if payload.deep and not ent["active"]:
        raise HTTPException(402, "deep-shrink is a premium feature")

    if not ent["active"]:
        allowed, count = await check_rate(owner_id, "shrink", FREE_LIMITS["shrinks"])
        if not allowed:
            raise HTTPException(429, f"free tier: {FREE_LIMITS['shrinks']} shrinks/day. try again tomorrow or upgrade to Otter Premium.")

    task_doc = await db.tasks.find_one({"id": task_id, "owner": owner_id}, {"_id": 0})
    if not task_doc:
        raise HTTPException(404, "task not found")
    task = Task(**{k: v for k, v in task_doc.items() if k != "owner"})

    # ponytail: re-shrink destroys finished steps. Checked BEFORE the LLM call so a
    # refusal costs no API call and no free-tier shrink. db.activity survives either
    # way, so the streak already counted work the user is about to stop seeing.
    done_count = await db.steps.count_documents({"task_id": task_id, "owner": owner_id, "done": True})
    if done_count and not payload.force:
        plural = "" if done_count == 1 else "s"
        raise HTTPException(409, f"{done_count} finished step{plural} would be lost")

    prompt = f"Task: {task.title}\n"
    if task.note:
        prompt += f"Note: {task.note}\n"
    prompt += f"Difficulty preference: {payload.difficulty}\n"
    if payload.too_big:
        # The clamp changes the number. Only the prompt changes the work.
        prompt += "The last steps were too big for this person. Return smaller first actions, not smaller estimates.\n"
    prompt += "\nReturn JSON."

    data = await _llm_json(
        f"shrink-{task_id}-{uuid.uuid4()}",
        SHRINK_SYSTEM,
        prompt,
        deep=payload.deep,
    )

    clean, problems = _validate_steps(data.get("steps") or [], payload.difficulty)

    if problems:
        # ponytail: exactly one repair, and its failure is not the user's problem.
        try:
            data = await _llm_json(
                f"shrink-{task_id}-{uuid.uuid4()}",
                SHRINK_SYSTEM,
                prompt + "\n\nYour last answer had problems:\n- " + "\n- ".join(problems)
                + "\nReturn corrected JSON.",
                deep=payload.deep,
            )
            repaired, _ = _validate_steps(data.get("steps") or [], payload.difficulty)
            if len(repaired) >= len(clean):
                clean = repaired
        except Exception as e:
            logger.warning("shrink repair failed, keeping %d survivors: %s", len(clean), e)

    # Never hard-fail when good steps exist. 502 only when nothing survived.
    if not clean:
        raise HTTPException(502, "AI returned no usable steps")

    await db.steps.delete_many({"task_id": task_id, "owner": owner_id})

    steps: List[Step] = [Step(task_id=task_id, order=i, **c) for i, c in enumerate(clean)]
    await db.steps.insert_many([{**s.dict(), "owner": owner_id} for s in steps])
    await db.tasks.update_one({"id": task_id, "owner": owner_id}, {"$set": {"shrunk": True, "difficulty": payload.difficulty}})

    if not ent["active"]:
        await bump_rate(owner_id, "shrink")

    return steps


class StepPatch(BaseModel):
    done: bool


@api.patch("/steps/{step_id}", response_model=Step)
async def toggle_step(step_id: str, payload: StepPatch, who=Depends(resolve_owner)):
    owner_id, _ = who
    doc = await db.steps.find_one({"id": step_id, "owner": owner_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "step not found")
    update = {"done": payload.done}
    if payload.done:
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
        await db.activity.insert_one({
            "id": str(uuid.uuid4()),
            "owner": owner_id,
            "step_id": step_id,
            "task_id": doc["task_id"],
            "date": datetime.now(timezone.utc).date().isoformat(),
            "at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        update["completed_at"] = None
    await db.steps.update_one({"id": step_id, "owner": owner_id}, {"$set": update})
    doc = await db.steps.find_one({"id": step_id, "owner": owner_id}, {"_id": 0, "owner": 0})
    return Step(**doc)


# ---------- Next ----------

NEXT_SYSTEM = """You are Otterly, a calm ADHD-friendly companion. Your job: given a list of undone micro-steps and the user's current energy, pick the ONE step they should do next. Never overwhelm — just one.

Rules:
- Return STRICT JSON only.
- If energy is "low": pick the shortest / lowest-friction step.
- If energy is "medium": pick a mid-effort step.
- If energy is "good": pick something meaningful, up to 25 min.
- If available minutes is provided, do not pick a step longer than that.
- Give ONE short warm reason (max 12 words, no shame).

JSON shape: {"step_id": "...", "reason": "..."}
If no steps fit: {"step_id": null, "reason": "..."}"""


@api.post("/next", response_model=NextResponse)
async def next_action(payload: NextRequest, who=Depends(resolve_owner)):
    owner_id, _ = who
    step_docs = await db.steps.find({"done": False, "owner": owner_id}, {"_id": 0, "owner": 0}).to_list(300)
    if not step_docs:
        return NextResponse(empty=True, reason="Nothing shrunk yet — add something you're avoiding.")

    task_ids = list({s["task_id"] for s in step_docs})
    task_docs = await db.tasks.find({"id": {"$in": task_ids}, "owner": owner_id}, {"_id": 0, "owner": 0}).to_list(500)
    task_map = {t["id"]: t for t in task_docs}

    candidates = step_docs[:40]
    lines = []
    for s in candidates:
        t = task_map.get(s["task_id"], {})
        lines.append(f'- id={s["id"]} minutes={s["minutes"]} task="{t.get("title","")}" step="{s["text"]}"')
    user_text = (
        f"Energy: {payload.energy}\n"
        f"Available minutes: {payload.minutes or 'unspecified'}\n\n"
        f"Undone micro-steps:\n" + "\n".join(lines) + "\n\nReturn JSON."
    )
    try:
        data = await _llm_json("next-" + str(uuid.uuid4()), NEXT_SYSTEM, user_text)
    except Exception as e:
        logger.warning("next_action LLM failed, falling back: %s", e)
        data = {}

    step_id = data.get("step_id")
    reason = str(data.get("reason", "")).strip() or "This one's small enough to start."

    step_doc = next((s for s in candidates if s["id"] == step_id), None)
    if not step_doc:
        step_doc = min(candidates, key=lambda s: s["minutes"])
        reason = "Picked the smallest available step."

    task_doc = task_map.get(step_doc["task_id"], {})
    return NextResponse(
        step=Step(**step_doc),
        task=Task(**task_doc) if task_doc else None,
        reason=reason,
        empty=False,
    )


# ---------- Braindump ----------

BRAINDUMP_SYSTEM = """You are Otterly. The user is going to pour out everything on their mind. Extract the distinct tasks / things they need to do into a short list.

Rules:
- Return STRICT JSON only.
- Each task title is a short imperative.
- Merge duplicates. Skip pure feelings.
- Max 12 items.

JSON shape: {"tasks": ["...", "..."]}
"""


@api.post("/braindump", response_model=BraindumpResponse)
async def braindump(payload: BraindumpRequest, who=Depends(resolve_owner)):
    owner_id, user_id = who
    ent = await get_entitlement(owner_id, user_id)
    if not ent["active"]:
        allowed, _ = await check_rate(owner_id, "braindump", FREE_LIMITS["braindumps"])
        if not allowed:
            raise HTTPException(429, f"free tier: {FREE_LIMITS['braindumps']} braindumps/day. upgrade for unlimited.")

    if not payload.text.strip():
        return BraindumpResponse(tasks=[])
    data = await _llm_json("brain-" + str(uuid.uuid4()), BRAINDUMP_SYSTEM, payload.text)
    tasks = [str(t).strip() for t in (data.get("tasks") or []) if str(t).strip()]

    if not ent["active"]:
        await bump_rate(owner_id, "braindump")

    referral = REFERRAL if SELF_HARM_RE.search(payload.text) else None
    return BraindumpResponse(tasks=tasks[:12], referral=referral)


# ---------- Voice transcribe ----------

class TranscribeResponse(BaseModel):
    text: str


@api.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(audio: UploadFile = File(...), who=Depends(resolve_owner)):
    """Whisper-1 STT via Emergent Universal Key. Free tier gets 5/day."""
    owner_id, user_id = who
    ent = await get_entitlement(owner_id, user_id)
    if not ent["active"]:
        allowed, _ = await check_rate(owner_id, "transcribe", 5)
        if not allowed:
            raise HTTPException(429, "free tier: 5 voice notes/day. upgrade for unlimited.")

    if audio.size and audio.size > 25 * 1024 * 1024:
        raise HTTPException(413, "audio too large (25MB max)")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, "empty audio")

    # OpenAI whisper-1 via the standard SDK; the Emergent key is compatible.
    import openai
    client = openai.OpenAI(
        api_key=EMERGENT_LLM_KEY,
        base_url="https://integrations.emergentagent.com/llm",
    )
    import io
    buf = io.BytesIO(audio_bytes)
    buf.name = audio.filename or "audio.m4a"
    try:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=buf,
        )
        text = (result.text or "").strip()
    except Exception as e:
        logger.warning("whisper failed: %s", e)
        raise HTTPException(502, "transcription failed")

    if not ent["active"]:
        await bump_rate(owner_id, "transcribe")

    return TranscribeResponse(text=text)


# ---------- Room (Sit-With-Me) ----------

ROOM_SYSTEM = """You are Otterly — a calm AI body-double who sits quietly with the user while they work. You are a companion, not a coach.

Rules:
- Reply in 1 to 2 short sentences. Never more.
- Warm, gentle, low-stim tone. Never cheerlead. Never shame.
- If the user shares their goal: acknowledge softly and say you're here.
- If the user just says "hi" or is silent: greet gently, ask what they'd like to work on.
- If the user shares progress: acknowledge it in one line ("That's real.").
- If the user shares a feeling: reflect it briefly, then offer to just sit.
- No emojis. No exclamation marks unless the user used one first.
- Never diagnose, never give medical advice. If the user mentions self-harm or crisis, gently say: "I care that you told me. Please reach a real person — 988 (US), 116 123 (UK), or NCMH 1553 (PH)."
"""


@api.post("/room/message", response_model=RoomResponse)
async def room_message(payload: RoomMessage, who=Depends(resolve_owner)):
    owner_id, user_id = who
    ent = await get_entitlement(owner_id, user_id)
    if not ent["active"]:
        allowed, _ = await check_rate(owner_id, "room", FREE_LIMITS["room_messages"])
        if not allowed:
            raise HTTPException(429, f"free tier: {FREE_LIMITS['room_messages']} room messages/day.")

    user_doc = RoomMessageDoc(session_id=payload.session_id, role="user", text=payload.text)
    await db.room_messages.insert_one({**user_doc.dict(), "owner": owner_id})

    chat = _llm_chat(payload.session_id, ROOM_SYSTEM)
    history = await db.room_messages.find(
        {"session_id": payload.session_id, "owner": owner_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(20)
    prompt = payload.text
    if payload.goal and len(history) <= 2:
        prompt = f"(User goal for this session: {payload.goal})\n\n{payload.text}"
    reply = await chat.send_message(UserMessage(text=prompt))
    reply_text = ensure_referral((reply or "").strip(), payload.text)

    otter_doc = RoomMessageDoc(session_id=payload.session_id, role="otter", text=reply_text)
    await db.room_messages.insert_one({**otter_doc.dict(), "owner": owner_id})

    if not ent["active"]:
        await bump_rate(owner_id, "room")

    return RoomResponse(reply=reply_text)


@api.get("/room/history/{session_id}", response_model=List[RoomMessageDoc])
async def room_history(session_id: str, who=Depends(resolve_owner)):
    owner_id, _ = who
    docs = await db.room_messages.find(
        {"session_id": session_id, "owner": owner_id}, {"_id": 0, "owner": 0}
    ).sort("created_at", 1).to_list(200)
    return [RoomMessageDoc(**d) for d in docs]


# ---------- Streak ----------

@api.get("/streak", response_model=StreakStats)
async def streak(who=Depends(resolve_owner)):
    owner_id, _ = who
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=6)
    docs = await db.activity.find(
        {"owner": owner_id, "date": {"$gte": week_start.isoformat()}}, {"_id": 0}
    ).to_list(1000)
    days = {d["date"] for d in docs}
    todays = [d for d in docs if d["date"] == today.isoformat()]

    all_days = await db.activity.distinct("date", {"owner": owner_id})
    return StreakStats(
        days_this_week=len(days),
        total_days=len(all_days),
        todays_steps=len(todays),
    )


# ---------- Wire ----------

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup_indexes():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.tasks.create_index([("owner", 1), ("created_at", -1)])
        await db.steps.create_index([("owner", 1), ("task_id", 1), ("order", 1)])
        await db.activity.create_index([("owner", 1), ("date", 1)])
        await db.rate_counters.create_index([("owner", 1), ("kind", 1), ("date", 1)], unique=True)
        await db.webhook_events.create_index("event_id", unique=True)
        await db.entitlements.create_index("user_id", unique=True)
        await db.room_messages.create_index([("owner", 1), ("session_id", 1), ("created_at", 1)])
    except Exception as e:
        logger.warning("index creation warning: %s", e)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
