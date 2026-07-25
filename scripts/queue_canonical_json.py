"""Render the work queue in its canonical on-disk shape.

Every writer of .work-queue.json except queue-edit.ps1 is python, and they all
emit json.dumps(indent=2, ensure_ascii=False) with a trailing newline. PS 5.1's
ConvertTo-Json emits 4-space indent, colon padding, and \\u0027 for every one of
the ~1300 apostrophes in the file, which rewrites the whole ~600 KB into a shape
nothing else produces (+17% size) and makes the diff unreadable.

So queue-edit.ps1 keeps the lock, the read-modify-write and the readback, and
hands the object here to be rendered. Reads compact JSON from argv[1], writes
canonical JSON to argv[2].

Usage: python queue_canonical_json.py <in.json> <out.json>
"""
import io
import json
import sys


def main():
    if len(sys.argv) != 3:
        sys.stderr.write(__doc__)
        return 2
    src, dst = sys.argv[1], sys.argv[2]
    with io.open(src, encoding="utf-8") as f:
        data = json.load(f)
    body = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    with io.open(dst, "w", encoding="utf-8", newline="") as f:
        f.write(body)
    # Prove the rendered file parses back to the same object before the caller
    # is allowed to move it over the live queue.
    with io.open(dst, encoding="utf-8") as f:
        if json.load(f) != data:
            sys.stderr.write("canonical render did not round-trip\n")
            return 1
    return 0


sys.exit(main())
