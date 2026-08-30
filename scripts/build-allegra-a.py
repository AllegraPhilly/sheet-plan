#!/usr/bin/env python3
"""Faithful 4-color Allegra ribbon A — transparent SVG + PNG for Sheet Plan.

Standalone mark from the 2026 Identity Standards (not the ALLEGRA wordmark):
thin left leg tucked behind, left star-spike, peak, thick right leg,
inward cross-bar (open A counter), bulbous purple terminal.
Gradient gold → orange → red → purple.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

# Hand-tuned design space. y grows downward.
# Main body (even-odd: outer silhouette + triangular counter).
BODY_OUTER = """
M 10 102
C 40 74 92 34 140 18
C 156 12 172 18 186 40
C 206 76 220 126 232 170
C 240 196 258 214 244 226
C 228 238 206 228 198 208
C 188 178 184 152 176 138
C 168 126 148 122 118 124
C 96 126 82 116 68 106
C 46 96 26 100 10 102
Z
"""

HOLE = """
M 132 52
C 144 46 158 54 164 72
C 170 90 164 104 148 108
L 118 110
C 106 110 102 96 108 78
C 114 62 122 54 132 52
Z
"""

# Thin left leg — drawn first so the body crosses in front.
LEFT_LEG = """
M 56 214
C 82 162 110 118 136 88
C 142 94 148 102 142 110
C 118 138 92 176 68 214
C 62 224 50 222 56 214
Z
"""

GOLD = (252, 186, 48)
ORANGE = (244, 131, 38)
RED = (238, 62, 66)
MAGENTA = (155, 38, 142)
PURPLE = (82, 46, 144)

VB = (0.0, 0.0, 260.0, 240.0)  # x, y, w, h


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (int(lerp(a[0], b[0], t)), int(lerp(a[1], b[1], t)), int(lerp(a[2], b[2], t)))


def ribbon_color(t: float) -> tuple[int, int, int]:
    stops = [(0.0, GOLD), (0.26, ORANGE), (0.50, RED), (0.76, MAGENTA), (1.0, PURPLE)]
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t <= t1:
            u = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
            return lerp_rgb(c0, c1, max(0.0, min(1.0, u)))
    return PURPLE


def hex_rgb(c: tuple[int, int, int]) -> str:
    return f"#{c[0]:02X}{c[1]:02X}{c[2]:02X}"


def compact(d: str) -> str:
    return " ".join(d.split())


def svg_doc() -> str:
    x, y, w, h = VB
    stops = "".join(
        f'<stop offset="{t:.2f}" stop-color="{hex_rgb(ribbon_color(t))}"/>'
        for t in (0.0, 0.26, 0.50, 0.76, 1.0)
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:g} {y:g} {w:g} {h:g}" role="img" aria-label="Allegra">
  <title>Allegra standalone A</title>
  <defs>
    <linearGradient id="ribbon" gradientUnits="userSpaceOnUse" x1="8" y1="70" x2="250" y2="230">
      {stops}
    </linearGradient>
  </defs>
  <path fill="url(#ribbon)" d="{compact(LEFT_LEG)}"/>
  <path fill="url(#ribbon)" fill-rule="evenodd" d="{compact(BODY_OUTER)} {compact(HOLE)}"/>
</svg>
"""


def parse_path(d: str) -> list[tuple[str, list[float]]]:
    tokens: list[str] = []
    buf = ""
    for ch in compact(d):
        if ch.isalpha():
            if buf.strip():
                tokens.extend(buf.replace(",", " ").split())
            tokens.append(ch)
            buf = ""
        else:
            buf += ch
    if buf.strip():
        tokens.extend(buf.replace(",", " ").split())

    cmds: list[tuple[str, list[float]]] = []
    i = 0
    while i < len(tokens):
        cmd = tokens[i]
        i += 1
        nums: list[float] = []
        while i < len(tokens) and not tokens[i].isalpha():
            nums.append(float(tokens[i]))
            i += 1
        cmds.append((cmd, nums))
    return cmds


def flatten(d: str, steps: int = 24) -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = []
    cx = cy = 0.0
    sx = sy = 0.0
    for cmd, n in parse_path(d):
        if cmd == "M":
            cx, cy = n[0], n[1]
            sx, sy = cx, cy
            pts.append((cx, cy))
        elif cmd == "L":
            cx, cy = n[0], n[1]
            pts.append((cx, cy))
        elif cmd == "C":
            x1, y1, x2, y2, x3, y3 = n
            for s in range(1, steps + 1):
                t = s / steps
                u = 1 - t
                x = u**3 * cx + 3 * u**2 * t * x1 + 3 * u * t**2 * x2 + t**3 * x3
                y = u**3 * cy + 3 * u**2 * t * y1 + 3 * u * t**2 * y2 + t**3 * y3
                pts.append((x, y))
            cx, cy = x3, y3
        elif cmd == "Z":
            if pts and (pts[-1][0] != sx or pts[-1][1] != sy):
                pts.append((sx, sy))
            cx, cy = sx, sy
    return pts


def evenodd_inside(rings: list[list[tuple[float, float]]], px: float, py: float) -> bool:
    crossings = 0
    for poly in rings:
        n = len(poly)
        for i in range(n):
            x1, y1 = poly[i]
            x2, y2 = poly[(i + 1) % n]
            if (y1 > py) != (y2 > py):
                xin = (x2 - x1) * (py - y1) / (y2 - y1 + 1e-9) + x1
                if px < xin:
                    crossings += 1
    return crossings % 2 == 1


def png_rgba(width: int, height: int, pixels: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b""
    stride = width * 4
    for y in range(height):
        raw += b"\x00" + pixels[y * stride : (y + 1) * stride]
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        ]
    )


def rasterize(width: int = 320) -> bytes:
    x0, y0, vw, vh = VB
    height = max(1, int(width * vh / vw))
    left = flatten(LEFT_LEG)
    outer = flatten(BODY_OUTER)
    hole = flatten(HOLE)
    pixels = bytearray(width * height * 4)

    def sample(px: float, py: float) -> bool:
        if evenodd_inside([left], px, py):
            return True
        return evenodd_inside([outer, hole], px, py)

    for y in range(height):
        for x in range(width):
            cover = 0
            for oy, ox in ((0.25, 0.25), (0.25, 0.75), (0.75, 0.25), (0.75, 0.75)):
                px = x0 + (x + ox) * vw / width
                py = y0 + (y + oy) * vh / height
                if sample(px, py):
                    cover += 1
            if not cover:
                continue
            t = max(0.0, min(1.0, (x + 0.5) / width * 0.74 + (y + 0.5) / height * 0.26))
            r, g, b = ribbon_color(t)
            a = int(255 * cover / 4)
            i = (y * width + x) * 4
            pixels[i : i + 4] = bytes((r, g, b, a))
    return png_rgba(width, height, bytes(pixels))


def main() -> None:
    root = Path(__file__).resolve().parents[1] / "public" / "brand"
    root.mkdir(parents=True, exist_ok=True)
    (root / "allegra-a.svg").write_text(svg_doc(), encoding="utf-8")
    (root / "allegra-a.png").write_bytes(rasterize(320))
    print(f"wrote {root / 'allegra-a.svg'} and {root / 'allegra-a.png'}")


if __name__ == "__main__":
    main()
