"""Draw the two basement layouts for 45 Autumn Crest Ct as SVG plans.

    python scripts/draw-basement-layouts.py     writes house-plan/basement/layout-office.svg (the D&D studio
                                               beside the office) and layout-utility.svg (the studio beside the
                                               utilities), and prints each room's size, the bin count and the lane

Feet throughout, measured from the basement's rear corner on the garage side: x runs toward the far
wall, y runs from the walkout wall toward the street. The basement is a 36 by 33 rectangle with
9-inch poured walls, plus a 12 by 2 foot bump-out under the front porch that the walk-through of
November 5, 2026 found real. What the layout keeps where it is: the stair (the run under the loft
stair, the landing, the run toward the front), the bath rough-in at the stair's foot, the walkout
slider and the window in the rear wall, the furnace and water heater about 9 feet off the garage
wall, the sump pit hard in the foundation corner, the finished room at the stair's foot with its reach-in
closet and its step, the two electrical panels and the two staggered posts under the far beam. Positions
marked "about" come from Kane's marked-up plan of November 5 at 20:05, the walk-through video and the
photos, not a tape, and move when the basement is cleared and measured. Shelf bays are 2 feet deep and hold 27-gallon bins (31 by 20 inches) three across every
8 feet, four tiers high.
"""

import html
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "house-plan" / "basement"

W, H = 36.0, 33.0
X0, X1, Y0, Y1 = 0.75, 35.25, 0.75, 32.25
SLIDER = (12.0, 17.7)
WINDOW = (26.5, 28.8)
LANDING = (12.3, 15.9, 15.3, 19.1)
RUN1 = (15.3, 15.9, 19.7, 19.1)   # from the door under the loft stair, down toward the landing
RUN2 = (12.3, 19.1, 15.3, 26.0)   # from the landing down toward the front wall
ROUGH = (16.5, 25.4)
BUMP = (12.0, 24.0, 2.0)          # the porch bump-out: x from, x to, depth past the front wall
BEAMS = (14.4, 18.5)              # two steel beams running left to right, one each side of the stair, through the posts Kane marked, about
POSTS = ((23.4, 14.4), (24.7, 18.5))   # the two posts Kane marked, staggered, one under each beam, about
SUMP = (1.9, 1.9)                 # the open pit, hard against the foundation corner on the garage side at the rear
DRAIN = (10.7, 16.4)              # the floor drain south-west of the furnace, where Kane marked it
BIN_LONG = 31 / 12
TIERS = 4

S = 18          # pixels per foot
ML, MT = 34, 26  # margins
PW = int(ML * 2 + W * S)
PH = int(MT + (H + BUMP[2]) * S + 30)

COLORS = {
    "studio": ("#ede9fe", "#5b21b6"),
    "office": ("#dbeafe", "#1d4ed8"),
    "bath": ("#ccfbf1", "#0f766e"),
    "storage": ("#dcfce7", "#15803d"),
    "utility": ("#e2e8f0", "#334155"),
    "lounge": ("#fce7f3", "#be185d"),
    "hall": ("#f1f5f9", "#475569"),
    "lane": ("#fff1f2", "#be123c"),
}


def X(v):
    return ML + v * S


def Y(v):
    return MT + v * S


class Plan:
    def __init__(self, key, title):
        self.key, self.title = key, title
        self.under, self.over, self.labels = [], [], []
        self.rooms, self.shelves, self.lanes = [], [], []

    def room(self, name, kind, rects, label_at, note="", compact=False):
        fill, ink = COLORS[kind]
        for x0, y0, x1, y1 in rects:
            self.under.append(f'<rect x="{X(x0):.1f}" y="{Y(y0):.1f}" width="{(x1 - x0) * S:.1f}" height="{(y1 - y0) * S:.1f}" fill="{fill}"/>')
        area = round(sum((x1 - x0) * (y1 - y0) for x0, y0, x1, y1 in rects))
        x0, y0, x1, y1 = rects[0]
        size = f"{x1 - x0:.1f} by {y1 - y0:.1f} ft" if len(rects) == 1 else "L-shaped"
        self.rooms.append({"name": name, "kind": kind, "area": area, "size": size, "note": note})
        lx, ly = label_at
        line2 = f"{area} sq ft" if compact or len(rects) > 1 else f"{size}, {area} sq ft"
        big = 11 if compact else 14
        self.labels.append(f'<text x="{X(lx):.1f}" y="{Y(ly):.1f}" font-size="{big}" font-weight="700" fill="{ink}" text-anchor="middle">{html.escape(name)}</text>')
        self.labels.append(f'<text x="{X(lx):.1f}" y="{Y(ly) + (13 if compact else 15):.1f}" font-size="{10 if compact else 11}" fill="{ink}" text-anchor="middle">{line2}</text>')

    def wall(self, x0, y0, x1, y1, sound=False):
        color = "#6d28d9" if sound else "#475569"
        self.over.append(f'<rect x="{X(x0):.1f}" y="{Y(y0):.1f}" width="{(x1 - x0) * S:.1f}" height="{(y1 - y0) * S:.1f}" fill="{color}"/>')

    def door(self, hx, hy, w, start_deg, sweep=90):
        """A door leaf of width w feet hinged at (hx, hy), drawn open at start_deg, with its swing arc."""
        a0 = math.radians(start_deg)
        a1 = math.radians(start_deg + sweep)
        x0, y0 = hx + w * math.cos(a0), hy + w * math.sin(a0)
        x1, y1 = hx + w * math.cos(a1), hy + w * math.sin(a1)
        self.over.append(f'<line x1="{X(hx):.1f}" y1="{Y(hy):.1f}" x2="{X(x0):.1f}" y2="{Y(y0):.1f}" stroke="#334155" stroke-width="2"/>')
        self.over.append(f'<path d="M {X(x0):.1f} {Y(y0):.1f} A {w * S:.1f} {w * S:.1f} 0 0 1 {X(x1):.1f} {Y(y1):.1f}" fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3"/>'
                         if sweep > 0 else
                         f'<path d="M {X(x0):.1f} {Y(y0):.1f} A {w * S:.1f} {w * S:.1f} 0 0 0 {X(x1):.1f} {Y(y1):.1f}" fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3"/>')

    def shelf(self, x0, y0, x1, y1):
        horiz = (x1 - x0) >= (y1 - y0)
        run = (x1 - x0) if horiz else (y1 - y0)
        across = int(run // (BIN_LONG + 0.06))
        bins = across * TIERS
        self.shelves.append(bins)
        self.over.append(f'<rect x="{X(x0):.1f}" y="{Y(y0):.1f}" width="{(x1 - x0) * S:.1f}" height="{(y1 - y0) * S:.1f}" fill="#bbf7d0" stroke="#15803d" stroke-width="1.2"/>')
        for k in range(1, across):
            if horiz:
                xx = x0 + k * (BIN_LONG + 0.06)
                self.over.append(f'<line x1="{X(xx):.1f}" y1="{Y(y0):.1f}" x2="{X(xx):.1f}" y2="{Y(y1):.1f}" stroke="#15803d" stroke-width="0.8"/>')
            else:
                yy = y0 + k * (BIN_LONG + 0.06)
                self.over.append(f'<line x1="{X(x0):.1f}" y1="{Y(yy):.1f}" x2="{X(x1):.1f}" y2="{Y(yy):.1f}" stroke="#15803d" stroke-width="0.8"/>')
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        rot = "" if horiz else f' transform="rotate(-90 {X(cx):.1f} {Y(cy):.1f})"'
        self.over.append(f'<text x="{X(cx):.1f}" y="{Y(cy) + 4:.1f}" font-size="10" font-weight="700" fill="#14532d" text-anchor="middle"{rot}>{bins} bins</text>')

    def thing(self, x0, y0, x1, y1, text, fill="#ffffff", stroke="#64748b", size=10, rx=3):
        self.over.append(f'<rect x="{X(x0):.1f}" y="{Y(y0):.1f}" width="{(x1 - x0) * S:.1f}" height="{(y1 - y0) * S:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>')
        if text:
            self.over.append(f'<text x="{X((x0 + x1) / 2):.1f}" y="{Y((y0 + y1) / 2) + 4:.1f}" font-size="{size}" fill="#1e293b" text-anchor="middle">{html.escape(text)}</text>')

    def seat(self, x, y, w, h):
        self.over.append(f'<rect x="{X(x):.1f}" y="{Y(y):.1f}" width="{w * S:.1f}" height="{h * S:.1f}" rx="3" fill="#ddd6fe" stroke="#7c3aed"/>')

    def game_table(self, cx, y0, tv=42, length_in=80, width_in=62, cut=1.5):
        """Nick's table, 80 by 62 inches as he measured it on November 6, each corner cut at 45 degrees with
        a face `cut` feet long, a 16:9 TV of `tv` inches set flat in its middle. One seat at each end and two
        along each long side."""
        tv_long = (tv * 16 / math.hypot(16, 9) + 0.7) / 12
        tv_short = (tv * 9 / math.hypot(16, 9) + 0.7) / 12
        w, length = width_in / 12, length_in / 12
        c = cut / math.sqrt(2)
        x0, x1, y1 = cx - w / 2, cx + w / 2, y0 + length
        pts = [(x0 + c, y0), (x1 - c, y0), (x1, y0 + c), (x1, y1 - c), (x1 - c, y1), (x0 + c, y1), (x0, y1 - c), (x0, y0 + c)]
        d = " ".join(f"{X(x):.1f},{Y(y):.1f}" for x, y in pts)
        self.over.append(f'<polygon points="{d}" fill="#c4b5fd" stroke="#5b21b6" stroke-width="1.5"/>')
        ym = y0 + length / 2
        self.thing(cx - tv_short / 2, ym - tv_long / 2, cx + tv_short / 2, ym + tv_long / 2, "", "#1e1b4b", "#1e1b4b", 8, 2)
        self.over.append(f'<text x="{X(cx):.1f}" y="{Y(ym) + 4:.1f}" font-size="10" font-weight="700" fill="#e0e7ff" text-anchor="middle">TV</text>')
        for yy in (y0 - 1.0, y1 + 0.2):
            self.seat(cx - 0.65, yy, 1.3, 0.8)
        straight = length - 2 * c
        for k in (0.25, 0.75):
            yy = y0 + c + straight * k
            for xx in (x0 - 1.0, x1 + 0.2):
                self.seat(xx, yy - 0.65, 0.8, 1.3)

    def speakers(self, pts):
        """Speakers mounted on the ceiling, drawn dashed because they hang overhead."""
        for x, y in pts:
            self.over.append(f'<circle cx="{X(x):.1f}" cy="{Y(y):.1f}" r="7" fill="#f5f3ff" stroke="#4c1d95" stroke-width="1.5" stroke-dasharray="2,2"/>')
            self.over.append(f'<circle cx="{X(x):.1f}" cy="{Y(y):.1f}" r="2.5" fill="#4c1d95"/>')

    def cubes(self, x0, y0, cols, depth=1.0, cube=1.15):
        """A cube shelf seen from above, cols cubes wide. Returns its far edge."""
        x1 = x0 + cols * cube
        self.thing(x0, y0, x1, y0 + depth, "", "#ede9fe", "#5b21b6", 8, 1)
        for k in range(1, cols):
            xx = x0 + k * cube
            self.over.append(f'<line x1="{X(xx):.1f}" y1="{Y(y0):.1f}" x2="{X(xx):.1f}" y2="{Y(y0 + depth):.1f}" stroke="#5b21b6" stroke-width="0.8"/>')
        return x1

    def gear(self, cx, cy, radius, text, teeth=12):
        """A round table cut like a gear, radius feet to the tips of its teeth."""
        pts = []
        for k in range(teeth * 4):
            a = 2 * math.pi * k / (teeth * 4)
            r = radius if k % 4 in (1, 2) else radius * 0.86
            pts.append(f"{X(cx + r * math.cos(a)):.1f},{Y(cy + r * math.sin(a)):.1f}")
        self.over.append(f'<polygon points="{" ".join(pts)}" fill="#fbcfe8" stroke="#be185d" stroke-width="1.4"/>')
        self.over.append(f'<circle cx="{X(cx):.1f}" cy="{Y(cy):.1f}" r="{radius * 0.3 * S:.1f}" fill="none" stroke="#be185d" stroke-width="1"/>')
        self.note(cx, cy + radius + 0.55, text, 8, "#9d174d")

    def vnote(self, x, y, text, size=9, color="#475569"):
        self.over.append(f'<text x="{X(x):.1f}" y="{Y(y):.1f}" font-size="{size}" fill="{color}" text-anchor="middle" transform="rotate(-90 {X(x):.1f} {Y(y):.1f})" dy="3">{html.escape(text)}</text>')

    def lane(self, x0, y0, x1, y1, label_side=1):
        length = math.hypot(x1 - x0, y1 - y0)
        self.lanes.append(round(length, 1))
        self.over.append(f'<line x1="{X(x0):.1f}" y1="{Y(y0):.1f}" x2="{X(x1):.1f}" y2="{Y(y1):.1f}" stroke="#e11d48" stroke-width="2" stroke-dasharray="7,5"/>')
        self.over.append(f'<line x1="{X(x0) - 9:.1f}" y1="{Y(y0):.1f}" x2="{X(x0) + 9:.1f}" y2="{Y(y0):.1f}" stroke="#e11d48" stroke-width="3"/>'
                         if abs(x1 - x0) < abs(y1 - y0) else
                         f'<line x1="{X(x0):.1f}" y1="{Y(y0) - 9:.1f}" x2="{X(x0):.1f}" y2="{Y(y0) + 9:.1f}" stroke="#e11d48" stroke-width="3"/>')
        self.over.append(f'<circle cx="{X(x1):.1f}" cy="{Y(y1):.1f}" r="{1.0 * S:.1f}" fill="#ffe4e6" stroke="#e11d48" stroke-width="2"/>')
        self.over.append(f'<circle cx="{X(x1):.1f}" cy="{Y(y1):.1f}" r="3" fill="#e11d48"/>')
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        if abs(x1 - x0) < abs(y1 - y0):
            self.over.append(f'<text x="{X(mx) + 8 * label_side:.1f}" y="{Y(my):.1f}" font-size="11" font-weight="700" fill="#be123c" text-anchor="middle" transform="rotate(-90 {X(mx) + 8 * label_side:.1f} {Y(my):.1f})">disc golf putting lane, {length:.0f} ft</text>')
        else:
            self.over.append(f'<text x="{X(mx):.1f}" y="{Y(my) - 7:.1f}" font-size="11" font-weight="700" fill="#be123c" text-anchor="middle">disc golf putting lane, {length:.0f} ft</text>')

    def note(self, x, y, text, size=10, color="#475569", anchor="middle"):
        self.over.append(f'<text x="{X(x):.1f}" y="{Y(y):.1f}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{html.escape(text)}</text>')

    def svg(self):
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PW} {PH}" width="{PW}" height="{PH}" font-family="Segoe UI, Arial, sans-serif" role="img" aria-label="{html.escape(self.title)}">',
               f'<rect width="{PW}" height="{PH}" fill="#ffffff"/>']
        out.append(f'<rect x="{X(0):.1f}" y="{Y(0):.1f}" width="{W * S:.1f}" height="{H * S:.1f}" fill="#f8fafc"/>')
        out.append(f'<rect x="{X(BUMP[0]):.1f}" y="{Y(H):.1f}" width="{(BUMP[1] - BUMP[0]) * S:.1f}" height="{BUMP[2] * S:.1f}" fill="#f8fafc"/>')
        out += self.under
        # the 1-foot grid, the 5-foot lines darker
        g = []
        for i in range(1, int(W)):
            g.append(f'<line x1="{X(i):.1f}" y1="{Y(0):.1f}" x2="{X(i):.1f}" y2="{Y(H):.1f}" stroke="{"#94a3b8" if i % 5 == 0 else "#cbd5e1"}" stroke-width="{0.9 if i % 5 == 0 else 0.5}" opacity="0.6"/>')
        for j in range(1, int(H)):
            g.append(f'<line x1="{X(0):.1f}" y1="{Y(j):.1f}" x2="{X(W):.1f}" y2="{Y(j):.1f}" stroke="{"#94a3b8" if j % 5 == 0 else "#cbd5e1"}" stroke-width="{0.9 if j % 5 == 0 else 0.5}" opacity="0.6"/>')
        out += g
        # the stair, the same in every layout
        sx0, sy0, sx1, sy1 = RUN1
        out.append(f'<rect x="{X(LANDING[0]):.1f}" y="{Y(LANDING[1]):.1f}" width="{(LANDING[2] - LANDING[0]) * S:.1f}" height="{(LANDING[3] - LANDING[1]) * S:.1f}" fill="#a5b4fc" stroke="#3730a3" stroke-width="1.5"/>')
        for x0, y0, x1, y1, n, vert in ((*RUN1, 5, False), (*RUN2, 8, True)):
            out.append(f'<rect x="{X(x0):.1f}" y="{Y(y0):.1f}" width="{(x1 - x0) * S:.1f}" height="{(y1 - y0) * S:.1f}" fill="#c7d2fe" stroke="#3730a3" stroke-width="1.5"/>')
            for k in range(1, n):
                if vert:
                    yy = y0 + k * (y1 - y0) / n
                    out.append(f'<line x1="{X(x0):.1f}" y1="{Y(yy):.1f}" x2="{X(x1):.1f}" y2="{Y(yy):.1f}" stroke="#3730a3" stroke-width="0.8"/>')
                else:
                    xx = x0 + k * (x1 - x0) / n
                    out.append(f'<line x1="{X(xx):.1f}" y1="{Y(y0):.1f}" x2="{X(xx):.1f}" y2="{Y(y1):.1f}" stroke="#3730a3" stroke-width="0.8"/>')
        out.append(f'<text x="{X(13.8):.1f}" y="{Y(17.7):.1f}" font-size="9" fill="#312e81" text-anchor="middle">landing</text>')
        out.append(f'<text x="{X(13.8):.1f}" y="{Y(22.6):.1f}" font-size="10" fill="#312e81" text-anchor="middle" transform="rotate(90 {X(13.8):.1f} {Y(22.6):.1f})">stairs down</text>')
        out += self.over
        # the poured walls, the slider and the window
        bx0, bx1, bd = BUMP
        out.append(f'<path d="M {X(0)} {Y(0)} H {X(W)} V {Y(H)} H {X(bx1)} V {Y(H + bd)} H {X(bx0)} V {Y(H)} H {X(0)} Z '
                   f'M {X(X0)} {Y(Y0)} V {Y(Y1)} H {X(bx0 + 0.75)} V {Y(Y1 + bd)} H {X(bx1 - 0.75)} V {Y(Y1)} H {X(X1)} V {Y(Y0)} Z" fill="#1e293b" fill-rule="evenodd"/>')
        for (a, b), label in ((SLIDER, "walkout slider"), (WINDOW, "window")):
            out.append(f'<rect x="{X(a):.1f}" y="{Y(0):.1f}" width="{(b - a) * S:.1f}" height="{0.75 * S:.1f}" fill="#e0f2fe"/>')
            out.append(f'<line x1="{X(a):.1f}" y1="{Y(0.38):.1f}" x2="{X(b):.1f}" y2="{Y(0.38):.1f}" stroke="#0284c7" stroke-width="3"/>')
            out.append(f'<text x="{X((a + b) / 2):.1f}" y="{Y(0) - 7:.1f}" font-size="11" font-weight="700" fill="#0369a1" text-anchor="middle">{label}</text>')
        out.append(f'<circle cx="{X(ROUGH[0]):.1f}" cy="{Y(ROUGH[1]):.1f}" r="5" fill="#0f766e" stroke="#ffffff" stroke-width="1.5"/>')
        out += self.labels
        out.append(f'<text x="{X(0):.1f}" y="{Y(0) - 8:.1f}" font-size="11" fill="#475569">rear, under the deck</text>')
        out.append(f'<text x="{X(W):.1f}" y="{Y(H + BUMP[2]) + 18:.1f}" font-size="11" fill="#475569" text-anchor="end">front, the street side · 1 square = 1 foot · "about" marks a spot taped later</text>')
        out.append(f'<text x="{X(0):.1f}" y="{Y(H + BUMP[2]) + 18:.1f}" font-size="11" fill="#475569">garage side</text>')
        out.append("</svg>")
        return "\n".join(out)

    def summary(self):
        return {"key": self.key, "title": self.title, "rooms": self.rooms, "bins": sum(self.shelves), "lanes": self.lanes}


def sump_closet(p):
    """The sump pit boxed into a closet in the foundation corner: the pit lidded and sealed, the pump's line out
    through the wall, the door in the closet's south side hinged at the garage wall so it swings clear of
    whatever stands east of it."""
    p.under.append(f'<rect x="{X(X0):.1f}" y="{Y(Y0):.1f}" width="{(3.3 - X0) * S:.1f}" height="{(3.75 - Y0) * S:.1f}" fill="#e2e8f0"/>')
    p.wall(X0, 3.75, 3.65, 4.1)
    p.wall(3.3, Y0, 3.65, 4.1)
    p.door(1.0, 4.0, 2.3, 90, -90)
    p.over.append(f'<circle cx="{X(SUMP[0]):.1f}" cy="{Y(SUMP[1]):.1f}" r="{0.95 * S:.1f}" fill="#bae6fd" stroke="#0369a1" stroke-width="1.5"/>')
    p.over.append(f'<circle cx="{X(SUMP[0]):.1f}" cy="{Y(SUMP[1]):.1f}" r="{0.55 * S:.1f}" fill="none" stroke="#0369a1" stroke-width="1" stroke-dasharray="2,2"/>')
    p.note(2.0, 2.15, "sump", 8, "#0c4a6e")
    p.note(2.0, 3.3, "closet", 7, "#334155")


def minis_closet(p, x0, x1, y0, facing):
    """A 2-foot reach-in closet for the minis against a wall, its front across the room side with two pairs of
    sliding doors. facing is 'south' when the closet stands on the rear wall and 'south' again on the office
    wall; the front is always the side away from the wall."""
    depth = 2.0
    if facing == "south":
        p.under.append(f'<rect x="{X(x0):.1f}" y="{Y(y0):.1f}" width="{(x1 - x0) * S:.1f}" height="{depth * S:.1f}" fill="#ddd6fe"/>')
        front = y0 + depth
        p.wall(x0 - 0.35, y0, x0, front + 0.35)
        p.wall(x1, y0, x1 + 0.35, front + 0.35)
        mid = (x0 + x1) / 2
        for a, b in ((x0, mid), (mid, x1)):
            m = (a + b) / 2
            p.over.append(f'<line x1="{X(a):.1f}" y1="{Y(front + 0.09):.1f}" x2="{X(m + 0.2):.1f}" y2="{Y(front + 0.09):.1f}" stroke="#334155" stroke-width="2"/>')
            p.over.append(f'<line x1="{X(m - 0.2):.1f}" y1="{Y(front + 0.26):.1f}" x2="{X(b):.1f}" y2="{Y(front + 0.26):.1f}" stroke="#334155" stroke-width="2"/>')
        p.note(mid, y0 + 1.25, "closet: minis, sliding doors", 8, "#4c1d95")


def corner_studio(p):
    """Layout B: the D&D studio in the rear corner on the garage side, beside the utilities. The sump closet in
    the foundation corner, the minis closet next to it on the rear wall, the bar on the door wall, the door into
    the lounge where the end table stood, the table in the middle, the game PC desk on the garage wall, the 78-inch
    shelves along the finished room's wall with the drawer unit at its east end. Nothing overlaps, and every long
    side keeps 2 feet of floor in front, since that is where it is reached. The desk and the rack on the garage
    wall in the room's south half, the cube shelves of books on the south wall. Speakers on the ceiling."""
    p.room("D&D studio", "studio", [(X0, Y0, 11.4, 9.1), (X0, 9.1, 9.0, 16.6)], (7.4, 4.15))
    p.wall(11.4, Y0, 12.0, 5.6, True)
    p.wall(11.4, 8.6, 12.0, 9.1, True)
    p.wall(9.0, 9.1, 9.4, 16.6, True)
    p.wall(9.0, 9.1, 15.0, 9.5, True)
    p.door(11.7, 8.6, 3.0, 0, -90)
    sump_closet(p)
    minis_closet(p, 4.0, 11.05, Y0, "south")
    p.game_table(5.1, 5.4)
    p.thing(X0 + 0.02, 12.0, X0 + 1.35, 14.58, "", "#c4b5fd", "#5b21b6", 8)
    p.vnote(1.42, 13.3, "PC desk", 7, "#1e1b4b")
    p.thing(X0 + 0.02, 15.35, X0 + 6.52, 16.6, "shelves, 78 by 15", "#ede9fe", "#5b21b6", 7)
    p.thing(7.33, 15.27, 9.0, 16.6, "", "#ede9fe", "#5b21b6", 7)
    p.note(8.17, 16.1, "drawers", 6, "#1e1b4b")
    p.speakers([(1.3, 8.6), (10.9, 7.2), (1.3, 10.6), (8.7, 12.4)])
    p.note(4.6, 3.75, "speakers on the ceiling", 7, "#4c1d95")


def corner_bins(p):
    """Layout A: the rear corner on the garage side holds the bins instead, since the play room cannot sit next
    to the furnace. Shelves on three walls around the sump closet and the door."""
    p.room("Bin room", "storage", [(X0, Y0, 11.4, 9.1), (X0, 9.1, 9.0, 16.6)], (6.1, 9.3), compact=True)
    p.wall(11.4, Y0, 12.0, 5.6)
    p.wall(11.4, 8.6, 12.0, 9.1)
    p.wall(9.0, 9.1, 9.4, 13.6)
    p.wall(9.0, 9.1, 15.0, 9.5)
    p.door(11.7, 8.6, 3.0, 0, -90)
    sump_closet(p)
    p.shelf(3.65, Y0, 9.4, Y0 + 2.0)
    p.shelf(X0, 6.5, X0 + 2.0, 16.6)
    p.shelf(2.75, 14.6, 6.4, 16.6)
    p.note(7.9, 14.9, "utility door", 6, "#334155")
    p.shelf(9.4, Y0, 11.4, 5.3)
    p.note(5.9, 12.0, "the furnace is through this wall,", 7, "#166534")
    p.note(5.9, 12.7, "which is why the bins are here", 7, "#166534")


def finished_room(p, use, utility_door=False):
    """The room the sellers finished at the foot of the stair, drawn from Kane's marks of November 5 at 20:05
    and the walk-through video: 11 feet wide along the front wall and 15 deep, its doorway facing the stair's
    foot, a reach-in closet immediately inside on the right along the stair's framed side, the wall stepping in
    further where the closet ends, and the room's north end 8 feet wide beyond that step. The counter and the
    desk stand along the front wall, the panel on the garage wall, the bed along the garage wall with its head
    at the north wall, where a framed opening sits centered behind the bed, to be filled in."""
    rects = [(X0, 17.0, 9.0, 20.0), (X0, 20.0, 12.0, Y1)]
    if use == "bins":
        p.room("Bin room, the finished room", "storage", rects, (6.6, 28.3), compact=True)
    else:
        p.room("Play room, the finished room", "lounge", rects, (6.6, 28.3), compact=True)
    p.wall(X0, 16.6, 9.4, 17.0)
    if utility_door:
        p.wall(9.0, 16.6, 9.4, 17.3)
        p.wall(9.0, 19.9, 9.4, 20.4)
        p.note(9.5, 18.0, "utility door", 6, "#334155", "start")
    else:
        p.wall(9.0, 16.6, 9.4, 20.4)
    p.wall(9.0, 20.0, 12.3, 20.4)
    p.wall(12.0, 20.0, 12.3, 26.4)
    p.wall(12.0, 28.9, 12.4, Y1)
    p.door(12.2, 28.9, 2.5, 180, 90)
    p.note(12.6, 27.3, "door to add", 7, "#475569", "start")
    # the reach-in closet along the stair's side, its sliding doors gone, the rod to refit
    p.under.append(f'<rect x="{X(10.5):.1f}" y="{Y(20.4):.1f}" width="{(12.0 - 10.5) * S:.1f}" height="{(26.0 - 20.4) * S:.1f}" fill="#e2e8f0"/>')
    p.wall(10.3, 26.0, 12.0, 26.4)
    for a, b, off in ((20.6, 23.3, 0.0), (23.1, 25.8, 0.17)):
        p.over.append(f'<line x1="{X(10.42 + off):.1f}" y1="{Y(a):.1f}" x2="{X(10.42 + off):.1f}" y2="{Y(b):.1f}" stroke="#334155" stroke-width="2"/>')
    p.vnote(11.25, 23.2, "closet, doors gone", 7, "#334155")
    p.note(8.9, 20.95, "steps in", 6, "#475569", "end")
    # the panel on the garage wall, its working space kept clear
    p.thing(X0, 25.0, X0 + 0.4, 26.5, "", "#fde68a", "#b45309", 7, 1)
    p.over.append(f'<rect x="{X(X0):.1f}" y="{Y(24.5):.1f}" width="{3.0 * S:.1f}" height="{3.0 * S:.1f}" fill="none" stroke="#b45309" stroke-width="1" stroke-dasharray="3,2"/>')
    p.note(2.6, 25.7, "panel, about", 7, "#92400e")
    p.note(2.6, 26.5, "kept clear", 7, "#92400e")
    # the framed opening on the north wall, above where the bed's head stands, to be filled in
    p.over.append(f'<rect x="{X(3.9):.1f}" y="{Y(17.0):.1f}" width="{2.0 * S:.1f}" height="{0.3 * S:.1f}" fill="none" stroke="#475569" stroke-width="1" stroke-dasharray="2,2"/>')
    p.note(5.6, 20.9, "framed opening, centered, to be filled", 6, "#475569")
    if use == "bins":
        p.shelf(X0, 18.8, X0 + 2.0, 24.4)
        p.shelf(3.0, 17.3, 6.0, 19.3)
        if utility_door:
            p.over.append(f'<rect x="{X(6.0):.1f}" y="{Y(17.3):.1f}" width="{3.0 * S:.1f}" height="{2.7 * S:.1f}" fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="3,2"/>')
            p.note(7.5, 18.5, "kept clear:", 6, "#334155")
            p.note(7.5, 19.1, "utility door", 6, "#334155")
        p.shelf(3.0, 30.25, 11.6, Y1)
        p.shelf(X0, 27.6, X0 + 2.0, 30.25)
        p.note(6.6, 30.0, "counter out, shelves in", 7, "#166534")
    else:
        p.thing(1.6, 20.3, 7.4, 24.4, "play rug", "#fdf2f8", "#db2777", 10, 10)
        p.thing(3.0, 30.3, 9.6, Y1 - 0.05, "the counter stays: toy storage", "#ffffff", "#be185d", 7)
        p.thing(X0 + 0.02, 28.0, 2.6, 30.0, "toy shelf", "#ffffff", "#be185d", 7)
        p.note(6.6, 26.2, "a gate at the door; the closet takes toys", 7, "#9d174d")
        p.note(6.6, 26.9, "or a guest room as it stands, bed and all", 7, "#9d174d")


def utility(p, door="corner"):
    """The furnace and the water heater where Kane's marks put them, about 12 to 15 feet off the garage wall
    and north of the landing, their controls facing the garage side with 30 inches kept clear there, the floor
    drain in the slab south-west of the furnace. The room runs under the landing's north edge and south into
    the pocket beside the stair, and its door is on its west side, where the furnace's controls face: from the
    corner room in layout 1, from the finished room into the pocket in layout 2."""
    p.room("Utility", "utility", [(9.4, 9.5, 15.0, 15.9), (9.4, 15.9, 12.3, 20.0)], (10.9, 11.1), compact=True)
    p.wall(14.6, 9.1, 15.0, 16.3)
    p.wall(12.3, 15.9, 15.0, 16.3)
    if door == "corner":
        p.door(9.2, 16.2, 2.6, 180, 90)
    else:
        p.door(9.2, 19.9, 2.6, 0, -90)
    p.thing(12.4, 12.2, 14.8, 15.5, "furnace", "#ffffff", "#334155", 8)
    p.over.append(f'<rect x="{X(9.9):.1f}" y="{Y(12.2):.1f}" width="{2.5 * S:.1f}" height="{3.3 * S:.1f}" fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="3,2"/>')
    p.note(11.15, 14.1, "30 in clear", 7, "#334155")
    p.over.append(f'<circle cx="{X(13.7):.1f}" cy="{Y(10.6):.1f}" r="{1.0 * S:.1f}" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>')
    p.note(13.7, 10.85, "heater", 7, "#334155")
    p.over.append(f'<circle cx="{X(DRAIN[0]):.1f}" cy="{Y(DRAIN[1]):.1f}" r="4" fill="none" stroke="#334155" stroke-width="1.2"/>')
    p.note(DRAIN[0], DRAIN[1] + 0.9, "floor drain", 7, "#334155")
    p.note(10.8, 18.6, "pocket by", 7, "#334155")
    p.note(10.8, 19.3, "the stair", 7, "#334155")


def lounge(p):
    """The slider opens into the lounge; the couch backs onto the office wall and faces the room, so the corner
    room's door swings into open floor and the putter stands at the office door behind the couch's end."""
    p.room("Lounge", "lounge", [(12.0, Y0, 23.4, 9.1), (15.0, 9.1, 20.4, 15.9)], (17.7, 12.0))
    p.thing(21.0, 1.6, 23.35, 7.6, "", "#fbcfe8", "#be185d", 9, 6)
    p.vnote(22.18, 4.6, "couch, facing the room", 8, "#9d174d")
    p.gear(16.6, 5.5, 1.5, "gear table")
    p.note(21.3, 8.9, "tee, at the office door", 7, "#be123c", "end")
    p.note(17.5, 17.8, "tools under the upper run", 7, "#312e81")


def hall(p):
    """The stair's foot, the lane down the far side between the bath and the first post, and the porch
    bump-out at the front holding the basket, with the net on the concrete behind it; the tee stands just outside
    the office door, 25 feet from the basket, so a miss lands on bare concrete and the couch backs onto the
    office wall."""
    p.room("Hall", "hall", [(20.4, 9.1, 23.4, 19.1), (20.4, 19.1, 23.4, 28.9), (12.4, 26.0, 15.3, 28.9), (12.4, 28.9, 23.4, Y1), (BUMP[0] + 0.75, Y1, BUMP[1] - 0.75, Y1 + BUMP[2])], (17.3, 30.9))
    p.lane(21.9, 8.6, 21.9, Y1 + BUMP[2] - 0.9, 1)
    p.over.append(f'<line x1="{X(19.0):.1f}" y1="{Y(Y1 + BUMP[2] - 0.08):.1f}" x2="{X(BUMP[1] - 0.8):.1f}" y2="{Y(Y1 + BUMP[2] - 0.08):.1f}" stroke="#be123c" stroke-width="3" stroke-dasharray="2,3"/>')
    p.note(18.6, Y1 + BUMP[2] - 0.3, "net", 8, "#be123c", "end")
    p.note(13.0, 33.1, "porch bump-out: concrete", 7, "#475569", "start")
    p.note(13.0, 33.8, "all round the basket", 7, "#475569", "start")


def office(p, sound=False, studio_door=False):
    """The office in the rear corner on the far side: the window behind the desk, two low windows on the far
    wall, the door off the lane north of the first post, which lands in the office's wall. With the studio
    next door, a second door at the far end of the shared wall opens into the office."""
    p.room("Office", "office", [(23.9, Y0, X1, 16.0)], (29.0, 8.4))
    p.wall(23.4, Y0, 23.9, 9.5)
    p.wall(23.4, 12.5, 23.9, 16.4)
    if studio_door:
        p.wall(23.4, 16.0, 32.6, 16.4, sound)
        p.wall(35.0, 16.0, X1, 16.4, sound)
        p.door(35.0, 16.2, 2.4, 270, -90)
        p.note(33.8, 12.9, "door to the studio", 7, "#1e3a8a")
    else:
        p.wall(23.4, 16.0, X1, 16.4, sound)
    p.door(23.65, 12.5, 3.0, 0, -90)
    corner_desk(p)
    p.thing(24.5, 13.4, 30.7, 15.8, "disc golf bags and racks", "#ffe4e6", "#e11d48", 9)
    for a, b in ((3.5, 5.0), (7.3, 8.8)):
        p.over.append(f'<rect x="{X(X1):.1f}" y="{Y(a):.1f}" width="{0.75 * S:.1f}" height="{(b - a) * S:.1f}" fill="#e0f2fe"/>')
        p.over.append(f'<line x1="{X(X1 + 0.38):.1f}" y1="{Y(a):.1f}" x2="{X(X1 + 0.38):.1f}" y2="{Y(b):.1f}" stroke="#0284c7" stroke-width="3"/>')
    p.note(30.0, 11.2, "two low windows on the far wall, about", 7, "#0369a1")


def corner_desk(p):
    """Nick's desk, 63 by 32 inches as he measured it on November 6: the computer tower in the corner where the
    rear and far walls meet, the desk running along the far wall from it, so he faces the wall with the window
    behind him to his left."""
    p.thing(33.6, 0.9, 35.2, 2.7, "PC", "#93c5fd", "#1d4ed8", 9)
    p.thing(32.58, 2.9, 35.23, 8.15, "", "#bfdbfe", "#1d4ed8", 10)
    p.vnote(33.9, 5.5, "desk, 63 by 32", 9, "#1e3a8a")
    p.over.append(f'<circle cx="{X(31.6):.1f}" cy="{Y(5.5):.1f}" r="{0.9 * S:.1f}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.2"/>')
    p.note(31.6, 5.8, "chair", 8, "#1e3a8a")


def front_window(p):
    p.over.append(f'<rect x="{X(27.5):.1f}" y="{Y(Y1):.1f}" width="{2.0 * S:.1f}" height="{0.75 * S:.1f}" fill="#e0f2fe"/>')
    p.over.append(f'<line x1="{X(27.5):.1f}" y1="{Y(Y1 + 0.38):.1f}" x2="{X(29.5):.1f}" y2="{Y(Y1 + 0.38):.1f}" stroke="#0284c7" stroke-width="3"/>')
    p.note(28.5, Y1 + 1.5, "small high window, about", 7, "#0369a1")


def front_panel(p):
    """The front far room's electrical panel, on the far wall across from the finished room's panel, where the
    walk-through photo P08 and Nick put it (November 6), with 30 by 36 inches kept clear before it."""
    p.thing(X1 - 0.4, 19.5, X1, 21.0, "", "#fde68a", "#b45309", 7, 1)
    p.over.append(f'<rect x="{X(X1 - 3.0):.1f}" y="{Y(19.0):.1f}" width="{3.0 * S:.1f}" height="{3.0 * S:.1f}" fill="none" stroke="#b45309" stroke-width="1" stroke-dasharray="3,2"/>')
    p.note(X1 - 1.5, 20.0, "panel", 8, "#92400e")
    p.note(X1 - 1.5, 21.0, "30 by 36 in", 7, "#92400e")
    p.note(X1 - 1.5, 21.8, "kept clear", 7, "#92400e")


def front_play(p):
    """Layout B: the kids' play area in the front corner on the far side, as planned: the play rug in the
    middle, the panel on the far wall with its working space kept clear and the toy shelves on that wall
    south of it, a half wall on the hall side so the kids stay in view, a 3-foot gate at the street end that
    folds back flat against the front wall, and the second post boxed just inside."""
    p.room("Play area", "lounge", [(23.9, 16.4, X1, Y1)], (29.3, 18.0))
    p.thing(25.0, 19.8, 32.1, 27.8, "play rug", "#fdf2f8", "#db2777", 10, 10)
    p.thing(33.6, 22.6, 35.2, 31.0, "", "#ffffff", "#be185d", 8)
    p.vnote(34.4, 26.8, "toy shelves", 9, "#9d174d")
    front_panel(p)
    p.over.append(f'<rect x="{X(23.4):.1f}" y="{Y(16.4):.1f}" width="{0.5 * S:.1f}" height="{(29.1 - 16.4) * S:.1f}" fill="#e2e8f0" stroke="#475569" stroke-width="1.2"/>')
    p.door(23.65, 32.1, 3.0, 0, -90)
    p.vnote(24.4, 23.5, "half wall, 42 in", 8, "#475569")
    p.note(24.3, 30.9, "gate", 8, "#475569", "start")
    p.note(25.4, 19.2, "post: box it", 7, "#334155", "start")
    front_window(p)


def front_studio(p):
    """Layout A: the D&D studio in the front corner on the far side, beside the office, the lane at its door and
    a second door through to the office at the far end of the shared wall.
    The minis closet on the office wall, the second post boxed in the corner by the door, the panel on the far
    wall with its working space clear, the table in the middle west of that space, the game PC desk, 31 by 16
    inches, under the small high window on the front wall. Speakers on the ceiling."""
    p.room("D&D studio", "studio", [(23.9, 16.4, X1, Y1)], (27.0, 19.6))
    p.wall(23.4, 16.4, 23.9, 20.0, True)
    p.wall(23.4, 23.0, 23.9, Y1, True)
    p.door(23.65, 23.0, 3.0, 0, -90)
    p.note(24.0, 19.1, "post: box it", 7, "#334155", "start")
    minis_closet(p, 25.3, 32.4, 16.4, "south")
    p.game_table(28.9, 21.5)
    p.thing(23.9, 24.6, 25.15, 31.1, "", "#ede9fe", "#5b21b6", 7)
    p.vnote(24.52, 27.85, "shelves, 78 by 15", 7, "#1e1b4b")
    p.thing(27.2, Y1 - 1.38, 29.78, Y1 - 0.05, "", "#c4b5fd", "#5b21b6", 8)
    p.note(28.5, Y1 - 1.6, "PC desk, 31 by 16", 7, "#1e1b4b")
    p.thing(25.4, Y1 - 1.38, 27.07, Y1 - 0.05, "drawers", "#ede9fe", "#5b21b6", 6)
    front_panel(p)
    p.speakers([(24.6, 22.0), (34.5, 20.3), (24.6, 29.6), (34.6, 31.6)])
    p.note(33.4, 23.0, "speakers on the ceiling", 7, "#4c1d95")
    front_window(p)


def bath(p, bottom=28.5):
    """The bath on the rough-in, 4.3 by 9 feet inside: a 60-inch tub and shower along the stair-side wall, the
    toilet on the rough-in, the sink across from it, the door in the south wall opening in. The fit is
    unproven: the rough-in sits right beside the stair stringers, and the toilet needs 15 inches from its
    center to that wall, so the room may shift east or turn once the tape has the real spot."""
    p.room("Bath", "bath", [(15.7, 19.5, 20.0, bottom)], (18.9, 20.6), compact=True)
    p.wall(15.3, 19.1, 20.4, 19.5)
    p.wall(15.3, 19.1, 15.7, bottom + 0.4)
    p.wall(20.0, 19.1, 20.4, bottom + 0.4)
    p.wall(15.3, bottom, 17.4, bottom + 0.4)
    p.wall(19.9, bottom, 20.4, bottom + 0.4)
    p.door(19.9, bottom + 0.2, 2.5, 180, 90)
    p.thing(15.75, 19.55, 18.25, 24.55, "", "#99f6e4", "#0f766e", 8)
    p.vnote(17.0, 22.05, "tub and shower", 8, "#134e4a")
    p.thing(15.75, 24.75, 16.2, 26.05, "", "#ffffff", "#0f766e", 7, 1)
    p.over.append(f'<ellipse cx="{X(16.75):.1f}" cy="{Y(25.4):.1f}" rx="{0.6 * S:.1f}" ry="{0.45 * S:.1f}" fill="#ffffff" stroke="#0f766e" stroke-width="1.2"/>')
    p.thing(18.6, 22.9, 19.95, 25.1, "sink", "#ffffff", "#0f766e", 8)
    p.note(18.0, 27.4, "fit unproven", 7, "#0f766e")


def structure(p):
    """Two steel beams running left to right, one each side of the stair, dashed where they run overhead,
    each through one of the two posts Kane marked on November 5 at 20:05 and corrected on November 6 at 13:28:
    the north beam about 14 feet from the rear wall, the south one about 18.5, boxed where it crosses the
    finished room. Where the south beam clears the stair gets taped."""
    for y in BEAMS:
        p.over.append(f'<line x1="{X(X0):.1f}" y1="{Y(y):.1f}" x2="{X(X1):.1f}" y2="{Y(y):.1f}" stroke="#334155" stroke-width="1.6" stroke-dasharray="9,5" opacity="0.75"/>')
    p.note(6.6, 14.1, "steel beam, left to right, about", 7, "#334155")
    p.note(21.9, 19.6, "beam, about", 6, "#334155")
    for x, y in POSTS:
        p.over.append(f'<rect x="{X(x) - 4:.1f}" y="{Y(y) - 4:.1f}" width="8" height="8" fill="#334155" stroke="#ffffff" stroke-width="1"/>')
    p.note(22.6, 14.7, "post", 7, "#334155", "end")


def shared(p, studio_in_front):
    utility(p, door="corner" if studio_in_front else "finished")
    lounge(p)
    hall(p)
    office(p, sound=studio_in_front, studio_door=studio_in_front)
    bath(p)
    structure(p)


def layout_utility():
    """Layout B: the studio in the rear corner by the utilities, the play area in the front corner by the
    office, the finished room holding the bins."""
    p = Plan("utility", "The basement with the D&D studio by the utilities: studio, office, play area, bins in the finished room, the lane")
    corner_studio(p)
    finished_room(p, "bins", utility_door=True)
    front_play(p)
    shared(p, False)
    return p


def layout_office():
    """Layout A: the studio in the front corner beside the office, the bins in the rear corner by the
    utilities, since the play room cannot sit next to the furnace, and the finished room as the play room."""
    p = Plan("office", "The basement with the D&D studio by the office: studio, office, bins by the utilities, the finished room as the play room, the lane")
    corner_bins(p)
    finished_room(p, "play")
    front_studio(p)
    shared(p, True)
    return p


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    stale = OUT / "layout.svg"
    if stale.exists():
        stale.unlink()
    for name, build in (("layout-office.svg", layout_office), ("layout-utility.svg", layout_utility)):
        p = build()
        (OUT / name).write_text(p.svg(), encoding="utf-8", newline="\n")
        print(name)
        print(json.dumps(p.summary(), indent=1))


if __name__ == "__main__":
    main()
