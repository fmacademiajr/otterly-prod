"""
Otterly backend — calm ADHD task-starter.

Endpoints (all prefixed with /api):
  POST   /api/tasks                 create a task (inbox)
  GET    /api/tasks                 list all tasks
  DELETE /api/tasks/{task_id}       delete a task
  POST   /api/tasks/{task_id}/shrink  ask AI to break a task into micro-steps
  PATCH  /api/steps/{step_id}       toggle a micro-step done/undone
  POST   /api/next                  ask AI to pick the next best micro-step (energy-aware)
  POST   /api/braindump             ask AI to split a paragraph into task candidates
  POST   /api/room/message          send a message to the Sit-With-Me AI body-double
  GET    /api/room/history/{session_id}   fetch conversation history
  GET    /api/streak                forgiving 7-day streak stats
  GET    /api/                      health
"""
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Otterly API")
api = APIRouter(prefix="/api")

# ---------- Models ----------

Energy = Literal["low", "medium", "good"]
Difficulty = Literal["easy", "medium", "hard"]


class TaskCreate(BaseModel):
    title: str
    note: Optional[str] = None


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
    minutes: int = 5  # 5, 10, or 25
    done: bool = False
    completed_at: Optional[str] = None


class ShrinkRequest(BaseModel):
    difficulty: Difficulty = "medium"


class NextRequest(BaseModel):
    energy: Energy = "medium"
    minutes: Optional[int] = None  # available time in minutes


class NextResponse(BaseModel):
    step: Optional[Step] = None
    task: Optional[Task] = None
    reason: str = ""
    empty: bool = False


class BraindumpRequest(BaseModel):
    text: str


class BraindumpResponse(BaseModel):
    tasks: List[str]


class RoomMessage(BaseModel):
    session_id: str
    text: str
    goal: Optional[str] = None  # what the user said they'd work on


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


# ---------- Helpers ----------

def _no_id(d):
    if d is None:
        return None
    d = dict(d)
    d.pop("_id", None)
    return d


async def _llm_chat(session_id: str, system: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-6")


async def _llm_json(session_id: str, system: str, user_text: str) -> dict:
    """Send a one-shot message and parse JSON reply (with a fenced-code strip)."""
    chat = await _llm_chat(session_id, system)
    raw = await chat.send_message(UserMessage(text=user_text))
    text = (raw or "").strip()
    # Strip ```json fences if present
    if text.startswith("```"):
        text = text.strip("`")
        # remove leading "json\n"
        if text.lower().startswith("json"):
            text = text[4:].lstrip("\n").lstrip()
        # remove trailing ``` if any
        if text.endswith("```"):
            text = text[:-3].rstrip()
    # try find first { or [
    for i, ch in enumerate(text):
        if ch in "{[":
            text = text[i:]
            break
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning("LLM JSON parse failed: %s | raw=%r", e, raw)
        raise HTTPException(status_code=502, detail="AI returned invalid response, please try again.")


# ---------- Task endpoints ----------

@api.get("/")
async def root():
    return {"ok": True, "app": "otterly"}


@api.post("/tasks", response_model=Task)
async def create_task(payload: TaskCreate):
    task = Task(title=payload.title.strip(), note=(payload.note or "").strip() or None)
    await db.tasks.insert_one(task.dict())
    return task


@api.get("/tasks", response_model=List[Task])
async def list_tasks():
    docs = await db.tasks.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Task(**d) for d in docs]


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    await db.tasks.delete_one({"id": task_id})
    await db.steps.delete_many({"task_id": task_id})
    return {"ok": True}


@api.get("/tasks/{task_id}/steps", response_model=List[Step])
async def list_steps(task_id: str):
    docs = await db.steps.find({"task_id": task_id}, {"_id": 0}).sort("order", 1).to_list(200)
    return [Step(**d) for d in docs]


# ---------- Shrink ----------

SHRINK_SYSTEM = """You are Otterly, a calm ADHD-friendly companion. You help people with ADHD start tasks by breaking them into tiny concrete micro-steps.

Rules:
- Return STRICT JSON only. No prose, no fenced code.
- 3 to 10 micro-steps. Fewer is better if the task allows.
- Each step MUST be a single concrete physical action that takes 5 to 25 minutes.
- Steps must start with a verb ("Open", "Walk to", "Type", "Send").
- Never generic ("plan it out"). Always concrete ("Open Gmail and start a draft to Jane").
- Tone: warm, non-shame, brief. Never mention how the user 'should' have done this earlier.
- For difficulty "easy": more steps, smaller (5 min each). For "medium": mid (10 min). For "hard": fewer/bigger steps (up to 25 min) because the user has focus.

Return JSON shape:
{"steps": [{"text": "...", "minutes": 5}]}
"""


@api.post("/tasks/{task_id}/shrink", response_model=List[Step])
async def shrink_task(task_id: str, payload: ShrinkRequest):
    task_doc = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task_doc:
        raise HTTPException(404, "task not found")
    task = Task(**task_doc)

    prompt = f"Task: {task.title}\n"
    if task.note:
        prompt += f"Note: {task.note}\n"
    prompt += f"Difficulty preference: {payload.difficulty}\n\nReturn JSON."

    data = await _llm_json(f"shrink-{task_id}-{uuid.uuid4()}", SHRINK_SYSTEM, prompt)

    raw_steps = data.get("steps") or []
    if not raw_steps:
        raise HTTPException(502, "AI returned no steps")

    # Clear old steps for a re-shrink
    await db.steps.delete_many({"task_id": task_id})

    steps: List[Step] = []
    for i, s in enumerate(raw_steps[:12]):
        minutes = int(s.get("minutes") or 10)
        # snap to 5/10/25
        minutes = min([5, 10, 25], key=lambda x: abs(x - minutes))
        step = Step(task_id=task_id, order=i, text=str(s.get("text", "")).strip(), minutes=minutes)
        if step.text:
            steps.append(step)

    if steps:
        await db.steps.insert_many([s.dict() for s in steps])
        await db.tasks.update_one({"id": task_id}, {"$set": {"shrunk": True, "difficulty": payload.difficulty}})

    # return without any mongo _id leakage
    return steps


class StepPatch(BaseModel):
    done: bool


@api.patch("/steps/{step_id}", response_model=Step)
async def toggle_step(step_id: str, payload: StepPatch):
    doc = await db.steps.find_one({"id": step_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "step not found")
    update = {"done": payload.done}
    if payload.done:
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
        # log activity
        await db.activity.insert_one({
            "id": str(uuid.uuid4()),
            "step_id": step_id,
            "task_id": doc["task_id"],
            "date": datetime.now(timezone.utc).date().isoformat(),
            "at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        update["completed_at"] = None
    await db.steps.update_one({"id": step_id}, {"$set": update})
    doc = await db.steps.find_one({"id": step_id}, {"_id": 0})
    return Step(**doc)


# ---------- Next (anti-overwhelm hero) ----------

NEXT_SYSTEM = """You are Otterly, a calm ADHD-friendly companion. Your job: given a list of undone micro-steps and the user's current energy, pick the ONE step they should do next. Never overwhelm — just one.

Rules:
- Return STRICT JSON only.
- If energy is "low": pick the shortest / lowest-friction step (prefer 5 min, prefer a physical/simple action like "stand up and drink water" style steps).
- If energy is "medium": pick a mid-effort step (10 min ok).
- If energy is "good": pick something meaningful, up to 25 min.
- If available minutes is provided, do not pick a step longer than that.
- Give ONE short warm reason (max 12 words, no shame, no cheerleading).

JSON shape: {"step_id": "...", "reason": "..."}
If no steps fit, return: {"step_id": null, "reason": "..."}"""


@api.post("/next", response_model=NextResponse)
async def next_action(payload: NextRequest):
    # gather all undone steps across tasks
    step_docs = await db.steps.find({"done": False}, {"_id": 0}).to_list(300)
    if not step_docs:
        return NextResponse(empty=True, reason="Nothing shrunk yet — add something you're avoiding.")

    task_ids = list({s["task_id"] for s in step_docs})
    task_docs = await db.tasks.find({"id": {"$in": task_ids}}, {"_id": 0}).to_list(500)
    task_map = {t["id"]: t for t in task_docs}

    # Cap what we send to the LLM to keep it fast
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

    data = await _llm_json("next-" + str(uuid.uuid4()), NEXT_SYSTEM, user_text)
    step_id = data.get("step_id")
    reason = str(data.get("reason", "")).strip() or "This one's small enough to start."

    if not step_id:
        return NextResponse(empty=True, reason=reason)

    step_doc = next((s for s in candidates if s["id"] == step_id), None)
    if not step_doc:
        # Fallback: pick shortest that fits
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
- Each task title is a short imperative (e.g. "File tax return", "Reply to Mom", "Book dentist").
- Merge duplicates. Skip pure feelings ("I feel bad") — keep only actionable items.
- Max 12 items.

JSON shape: {"tasks": ["...", "..."]}
"""


@api.post("/braindump", response_model=BraindumpResponse)
async def braindump(payload: BraindumpRequest):
    if not payload.text.strip():
        return BraindumpResponse(tasks=[])
    data = await _llm_json("brain-" + str(uuid.uuid4()), BRAINDUMP_SYSTEM, payload.text)
    tasks = [str(t).strip() for t in (data.get("tasks") or []) if str(t).strip()]
    return BraindumpResponse(tasks=tasks[:12])


# ---------- Room (Sit-With-Me) ----------

ROOM_SYSTEM = """You are Otterly — a calm AI body-double who sits quietly with the user while they work. You are a companion, not a coach.

Rules:
- Reply in 1 to 2 short sentences. Never more. Whitespace is a feature.
- Warm, gentle, low-stim tone. Never cheerlead ("You got this!"). Never shame.
- If the user shares their goal: acknowledge softly and say you're here.
- If the user just says "hi" or is silent: greet gently, ask what they'd like to work on.
- If the user shares progress: acknowledge it in one line ("That's real.").
- If the user shares a feeling: reflect it briefly, then offer to just sit.
- No emojis. No exclamation marks unless the user used one first.
- Never diagnose, never give medical/therapeutic advice. If the user mentions self-harm or crisis, gently say: "I care that you told me. Please reach a real person — 988 (US), 116 123 (UK), or NCMH 1553 (PH)."
"""


@api.post("/room/message", response_model=RoomResponse)
async def room_message(payload: RoomMessage):
    # store user message
    user_doc = RoomMessageDoc(session_id=payload.session_id, role="user", text=payload.text)
    await db.room_messages.insert_one(user_doc.dict())

    # get prior turns for context (last 10)
    history = await db.room_messages.find(
        {"session_id": payload.session_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    history = list(reversed(history))

    chat = await _llm_chat(payload.session_id, ROOM_SYSTEM)
    # Send only the latest user text; emergentintegrations manages history via session_id, but
    # we pass a hint if goal exists.
    prompt = payload.text
    if payload.goal and len(history) <= 2:
        prompt = f"(User goal for this session: {payload.goal})\n\n{payload.text}"
    reply = await chat.send_message(UserMessage(text=prompt))
    reply_text = (reply or "").strip()

    otter_doc = RoomMessageDoc(session_id=payload.session_id, role="otter", text=reply_text)
    await db.room_messages.insert_one(otter_doc.dict())

    return RoomResponse(reply=reply_text)


@api.get("/room/history/{session_id}", response_model=List[RoomMessageDoc])
async def room_history(session_id: str):
    docs = await db.room_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return [RoomMessageDoc(**d) for d in docs]


# ---------- Streak ----------

@api.get("/streak", response_model=StreakStats)
async def streak():
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=6)
    docs = await db.activity.find(
        {"date": {"$gte": week_start.isoformat()}}, {"_id": 0}
    ).to_list(1000)
    days = {d["date"] for d in docs}
    todays = [d for d in docs if d["date"] == today.isoformat()]

    all_days = await db.activity.distinct("date")
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("otterly")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
