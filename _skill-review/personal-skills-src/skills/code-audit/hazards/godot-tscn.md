# Godot .tscn hazards

Load when auditing `.tscn` files.

## Parse / syntax (BLOCK)

### `#` comments are illegal

The .tscn parser reads `#` as the start of a hex color code. A stray `# comment` line produces "Invalid color code: #" and "Unexpected end of file" at that line.

```ini
# BAD - parse error
[node name="Root" type="Node2D"]
# this is a comment about Root
script = ExtResource("1_ab12c")
```

Fix: embed any explanatory note in a node `name` instead, or strip the comment.

```ini
# GOOD
[node name="RootMovedFromOldTscn" type="Node2D"]
script = ExtResource("1_ab12c")
```

Detection: `checks/godot_tscn_comments.py`. Hit BR v0.31.2 on the six HBH enemy .tscn stubs.

### Stale ExtResource paths after rename

When a `.gd` file gets renamed, .tscn files that reference it via `ExtResource("...path...")` still point at the old path. Godot then reports "Failed to load resource" at scene load.

Fix: grep all .tscn files for the old path and update.

## UID format (BLOCK)

Godot's UID format is `uid://b` followed by exactly 12 base-32 characters (lowercase letters minus `i` `l` `o`, digits minus `0` `1`). 13 total chars after `uid://`.

```
# BAD - 14-char uuid-hex; Godot rejects as "Unrecognized UID"
uid://b1234567890abcd
```

Fix: empty the `.uid` sidecar file. Godot regenerates it on first open.

Detection: `checks/godot_uid_format.py`. Hit BR v0.30.0.
