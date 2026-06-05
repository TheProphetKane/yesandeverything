# Profiler workflow

How to capture and read Godot 4 performance data. Reference this whenever the user reports a symptom but has not provided measurements.

## When to ask for profiler data vs. when to suggest the obvious

If the user reports a SPECIFIC code path ("my AI scan is slow"), the catalog pattern is usually enough — skip the profiler ceremony.

If the user reports a SYMPTOM without a code-pointer ("the game lags at wave 5"), get profiler data BEFORE guessing. Speculation past 2 fix attempts on the same symptom is the documented anti-pattern (see HBH memory `debugging_discipline`). The 11-patch v0.74.22-v0.74.32 cycle was burned because the wrong path was being optimized — measurement first would have saved the cycle.

## Capture flow (5 minutes)

### Option A: Editor profiler

1. Open the project in the Godot editor.
2. Run the game (F5 for the main scene, or F6 for the current scene).
3. While the game is running, in the editor: **Debug menu -> Profiler**.
4. Click **Start** at the top of the profiler panel.
5. Reproduce the slow scenario in the game (spawn the wave, trigger the lag, etc.).
6. Click **Stop**.
7. The "Frame Time (sec)" graph shows the per-frame cost. Hover for the cost breakdown.
8. The "Functions" table sorted by "Time (s)" descending shows the hot functions.

What to capture for the skill:
- Top 10 functions by "Self Time (s)"
- Average frame time (peak too, if the symptom is hitching not constant slowness)
- Visual profiler delta if running 3D (Debug -> Visual Profiler)

### Option B: In-game overlay

For when the editor profiler is overhead-distorting the numbers, or when capturing on a release build.

Drop this into an autoload (e.g., `source/autoloads/perf_overlay.gd`):

```gdscript
extends CanvasLayer

@onready var label: Label = Label.new()

func _ready() -> void:
    add_child(label)
    label.position = Vector2(8, 8)
    label.add_theme_color_override("font_color", Color.WHITE)
    label.add_theme_color_override("font_outline_color", Color.BLACK)
    label.add_theme_constant_override("outline_size", 2)
    label.z_index = 1000

func _process(_dt: float) -> void:
    if not visible:
        return
    var fps: float = Engine.get_frames_per_second()
    var frame_time_ms: float = 1000.0 / max(1.0, fps)
    var draw_calls: int = RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME)
    var process_time: float = Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0
    var physics_time: float = Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0
    var nav_time: float = Performance.get_monitor(Performance.TIME_NAVIGATION_PROCESS) * 1000.0
    var nodes: int = Performance.get_monitor(Performance.OBJECT_NODE_COUNT)
    label.text = "FPS %d (%.2f ms)  draws %d  proc %.2f  phys %.2f  nav %.2f  nodes %d" % [
        int(fps), frame_time_ms, draw_calls, process_time, physics_time, nav_time, nodes
    ]
```

Toggle visible via a debug key. Costs <0.05ms per frame to display.

### Option C: Programmatic capture

For automation (e.g., a CI perf-regression test):

```gdscript
# Capture N frames of perf data and write to a file
extends Node

const N_FRAMES: int = 600  # 10s at 60fps
var samples: PackedFloat32Array = PackedFloat32Array()
var captured: int = 0

func _process(_dt: float) -> void:
    if captured >= N_FRAMES:
        if captured == N_FRAMES:
            _write_capture()
            captured += 1  # mark done
        return
    samples.append(Performance.get_monitor(Performance.TIME_PROCESS))
    captured += 1

func _write_capture() -> void:
    var f := FileAccess.open("user://perf_capture.csv", FileAccess.WRITE)
    f.store_line("frame_process_time_seconds")
    for s in samples:
        f.store_line(str(s))
    f.close()
    print("wrote ", N_FRAMES, " samples to user://perf_capture.csv")
```

## Reading profiler output

### Function table

- **Self Time** -- time spent IN this function, excluding child calls. This is what you want for hot-path identification.
- **Total Time** -- self + children. Useful for spotting deep call chains.
- **Calls** -- if a function shows up with millions of calls per frame, that itself is the finding (probably called in a loop).

The function with the highest **Self Time** is usually NOT the right fix target if it is `_process` or `_physics_process` of a major class -- those are aggregations. Drill into the children.

### Frame time graph

- **Average** -- the steady-state cost. Fix this if it exceeds the budget (16.67ms for 60fps, 8.33ms for 120fps).
- **Peaks** -- the spikes. Fix these if the user reports hitching/stutter.
- **Trend** -- if frame time grows over the capture window, you have either a leak (memory or signal-connection) or an accumulating allocation.

## Performance.get_monitor values worth knowing

| Monitor | What it tells you |
|---|---|
| `TIME_FPS` | Current FPS |
| `TIME_PROCESS` | Per-frame _process time (seconds) |
| `TIME_PHYSICS_PROCESS` | Per-frame _physics_process time |
| `TIME_NAVIGATION_PROCESS` | Per-frame nav cost (relevant for AStarGrid2D usage) |
| `MEMORY_STATIC` | Static memory in bytes (Godot's own) |
| `MEMORY_STATIC_MAX` | Peak static memory |
| `OBJECT_COUNT` | Total Object count (Resource + Node) |
| `OBJECT_NODE_COUNT` | Total Node count -- watch for leaks here |
| `RENDER_TOTAL_OBJECTS_IN_FRAME` | Total render objects (3D) |
| `RENDER_TOTAL_DRAW_CALLS_IN_FRAME` | Draw calls -- target <2000 on integrated GPU |
| `RENDER_VIDEO_MEM_USED` | GPU memory used |
| `PHYSICS_2D_ACTIVE_OBJECTS` | Active physics bodies -- if this grows unboundedly, leak |

## Common false reads

**"My CPU profiler shows everything is fast but frame time is high"** -- you are GPU-bound. Look at draw calls + overdraw + shader cost, not CPU functions.

**"_process is the top function"** -- expected. Drill into its callees. `_process` itself is just the dispatch.

**"This function is slow because Self Time is high"** -- check Calls first. A function called 10000x at 5us each shows up as 50ms but the fix is probably "stop calling it 10000 times" not "make it faster".

**"Memory keeps growing"** -- check `OBJECT_NODE_COUNT` over time. If it grows, you have leaked Nodes (probably a signal connection holding a reference, or a Timer that never gets queue_freed). If memory grows but node count is stable, it is a Resource leak (textures, audio streams).

**"The editor profiler is too slow / distorting numbers"** -- export a debug build and capture with the in-game overlay (Option B). The overlay is ~0.05ms/frame, vs the editor profiler which can add 5-20ms.

## Capture-to-fix protocol

After the user provides profiler data:

1. **Identify the top 3 hot paths by Self Time** (excluding `_process` / `_physics_process` aggregators).
2. **For each, look up the matching pattern** in `optimization-patterns.md`.
3. **Estimate impact**: how much frame budget does this consume? At target N (e.g., 1000 enemies), how much will the fix save?
4. **Propose the highest-impact LOW-risk fix first.** Land it, re-capture, compare.
5. **Only then move to medium/high-risk fixes.** Each one gets its own capture before declaring done.

Do NOT bundle multiple perf fixes into one commit. The OPTIMIZATION_LOG row needs a clean before/after to be useful for future reference.

## When to give up and accept the cost

Some hot paths have already been optimized to the floor for their pattern. If the catalog has no further pattern and the cost is dominated by an irreducible cost (e.g., 1000 enemies pathfinding = 1000 A* runs no matter what), the fix is to change the SCENARIO (reduce N, reduce frequency) not the code.

Pattern: when the OPTIMIZATION_LOG.md "Tried but rejected" section already has 2+ entries for this hot path, escalate to design (reduce the count) instead of trying a 4th optimization angle.
