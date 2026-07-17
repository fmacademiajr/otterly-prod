"""
Flood-fill checkerboard-and-white backgrounds from Gemini Nano Banana output
back to real transparency. Nano Banana sometimes bakes the transparency
indicator into pixel data (alpha=255, grey/white RGB) instead of writing
alpha=0. This script fixes that in place.

Run: python3 backend/scripts/flood_fill_transparent.py otter-focus otter-focused ...
Or with no args to process all four repaired variants.
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]  # /app
OUTPUT_DIR = ROOT / "frontend" / "assets" / "otter"

DEFAULT_TARGETS = [
    "otter-focus",
    "otter-focused",
    "otter-working",
    "otter-celebrate",
]

# Any pixel whose RGB is within TOL of pure white or pure grey checker gets treated
# as background. The Otter's palette (warm browns #8A6A4A, cream #E8D8BE, sand
# #D4A24F) is well outside this range, so we won't eat the character.
TOL = 15

def is_bg(r: int, g: int, b: int, a: int) -> bool:
    if a < 128:
        return True
    # Grayscale? R≈G≈B
    if abs(r - g) > 4 or abs(g - b) > 4:
        return False
    lum = (r + g + b) // 3
    # White (≥ 240) OR light grey (195-225 range, checker halftone)
    return lum >= 195

def flood(name: str) -> None:
    p = OUTPUT_DIR / f"{name}.png"
    if not p.exists():
        print(f"  ✗ {name}: no such file")
        return
    im = Image.open(p).convert("RGBA")
    w, h = im.size
    px = im.load()
    visited = [[False] * h for _ in range(w)]
    q: deque = deque()

    # Seed all four edges
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))

    cleared = 0
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        if visited[x][y]:
            continue
        visited[x][y] = True
        r, g, b, a = px[x, y]
        if not is_bg(r, g, b, a):
            continue
        px[x, y] = (0, 0, 0, 0)
        cleared += 1
        # 4-way flood
        q.append((x + 1, y)); q.append((x - 1, y))
        q.append((x, y + 1)); q.append((x, y - 1))

    im.save(p, "PNG")
    total = w * h
    pct = (cleared / total) * 100
    print(f"  ✓ {name}: cleared {cleared:,} px of {total:,} ({pct:.1f}%)")

def main() -> None:
    names = sys.argv[1:] if len(sys.argv) > 1 else DEFAULT_TARGETS
    for n in names:
        flood(n)

if __name__ == "__main__":
    main()
