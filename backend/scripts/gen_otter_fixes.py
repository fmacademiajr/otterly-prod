"""
Regenerate the four broken otter variants flagged in HANDOFF-TO-EMERGENT.md §6:

  otter-focus.png     — Apple logo on the MacBook lid (trademark risk)
  otter-focused.png   — 'active time running' text + scowl
  otter-working.png   — 'workin' on stuff...' text baked into laptop
  otter-celebrate.png — human teeth + arms-raised cheering (banned by brief)

All four must match otter-default.png: closed-mouth calm, muted browns and sand,
no text, no third-party marks, no teeth, no shouting pose. Sticker style with a
clean dark outline, transparent background, centered composition.

Run: cd /app/backend && python scripts/gen_otter_fixes.py
"""
import asyncio
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT = Path(__file__).resolve().parents[2]  # /app
load_dotenv(ROOT / "backend" / ".env")

OUTPUT_DIR = ROOT / "frontend" / "assets" / "otter"
REFERENCE = OUTPUT_DIR / "otter-default.png"

# Hard style rules replayed in every prompt so Gemini can't drop them.
STYLE_RULES = (
    "STRICT RULES: Do NOT draw any laptop, computer, phone, screen, or device. "
    "Do NOT draw any Apple logo, brand mark, or corporate symbol. "
    "Do NOT draw ANY text, letters, numbers, speech bubbles, or signs. "
    "Do NOT show human-style teeth or an open shouting mouth. "
    "Keep the SAME character identity as the reference: same warm brown fur, "
    "same soft cream-and-sand tartan scarf, same rounded snout, same soft "
    "dark eyes, same closed-mouth calm smile. "
    "Sticker style with a clean dark outline. Transparent background. Centered."
)

VARIATIONS = [
    {
        "name": "otter-focus",
        "prompt": (
            "Use this exact cartoon otter as the character reference. Generate the same "
            "otter sitting quietly in a listening posture — head slightly tilted, both "
            "paws resting softly in its lap, closed-mouth calm smile, gentle eye contact "
            "with the viewer. Nothing in its paws, no objects around it, no laptop. "
            "It is simply present and attentive, like a companion sitting with a friend. "
            + STYLE_RULES
        ),
    },
    {
        "name": "otter-focused",
        "prompt": (
            "Use this exact cartoon otter as the character reference. Generate the same "
            "otter with a quietly focused expression — closed-mouth calm smile, eyes "
            "open and soft, one paw resting under its chin in a thinking pose. NO scowl, "
            "NO frown, NO angry eyebrows. Warm and gentle, not intense. Nothing else in "
            "the frame — no clock, no timer, no speech bubble, no text of any kind. "
            + STYLE_RULES
        ),
    },
    {
        "name": "otter-working",
        "prompt": (
            "Use this exact cartoon otter as the character reference. Generate the same "
            "otter mid-gesture, one paw gently raised as if it's about to speak or "
            "wave. Closed-mouth calm smile, eyes soft and open, warm and unhurried. "
            "Nothing in its paws. NO laptop, NO phone, NO device, NO screen, NO text. "
            + STYLE_RULES
        ),
    },
    {
        "name": "otter-celebrate",
        "prompt": (
            "Use this exact cartoon otter as the character reference. Generate the same "
            "otter with a soft, warm expression of quiet contentment — closed-mouth "
            "gentle smile (NO teeth, NO open mouth), eyes gently closed in a peaceful "
            "way (like a small happy sigh), one paw resting on its chest. Both paws "
            "STAY LOW near the body. NO raised arms, NO cheering pose, NO shouting, "
            "NO confetti, NO stars, NO sparkles. Just a quiet 'well done' moment. "
            + STYLE_RULES
        ),
    },
]


async def generate_one(ref_b64: str, name: str, prompt: str):
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(
        api_key=api_key,
        session_id=f"otter-fix-{name}",
        system_message=(
            "You are a precise image editor. Preserve character identity across "
            "variations. When asked to omit an object, brand, or text, you must "
            "omit it — do not substitute a different object in its place."
        ),
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )
    msg = UserMessage(text=prompt, file_contents=[ImageContent(ref_b64)])
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print(f"  ✗ {name}: no image returned. text={text[:120]}")
        return False
    for img in images:
        out = OUTPUT_DIR / f"{name}.png"
        with open(out, "wb") as f:
            f.write(base64.b64decode(img["data"]))
        print(f"  ✓ {name} → {out.name} ({out.stat().st_size // 1024} KB)")
        return True


async def main():
    if not REFERENCE.exists():
        print(f"Reference missing: {REFERENCE}")
        sys.exit(1)
    with open(REFERENCE, "rb") as f:
        ref_b64 = base64.b64encode(f.read()).decode("utf-8")
    print(f"Reference: {REFERENCE.name}  ({REFERENCE.stat().st_size // 1024} KB)")
    print()

    only = sys.argv[1:] if len(sys.argv) > 1 else None
    to_run = [v for v in VARIATIONS if (not only or v["name"] in only)]

    for v in to_run:
        print(f"Generating {v['name']} …")
        try:
            await generate_one(ref_b64, v["name"], v["prompt"])
        except Exception as e:
            print(f"  ✗ {v['name']}: {e}")

    print()
    print("Done. Review the PNGs in /app/frontend/assets/otter/")


if __name__ == "__main__":
    asyncio.run(main())
