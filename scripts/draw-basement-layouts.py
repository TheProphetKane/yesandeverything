"""Draw the basement layout options for 45 Autumn Crest Ct as SVG plans.

    python scripts/draw-basement-layouts.py     writes house-plan/basement/layout-a.svg, -b.svg, -c.svg
                                               and prints each room's size, the bin count and the lane

Feet throughout, measured from the basement's rear corner on the garage side: x runs toward the far
wall, y runs from the walkout wall toward the street. The basement is a plain 36 by 33 rectangle
with 9-inch poured walls. What every layout keeps where it is: the stair (the run under the loft
stair, the landing, the run toward the front), the bath rough-in at the stair's foot, the walkout
slider and the window, both in the rear wall. Shelf bays are 2 feet deep and hold 27-gallon bins
(31 by 20 inches) three across every 8 feet, four tiers high.
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
BIN_LONG = 31 / 12
TIERS = 4

S = 18          # pixels per foot
ML, MT = 34, 26  # margins
PW = int(ML * 2 + W * S)
PH = int(MT + H * S + 30)

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

    def table(self, x0, y0, x1, y1, seats_side=3):
        self.thing(x0, y0, x1, y1, "game table 4 by 8", "#c4b5fd", "#5b21b6", 10, 6)
        for k in range(seats_side):
            yy = y0 + (k + 0.5) * (y1 - y0) / seats_side
            for xx in (x0 - 1.0, x1 + 0.2):
                self.over.append(f'<rect x="{X(xx):.1f}" y="{Y(yy - 0.6):.1f}" width="{0.8 * S:.1f}" height="{1.2 * S:.1f}" rx="3" fill="#ddd6fe" stroke="#7c3aed"/>')
        for yy in (y0 - 1.0, y1 + 0.2):
            self.over.append(f'<rect x="{X((x0 + x1) / 2 - 0.6):.1f}" y="{Y(yy):.1f}" width="{1.2 * S:.1f}" height="{0.8 * S:.1f}" rx="3" fill="#ddd6fe" stroke="#7c3aed"/>')

    def corners(self, pts):
        for x, y in pts:
            self.over.append(f'<circle cx="{X(x):.1f}" cy="{Y(y):.1f}" r="7" fill="#a78bfa" stroke="#4c1d95" stroke-width="1.5"/>')
            self.over.append(f'<circle cx="{X(x):.1f}" cy="{Y(y):.1f}" r="2.5" fill="#4c1d95"/>')

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
        out.append(f'<path d="M {X(0)} {Y(0)} H {X(W)} V {Y(H)} H {X(0)} Z M {X(X0)} {Y(Y0)} V {Y(Y1)} H {X(X1)} V {Y(Y0)} Z" fill="#1e293b" fill-rule="evenodd"/>')
        for (a, b), label in ((SLIDER, "walkout slider"), (WINDOW, "window")):
            out.append(f'<rect x="{X(a):.1f}" y="{Y(0):.1f}" width="{(b - a) * S:.1f}" height="{0.75 * S:.1f}" fill="#e0f2fe"/>')
            out.append(f'<line x1="{X(a):.1f}" y1="{Y(0.38):.1f}" x2="{X(b):.1f}" y2="{Y(0.38):.1f}" stroke="#0284c7" stroke-width="3"/>')
            out.append(f'<text x="{X((a + b) / 2):.1f}" y="{Y(0) - 7:.1f}" font-size="11" font-weight="700" fill="#0369a1" text-anchor="middle">{label}</text>')
        out.append(f'<circle cx="{X(ROUGH[0]):.1f}" cy="{Y(ROUGH[1]):.1f}" r="5" fill="#0f766e" stroke="#ffffff" stroke-width="1.5"/>')
        out += self.labels
        out.append(f'<text x="{X(0):.1f}" y="{Y(0) - 8:.1f}" font-size="11" fill="#475569">rear, under the deck</text>')
        out.append(f'<text x="{X(W):.1f}" y="{Y(H) + 18:.1f}" font-size="11" fill="#475569" text-anchor="end">front, the street side · 1 square = 1 foot</text>')
        out.append(f'<text x="{X(0):.1f}" y="{Y(H) + 18:.1f}" font-size="11" fill="#475569">garage side</text>')
        out.append("</svg>")
        return "\n".join(out)

    def summary(self):
        return {"key": self.key, "title": self.title, "rooms": self.rooms, "bins": sum(self.shelves), "lanes": self.lanes}


def studio_kit(p, y_end, table_y0=4.6):
    """The D&D studio's furniture between the rear wall and y_end: a long shelf of books and minis on the
    garage-side wall, the 4-by-8 table, the game PC desk at the far end, the screen on the rear wall."""
    top, bottom = 2.4, min(y_end - 3.6, 15.4)
    p.thing(X0 + 0.02, top, 2.25, bottom, "", "#ede9fe", "#5b21b6", 9, 2)
    cx, cy = (X0 + 2.25) / 2, (top + bottom) / 2
    p.over.append(f'<text x="{X(cx):.1f}" y="{Y(cy):.1f}" font-size="10" fill="#4c1d95" text-anchor="middle" transform="rotate(-90 {X(cx):.1f} {Y(cy):.1f})" dy="4">shelf: books and minis, {bottom - top:.0f} ft</text>')
    p.table(4.9, table_y0, 8.9, table_y0 + 8.0)
    p.thing(4.0, 0.85, 9.8, 1.25, "", "#1e1b4b", "#1e1b4b", 8, 1)
    p.note(6.9, 2.3, "screen", 9, "#4c1d95")
    p.thing(4.0, y_end - 2.6, 9.0, y_end - 0.1, "game PC desk", "#c4b5fd", "#5b21b6", 9)
    p.thing(9.4, y_end - 2.6, 11.3, y_end - 0.1, "rack", "#ffffff", "#5b21b6", 8)
    p.corners([(1.4, 1.4), (10.7, 1.4), (1.4, y_end - 0.7), (10.7, y_end - 3.2)])


def furnace(p):
    """The furnace and the water heater, under the flue that leaves the roof about 15 feet from the
    garage-side wall at the ridge, north of the landing."""
    p.thing(12.3, 12.0, 14.6, 15.3, "furnace", "#ffffff", "#334155", 8)
    p.over.append(f'<circle cx="{X(16.0):.1f}" cy="{Y(14.2):.1f}" r="{1.0 * S:.1f}" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>')
    p.note(16.0, 14.5, "water heater", 7, "#334155")


def corner_desk(p):
    """Nick's desk: the computer tower in the corner where the rear and far walls meet, the desk running
    along the far wall from it, so he faces the wall with the window behind him to his left."""
    p.thing(33.6, 0.9, 35.2, 2.7, "PC", "#93c5fd", "#1d4ed8", 9)
    p.thing(32.6, 2.7, 35.2, 9.2, "desk", "#bfdbfe", "#1d4ed8", 10)
    p.over.append(f'<circle cx="{X(31.6):.1f}" cy="{Y(5.6):.1f}" r="{0.9 * S:.1f}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.2"/>')
    p.note(31.6, 5.9, "chair", 8, "#1e3a8a")


def common_bath(p, door_side, bottom=27.5):
    """The bath on the rough-in, between the run toward the front and the hall. door_side: 'east' or 'south'."""
    p.room("Bath", "bath", [(15.7, 19.5, 20.0, bottom)], (17.85, bottom - 1.3), compact=True)
    p.wall(15.3, 19.1, 20.4, 19.5)
    p.wall(15.3, 19.1, 15.7, bottom + 0.4)
    if door_side == "east":
        p.wall(20.0, 19.1, 20.4, 22.6)
        p.wall(20.0, 25.2, 20.4, bottom + 0.4)
        p.door(20.2, 25.2, 2.5, 180, 90)
        p.wall(15.3, bottom, 20.4, bottom + 0.4)
    else:
        p.wall(20.0, 19.1, 20.4, bottom + 0.4)
        p.wall(15.3, bottom, 17.3, bottom + 0.4)
        p.wall(19.8, bottom, 20.4, bottom + 0.4)
        p.door(19.8, bottom + 0.2, 2.5, 180, 90)
    p.thing(15.75, 19.55, 19.95, 22.3, "shower", "#99f6e4", "#0f766e", 9)
    p.thing(18.3, 22.7, 19.95, 24.3, "sink", "#ffffff", "#0f766e", 8)


def layout_a():
    p = Plan("a", "Layout A: the lounge and the center lane")
    p.room("D&D studio", "studio", [(X0, Y0, 11.4, 19.5)], (6.9, 15.0))
    p.wall(11.4, Y0, 12.0, 1.4, True)
    p.wall(11.4, 4.4, 12.0, 20.1, True)
    p.wall(X0, 19.5, 12.0, 20.1, True)
    p.door(11.7, 4.4, 3.0, 180, 90)
    studio_kit(p, 19.5)
    p.room("Utility", "utility", [(12.0, 9.0, 18.6, 15.5)], (15.3, 10.3), compact=True)
    p.wall(12.0, 8.6, 19.0, 9.0)
    p.wall(18.6, 8.6, 19.0, 10.6)
    p.wall(18.6, 13.2, 19.0, 15.9)
    p.wall(12.0, 15.5, 20.4, 15.9)
    p.door(18.8, 13.2, 2.6, 0, -90)
    furnace(p)
    p.room("Lounge", "lounge", [(12.0, Y0, 24.2, 8.6), (19.0, 8.6, 24.2, 15.5)], (17.4, 4.3))
    p.thing(12.05, 4.8, 13.3, 8.5, "", "#ffffff", "#be185d", 8)
    p.note(12.7, 6.9, "coats", 8, "#9d174d")
    p.thing(13.8, 6.9, 18.5, 8.55, "snack counter", "#ffffff", "#be185d", 8)
    p.room("Hall", "hall", [(20.4, 15.5, 24.2, 27.9), (12.0, 27.9, 24.2, Y1)], (17.5, 30.4))
    p.lane(22.3, 2.0, 22.3, 30.9, -1)
    p.room("Office", "office", [(24.6, Y0, X1, 22.0)], (29.6, 12.4))
    p.wall(24.2, Y0, 24.6, 2.0)
    p.wall(24.2, 5.0, 24.6, 22.4)
    p.wall(24.2, 22.0, X1, 22.4)
    p.door(24.4, 5.0, 3.0, 0, -90)
    corner_desk(p)
    p.thing(25.2, 19.4, 34.8, 21.8, "disc golf bags and racks", "#ffe4e6", "#e11d48", 9)
    common_bath(p, "south")
    p.room("Bin room", "storage", [(X0, 20.1, 11.6, Y1)], (6.2, 26.3))
    p.wall(11.6, 20.1, 12.0, 26.8)
    p.wall(11.6, 29.7, 12.0, Y1)
    p.door(11.8, 26.8, 2.9, 90, 90)
    p.shelf(X0, 20.1, 2.75, Y1)
    p.shelf(2.75, 20.1, 11.6, 22.1)
    p.shelf(2.75, 30.25, 11.6, Y1)
    p.shelf(9.6, 22.1, 11.6, 26.6)
    p.room("Bin room two", "storage", [(24.6, 22.4, X1, Y1)], (29.0, 27.0))
    p.wall(24.2, 22.4, 24.6, 27.5)
    p.wall(24.2, 30.5, 24.6, Y1)
    p.door(24.4, 27.5, 3.0, 0, 90)
    p.shelf(33.25, 22.4, X1, Y1)
    p.shelf(26.6, 30.25, 33.25, Y1)
    p.shelf(26.6, 22.4, 33.25, 24.4)
    return p


def layout_b():
    p = Plan("b", "Layout B: the office comes first, lane included")
    p.room("D&D studio", "studio", [(X0, Y0, 11.4, 22.5)], (6.1, 18.0))
    p.wall(11.4, Y0, 12.0, 1.4, True)
    p.wall(11.4, 4.4, 12.0, 23.1, True)
    p.wall(X0, 22.5, 12.0, 23.1, True)
    p.door(11.7, 4.4, 3.0, 180, 90)
    studio_kit(p, 22.5)
    p.thing(3.0, 14.6, 9.0, 16.9, "couch for players off turn", "#ddd6fe", "#5b21b6", 8)
    # entry and hall
    p.room("Entry", "lounge", [(12.0, Y0, 23.9, 6.6)], (16.0, 4.0))
    p.thing(12.05, 5.0, 15.0, 6.55, "bench, coats", "#ffffff", "#be185d", 8)
    p.room("Hall", "hall", [(20.4, 6.6, 23.9, 27.9), (12.0, 27.9, 23.9, Y1)], (17.5, 30.4))
    # utility in the middle, north of the stair
    p.room("Utility", "utility", [(12.0, 7.0, 20.0, 15.5)], (16.0, 10.4), "furnace, water heater and panel if they sit near the middle; bins if they do not")
    p.wall(12.0, 6.6, 20.4, 7.0)
    p.wall(20.0, 7.0, 20.4, 8.0)
    p.wall(20.0, 10.8, 20.4, 15.9)
    p.wall(12.0, 15.5, 20.4, 15.9)
    p.door(20.2, 8.0, 2.8, 90, 90)
    furnace(p)
    p.shelf(12.0, 7.0, 20.0, 9.0)
    # office, the whole east side
    p.room("Office", "office", [(24.3, Y0, X1, Y1)], (29.6, 11.0))
    p.wall(23.9, Y0, 24.3, 2.0)
    p.wall(23.9, 5.0, 24.3, Y1)
    p.door(24.1, 5.0, 3.0, 0, -90)
    corner_desk(p)
    p.thing(26.8, 16.0, 30.6, 21.0, "disc golf bags and racks", "#ffe4e6", "#e11d48", 8)
    p.shelf(24.3, 7.0, 26.3, 15.0)
    p.shelf(24.3, 22.0, 26.3, 30.0)
    p.lane(33.2, 10.4, 33.2, 30.8, -1)
    common_bath(p, "east")
    p.room("Bin room", "storage", [(X0, 23.1, 11.6, Y1)], (6.2, 27.4))
    p.wall(11.6, 23.1, 12.0, 26.8)
    p.wall(11.6, 29.7, 12.0, Y1)
    p.door(11.8, 26.8, 2.9, 90, 90)
    p.shelf(X0, 23.1, 2.75, Y1)
    p.shelf(2.75, 23.1, 11.6, 25.1)
    p.shelf(2.75, 30.25, 11.6, Y1)
    return p


def layout_c():
    p = Plan("c", "Layout C: the 10-meter lane")
    p.room("D&D studio", "studio", [(X0, Y0, 11.4, 18.0)], (6.9, 13.0))
    p.wall(11.4, Y0, 12.0, 1.4, True)
    p.wall(11.4, 4.4, 12.0, 18.6, True)
    p.wall(X0, 18.0, 12.0, 18.6, True)
    p.door(11.7, 4.4, 3.0, 180, 90)
    studio_kit(p, 18.0, 3.8)
    p.room("Entry", "lounge", [(12.0, Y0, 23.9, 6.4)], (17.5, 3.9))
    p.room("Utility", "utility", [(12.0, 6.8, 19.8, 15.5)], (15.9, 8.4), compact=True)
    p.wall(12.0, 6.4, 20.2, 6.8)
    p.wall(19.8, 6.4, 20.2, 9.6)
    p.wall(19.8, 12.2, 20.2, 15.9)
    p.wall(12.0, 15.5, 20.2, 15.9)
    p.door(20.0, 12.2, 2.6, 0, -90)
    furnace(p)
    p.room("Hall", "hall", [(20.2, 6.4, 23.9, 26.6)], (22.05, 19.0), compact=True)
    p.room("Office", "office", [(24.3, Y0, X1, 26.2)], (29.8, 9.0))
    p.wall(23.9, Y0, 24.3, 2.0)
    p.wall(23.9, 5.0, 24.3, 26.6)
    p.wall(23.9, 26.2, X1, 26.6)
    p.door(24.1, 5.0, 3.0, 0, -90)
    corner_desk(p)
    p.thing(28.0, 13.5, 34.6, 20.6, "throwing net", "#ffe4e6", "#e11d48", 9)
    p.note(31.3, 11.8, "throw from here, 15 ft", 9, "#be123c")
    p.thing(26.6, 22.4, 34.8, 25.9, "disc golf bags and racks", "#ffe4e6", "#e11d48", 9)
    p.shelf(24.3, 13.0, 26.3, 21.0)
    p.room("Lane and hall", "lane", [(X0, 27.4, X1, Y1), (24.3, 26.6, X1, 27.4)], (24.0, 29.0))
    p.lane(2.0, 30.6, 34.0, 30.6)
    p.note(13.8, 28.6, "stair foot: call the throw", 9, "#9f1239")
    common_bath(p, "east", bottom=26.6)
    p.room("Bin room", "storage", [(X0, 18.6, 11.6, 27.0)], (5.8, 22.6))
    p.wall(11.6, 18.6, 12.0, 27.4)
    p.wall(X0, 27.0, 4.6, 27.4)
    p.wall(7.6, 27.0, 12.0, 27.4)
    p.door(7.6, 27.2, 3.0, 180, 90)
    p.shelf(X0, 18.6, 2.75, 27.0)
    p.shelf(2.75, 18.6, 11.6, 20.6)
    p.shelf(9.6, 20.6, 11.6, 27.0)
    return p


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    summary = []
    for make in (layout_a, layout_b, layout_c):
        p = make()
        (OUT / f"layout-{p.key}.svg").write_text(p.svg(), encoding="utf-8", newline="\n")
        summary.append(p.summary())
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
