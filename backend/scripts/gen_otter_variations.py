"""
One-time Otter variation generator using Gemini Nano Banana.

Generates:
  otter-crown.png   — same otter, tiny gold crown on head (for Founding Otter card)
  otter-wave.png    — same otter, one paw raised waving hello (for onboarding welcome)
  otter-sleep.png   — same otter, eyes closed, snoozing (for late-night / idle)
  otter-peek.png    — same otter, just the head from behind a card edge (for Next screen inline)

Run: cd /app/backend && python scripts/gen_otter_variations.py
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

VARIATIONS = [
    {
        "name": "otter-crown",
        "prompt": (
            "Use this exact cartoon otter and generate the same otter, same style, "
            "same soft tartan scarf, same warm brown fur, same wholesome face — "
            "but add a tiny gold crown with 3-5 rounded points sitting on top of "
            "its head. The crown is a warm gold (#D4A24F). Keep everything else "
            "identical. Sticker style with a clean dark outline. Transparent background. "
            "Centered composition."
        ),
    },
    {
        "name": "otter-wave",
        "prompt": (
            "Use this exact cartoon otter and generate the same otter, same style, "
            "same soft tartan scarf, same warm brown fur, same wholesome face — "
            "but with one paw raised in a small friendly wave hello (right paw up "
            "near its face). Sticker style with a clean dark outline. Transparent "
            "background. Centered composition."
        ),
    },
    {
        "name": "otter-sleep",
        "prompt": (
            "Use this exact cartoon otter and generate the same otter, same style, "
            "same soft tartan scarf, same warm brown fur — but with eyes gently "
            "closed, mouth slightly upturned in a peaceful sleep, and small 'zzz' "
            "sleep marks floating near its head. It should look calm and cozy, "
            "not sad. Sticker style with a clean dark outline. Transparent "
            "background. Centered composition."
        ),
    },
    {
        "name": "otter-peek",
        "prompt": (
            "Use this exact cartoon otter and generate JUST the otter's face and "
            "top-of-head only, as if it's peeking out from behind a horizontal edge "
            "at the bottom. Same style, same warm brown fur, same wholesome face. "
            "The image is roughly square, and the otter head takes up the top "
            "60% while the bottom 40% is empty transparent space. Sticker style "
            "with a clean dark outline. Transparent background."
        ),
    },
]


async def generate_one(ref_b64: str, name: str, prompt: str):
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(
        api_key=api_key,
        session_id=f"otter-gen-{name}",
        system_message="You are a precise image editor. Preserve character identity across variations.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )
    msg = UserMessage(text=prompt, file_contents=[ImageContent(ref_b64)])
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print(f"  ✗ {name}: no image returned. text={text[:80]}")
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
