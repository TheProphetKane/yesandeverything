"""Single-flight read-modify-write for .work-queue.json, for python writers.

WHY: queue-edit.ps1 has implemented a correct .work-queue.lock protocol since it
was written, and no live writer has ever taken it. Both hourly routines write the
queue with inline python and no lock, so the lost-update race the lock was built
for is still live -- docs/QUEUE_TRIAGE.md records a removal that did not stick
because a later writer rebuilt from a stale read.

This module gives the python writers the SAME lock, so every writer serializes on
one file regardless of language:

  acquire .work-queue.lock by atomic O_CREAT|O_EXCL, write "pid|utc|host"
  break a lock older than 30s
  retry with jittered backoff up to 15s, then fail rather than race
  read -> mutate -> atomic tmp+rename -> readback -> release

Hold the lock only for the file mutation, never across a running prompt.

Usage:

    from queue_write import edit

    def bump(q):
        for it in q["items"]:
            if it["id"] == some_id:
                it["status"] = "completed"
        return q

    edit(bump)

`edit` returns the queue it wrote. Raises on lock timeout or a failed readback;
both mean the caller must NOT assume its write landed.
"""
import errno
import io
import json
import os
import random
import socket
import time
import datetime

QUEUE_PATH = r"X:\YesAndEverything\.work-queue.json"
LOCK_PATH = r"X:\YesAndEverything\.work-queue.lock"
STALE_SECONDS = 30.0
TIMEOUT_SECONDS = 15.0
WRITE_ATTEMPTS = 5


class QueueLockBusy(RuntimeError):
    pass


class QueueWriteFailed(RuntimeError):
    pass


def _acquire():
    deadline = time.time() + TIMEOUT_SECONDS
    while True:
        try:
            fd = os.open(LOCK_PATH, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            stamp = "%d|%s|%s" % (
                os.getpid(),
                datetime.datetime.utcnow().isoformat() + "Z",
                socket.gethostname(),
            )
            os.write(fd, stamp.encode("utf-8"))
            os.close(fd)
            return
        except OSError as e:
            if e.errno != errno.EEXIST:
                raise
            try:
                age = time.time() - os.path.getmtime(LOCK_PATH)
                if age > STALE_SECONDS:
                    os.unlink(LOCK_PATH)
                    continue
            except OSError:
                # Lock vanished under us; loop round and try to take it.
                continue
            if time.time() > deadline:
                raise QueueLockBusy(
                    "queue lock busy > %ds; aborting rather than racing another writer"
                    % int(TIMEOUT_SECONDS)
                )
            time.sleep(0.08 + random.random() * 0.14)


def _release():
    try:
        os.unlink(LOCK_PATH)
    except OSError:
        pass


def _read():
    if not os.path.exists(QUEUE_PATH):
        return {"items": [], "updated": ""}
    with io.open(QUEUE_PATH, encoding="utf-8") as f:
        return json.load(f)


def _write(q):
    """Atomic write with readback, retried. The FUSE mount can land a truncated
    file or serve a stale read straight after a rename, so a write is not done
    until the file on disk reads back byte-identical AND parses."""
    q["updated"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ")
    body = json.dumps(q, indent=2, ensure_ascii=False) + "\n"
    tmp = QUEUE_PATH + ".tmp"
    for _ in range(WRITE_ATTEMPTS):
        with io.open(tmp, "w", encoding="utf-8", newline="") as f:
            f.write(body)
        with io.open(tmp, encoding="utf-8") as f:
            json.load(f)  # parse before it may replace the live file
        os.replace(tmp, QUEUE_PATH)
        with io.open(QUEUE_PATH, encoding="utf-8") as f:
            got = f.read()
        if got == body:
            return q
        time.sleep(0.3)  # let a stale read settle, then rewrite
    raise QueueWriteFailed(
        "readback verify failed after %d attempts (FUSE truncation or stale read); "
        "the queue on disk may not match what was intended" % WRITE_ATTEMPTS
    )


def edit(mutator):
    """Take the lock, read the queue, hand it to `mutator`, write what it returns."""
    _acquire()
    try:
        q = _read()
        q.setdefault("items", [])
        out = mutator(q)
        if out is None:
            raise ValueError("mutator returned None; it must return the queue")
        return _write(out)
    finally:
        _release()


def read():
    """Lock-free read. Fine for reporting; never use it as the basis of a write."""
    return _read()
