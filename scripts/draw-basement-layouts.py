"""Draw the basement layout for 45 Autumn Crest Ct as an SVG plan.

    python scripts/draw-basement-layouts.py     writes house-plan/basement/layout.svg
                                               and prints each room's size, the bin count and the lane

Feet throughout, measured from the basement's rear corner on the garage side: x runs toward the far
wall, y runs from the walkout wall toward the street. The basement is a 36 by 33 rectangle with
9-inch poured walls, plus a 12 by 2 foot bump-out under the front porch that the walk-through of
November 5, 2026 found real. What the layout keeps where it is: the stair (the run under the loft
stair, the landing, the run toward the front), the bath rough-in at the stair's foot, the walkout
slider and the window in the rear wall, the furnace and water heater about 9 feet off the garage
wall, the sump pit in the corner the old studio closet would have covered, the finished room at the
stair's foot, the two electrical panels and the two steel posts under the beam. Positions marked
"about" come from the walk-through notes, not a tape, and move when the basement is cleared and
measured. Shelf bays are 2 feet deep and hold 27-gallon bins (31 by 20 inches) three across every
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
BEAM_Y = 16.4                     # the steel beam, about 16 feet off the rear wall
POSTS = ((9.3, BEAM_Y), (23.8, BEAM_Y))   # staggered posts, about 3 feet off each end of the stair
SUMP = (1.9, 16.8)                # the open pit, in the corner where the old studio closet would have run
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

    def game_table(self, cx, y0, tv=42, side=2.0, end=2.25, cut=1.5):
        """Nick's table, sized from the TV set flat in its middle: a 16:9 screen of `tv` inches with about
        a third of an inch of bezel, `side` feet of table along its long edges and `end` feet past its short
        ones, each corner cut at 45 degrees with a face `cut` feet long. One seat at each end and two along
        each long side. A 42-inch TV makes the table about 5.8 by 7.6 feet."""
        tv_long = (tv * 16 / math.hypot(16, 9) + 0.7) / 12
        tv_short = (tv * 9 / math.hypot(16, 9) + 0.7) / 12
        w, length = tv_short + 2 * side, tv_long + 2 * end
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
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PW} {PH}" width="{PW}" height="{PH}" font-family="Segoe UI, Arial, sans-serif" role="img" aria-label="{self.title}">',
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


def studio(p):
    """The D&D studio in the front corner on the far side, where the play area was planned: 10.65 by 15.85
    feet inside. The closet of minis runs along the office wall beside the door into the office. The game PC
    desk and the rack stand on the far wall below the electrical panel, which keeps 30 by 36 inches clear in
    front of it. The table sits in the middle, the bar on the hall wall, the cube shelves of books under the
    small high window on the front wall. Speakers on the ceiling in the corners."""
    # the closet of minis on the office wall, 2 feet deep, one pair of sliding doors
    p.under.append(f'<rect x="{X(24.6):.1f}" y="{Y(16.8):.1f}" width="{(30.4 - 24.6) * S:.1f}" height="{(18.8 - 16.8) * S:.1f}" fill="#ddd6fe"/>')
    p.wall(24.6, 18.8, 25.3, 19.15)
    p.wall(29.7, 18.8, 30.4, 19.15)
    p.wall(30.4, 16.8, 30.75, 19.15)
    m = (25.3 + 29.7) / 2
    p.over.append(f'<line x1="{X(25.3):.1f}" y1="{Y(18.89):.1f}" x2="{X(m + 0.25):.1f}" y2="{Y(18.89):.1f}" stroke="#334155" stroke-width="2"/>')
    p.over.append(f'<line x1="{X(m - 0.25):.1f}" y1="{Y(19.06):.1f}" x2="{X(29.7):.1f}" y2="{Y(19.06):.1f}" stroke="#334155" stroke-width="2"/>')
    p.note(27.5, 18.05, "closet: minis", 9, "#4c1d95")
    # the electrical panel on the far wall, with its working space
    p.thing(34.85, 19.5, 35.25, 21.0, "", "#fde68a", "#b45309", 7, 1)
    p.over.append(f'<rect x="{X(32.25):.1f}" y="{Y(19.0):.1f}" width="{3.0 * S:.1f}" height="{3.0 * S:.1f}" fill="none" stroke="#b45309" stroke-width="1" stroke-dasharray="3,2"/>')
    p.note(33.75, 20.0, "panel", 8, "#92400e")
    p.note(33.75, 21.0, "30 by 36 in", 7, "#92400e")
    p.note(33.75, 21.8, "kept clear", 7, "#92400e")
    # the game PC desk and the rack on the far wall, under the panel
    p.thing(33.4, 23.2, 35.23, 26.7, "", "#c4b5fd", "#5b21b6", 8)
    p.vnote(34.3, 24.95, "game PC desk", 8, "#1e1b4b")
    p.thing(33.4, 26.9, 35.23, 28.9, "rack", "#ffffff", "#5b21b6", 8)
    p.over.append(f'<circle cx="{X(32.6):.1f}" cy="{Y(24.95):.1f}" r="{0.7 * S:.1f}" fill="#ddd6fe" stroke="#7c3aed" stroke-width="1.2"/>')
    # the bar on the hall wall, dry for now
    p.thing(24.62, 19.4, 26.6, 22.4, "", "#ede9fe", "#5b21b6", 8)
    p.note(25.6, 20.3, "bar", 9, "#4c1d95")
    p.thing(24.7, 20.9, 26.5, 22.3, "fridge", "#ffffff", "#5b21b6", 7)
    # cube shelves of books on the front wall, under the small high window
    x = 26.9
    for cols in (1, 3, 1):
        x = p.cubes(x, 31.1, cols) + 0.15
    p.note(28.3, 30.75, "cube shelves: books", 7, "#4c1d95")
    p.game_table(29.4, 21.0)
    p.speakers([(25.3, 17.3), (34.5, 17.3), (25.3, 31.6), (34.5, 31.6)])
    p.note(32.6, 18.5, "speakers on the ceiling", 7, "#4c1d95")


def play_area(p):
    """The kids' play area in the rear corner on the garage side, where the studio was planned: the play rug
    in the middle, toy shelves on the garage wall, the sump pit boxed into a closet in its front corner, and a
    half wall with a gate on the lounge side so the kids stay in view."""
    p.thing(2.4, 3.6, 7.6, 12.6, "play rug", "#fdf2f8", "#db2777", 10, 10)
    p.thing(X0 + 0.02, 2.0, 2.2, 12.0, "", "#ffffff", "#be185d", 8)
    p.vnote(1.5, 7.0, "toy shelves", 9, "#9d174d")
    # the sump closet: the open pit, lidded and sealed, behind a door, with the pump's outlet going out the wall
    p.under.append(f'<rect x="{X(X0):.1f}" y="{Y(15.3):.1f}" width="{(3.3 - X0) * S:.1f}" height="{(18.3 - 15.3) * S:.1f}" fill="#e2e8f0"/>')
    p.wall(X0, 14.95, 1.2, 15.3)
    p.wall(3.3, 14.95, 3.65, 18.3)
    p.door(1.2, 15.1, 2.1, 0, 90)
    p.over.append(f'<circle cx="{X(SUMP[0]):.1f}" cy="{Y(SUMP[1]):.1f}" r="{0.95 * S:.1f}" fill="#bae6fd" stroke="#0369a1" stroke-width="1.5"/>')
    p.over.append(f'<circle cx="{X(SUMP[0]):.1f}" cy="{Y(SUMP[1]):.1f}" r="{0.55 * S:.1f}" fill="none" stroke="#0369a1" stroke-width="1" stroke-dasharray="2,2"/>')
    p.note(2.0, 17.05, "sump", 8, "#0c4a6e")
    p.note(6.3, 16.95, "sump closet:", 7, "#334155")
    p.note(6.3, 17.6, "lidded pit, pump, door", 7, "#334155")
    # the half wall about 42 inches high along the lounge side, a 3-foot gate at the rear end
    p.over.append(f'<rect x="{X(9.0):.1f}" y="{Y(4.0):.1f}" width="{0.35 * S:.1f}" height="{(9.6 - 4.0) * S:.1f}" fill="#e2e8f0" stroke="#475569" stroke-width="1.2"/>')
    p.door(9.175, 4.0, 3.0, -90, 90)
    p.vnote(9.8, 7.0, "half wall, 42 in", 8, "#475569")
    p.note(9.6, 2.4, "gate", 8, "#475569", "start")


def utility(p):
    """The furnace and the water heater where the walk-through found them: about 9 feet off the garage wall,
    north of the landing, with the floor drain beside them. The furnace faces the door and keeps 30 by 30
    inches clear in front of its controls."""
    p.thing(9.6, 12.4, 11.9, 15.7, "furnace", "#ffffff", "#334155", 8)
    p.over.append(f'<rect x="{X(11.9):.1f}" y="{Y(12.4):.1f}" width="{2.5 * S:.1f}" height="{3.3 * S:.1f}" fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="3,2"/>')
    p.note(13.15, 14.3, "30 in clear", 7, "#334155")
    p.over.append(f'<circle cx="{X(12.5):.1f}" cy="{Y(11.4):.1f}" r="{0.85 * S:.1f}" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>')
    p.note(12.5, 11.65, "heater", 7, "#334155")
    p.over.append(f'<circle cx="{X(14.1):.1f}" cy="{Y(11.3):.1f}" r="4" fill="none" stroke="#334155" stroke-width="1.2"/>')
    p.note(14.1, 10.75, "drain", 7, "#334155")


def corner_desk(p):
    """Nick's desk: the computer tower in the corner where the rear and far walls meet, the desk running
    along the far wall from it, so he faces the wall with the window behind him to his left."""
    p.thing(33.6, 0.9, 35.2, 2.7, "PC", "#93c5fd", "#1d4ed8", 9)
    p.thing(32.6, 2.7, 35.2, 9.2, "desk", "#bfdbfe", "#1d4ed8", 10)
    p.over.append(f'<circle cx="{X(31.6):.1f}" cy="{Y(5.6):.1f}" r="{0.9 * S:.1f}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.2"/>')
    p.note(31.6, 5.9, "chair", 8, "#1e3a8a")


def bath(p, bottom=28.5):
    """The bath on the rough-in, 5.3 by 9 feet inside: a 60-inch tub and shower across the north end, the
    toilet backed onto the stair-side wall at the rough-in, the sink on the hall wall. The fit is unproven:
    the rough-in sits right beside the stair stringers, and the toilet needs 15 inches from its center to
    that wall, so the room may shift east or turn once the tape has the real spot."""
    p.room("Bath", "bath", [(15.7, 19.5, 21.0, bottom)], (18.0, 23.5), compact=True)
    p.wall(15.3, 19.1, 21.4, 19.5)
    p.wall(15.3, 19.1, 15.7, bottom + 0.4)
    p.wall(21.0, 19.1, 21.4, bottom + 0.4)
    p.wall(15.3, bottom, 18.1, bottom + 0.4)
    p.wall(20.6, bottom, 21.4, bottom + 0.4)
    p.door(20.6, bottom + 0.2, 2.5, 180, 90)
    p.thing(15.75, 19.55, 20.95, 22.05, "tub and shower", "#99f6e4", "#0f766e", 8)
    p.thing(15.75, 24.75, 16.2, 26.05, "", "#ffffff", "#0f766e", 7, 1)
    p.over.append(f'<ellipse cx="{X(16.75):.1f}" cy="{Y(25.4):.1f}" rx="{0.6 * S:.1f}" ry="{0.45 * S:.1f}" fill="#ffffff" stroke="#0f766e" stroke-width="1.2"/>')
    p.thing(19.4, 22.9, 20.95, 25.1, "sink", "#ffffff", "#0f766e", 8)
    p.note(18.3, 27.4, "fit unproven", 7, "#0f766e")


def structure(p):
    """The steel beam and its two staggered posts, drawn where the walk-through put them."""
    p.over.append(f'<line x1="{X(X0):.1f}" y1="{Y(BEAM_Y):.1f}" x2="{X(X1):.1f}" y2="{Y(BEAM_Y):.1f}" stroke="#334155" stroke-width="1.6" stroke-dasharray="9,5" opacity="0.7"/>')
    p.note(6.3, BEAM_Y - 0.4, "steel beam, about 16 ft off the rear wall", 7, "#334155")
    for x, y in POSTS:
        p.over.append(f'<rect x="{X(x) - 4:.1f}" y="{Y(y) - 4:.1f}" width="8" height="8" fill="#334155" stroke="#ffffff" stroke-width="1"/>')
        p.note(x, y + 0.95, "post, about", 7, "#334155")


def layout():
    p = Plan("a", "The basement layout: play area, office, studio and the center lane, drawn from the walk-through")
    # the play area in the rear corner on the garage side, the utility room against it where the furnace stands
    p.room("Play area", "lounge", [(X0, Y0, 9.0, 18.3)], (5.0, 13.8))
    p.wall(9.0, 9.6, 9.4, 18.7)
    p.wall(X0, 18.3, 12.0, 18.7)
    play_area(p)
    p.room("Utility", "utility", [(9.4, 10.0, 14.6, 16.0)], (10.6, 10.9), compact=True)
    p.wall(9.0, 9.6, 15.0, 10.0)
    p.wall(14.6, 9.6, 15.0, 10.4)
    p.wall(14.6, 13.0, 15.0, 16.4)
    p.wall(9.0, 16.0, 15.0, 16.4)
    p.door(14.8, 13.0, 2.6, 0, -90)
    utility(p)
    # the lounge: the slider opens into it, the couch faces the yard, the basket stands at its rear wall
    p.room("Lounge", "lounge", [(9.4, Y0, 24.2, 9.6), (15.0, 9.6, 20.4, 15.9)], (19.0, 4.6))
    p.thing(13.6, 6.0, 18.95, 8.55, "couch", "#fbcfe8", "#be185d", 9, 6)
    p.thing(12.1, 6.0, 13.45, 8.05, "", "#ffffff", "#be185d", 8, 2)
    p.vnote(12.78, 7.0, "end table", 7, "#9d174d")
    p.gear(16.28, 3.75, 1.5, "gear table")
    # the hall: the stair's foot, the lane down the far side, and the porch bump-out at the front holding the tee
    p.room("Hall", "hall", [(20.4, 9.6, 24.2, 19.1), (21.4, 19.1, 24.2, 28.9), (12.0, 26.0, 15.3, 28.9), (12.0, 28.9, 24.2, Y1), (BUMP[0] + 0.75, Y1, BUMP[1] - 0.75, Y1 + BUMP[2])], (17.0, 30.9))
    p.lane(22.5, Y1 + BUMP[2] - 0.6, 22.5, 2.0, -1)
    p.over.append(f'<line x1="{X(20.0):.1f}" y1="{Y(0.95):.1f}" x2="{X(24.2):.1f}" y2="{Y(0.95):.1f}" stroke="#be123c" stroke-width="3" stroke-dasharray="2,3"/>')
    p.note(20.2, 1.75, "net", 8, "#be123c", "start")
    p.note(14.0, 33.3, "porch bump-out", 8, "#475569", "start")
    p.note(14.0, 34.0, "damp band at the slab: check", 7, "#b45309", "start")
    p.note(13.65, 27.6, "tools under stair", 7, "#312e81")
    # the office in the rear corner on the far side, the window behind the desk, two low windows on the far wall
    p.room("Office", "office", [(24.6, Y0, X1, 16.0)], (28.6, 8.4))
    p.wall(24.2, Y0, 24.6, 9.5)
    p.wall(24.2, 12.5, 24.6, 16.4)
    p.wall(24.2, 16.0, 31.0, 16.4)
    p.wall(34.0, 16.0, X1, 16.4)
    p.door(24.4, 12.5, 3.0, 0, -90)
    p.door(31.0, 16.2, 3.0, 90, -90)
    p.note(32.5, 15.6, "door to the studio", 7, "#1e3a8a")
    corner_desk(p)
    p.thing(25.2, 13.4, 30.4, 15.8, "disc golf bags and racks", "#ffe4e6", "#e11d48", 8)
    for a, b in ((3.5, 5.0), (7.3, 8.8)):
        p.over.append(f'<rect x="{X(X1):.1f}" y="{Y(a):.1f}" width="{0.75 * S:.1f}" height="{(b - a) * S:.1f}" fill="#e0f2fe"/>')
        p.over.append(f'<line x1="{X(X1 + 0.38):.1f}" y1="{Y(a):.1f}" x2="{X(X1 + 0.38):.1f}" y2="{Y(b):.1f}" stroke="#0284c7" stroke-width="3"/>')
    p.note(30.0, 11.2, "two low windows on the far wall, about", 7, "#0369a1")
    # the D&D studio in the front corner on the far side, where the play area was planned
    p.room("D&D studio", "studio", [(24.6, 16.4, X1, Y1)], (31.6, 29.9), compact=True)
    p.wall(24.2, 16.4, 24.6, 28.5, True)
    p.wall(24.2, 31.5, 24.6, Y1, True)
    p.door(24.5, 31.5, 3.0, 0, -90)
    studio(p)
    p.over.append(f'<rect x="{X(29.0):.1f}" y="{Y(Y1):.1f}" width="{2.0 * S:.1f}" height="{0.75 * S:.1f}" fill="#e0f2fe"/>')
    p.over.append(f'<line x1="{X(29.0):.1f}" y1="{Y(Y1 + 0.38):.1f}" x2="{X(31.0):.1f}" y2="{Y(Y1 + 0.38):.1f}" stroke="#0284c7" stroke-width="3"/>')
    p.note(30.0, Y1 + 1.5, "small high window, about", 7, "#0369a1")
    bath(p)
    # the bin room is the room the sellers finished at the stair's foot: teal walls, foam mats, a panel in a
    # rough cutout, a doorless closet, a curtain for a door; it stays as it stands and takes the bins
    p.room("Bin room, the finished room", "storage", [(X0, 18.7, 11.6, Y1)], (7.0, 27.0), compact=True)
    p.wall(11.6, 18.7, 12.0, 26.8)
    p.wall(11.6, 29.7, 12.0, Y1)
    p.door(11.8, 26.8, 2.9, 90, 90)
    p.note(12.5, 28.3, "door to add", 7, "#15803d", "start")
    p.thing(X0, 23.0, X0 + 0.4, 24.5, "", "#fde68a", "#b45309", 7, 1)
    p.over.append(f'<rect x="{X(X0):.1f}" y="{Y(22.5):.1f}" width="{3.0 * S:.1f}" height="{3.0 * S:.1f}" fill="none" stroke="#b45309" stroke-width="1" stroke-dasharray="3,2"/>')
    p.note(2.6, 23.6, "panel, about", 7, "#92400e")
    p.note(2.6, 24.4, "kept clear", 7, "#92400e")
    p.under.append(f'<rect x="{X(X0):.1f}" y="{Y(29.3):.1f}" width="{(4.0 - X0) * S:.1f}" height="{(Y1 - 29.3) * S:.1f}" fill="#bbf7d0"/>')
    p.wall(4.0, 29.3, 4.35, Y1)
    p.wall(X0, 29.3, 1.5, 29.65)
    p.note(2.4, 30.4, "closet, about:", 7, "#166534")
    p.note(2.4, 31.1, "refit the shelving", 7, "#166534")
    p.shelf(4.0, 18.7, 11.6, 20.7)
    p.shelf(X0, 25.6, 2.75, 29.3)
    p.shelf(4.35, 30.25, 11.6, Y1)
    p.shelf(9.6, 20.7, 11.6, 26.6)
    structure(p)
    return p


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    p = layout()
    (OUT / "layout.svg").write_text(p.svg(), encoding="utf-8", newline="\n")
    print(json.dumps(p.summary(), indent=1))


if __name__ == "__main__":
    main()
