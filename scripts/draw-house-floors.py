"""Draw the main and upper floors of the new house as SVG plans.

    python scripts/draw-house-floors.py     writes house-plan/floors/main.svg and house-plan/floors/upper.svg
                                           and prints each room's size

Feet throughout, on the basement layout's grid: x runs from the house's garage-side wall toward the far
wall, so the garage sits at negative x, and y runs from the rear wall toward the street. The rooms are the
builder's Rockport drawing (Burkemper Homes, brochure 02/07), read off a 1-foot grid laid over it and fitted
to the county's measured outline: a 36 by 33 block with a 12 by 2 projection at the front door. Where the
brochure prints a room's size, the label carries it; every other size is measured off the drawing. The
upper floor departs from the drawing in one place, on Nick's word: the loft is floored to the front wall,
with no lookdown over the foyer.
"""

import html
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "house-plan" / "floors"

S = 18      # pixels per foot
T = 0.4     # frame wall thickness, feet

COLORS = {
    "gather": ("#fce7f3", "#be185d"),
    "kitchen": ("#fee2e2", "#b91c1c"),
    "primary": ("#ede9fe", "#5b21b6"),
    "bedroom": ("#dbeafe", "#1d4ed8"),
    "loft": ("#fae8ff", "#a21caf"),
    "bath": ("#ccfbf1", "#0f766e"),
    "storage": ("#dcfce7", "#15803d"),
    "utility": ("#e2e8f0", "#334155"),
    "hall": ("#f1f5f9", "#475569"),
    "stair": ("#c7d2fe", "#3730a3"),
    "outside": ("#ecfdf5", "#047857"),
}
LEGEND = {
    "gather": "living spaces", "kitchen": "kitchen", "primary": "primary suite", "bedroom": "bedrooms",
    "loft": "loft", "bath": "baths", "storage": "closets", "utility": "garage and laundry",
    "hall": "halls and foyer", "stair": "stairs",
}


def feet(v):
    return f"{v:g}" if v == int(v) else f"{v:.1f}"


class Plan:
    def __init__(self, key, title, box, grids):
        self.key, self.title = key, title
        self.bx0, self.by0, self.bx1, self.by1 = box
        self.grids = grids
        self.ml, self.mt = 30, 34
        self.pw = int(self.ml * 2 + (self.bx1 - self.bx0) * S)
        self.ph = int(self.mt + (self.by1 - self.by0) * S + 70)
        self.under, self.walls, self.over, self.labels = [], [], [], []
        self.rooms, self.kinds = [], []

    def X(self, v):
        return self.ml + (v - self.bx0) * S

    def Y(self, v):
        return self.mt + (v - self.by0) * S

    def pts(self, points):
        return " ".join(f"{self.X(x):.1f},{self.Y(y):.1f}" for x, y in points)

    def rect(self, x0, y0, x1, y1, fill, stroke="none", sw=1.2, rx=0, dash=""):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        return (f'<rect x="{self.X(x0):.1f}" y="{self.Y(y0):.1f}" width="{(x1 - x0) * S:.1f}" height="{(y1 - y0) * S:.1f}" '
                f'rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>')

    def room(self, name, kind, rects, label_at, size=None, polys=(), compact=False, line2=None, turn=False):
        """A room filled in its kind's color. `size` is the builder's printed size, (width, depth) in feet;
        without it the label gives the size measured off the drawing."""
        fill, ink = COLORS[kind]
        for x0, y0, x1, y1 in rects:
            self.under.append(self.rect(x0, y0, x1, y1, fill))
        for p in polys:
            self.under.append(f'<polygon points="{self.pts(p)}" fill="{fill}"/>')
        if kind not in self.kinds:
            self.kinds.append(kind)
        drawn = sum((x1 - x0) * (y1 - y0) for x0, y0, x1, y1 in rects)
        drawn += sum(abs(sum(p[i][0] * p[i - 1][1] - p[i - 1][0] * p[i][1] for i in range(len(p)))) / 2 for p in polys)
        if size:
            area = round(size[0] * size[1])
            text = f"{feet(size[0])} by {feet(size[1])} ft, {area} sq ft"
        elif len(rects) == 1 and not polys:
            x0, y0, x1, y1 = rects[0]
            area = round(drawn)
            text = f"{area} sq ft" if compact else f"about {x1 - x0:.1f} by {y1 - y0:.1f} ft, {area} sq ft"
        else:
            area = round(drawn)
            text = f"about {area} sq ft"
        text = text if line2 is None else line2
        self.rooms.append({"name": name, "kind": kind, "area": area, "label": text, "builder": bool(size)})
        lx, ly = label_at
        big = 11 if compact else 14
        spin = f' transform="rotate(-90 {self.X(lx):.1f} {self.Y(ly):.1f})"' if turn else ""
        self.labels.append(f'<text x="{self.X(lx):.1f}" y="{self.Y(ly):.1f}" font-size="{big}" font-weight="700" fill="{ink}" text-anchor="middle"{spin}>{html.escape(name)}</text>')
        if text:
            self.labels.append(f'<text x="{self.X(lx):.1f}" y="{self.Y(ly) + (13 if compact else 15):.1f}" font-size="{10 if compact else 11}" fill="{ink}" text-anchor="middle">{html.escape(text)}</text>')

    def outside(self, points, label, label_at, dash="6,4"):
        fill, ink = COLORS["outside"]
        self.under.append(f'<polygon points="{self.pts(points)}" fill="{fill}" stroke="{ink}" stroke-width="1.4" stroke-dasharray="{dash}"/>')
        self.note(*label_at, label, 11, ink)

    def wall(self, x0, y0, x1, y1):
        self.walls.append(self.rect(x0, y0, x1, y1, "#334155"))

    def shell(self, points, closed=True):
        """An outside wall along its centerline, T feet thick."""
        tag = "polygon" if closed else "polyline"
        self.walls.append(f'<{tag} points="{self.pts(points)}" fill="none" stroke="#1e293b" stroke-width="{T * S:.1f}" stroke-linejoin="miter"/>')

    def glass(self, a, b, label=""):
        """A window, or with a label a glass door, set in the wall between points a and b."""
        line = f'x1="{self.X(a[0]):.1f}" y1="{self.Y(a[1]):.1f}" x2="{self.X(b[0]):.1f}" y2="{self.Y(b[1]):.1f}"'
        self.over.append(f'<line {line} stroke="#e0f2fe" stroke-width="{T * S - 1:.1f}"/>')
        self.over.append(f'<line {line} stroke="#0284c7" stroke-width="2.5"/>')
        if label:
            self.note((a[0] + b[0]) / 2, min(a[1], b[1]) - 0.55, label, 10, "#0369a1")

    def gap(self, a, b, fill="#ffffff"):
        """An opening cut through an outside wall, for a door."""
        self.over.append(f'<line x1="{self.X(a[0]):.1f}" y1="{self.Y(a[1]):.1f}" x2="{self.X(b[0]):.1f}" y2="{self.Y(b[1]):.1f}" stroke="{fill}" stroke-width="{T * S + 1:.1f}"/>')

    def door(self, hx, hy, w, start_deg, sweep=90):
        """A door leaf of width w feet hinged at (hx, hy), drawn open at start_deg, with its swing arc."""
        a0, a1 = math.radians(start_deg), math.radians(start_deg + sweep)
        x0, y0 = hx + w * math.cos(a0), hy + w * math.sin(a0)
        x1, y1 = hx + w * math.cos(a1), hy + w * math.sin(a1)
        self.over.append(f'<line x1="{self.X(hx):.1f}" y1="{self.Y(hy):.1f}" x2="{self.X(x0):.1f}" y2="{self.Y(y0):.1f}" stroke="#334155" stroke-width="2"/>')
        self.over.append(f'<path d="M {self.X(x0):.1f} {self.Y(y0):.1f} A {w * S:.1f} {w * S:.1f} 0 0 {1 if sweep > 0 else 0} {self.X(x1):.1f} {self.Y(y1):.1f}" '
                         f'fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3"/>')

    def bifold(self, x0, x1, y, depth=0.5, panels=4):
        """Folding closet doors across an opening, drawn half open."""
        step = (x1 - x0) / panels
        pts = [(x0 + k * step, y + (depth if k % 2 else 0)) for k in range(panels + 1)]
        self.over.append(f'<polyline points="{self.pts(pts)}" fill="none" stroke="#334155" stroke-width="1.6"/>')

    def slide(self, x0, x1, y):
        """Two sliding closet doors across an opening."""
        m = (x0 + x1) / 2
        for a, b, dy in ((x0, m + 0.3, -0.1), (m - 0.3, x1, 0.1)):
            self.over.append(f'<line x1="{self.X(a):.1f}" y1="{self.Y(y + dy):.1f}" x2="{self.X(b):.1f}" y2="{self.Y(y + dy):.1f}" stroke="#334155" stroke-width="2"/>')

    def rod(self, a, b):
        self.over.append(f'<line x1="{self.X(a[0]):.1f}" y1="{self.Y(a[1]):.1f}" x2="{self.X(b[0]):.1f}" y2="{self.Y(b[1]):.1f}" stroke="#15803d" stroke-width="1.4" stroke-dasharray="5,3"/>')

    def open_side(self, a, b):
        """A side left open to the next room, as the builder drew it: a dashed line."""
        self.over.append(f'<line x1="{self.X(a[0]):.1f}" y1="{self.Y(a[1]):.1f}" x2="{self.X(b[0]):.1f}" y2="{self.Y(b[1]):.1f}" stroke="#64748b" stroke-width="2" stroke-dasharray="4,4"/>')

    def rail(self, pts):
        self.over.append(f'<polyline points="{self.pts(pts)}" fill="none" stroke="#3730a3" stroke-width="2.5"/>')
        for x, y in pts:
            self.over.append(self.rect(x - 0.18, y - 0.18, x + 0.18, y + 0.18, "#ffffff", "#3730a3", 1.5))

    def thing(self, x0, y0, x1, y1, text="", fill="#ffffff", stroke="#64748b", size=9, rx=2):
        self.over.append(self.rect(x0, y0, x1, y1, fill, stroke, 1.2, rx))
        if text:
            self.note((x0 + x1) / 2, (y0 + y1) / 2 + 0.2, text, size, "#1e293b")

    def shape(self, points, fill="#ffffff", stroke="#64748b"):
        self.over.append(f'<polygon points="{self.pts(points)}" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>')

    def oval(self, cx, cy, rx, ry, fill="#ffffff", stroke="#0f766e", rot=0):
        t = f' transform="rotate({rot} {self.X(cx):.1f} {self.Y(cy):.1f})"' if rot else ""
        self.over.append(f'<ellipse cx="{self.X(cx):.1f}" cy="{self.Y(cy):.1f}" rx="{rx * S:.1f}" ry="{ry * S:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="1.2"{t}/>')

    def toilet(self, x, y, facing):
        """A toilet with its tank against the wall at (x, y), the bowl toward `facing`: 'up', 'down' or 'right'."""
        if facing == "right":
            self.thing(x, y - 0.75, x + 0.6, y + 0.75, "", "#ffffff", "#0f766e")
            self.oval(x + 1.25, y, 0.7, 0.55)
        elif facing == "down":
            self.thing(x - 0.75, y, x + 0.75, y + 0.6, "", "#ffffff", "#0f766e")
            self.oval(x, y + 1.25, 0.55, 0.7)
        else:
            self.thing(x - 0.75, y - 0.6, x + 0.75, y, "", "#ffffff", "#0f766e")
            self.oval(x, y - 1.25, 0.55, 0.7)

    def tub(self, x0, y0, x1, y1, text="tub"):
        self.thing(x0, y0, x1, y1, "", "#ffffff", "#0f766e")
        self.thing(x0 + 0.25, y0 + 0.25, x1 - 0.25, y1 - 0.25, "", "#f0fdfa", "#0f766e", rx=10)
        if text and y1 - y0 > x1 - x0:
            self.vnote((x0 + x1) / 2, (y0 + y1) / 2, text, 8, "#0f766e")
        elif text:
            self.note((x0 + x1) / 2, (y0 + y1) / 2 + 0.2, text, 8, "#0f766e")

    def stairs(self, x0, y0, x1, y1, n, across, arrow=None, fill=None):
        """A flight of n treads. `across` is True when the treads run across x (the flight climbs along y).
        `arrow` points 'up', 'down', 'left' or 'right' on the page, the way a walker goes from this floor, as
        the builder draws it: up the flights on the main floor, down them on the upper floor."""
        if "stair" not in self.kinds:
            self.kinds.append("stair")
        self.over.append(self.rect(x0, y0, x1, y1, fill or COLORS["stair"][0], "#3730a3", 1.5))
        for k in range(1, n):
            if across:
                yy = y0 + k * (y1 - y0) / n
                self.over.append(f'<line x1="{self.X(x0):.1f}" y1="{self.Y(yy):.1f}" x2="{self.X(x1):.1f}" y2="{self.Y(yy):.1f}" stroke="#3730a3" stroke-width="0.9"/>')
            else:
                xx = x0 + k * (x1 - x0) / n
                self.over.append(f'<line x1="{self.X(xx):.1f}" y1="{self.Y(y0):.1f}" x2="{self.X(xx):.1f}" y2="{self.Y(y1):.1f}" stroke="#3730a3" stroke-width="0.9"/>')
        if arrow:
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            dx, dy = {"up": (0, -1), "down": (0, 1), "left": (-1, 0), "right": (1, 0)}[arrow]
            half = (abs(dx) * (x1 - x0) + abs(dy) * (y1 - y0)) / 2 - 0.35
            ax, ay, bx, by = cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half
            self.over.append(f'<line x1="{self.X(ax):.1f}" y1="{self.Y(ay):.1f}" x2="{self.X(bx):.1f}" y2="{self.Y(by):.1f}" stroke="#312e81" stroke-width="1.6"/>')
            ang = math.atan2(dy, dx)
            tip = [(bx, by), (bx - 0.45 * math.cos(ang - 0.5), by - 0.45 * math.sin(ang - 0.5)),
                   (bx - 0.45 * math.cos(ang + 0.5), by - 0.45 * math.sin(ang + 0.5))]
            self.over.append(f'<polygon points="{self.pts(tip)}" fill="#312e81"/>')

    def piece(self, x0, y0, x1, y1, text="", ink="#334155", size=8, turn=False, fill="#ffffff", dash=""):
        """A piece of furniture seen from above, outlined in its room's ink and labeled in place."""
        self.over.append(self.rect(x0, y0, x1, y1, fill, ink, 1.4, 3, dash))
        if text and turn:
            self.vnote((x0 + x1) / 2, (y0 + y1) / 2, text, size, ink)
        elif text:
            self.note((x0 + x1) / 2, (y0 + y1) / 2 + 0.2, text, size, ink)

    def bed(self, x0, y0, x1, y1, head, text, ink, size=9):
        """A bed with its headboard and pillows on the `head` side, 'right' or 'up', and the turned-down
        cover drawn across it."""
        self.piece(x0, y0, x1, y1, "", ink)
        if head == "right":
            width = y1 - y0
            self.over.append(self.rect(x1 - 0.3, y0, x1, y1, ink, ink, 1, 2))
            n = 2 if width >= 4.5 else 1
            step = (width - 0.3 * (n + 1)) / n
            for k in range(n):
                a = y0 + 0.3 + k * (step + 0.3)
                self.over.append(self.rect(x1 - 1.55, a, x1 - 0.45, a + step, "#f8fafc", ink, 1, 6))
            fold = x1 - 2.4
            self.over.append(f'<line x1="{self.X(fold):.1f}" y1="{self.Y(y0):.1f}" x2="{self.X(fold):.1f}" y2="{self.Y(y1):.1f}" stroke="{ink}" stroke-width="1"/>')
            self.note((x0 + fold) / 2, (y0 + y1) / 2 + 0.25, text, size, ink)
        else:
            width = x1 - x0
            self.over.append(self.rect(x0, y0, x1, y0 + 0.3, ink, ink, 1, 2))
            n = 2 if width >= 4.5 else 1
            step = (width - 0.3 * (n + 1)) / n
            for k in range(n):
                a = x0 + 0.3 + k * (step + 0.3)
                self.over.append(self.rect(a, y0 + 0.45, a + step, y0 + 1.4, "#f8fafc", ink, 1, 6))
            fold = y0 + 2.0
            self.over.append(f'<line x1="{self.X(x0):.1f}" y1="{self.Y(fold):.1f}" x2="{self.X(x1):.1f}" y2="{self.Y(fold):.1f}" stroke="{ink}" stroke-width="1"/>')
            self.vnote((x0 + x1) / 2, (fold + y1) / 2, text, size, ink)

    def crib(self, x0, y0, x1, y1, ink):
        """A crib: rails all round, slats drawn along its long sides."""
        self.piece(x0, y0, x1, y1, "", ink)
        self.over.append(self.rect(x0 + 0.2, y0 + 0.2, x1 - 0.2, y1 - 0.2, "#f8fafc", ink, 1, 2))
        k = y0 + 0.5
        while k < y1 - 0.3:
            for xx in (x0 + 0.1, x1 - 0.1):
                self.over.append(f'<line x1="{self.X(xx - 0.08):.1f}" y1="{self.Y(k):.1f}" x2="{self.X(xx + 0.08):.1f}" y2="{self.Y(k):.1f}" stroke="{ink}" stroke-width="1"/>')
            k += 0.35
        self.vnote((x0 + x1) / 2, (y0 + y1) / 2, "crib", 9, ink)

    def chair(self, cx, cy, ink, r=0.6):
        self.over.append(f'<rect x="{self.X(cx - r):.1f}" y="{self.Y(cy - r):.1f}" width="{2 * r * S:.1f}" height="{2 * r * S:.1f}" rx="5" fill="#ffffff" stroke="{ink}" stroke-width="1.2"/>')

    def long_table(self, x0, y0, x1, y1, text, ink):
        """A rectangular table running along y, two chairs down each long side and one at each end."""
        cx = (x0 + x1) / 2
        for cy in (y0 + (y1 - y0) * 0.27, y0 + (y1 - y0) * 0.73):
            self.chair(x0 - 0.35, cy, ink)
            self.chair(x1 + 0.35, cy, ink)
        self.chair(cx, y0 - 0.35, ink)
        self.chair(cx, y1 + 0.35, ink)
        self.piece(x0, y0, x1, y1, "", ink)
        self.vnote(cx, (y0 + y1) / 2, text, 8, ink)

    def sectional(self, pts, back, text, at, ink):
        """An L-shaped sectional: its outline, the line where the back cushions meet the seats."""
        self.over.append(f'<polygon points="{self.pts(pts)}" fill="#ffffff" stroke="{ink}" stroke-width="1.4" stroke-linejoin="round"/>')
        self.over.append(f'<polyline points="{self.pts(back)}" fill="none" stroke="{ink}" stroke-width="1"/>')
        self.note(*at, text, 9, ink)

    def wall_tv(self, x, y0, y1, ink):
        """A television hung flat on a wall that runs along y at x."""
        self.over.append(self.rect(x, y0, x + 0.22, y1, "#1e1b4b", "#1e1b4b", 1, 1))

    def note(self, x, y, text, size=10, color="#475569", anchor="middle"):
        self.labels.append(f'<text x="{self.X(x):.1f}" y="{self.Y(y):.1f}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{html.escape(text)}</text>')

    def vnote(self, x, y, text, size=9, color="#475569"):
        self.labels.append(f'<text x="{self.X(x):.1f}" y="{self.Y(y):.1f}" font-size="{size}" fill="{color}" text-anchor="middle" '
                           f'transform="rotate(-90 {self.X(x):.1f} {self.Y(y):.1f})" dy="3">{html.escape(text)}</text>')

    def grid(self, gx0, gy0, gx1, gy1):
        lines = []
        for i in range(math.ceil(gx0), int(gx1) + 1):
            five = i % 5 == 0
            lines.append(f'<line x1="{self.X(i):.1f}" y1="{self.Y(gy0):.1f}" x2="{self.X(i):.1f}" y2="{self.Y(gy1):.1f}" '
                         f'stroke="{"#94a3b8" if five else "#cbd5e1"}" stroke-width="{0.9 if five else 0.5}" opacity="0.6"/>')
        for j in range(math.ceil(gy0), int(gy1) + 1):
            five = j % 5 == 0
            lines.append(f'<line x1="{self.X(gx0):.1f}" y1="{self.Y(j):.1f}" x2="{self.X(gx1):.1f}" y2="{self.Y(j):.1f}" '
                         f'stroke="{"#94a3b8" if five else "#cbd5e1"}" stroke-width="{0.9 if five else 0.5}" opacity="0.6"/>')
        return lines

    def svg(self, top, bottom_left, bottom_right):
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.pw} {self.ph}" width="{self.pw}" height="{self.ph}" '
               f'font-family="Segoe UI, Arial, sans-serif" role="img" aria-label="{html.escape(self.title)}">',
               f'<rect width="{self.pw}" height="{self.ph}" fill="#ffffff"/>']
        out += self.under
        # the 1-foot grid, the 5-foot lines darker, on the same origin as the basement layout
        for gx0, gy0, gx1, gy1 in self.grids:
            out += self.grid(gx0, gy0, gx1, gy1)
        out += self.walls
        out += self.over
        out += self.labels
        out.append(f'<text x="{self.X(0):.1f}" y="{self.Y(self.by0) - 14:.1f}" font-size="11" fill="#475569">{html.escape(top)}</text>')
        base = self.Y(self.by1) + 6
        out.append(f'<text x="{self.X(self.bx0) + 4:.1f}" y="{base:.1f}" font-size="11" fill="#475569">{html.escape(bottom_left)}</text>')
        out.append(f'<text x="{self.X(self.bx1) - 4:.1f}" y="{base:.1f}" font-size="11" fill="#475569" text-anchor="end">{html.escape(bottom_right)}</text>')
        # the color key
        x, y = self.X(self.bx0) + 4, base + 26
        for kind in [k for k in LEGEND if k in self.kinds]:
            fill, ink = COLORS[kind]
            label = LEGEND[kind]
            width = 26 + len(label) * 6.1
            if x + width > self.pw - 10:
                x, y = self.X(self.bx0) + 4, y + 22
            out.append(f'<rect x="{x:.1f}" y="{y - 11:.1f}" width="16" height="14" rx="3" fill="{fill}" stroke="{ink}" stroke-width="1.2"/>')
            out.append(f'<text x="{x + 21:.1f}" y="{y:.1f}" font-size="11" fill="{ink}">{html.escape(label)}</text>')
            x += width + 12
        out.append("</svg>")
        return "\n".join(out)

    def summary(self):
        return {"key": self.key, "title": self.title, "rooms": self.rooms}


def main_floor():
    p = Plan("main", "The main floor of the new house", (-21.8, -11.2, 37.8, 38.6), [(0.0, -2.0, 36.0, 38.0), (-21.3, 7.45, 0.0, 38.0)])
    # outside: the deck behind the breakfast bay, the porch across the front
    p.outside([(9.0, -10.0), (21.0, -10.0), (21.0, 0.0), (9.0, 0.0)], "deck", (15.0, -6.2))
    p.outside([(0.4, 33.0), (12.0, 33.0), (12.0, 35.0), (24.2, 35.0), (24.2, 33.0), (36.0, 33.0), (36.0, 38.0), (0.4, 38.0)],
              "front porch", (30.0, 36.3))
    for x in (0.8, 6.9, 12.3, 23.5, 29.5, 35.5):
        p.over.append(p.rect(x - 0.25, 37.35, x + 0.25, 37.85, "#ffffff", "#047857", 1.4))

    breakfast_bay = [(9.0, 0.45), (9.0, 0.2), (10.6, -1.8), (18.4, -1.8), (20.0, 0.2), (20.0, 0.45)]
    family_bay = [(23.5, 0.45), (23.5, 0.2), (25.1, -1.8), (31.9, -1.8), (33.5, 0.2), (33.5, 0.45)]
    p.room("Kitchen", "kitchen", [(0.4, 0.4, 9.0, 16.15)], (5.1, 12.0), size=(9, 16), compact=True)
    p.room("Breakfast room", "kitchen", [(9.0, 0.4, 20.0, 12.5)], (14.6, 11.0), size=(11, 12), polys=[breakfast_bay])
    p.room("Family room", "gather", [(20.0, 0.4, 35.6, 19.2), (19.7, 12.5, 20.0, 19.2)], (30.6, 15.8), size=(15.5, 19), polys=[family_bay])
    p.room("Dining room", "gather", [(0.4, 16.5, 12.1, 32.6)], (6.0, 31.2), size=(12, 15.7))
    p.room("Toy room", "gather", [(24.2, 19.4, 35.6, 32.6)], (29.6, 22.0), line2="the living room, 12 by 13 ft")
    p.room("Foyer", "hall", [(12.4, 22.8, 15.2, 34.6), (15.2, 27.2, 20.4, 34.6), (20.4, 19.4, 23.8, 34.6)], (18.0, 30.0))
    p.room("Half bath", "bath", [(15.6, 19.4, 20.0, 24.4)], (19.4, 23.15), compact=True, line2="", turn=True)
    p.room("Coats", "storage", [(15.6, 24.7, 20.0, 27.0)], (17.8, 26.65), compact=True, line2="")
    p.room("Pantry", "storage", [(9.25, 12.8, 12.1, 16.15)], (10.7, 15.0), compact=True, line2="")
    p.room("Laundry", "utility", [(-11.2, 7.6, -0.4, 16.3)], (-4.0, 13.0), compact=True)
    p.room("Two-car garage", "utility", [(-20.9, 16.7, -0.4, 37.6), (-20.9, 7.6, -11.6, 16.7)], (-10.6, 26.0),
           line2="L-shaped, 557 sq ft on the county record")
    p.room("Landing", "stair", [(12.4, 12.8, 15.2, 19.0)], (13.8, 15.6), compact=True, line2="")

    # outside walls: the house block, the two rear bays, the projection at the front door, the garage and laundry wing
    p.shell([(0.2, 0.2), (9.0, 0.2), (10.6, -1.8), (18.4, -1.8), (20.0, 0.2), (23.5, 0.2), (25.1, -1.8), (31.9, -1.8),
             (33.5, 0.2), (35.8, 0.2), (35.8, 32.8), (24.0, 32.8), (24.0, 34.8), (12.2, 34.8), (12.2, 32.8), (0.2, 32.8)])
    p.shell([(0.2, 7.45), (-21.1, 7.45), (-21.1, 37.8), (0.2, 37.8), (0.2, 32.8)], closed=False)
    p.shell([(-11.35, 7.45), (-11.35, 16.5), (0.2, 16.5)], closed=False)
    # the fireplace on the family room's end wall, its chase outside
    p.walls.append(p.rect(35.8, 7.4, 37.2, 12.2, "#e2e8f0", "#1e293b", 2.5))
    p.thing(34.5, 8.1, 35.6, 11.5, "", "#fecdd3", "#9f1239")
    p.vnote(35.05, 9.8, "fireplace", 8, "#881337")

    # glass: the slider in the breakfast bay, windows in the family bay and around the house
    p.glass((10.6, -1.8), (9.0, 0.2))
    p.glass((11.6, -1.8), (17.4, -1.8), "sliding glass door to the deck")
    p.glass((18.4, -1.8), (20.0, 0.2))
    p.glass((23.5, 0.2), (25.1, -1.8))
    p.glass((25.4, -1.8), (31.6, -1.8))
    p.glass((31.9, -1.8), (33.5, 0.2))
    p.glass((1.0, 0.2), (3.6, 0.2))
    p.glass((0.2, 0.9), (0.2, 3.6))
    p.glass((2.9, 32.8), (5.95, 32.8))
    p.glass((6.05, 32.8), (9.1, 32.8))
    p.glass((27.0, 32.8), (29.75, 32.8))
    p.glass((29.85, 32.8), (32.6, 32.8))
    p.glass((15.5, 34.8), (16.6, 34.8))
    p.glass((19.4, 34.8), (20.5, 34.8))

    # doors through the outside walls
    p.gap((16.6, 34.8), (19.4, 34.8))
    p.door(19.4, 34.6, 2.8, -90, -90)
    p.note(18.0, 36.7, "front door", 10, "#334155")
    p.gap((0.2, 13.3), (0.2, 16.1))
    p.door(0.2, 16.1, 2.8, -40, -50)
    p.gap((-7.9, 16.5), (-5.2, 16.5))
    p.door(-7.9, 16.5, 2.7, -48, 48)
    p.gap((-18.9, 37.8), (-2.9, 37.8), "#f8fafc")
    p.open_side((-18.9, 37.8), (-2.9, 37.8))
    p.note(-10.9, 37.3, "garage door", 10, "#334155")

    # the kitchen: the corner sink, the counters, the range, the island, the desk
    p.shape([(0.4, 0.4), (9.0, 0.4), (9.0, 2.4), (4.0, 2.4), (2.4, 4.0), (2.4, 9.0), (0.4, 9.0)], "#ffffff", "#b91c1c")
    p.oval(2.35, 2.35, 0.75, 0.5, "#fef2f2", "#b91c1c", -45)
    p.note(2.3, 2.6, "sink", 7, "#7f1d1d")
    p.thing(4.0, 0.45, 5.9, 2.35, "dw", "#ffffff", "#b91c1c", 7)
    p.thing(0.45, 5.8, 2.35, 7.7, "", "#ffffff", "#b91c1c")
    for cx, cy in ((0.95, 6.3), (1.85, 6.3), (0.95, 7.2), (1.85, 7.2)):
        p.oval(cx, cy, 0.28, 0.28, "#ffffff", "#7f1d1d")
    p.vnote(2.95, 6.75, "range", 7, "#7f1d1d")
    p.thing(0.45, 9.2, 2.5, 12.2, "", "#ffffff", "#b91c1c")
    p.vnote(1.45, 10.7, "fridge", 8, "#7f1d1d")
    p.thing(6.3, 5.0, 8.5, 9.0, "", "#fecaca", "#b91c1c")
    p.vnote(7.4, 7.0, "island", 8, "#7f1d1d")
    p.wall(5.3, 16.15, 12.4, 16.5)
    p.thing(5.3, 14.0, 9.0, 16.15, "desk", "#ffffff", "#b91c1c", 8)

    # the pantry and the laundry
    p.wall(9.0, 12.5, 9.25, 16.5)
    p.wall(9.0, 12.5, 9.6, 12.8)
    p.wall(11.4, 12.5, 12.4, 12.8)
    p.door(9.6, 12.65, 1.8, -70, 70)
    p.thing(-5.6, 8.0, -3.3, 10.3, "dryer", "#ffffff", "#334155", 7)
    p.thing(-3.1, 8.0, -0.8, 10.3, "washer", "#ffffff", "#334155", 7)
    p.wall(-8.65, 7.6, -8.4, 10.3)
    p.wall(-8.65, 15.0, -8.4, 16.3)
    p.over.append(p.rect(-11.15, 7.65, -8.65, 16.25, COLORS["storage"][0], "none"))
    p.open_side((-8.5, 10.3), (-8.5, 15.0))
    p.rod((-9.9, 8.0), (-9.9, 15.9))
    p.vnote(-10.55, 12.0, "closet", 8, "#14532d")

    # the stair: the foyer flight and the family room flight climb to one landing, and the run to the loft
    # leaves it; the basement door sits under the run's high end
    p.wall(12.1, 12.5, 12.4, 19.0)
    p.wall(12.1, 12.5, 19.7, 12.8)
    p.wall(15.2, 15.7, 19.7, 15.95)
    p.stairs(12.4, 19.0, 15.2, 22.8, 5, True, "up")
    p.stairs(15.2, 12.8, 19.7, 15.7, 5, False, "left")
    p.stairs(15.2, 15.95, 19.7, 19.0, 5, False, "right")
    p.rail([(12.25, 19.0), (12.25, 22.8)])
    p.note(17.45, 15.2, "up to the landing", 7, "#312e81")
    p.note(17.45, 18.55, "up to the loft", 7, "#312e81")
    p.door(19.75, 15.95, 2.9, 0, 90)
    p.note(22.5, 17.5, "basement door", 8, "#334155", "start")

    # the half bath, the coat closet, and the open sides of the foyer
    p.wall(15.2, 19.0, 20.4, 19.4)
    p.wall(15.2, 19.0, 15.6, 27.2)
    p.wall(20.0, 22.0, 20.4, 27.2)
    p.wall(15.6, 24.4, 20.0, 24.7)
    p.door(20.15, 19.5, 2.4, 180, -90)
    p.oval(16.45, 20.6, 0.6, 0.5)
    p.toilet(15.6, 23.3, "right")
    p.rod((15.9, 25.3), (19.7, 25.3))
    p.bifold(15.6, 20.0, 27.0)
    p.open_side((12.25, 22.8), (12.25, 32.6))
    p.wall(23.8, 19.2, 24.2, 24.8)
    p.open_side((24.0, 24.8), (24.0, 32.6))
    p.open_side((20.4, 19.2), (23.8, 19.2))
    p.wall(23.8, 19.0, 27.4, 19.4)
    p.wall(32.2, 19.0, 35.8, 19.4)
    p.open_side((27.4, 19.2), (32.2, 19.2))

    # the furniture, mocked up to be moved: the family's own pieces, a dining table still to buy
    pink, red, green = COLORS["gather"][1], COLORS["kitchen"][1], COLORS["storage"][1]
    p.sectional([(21.0, 3.0), (24.0, 3.0), (24.0, 10.0), (29.5, 10.0), (29.5, 13.0), (21.0, 13.0)],
                [(21.8, 3.0), (21.8, 12.2), (29.5, 12.2)], "sectional", (26.6, 11.55), pink)
    p.piece(25.5, 4.5, 29.5, 8.5, "coffee table", pink, 8)
    p.note(27.5, 7.25, "4 by 4 ft", 7, pink)
    # the breakfast table: a small rectangle, a bench down each long side, a chair at each end
    p.piece(12.35, 3.55, 16.85, 4.65, "bench", red, 7)
    p.piece(12.35, 8.15, 16.85, 9.25, "bench", red, 7)
    p.chair(11.4, 6.4, red)
    p.chair(17.8, 6.4, red)
    p.piece(12.1, 4.9, 17.1, 7.9, "table", red, 8)
    p.long_table(4.35, 22.0, 7.65, 28.0, "dining table, to buy", pink)
    p.piece(8.2, 16.55, 12.05, 18.5, "frog shelf", green, 8, fill="#f0fdf4")
    p.note(10.1, 18.15, "2 by 4 ft", 7, green)
    p.piece(28.0, 25.0, 32.0, 27.7, "train table", pink, 9)
    p.piece(34.55, 24.2, 35.55, 27.2, "bookshelf", pink, 8, turn=True)
    p.piece(28.5, 31.0, 31.5, 32.55, "toy chest", pink, 8)
    return p.svg("rear, the deck side", "garage side", "front, the street side · 1 square = 1 foot"), p.summary()


def upper_floor():
    p = Plan("upper", "The upper floor of the new house", (-1.4, -1.0, 38.4, 36.2), [(0.0, 0.0, 36.0, 35.0)])
    p.room("Primary bedroom", "primary", [(0.4, 14.6, 12.1, 24.4), (0.4, 24.4, 10.2, 29.5), (0.4, 29.5, 12.0, 32.6)], (6.1, 26.7), size=(12, 18))
    p.room("Primary bath", "primary", [(0.4, 0.4, 9.6, 6.8), (0.4, 6.8, 7.3, 14.3), (9.9, 0.4, 12.8, 6.8)], (4.9, 9.4), compact=True)
    p.room("Walk-in closet", "storage", [(7.6, 7.1, 12.5, 12.6), (7.6, 12.6, 12.1, 14.3)], (10.1, 9.55), compact=True, line2="")
    p.room("Infant's room", "bedroom", [(13.1, 0.4, 23.8, 10.0), (17.9, 10.0, 23.8, 12.4)], (18.1, 9.0), line2="bedroom 4, 11 by 11 ft")
    p.room("Toddler's room", "bedroom", [(24.2, 0.4, 35.6, 11.5), (24.2, 11.5, 27.8, 12.4)], (29.5, 6.0), line2="bedroom 3, 11 by 11 ft")
    p.room("Guest room", "bedroom", [(24.2, 21.9, 35.6, 32.6), (24.2, 19.4, 28.1, 21.9)], (30.0, 31.3), line2="bedroom 2, 12 by 11 ft")
    p.room("Hall bath", "bath", [(28.1, 14.3, 35.6, 19.0)], (31.0, 16.0), compact=True)
    p.room("Hall", "hall", [(19.6, 12.7, 27.8, 19.4)], (23.9, 16.6), compact=True, line2="")
    p.room("Loft", "loft", [(15.4, 19.4, 23.8, 24.0), (12.4, 24.0, 23.8, 34.6), (10.2, 24.7, 12.4, 29.5)], (18.6, 27.6))
    for name, rect, at in (("closet", (13.1, 10.0, 17.9, 12.4), (15.5, 12.05)), ("closet", (27.8, 11.6, 35.6, 14.0), (31.7, 13.3)),
                           ("closet", (28.1, 19.4, 35.6, 21.9), (31.7, 21.4)), ("linen", (18.0, 12.9, 19.6, 15.7), (18.8, 14.6)),
                           ("linen", (0.4, 12.2, 2.3, 14.3), (1.35, 13.5))):
        p.under.append(p.rect(*rect, COLORS["storage"][0]))
        p.note(*at, name, 8, "#14532d")

    p.shell([(0.2, 0.2), (35.8, 0.2), (35.8, 32.8), (24.0, 32.8), (24.0, 34.8), (12.2, 34.8), (12.2, 32.8), (0.2, 32.8)])
    p.walls.append(p.rect(35.8, 7.2, 37.2, 12.2, "#e2e8f0", "#1e293b", 2.5))
    p.vnote(36.5, 9.7, "chimney", 7, "#334155")
    for a, b in (((0.8, 0.2), (4.7, 0.2)), ((0.2, 1.0), (0.2, 5.0)), ((17.3, 0.2), (20.2, 0.2)), ((28.2, 0.2), (31.3, 0.2)),
                 ((3.2, 32.8), (6.05, 32.8)), ((6.15, 32.8), (9.0, 32.8)), ((16.8, 34.8), (19.6, 34.8)),
                 ((27.5, 32.8), (30.3, 32.8)), ((30.4, 32.8), (33.2, 32.8))):
        p.glass(a, b)

    # the primary bath: the corner tub under two windows, the shower, the toilet room, the double vanity
    p.shape([(0.4, 0.4), (5.4, 0.4), (5.4, 3.4), (2.3, 5.4), (0.4, 5.4)], "#ffffff", "#0f766e")
    p.oval(2.65, 2.55, 1.9, 1.25, "#f0fdfa", "#0f766e", -25)
    p.note(2.65, 2.8, "tub", 8, "#0f766e")
    p.thing(5.6, 0.45, 9.4, 3.4, "", "#ffffff", "#0f766e")
    p.over.append(f'<path d="M {p.X(5.6):.1f} {p.Y(0.45):.1f} L {p.X(9.4):.1f} {p.Y(3.4):.1f} M {p.X(9.4):.1f} {p.Y(0.45):.1f} L {p.X(5.6):.1f} {p.Y(3.4):.1f}" stroke="#99f6e4" stroke-width="1"/>')
    p.note(7.5, 2.15, "shower", 8, "#0f766e")
    p.thing(0.45, 5.45, 2.3, 11.9, "", "#ffffff", "#0f766e")
    p.oval(1.35, 6.7, 0.5, 0.65)
    p.oval(1.35, 10.75, 0.5, 0.65)
    p.vnote(1.35, 8.7, "double vanity", 7, "#0f766e")
    p.wall(9.6, 0.4, 9.9, 4.4)
    p.door(9.75, 6.65, 2.25, 0, -90)
    p.toilet(11.4, 0.45, "down")
    p.note(11.4, 4.3, "toilet", 8, "#0f766e")
    p.wall(7.3, 6.8, 12.8, 7.1)
    p.wall(7.3, 6.8, 7.6, 10.3)
    p.wall(7.3, 12.6, 7.6, 14.6)
    p.door(7.45, 10.3, 2.3, 0, 90)
    p.rod((7.9, 8.0), (12.1, 8.0))
    p.rod((7.9, 13.9), (11.8, 13.9))
    p.wall(0.4, 11.9, 2.6, 12.2)
    p.door(2.4, 12.3, 1.8, 40, 50)
    p.wall(0.4, 14.3, 3.2, 14.6)
    p.wall(7.2, 14.3, 12.4, 14.6)
    p.door(3.2, 14.45, 2.0, -35, 35)
    p.door(7.2, 14.45, 2.0, -145, -35)

    # the walls between the suite, bedroom 4 and the stair
    p.wall(12.8, 0.4, 13.1, 12.7)
    p.wall(12.1, 12.4, 21.2, 12.7)
    p.wall(12.1, 12.4, 12.4, 24.7)
    p.wall(23.7, 12.4, 24.2, 12.7)
    p.wall(23.8, 0.4, 24.2, 12.7)
    p.door(23.7, 12.55, 2.4, -90, -90)
    p.wall(13.1, 9.85, 14.2, 10.15)
    p.wall(17.6, 9.85, 17.9, 12.4)
    p.slide(14.2, 17.6, 10.0)
    p.rod((13.4, 11.2), (17.4, 11.2))

    # bedroom 3, the hall bath and bedroom 2, with their closets
    p.door(24.3, 12.55, 2.5, -90, 90)
    p.wall(26.8, 12.4, 28.1, 12.7)
    p.wall(27.8, 11.35, 29.0, 11.65)
    p.wall(34.5, 11.35, 35.6, 11.65)
    p.slide(29.0, 34.5, 11.5)
    p.rod((28.2, 12.9), (35.3, 12.9))
    p.wall(27.8, 11.35, 28.1, 14.6)
    p.wall(27.8, 14.0, 35.6, 14.3)
    p.door(27.95, 14.6, 2.2, 0, 90)
    p.wall(27.8, 16.85, 28.1, 19.4)
    p.thing(28.1, 17.0, 30.7, 19.0, "", "#ffffff", "#0f766e")
    p.oval(29.4, 18.0, 0.65, 0.45)
    p.toilet(31.5, 19.0, "up")
    p.tub(32.4, 14.3, 35.6, 19.0)
    p.wall(27.8, 19.0, 35.6, 19.4)
    p.rod((28.4, 20.6), (35.3, 20.6))
    p.wall(27.8, 19.4, 28.1, 22.0)
    p.wall(28.1, 21.75, 29.0, 22.05)
    p.wall(34.5, 21.75, 35.6, 22.05)
    p.slide(29.0, 34.5, 21.9)
    p.wall(23.8, 19.0, 24.8, 19.4)
    p.wall(23.8, 19.0, 24.2, 32.8)
    p.door(24.8, 19.4, 2.6, 90, -90)

    # the stair well: the run from the loft, the family room flight and the foyer flight seen from above, the landing below
    p.stairs(12.4, 12.7, 15.4, 19.4, 1, True, fill="#e0e7ff")
    p.labels.append(f'<text x="{p.X(13.9):.1f}" y="{p.Y(16.2):.1f}" font-size="11" font-weight="700" fill="#3730a3" text-anchor="middle">Landing</text>')
    p.stairs(15.4, 12.7, 18.0, 15.9, 3, False, fill="#e0e7ff")
    p.stairs(15.4, 15.9, 19.6, 19.4, 5, False, "left")
    p.note(17.5, 18.95, "down", 8, "#312e81")
    p.stairs(12.4, 19.4, 15.4, 24.0, 6, True, "down", fill="#e0e7ff")
    p.rail([(15.4, 24.0), (15.4, 19.4), (19.6, 19.4)])
    p.rail([(12.4, 24.0), (15.4, 24.0)])
    p.wall(17.85, 12.7, 18.05, 15.95)
    p.wall(17.85, 15.75, 19.6, 15.95)
    p.door(19.7, 15.55, 1.9, 0, -90)

    # the loft: double doors into the primary bedroom from a recess on its garage side
    p.wall(10.1, 24.4, 12.4, 24.7)
    p.wall(10.1, 29.5, 12.4, 29.8)
    p.wall(12.0, 29.5, 12.4, 33.0)
    p.door(10.3, 24.7, 2.4, 0, 90)
    p.door(10.3, 29.5, 2.4, 0, -90)

    # the furniture, mocked up to be moved
    violet, blue, fuchsia = COLORS["primary"][1], COLORS["bedroom"][1], COLORS["loft"][1]
    # the primary bedroom: the king bed inside the doors on the right, its head on that wall, facing the
    # television on the garage-side wall above a dresser, an end table each side, a second dresser by the windows
    p.bed(5.1, 16.4, 12.05, 22.6, "right", "king bed", violet, 10)
    p.piece(10.55, 14.7, 12.05, 16.3, "", violet)
    p.piece(10.55, 22.7, 12.05, 24.3, "", violet)
    p.vnote(11.3, 15.5, "end", 7, violet)
    p.vnote(11.3, 23.5, "end", 7, violet)
    p.piece(0.45, 16.9, 2.05, 22.1, "dresser, television above", violet, 7, turn=True)
    p.wall_tv(0.42, 17.2, 21.8, violet)
    p.piece(0.45, 25.4, 2.05, 29.4, "dresser", violet, 8, turn=True)
    # the infant's room: the crib, its changing table attached at the door end, on the wall shared with the
    # toddler, not the one behind the primary toilet, and off the window wall; a glider in the corner
    p.crib(21.35, 2.6, 23.75, 7.0, blue)
    p.piece(21.35, 7.0, 23.75, 9.3, "changer", blue, 8, turn=True)
    p.over.append(f'<circle cx="{p.X(14.75):.1f}" cy="{p.Y(2.05):.1f}" r="{1.2 * S:.1f}" fill="#ffffff" stroke="{blue}" stroke-width="1.4"/>')
    p.note(14.75, 2.3, "glider", 8, blue)
    # the toddler's room: the bed in the corner, two walls to roll against, a dresser and a low shelf
    p.bed(32.9, 0.45, 35.55, 5.2, "up", "toddler bed", blue, 8)
    p.piece(24.25, 3.0, 25.85, 7.0, "dresser", blue, 8, turn=True)
    p.piece(34.35, 6.2, 35.55, 10.2, "books and toys", blue, 7, turn=True)
    # the guest room: a full bed, 54 by 75 inches in a frame, its head on the far wall, end tables, a dresser
    p.bed(28.95, 24.9, 35.55, 29.6, "right", "full bed", blue, 9)
    p.piece(34.05, 23.25, 35.55, 24.8, "", blue)
    p.piece(34.05, 29.7, 35.55, 31.25, "", blue)
    p.vnote(34.8, 24.0, "end", 7, blue)
    p.vnote(34.8, 30.5, "end", 7, blue)
    p.piece(24.25, 24.8, 25.85, 28.8, "dresser", blue, 8, turn=True)
    # the frogs' other possible spot, against the guest room wall
    p.piece(21.75, 26.0, 23.75, 30.0, "frogs, other spot", fuchsia, 7, turn=True, fill="#fdf4ff", dash="4,3")
    return p.svg("rear, over the deck", "garage side", "front, the street side · 1 square = 1 foot"), p.summary()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = []
    for name, draw in (("main.svg", main_floor), ("upper.svg", upper_floor)):
        svg, summary = draw()
        (OUT / name).write_text(svg, encoding="utf-8", newline="\n")
        report.append(summary)
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
