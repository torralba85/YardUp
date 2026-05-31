#!/usr/bin/env python3
"""Cadastral Lyric — Plate I.
A warm-sepia cadastral study plate for the LotFoundry hero. Portrait 3:4,
rendered at 2x supersample for crisp graded hairlines, downscaled LANCZOS.
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ---------------------------------------------------------------- canvas ----
S = 2                      # supersample factor
FW, FH = 1200, 1600        # final size (3:4 portrait)
W, H = FW * S, FH * S

FONTS = ("C:/Users/torra/AppData/Roaming/Claude/local-agent-mode-sessions/"
         "skills-plugin/0bfd4c65-5627-46cc-945c-2defc6eec0de/"
         "bf209231-ce4c-42df-9e01-eeb0c4a3eb44/skills/canvas-design/canvas-fonts")

# ---------------------------------------------------------------- palette ---
VELLUM   = (243, 233, 216)
VELLUM_D = (235, 223, 202)
ESPRESSO = (40,  23,  10)
MAHOGANY = (89,  42,  15)
CLAY     = (140, 91,  63)
CLAY_LT  = (171, 126, 96)
TAUPE    = (150, 128, 104)
HAIRLINE = (203, 181, 151)
INK_SOFT = (104, 88,  74)

def q(v):  # final units -> supersample px
    return int(round(v * S))

def font(name, size):
    return ImageFont.truetype(f"{FONTS}/{name}", q(size))

GM   = lambda s: font("GeistMono-Regular.ttf", s)
GMB  = lambda s: font("GeistMono-Bold.ttf", s)
NP   = lambda s: font("NationalPark-Regular.ttf", s)
NPB  = lambda s: font("NationalPark-Bold.ttf", s)
SER  = lambda s: font("InstrumentSerif-Italic.ttf", s)

# ---------------------------------------------------------------- helpers ---
def tracked(draw, xy, text, fnt, fill, tracking, anchor="lm"):
    """Draw letter-spaced text. anchor: lm (left-mid), mm, rm."""
    tr = q(tracking)
    widths = [draw.textlength(c, font=fnt) for c in text]
    total = sum(widths) + tr * (len(text) - 1)
    x, y = xy
    if anchor[0] == "m":
        x -= total / 2
    elif anchor[0] == "r":
        x -= total
    for c, w in zip(text, widths):
        draw.text((x, y), c, font=fnt, fill=fill, anchor="l" + anchor[1])
        x += w + tr
    return total

def dline(draw, p0, p1, fill, width, dash, gap):
    """Dashed straight line."""
    x0, y0 = p0; x1, y1 = p1
    dx, dy = x1 - x0, y1 - y0
    dist = math.hypot(dx, dy)
    if dist == 0: return
    ux, uy = dx / dist, dy / dist
    n = 0.0
    on = True
    while n < dist:
        seg = dash if on else gap
        if on:
            a = (x0 + ux * n, y0 + uy * n)
            b = (x0 + ux * min(n + seg, dist), y0 + uy * min(n + seg, dist))
            draw.line([a, b], fill=fill, width=width)
        n += seg
        on = not on

def drect(draw, box, fill, width, dash, gap):
    x0, y0, x1, y1 = box
    dline(draw, (x0, y0), (x1, y0), fill, width, dash, gap)
    dline(draw, (x1, y0), (x1, y1), fill, width, dash, gap)
    dline(draw, (x1, y1), (x0, y1), fill, width, dash, gap)
    dline(draw, (x0, y1), (x0, y0), fill, width, dash, gap)

def rot_text(base, xy, text, fnt, fill, angle, tracking=0, anchor="mm"):
    """Render tracked text to a temp layer, rotate, paste centered at xy."""
    tmp = Image.new("RGBA", (q(900), q(160)), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    cx, cy = tmp.size[0] / 2, tmp.size[1] / 2
    tracked(d, (cx, cy), text, fnt, fill, tracking, anchor="mm")
    tmp = tmp.rotate(angle, resample=Image.BICUBIC, expand=True)
    base.alpha_composite(tmp, (int(xy[0] - tmp.size[0] / 2), int(xy[1] - tmp.size[1] / 2)))

# ---------------------------------------------------------------- base ------
img = Image.new("RGBA", (W, H), VELLUM + (255,))

# paper grain
rng = np.random.default_rng(7)
noise = rng.normal(0, 1, (H, W))
noise = np.clip(noise, -2.4, 2.4)
arr = np.array(img).astype(np.float32)
g = (noise * 5.0)[:, :, None]
arr[:, :, :3] = np.clip(arr[:, :, :3] + g, 0, 255)
# faint warm radial wash (aged center glow)
yy, xx = np.mgrid[0:H, 0:W]
r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
vig = np.clip((r - 0.55) / 0.85, 0, 1) ** 2
arr[:, :, :3] -= (vig * 16)[:, :, None]
arr = np.clip(arr, 0, 255)
img = Image.fromarray(arr.astype(np.uint8), "RGBA")

# ---------------------------------------------------------- geometry --------
# lot (deep parcel), all in FINAL coords
LOT = (420, 300, 780, 1160)
SET = (468, 388, 732, 1074)          # setback envelope
HOUSE = (506, 440, 694, 642)         # existing structure (front)
ADU = (520, 866, 680, 1028)          # proposed ADU (rear) — protagonist
ADU_CX = (ADU[0] + ADU[2]) / 2
ADU_CY = (ADU[1] + ADU[3]) / 2

def Q(box):
    return (q(box[0]), q(box[1]), q(box[2]), q(box[3]))

def inside_lot(x, y, pad=6):
    return (LOT[0] - pad <= x <= LOT[2] + pad) and (LOT[1] - pad <= y <= LOT[3] + pad)

# ---------------------------------------------------- faint layer (terrain) -
faint = Image.new("RGBA", (W, H), (0, 0, 0, 0))
fd = ImageDraw.Draw(faint)

# topographic contours — confined to negative space OUTSIDE the lot
rng2 = np.random.default_rng(3)
for i in range(1, 13):
    rad = 70 + i * 64
    pts = []
    for a in range(0, 361, 4):
        ra = math.radians(a)
        # organic perturbation, stable per ring
        wob = 1 + 0.06 * math.sin(ra * 3 + i) + 0.04 * math.cos(ra * 5 - i * 0.7)
        x = ADU_CX + rad * 1.02 * wob * math.cos(ra)
        y = ADU_CY + rad * 1.18 * wob * math.sin(ra)
        pts.append((x, y))
    for j in range(len(pts) - 1):
        a, b = pts[j], pts[j + 1]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        if inside_lot(mx, my):
            continue
        if not (96 < mx < 1104 and 216 < my < 1276):
            continue
        fd.line([(q(a[0]), q(a[1])), (q(b[0]), q(b[1]))],
                fill=CLAY + (34,), width=q(1.3))

# faint cadastral graticule (whole field, behind everything)
GRID = 48
for gx in range(120, 1081, GRID):
    fd.line([(q(gx), q(196)), (q(gx), q(1286))], fill=TAUPE + (20,), width=q(1.0))
for gy in range(204, 1287, GRID):
    fd.line([(q(120), q(gy)), (q(1080), q(gy))], fill=TAUPE + (20,), width=q(1.0))

# buildable-zone wash — the ADU rests within a quietly defined field
fd.rectangle(Q(SET), fill=CLAY + (15,))

img = Image.alpha_composite(img, faint)

# ---------------------------------------------------- soft shadow under ADU -
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.rectangle((q(ADU[0] + 7), q(ADU[1] + 11), q(ADU[2] + 7), q(ADU[3] + 11)),
             fill=ESPRESSO + (60,))
shadow = shadow.filter(ImageFilter.GaussianBlur(q(7)))
img = Image.alpha_composite(img, shadow)

draw = ImageDraw.Draw(img)

# ---------------------------------------------------- frame (museum mount) --
draw.rectangle((q(64), q(64), q(1136), q(1536)), outline=ESPRESSO + (255,), width=q(1.4))
draw.rectangle((q(76), q(76), q(1124), q(1524)), outline=TAUPE + (255,), width=q(1.0))
# neatline graticule ticks — cartographic detail that makes the margins surveyed
TK = 48
for gx in range(124, 1077, TK):
    draw.line([(q(gx), q(76)), (q(gx), q(84))], fill=TAUPE + (255,), width=q(0.9))
    draw.line([(q(gx), q(1516)), (q(gx), q(1524))], fill=TAUPE + (255,), width=q(0.9))
for gy in range(124, 1477, TK):
    draw.line([(q(76), q(gy)), (q(84), q(gy))], fill=TAUPE + (255,), width=q(0.9))
    draw.line([(q(1116), q(gy)), (q(1124), q(gy))], fill=TAUPE + (255,), width=q(0.9))

# ---------------------------------------------------- header ---------------
tracked(draw, (q(120), q(150)), "CADASTRAL LYRIC", GMB(17), MAHOGANY + (255,), 6.5, "lm")
tracked(draw, (q(1080), q(150)), "PLATE I", GM(15), ESPRESSO + (255,), 6.5, "rm")
draw.line([(q(120), q(184)), (q(1080), q(184))], fill=HAIRLINE + (255,), width=q(1.0))
tracked(draw, (q(120), q(206)), "FIELD STUDY OF A SINGLE LOT", GM(11),
        INK_SOFT + (255,), 3.5, "lm")

# ---------------------------------------------------- dimension: width (top)
ext = HAIRLINE + (255,)
draw.line([(q(LOT[0]), q(LOT[1] - 6)), (q(LOT[0]), q(254))], fill=ext, width=q(0.9))
draw.line([(q(LOT[2]), q(LOT[1] - 6)), (q(LOT[2]), q(254))], fill=ext, width=q(0.9))
draw.line([(q(LOT[0]), q(258)), (q(LOT[2]), q(258))], fill=INK_SOFT + (255,), width=q(1.0))
for tx in (LOT[0], LOT[2]):  # 45-deg ticks
    draw.line([(q(tx - 6), q(264)), (q(tx + 6), q(252))], fill=INK_SOFT + (255,), width=q(1.2))
tracked(draw, (q((LOT[0] + LOT[2]) / 2), q(240)), "50'-0\"", GM(13),
        ESPRESSO + (255,), 2.0, "mm")

# ---------------------------------------------------- dimension: length (left)
draw.line([(q(LOT[0] - 6), q(LOT[1])), (q(372), q(LOT[1]))], fill=ext, width=q(0.9))
draw.line([(q(LOT[0] - 6), q(LOT[3])), (q(372), q(LOT[3]))], fill=ext, width=q(0.9))
draw.line([(q(368), q(LOT[1])), (q(368), q(LOT[3]))], fill=INK_SOFT + (255,), width=q(1.0))
for ty in (LOT[1], LOT[3]):
    draw.line([(q(362), q(ty + 6)), (q(374), q(ty - 6))], fill=INK_SOFT + (255,), width=q(1.2))
rot_text(img, (q(338), q((LOT[1] + LOT[3]) / 2)), "120'-0\"", GM(13),
         ESPRESSO + (255,), 90, tracking=2.0)
draw = ImageDraw.Draw(img)

# ---------------------------------------------------- the lot & contents ---
# lot boundary
draw.rectangle(Q(LOT), outline=ESPRESSO + (255,), width=q(2.0))
# setback envelope (dashed)
drect(draw, (q(SET[0]), q(SET[1]), q(SET[2]), q(SET[3])), CLAY + (235,),
      q(1.4), q(9), q(7))
tracked(draw, (q(SET[0] + 6), q(SET[1] + 16)), "SETBACK ENVELOPE", GM(8.5),
        CLAY + (255,), 2.4, "lm")

# existing house (outline + light cross-hatch feel via two diagonals)
draw.rectangle(Q(HOUSE), outline=MAHOGANY + (255,), width=q(1.4))
draw.line([(q(HOUSE[0]), q(HOUSE[1])), (q(HOUSE[2]), q(HOUSE[3]))],
          fill=MAHOGANY + (40,), width=q(0.9))
draw.line([(q(HOUSE[2]), q(HOUSE[1])), (q(HOUSE[0]), q(HOUSE[3]))],
          fill=MAHOGANY + (40,), width=q(0.9))
tracked(draw, (q((HOUSE[0] + HOUSE[2]) / 2), q((HOUSE[1] + HOUSE[3]) / 2)),
        "EXISTING", GM(9), MAHOGANY + (255,), 2.4, "mm")

# stepping-stone access linking the existing structure to the ADU
px = (HOUSE[0] + HOUSE[2]) / 2
sy = HOUSE[3] + 18
while sy < ADU[1] - 12:
    draw.ellipse((q(px - 4), q(sy - 4), q(px + 4), q(sy + 4)),
                 fill=TAUPE + (170,))
    sy += 28

# ADU — protagonist: single saturated solid mark
draw.rectangle(Q(ADU), fill=CLAY + (255,), outline=MAHOGANY + (255,), width=q(2.2))
# inner top highlight + ridge line for crafted depth
draw.line([(q(ADU[0] + 4), q(ADU[1] + 4)), (q(ADU[2] - 4), q(ADU[1] + 4))],
          fill=CLAY_LT + (200,), width=q(1.2))
draw.line([(q(ADU_CX), q(ADU[1] + 6)), (q(ADU_CX), q(ADU[3] - 6))],
          fill=MAHOGANY + (90,), width=q(1.0))
# entry pad in front of ADU
draw.rectangle((q(ADU_CX - 18), q(ADU[3]), q(ADU_CX + 18), q(ADU[3] + 18)),
               outline=MAHOGANY + (180,), width=q(1.1))
tracked(draw, (q(ADU_CX), q(ADU_CY - 6)), "ADU", GMB(12), VELLUM + (255,), 3.0, "mm")
tracked(draw, (q(ADU_CX), q(ADU_CY + 14)), "α", NP(13), VELLUM + (230,), 0, "mm")

# rear setback dimension (small, right side) — one quiet secondary measure
rx = LOT[2] + 18
draw.line([(q(LOT[2] + 6), q(SET[3])), (q(rx + 6), q(SET[3]))], fill=ext, width=q(0.8))
draw.line([(q(LOT[2] + 6), q(LOT[3])), (q(rx + 6), q(LOT[3]))], fill=ext, width=q(0.8))
draw.line([(q(rx), q(SET[3])), (q(rx), q(LOT[3]))], fill=INK_SOFT + (255,), width=q(0.9))
rot_text(img, (q(rx + 20), q((SET[3] + LOT[3]) / 2)), "REAR 20'", GM(9),
         INK_SOFT + (255,), 90, tracking=1.5)
draw = ImageDraw.Draw(img)

# ---------------------------------------------------- corner monuments -----
for (mx, my), lbl in [((LOT[0], LOT[1]), "P1"), ((LOT[2], LOT[1]), "P2"),
                      ((LOT[2], LOT[3]), "P3"), ((LOT[0], LOT[3]), "P4")]:
    draw.ellipse((q(mx - 7), q(my - 7), q(mx + 7), q(my + 7)),
                 outline=ESPRESSO + (255,), width=q(1.2), fill=VELLUM + (255,))
    draw.line([(q(mx - 10), q(my)), (q(mx + 10), q(my))], fill=ESPRESSO + (255,), width=q(0.9))
    draw.line([(q(mx), q(my - 10)), (q(mx), q(my + 10))], fill=ESPRESSO + (255,), width=q(0.9))

# ---------------------------------------------------- north arrow ----------
nx, ny = 1040, 320
draw.line([(q(nx), q(ny + 30)), (q(nx), q(ny - 30))], fill=ESPRESSO + (255,), width=q(1.4))
draw.polygon([(q(nx), q(ny - 38)), (q(nx - 7), q(ny - 22)), (q(nx + 7), q(ny - 22))],
             fill=ESPRESSO + (255,))
draw.ellipse((q(nx - 3), q(ny + 28), q(nx + 3), q(ny + 34)), fill=ESPRESSO + (255,))
tracked(draw, (q(nx), q(ny - 54)), "N", NPB(14), ESPRESSO + (255,), 0, "mm")

# ---------------------------------------------------- scale bar ------------
sbx, sby = 120, 1300
seg = 46
for i in range(4):
    x0 = sbx + i * seg
    fillc = ESPRESSO + (255,) if i % 2 == 0 else None
    draw.rectangle((q(x0), q(sby), q(x0 + seg), q(sby + 11)),
                   fill=fillc, outline=ESPRESSO + (255,), width=q(1.0))
for i, lab in enumerate(["0", "16", "32", "48", "64"]):
    tracked(draw, (q(sbx + i * seg), q(sby + 26)), lab, GM(9), INK_SOFT + (255,), 0, "mm")
tracked(draw, (q(sbx + 2 * seg), q(sby + 44)), "FEET  ·  1\" = 16'", GM(8.5),
        INK_SOFT + (255,), 2.0, "mm")

# ---------------------------------------------------- the lyric (serif) ----
draw.text((q(600), q(1372)), "Every parcel, a latent architecture.",
          font=SER(33), fill=ESPRESSO + (255,), anchor="mm")

# ---------------------------------------------------- registry block -------
reg = [
    "LAT 38.5816°  LNG -121.4944°",
    "ZONE R-1  ·  COVERAGE 38%",
    "REG. No LF-0001  ·  MMXXVI",
]
ry = 1440
for line in reg:
    tracked(draw, (q(1080), q(ry)), line, GM(10.5), INK_SOFT + (255,), 1.2, "rm")
    ry += 24
# small balancing seal bottom-left
draw.ellipse((q(150), q(1448), q(202), q(1500)), outline=CLAY + (255,), width=q(1.2))
draw.ellipse((q(157), q(1455), q(195), q(1493)), outline=CLAY + (160,), width=q(0.9))
tracked(draw, (q(176), q(1474)), "LF", NPB(12), CLAY + (255,), 1.0, "mm")

# ---------------------------------------------------- finish ---------------
out = img.convert("RGB").resize((FW, FH), Image.LANCZOS)
out.save("brand/_plate_render.png")
out.save("public/hero-cadastral-plate.png")
print("rendered", out.size)
