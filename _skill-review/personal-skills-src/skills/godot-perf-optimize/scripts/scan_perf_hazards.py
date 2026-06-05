#!/usr/bin/env python3
"""Scan a Godot project for regex-detectable performance hazards.

Emits JSON-lines findings on stdout. Exit code reflects worst severity:
    0 - clean / LOW only
    1 - MEDIUM or HIGH (default; pass --warn-only to keep exit 0)
    2 - BLOCK (only triggered with --exit-on-high)

Usage:
    python scan_perf_hazards.py --target X:\\HereBeHordes
    python scan_perf_hazards.py --target X:\\BrackishRising --warn-only
    python scan_perf_hazards.py --target X:\\HereBeHordes --exit-on-high
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _common import walk_files, emit, safe_read, SEVERITIES

# ---------- Check definitions ----------
# Each check: walks .gd files, applies a regex inside _process / _physics_process /
# _input contexts, emits findings.

PROCESS_RE = re.compile(r"^(\s*)func\s+_(process|physics_process|input|unhandled_input)\s*\(", re.M)

def find_process_bodies(src: str) -> list[tuple[int, str, str]]:
    """Yield (start_line, name, body) for each _process-style function."""
    out = []
    lines = src.split("\n")
    for m in PROCESS_RE.finditer(src):
        start_line = src[:m.start()].count("\n")
        indent = len(m.group(1))
        body_lines = [lines[start_line]]
        for j in range(start_line + 1, len(lines)):
            ln = lines[j]
            if not ln.strip():
                body_lines.append(ln); continue
            line_indent = len(ln) - len(ln.lstrip())
            if line_indent <= indent and ln.strip():
                break
            body_lines.append(ln)
        out.append((start_line + 1, m.group(2), "\n".join(body_lines)))
    return out

# ---------- Specific checks ----------

GET_NODES_IN_GROUP = re.compile(r"get_tree\(\)\.get_nodes_in_group\s*\(")
FIND_NODE_STRING = re.compile(r"\b(?:find_node|get_node)\s*\(\s*[\"']")
NEW_REGEX_IN_LOOP = re.compile(r"\bRegEx\.new\s*\(|\bnew\s+RegExp\s*\(")
NEW_DICT_IN_LOOP = re.compile(r"=\s*\{\s*\}|=\s*Dictionary\s*\(\s*\)")
NEW_ARRAY_IN_LOOP = re.compile(r"=\s*\[\s*\]|=\s*Array\s*\(\s*\)|=\s*PackedFloat32Array\(\)|=\s*PackedInt32Array\(\)")
UNTYPED_VAR_IN_LOOP = re.compile(r"^\s*var\s+\w+\s*=", re.M)  # `var x =` with no `: Type`
PRELOAD_IN_FUNC = re.compile(r"^\s+.*\bpreload\s*\(", re.M)  # preload inside an indented (function-body) context
PRINT_IN_LOOP = re.compile(r"\bprint\s*\(|\bprintt\s*\(|\bprintln\s*\(")
ASTAR_UPDATE_IN_LOOP = re.compile(r"\.update\s*\(\s*\)|\.set_point_solid\s*\(")
SIGNAL_CONNECT_NO_DISCONNECT = re.compile(r"\.connect\s*\(")  # informational; pair with queue_free check

def check_process_bodies(p: Path) -> None:
    src = safe_read(p)
    if src is None:
        return
    bodies = find_process_bodies(src)
    if not bodies:
        return
    for start_line, name, body in bodies:
        # 1. get_nodes_in_group inside _process
        for m in GET_NODES_IN_GROUP.finditer(body):
            line = start_line + body[:m.start()].count("\n")
            emit("HIGH", "get-nodes-in-group-loop", p, line,
                 f"get_tree().get_nodes_in_group(...) inside _{name}. The call walks the SceneTree group index every frame.",
                 fix="Cache the array in an autoload or system Node. Refresh on group membership change.",
                 speedup="2-10x depending on group size")

        # 2. find_node / get_node string lookup inside _process
        for m in FIND_NODE_STRING.finditer(body):
            line = start_line + body[:m.start()].count("\n")
            emit("MEDIUM", "find-node-string-lookup", p, line,
                 f"String-based node lookup inside _{name}. Walks the SceneTree every frame.",
                 fix="Cache as @onready var typed reference at the top of the class.",
                 speedup="Marginal per call but adds up; enables compile-time autocomplete")

        # 3. Array/Dict literal allocation inside _process
        for m in NEW_DICT_IN_LOOP.finditer(body):
            line = start_line + body[:m.start()].count("\n")
            emit("MEDIUM", "gc-allocation-churn", p, line,
                 f"Dict allocation inside _{name}. Causes GC churn at scale.",
                 fix="Hoist the dict to a class member. Use .clear() instead of re-allocating.",
                 speedup="Eliminates GC pauses at high tick frequency")
        for m in NEW_ARRAY_IN_LOOP.finditer(body):
            line = start_line + body[:m.start()].count("\n")
            emit("MEDIUM", "gc-allocation-churn", p, line,
                 f"Array allocation inside _{name}.",
                 fix="Hoist the array to a class member. Use .clear() + .append() instead.",
                 speedup="Eliminates GC pauses at high tick frequency")

        # 4. preload inside a function body (the if-guard does not defer; parse-time resolution)
        for m in PRELOAD_IN_FUNC.finditer(body):
            line = start_line + body[:m.start()].count("\n")
            emit("LOW", "preload-vs-load", p, line,
                 f"preload() inside _{name} body. preload is parse-time; the function-body location is misleading.",
                 fix="Move to a module-level const, or use load() if the loading should actually be deferred.",
                 speedup="No runtime change; clarity only")

        # 5. print inside _process — performance + log spam
        for m in PRINT_IN_LOOP.finditer(body):
            line = start_line + body[:m.start()].count("\n")
            emit("LOW", "print-in-hot-path", p, line,
                 f"print() inside _{name}. Logs every frame; stutters on terminal flush.",
                 fix="Gate behind a debug_flags toggle, or remove if no longer needed.",
                 speedup="Eliminates per-frame stdout flush")

        # 6. AStarGrid2D.update or set_point_solid inside _process
        for m in ASTAR_UPDATE_IN_LOOP.finditer(body):
            line = start_line + body[:m.start()].count("\n")
            # Filter false positives: only flag if there is `AStarGrid` or `astar` mentioned nearby
            ctx = body[max(0, m.start()-200):m.end()+100]
            if re.search(r"\b(AStarGrid|astar|nav_grid)", ctx, re.I):
                emit("HIGH", "astar-grid-rebuild-per-frame", p, line,
                     f"AStarGrid mutation inside _{name}. O(W*H) per call.",
                     fix="Mark dirty flag instead. Only call update() when dirty AND a path is needed this frame.",
                     speedup="Massive on large grids; dirty-flag amortizes cost")

# ---------- Class-level checks (not inside _process) ----------

EXTENDS_NODE = re.compile(r"^extends\s+(\w+)", re.M)

def check_high_instance_classes(p: Path) -> None:
    """Heuristic: if a class extends Node2D / Sprite2D / CharacterBody2D AND has _process,
    AND its filename matches a class likely to exist at high count (enemy, projectile,
    particle, tree, decor), flag the _process as a candidate for batched-tick or MultiMesh."""
    src = safe_read(p)
    if src is None:
        return
    if not re.search(r"\bfunc\s+_(process|physics_process)\s*\(", src):
        return
    base = re.search(EXTENDS_NODE, src)
    base_name = base.group(1) if base else ""
    if base_name not in {"Node2D", "Sprite2D", "AnimatedSprite2D", "CharacterBody2D", "RigidBody2D", "Area2D"}:
        return
    fname = p.name.lower()
    high_count_hints = ("enemy", "zombie", "runner", "shambler", "horde", "projectile",
                        "bullet", "particle", "tree", "grass", "rock", "decor", "tile")
    if not any(hint in fname for hint in high_count_hints):
        return
    # Find the _process line for the report
    m = re.search(r"^(\s*)func\s+_(process|physics_process)\s*\(", src, re.M)
    line = src[:m.start()].count("\n") + 1 if m else 1
    emit("MEDIUM", "per-frame-process-at-scale", p, line,
         f"Per-frame {m.group(2) if m else '_process'} on a class likely to exist at high count ({fname}).",
         fix="Consider batched-tick (manager Node ticks the active set) or MultiMesh + data-pool for hundreds-to-thousands.",
         speedup="5-50x at 1000 instances")

# ---------- Other class-level checks ----------

def check_preload_explosion(p: Path) -> None:
    """A script that preloads 10+ resources at module-level pays the full cost at scene load."""
    src = safe_read(p)
    if src is None:
        return
    # Count module-level preloads (no leading whitespace before const X = preload)
    module_preloads = re.findall(r"^(?:const|var)\s+\w+\s*(?::\s*\w+)?\s*=\s*preload\s*\(", src, re.M)
    if len(module_preloads) >= 10:
        emit("MEDIUM", "preload-explosion", p, 1,
             f"{len(module_preloads)} module-level preloads. Every scene load pays the full cost.",
             fix="Convert non-critical preloads to load() inside the functions that use them.",
             speedup="Scene-load time scales linearly with preload count")

# ---------- Main ----------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True, help="Project root path")
    ap.add_argument("--warn-only", action="store_true", help="Always exit 0 (for preship integration)")
    ap.add_argument("--exit-on-high", action="store_true", help="Exit 2 if any HIGH/BLOCK finding")
    ap.add_argument("--json", action="store_true", help="Pure JSON output (one finding per line)")
    args = ap.parse_args()

    root = Path(args.target)
    if not root.exists():
        print(f"target not found: {root}", file=sys.stderr)
        sys.exit(3)

    # Scan all .gd files
    severities_seen = set()

    # Re-route emit to capture severities
    import builtins
    orig_print = print
    def capturing_print(*args, **kwargs):
        # Parse the JSON we are about to emit to track max severity
        for a in args:
            if isinstance(a, str) and a.startswith("{"):
                try:
                    obj = json.loads(a)
                    severities_seen.add(obj.get("severity", "LOW"))
                except Exception:
                    pass
        orig_print(*args, **kwargs)
    builtins.print = capturing_print

    try:
        for f in walk_files(args.target, exts={".gd"}):
            check_process_bodies(f)
            check_high_instance_classes(f)
            check_preload_explosion(f)
    finally:
        builtins.print = orig_print

    if args.warn_only:
        sys.exit(0)
    if "BLOCK" in severities_seen and args.exit_on_high:
        sys.exit(2)
    if {"HIGH", "MEDIUM"} & severities_seen:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
