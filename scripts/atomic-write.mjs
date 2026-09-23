// The one atomic writer, shared.
//
// This mount truncates a large write mid-flight, which is a hazard both this
// project and its siblings have been bitten by. Every script that rewrites a
// tracked file goes through here rather than a raw writeFileSync: write to a
// sibling temp file on the same volume, rename it over the target (atomic on the
// same filesystem, unlike a direct write that can be caught halfway), then read
// the target back and confirm it holds exactly what was intended. A mismatch
// throws naming the path instead of shipping a silently short file.
//
// Lifted out of update-project-pages.mjs on 2026-09-22 (bar-raise
// reliability-03), when rotate-gate-phrase.mjs turned out to be rewriting every
// design page with a plain write. Two copies of this function would have been
// the obvious fix and the wrong one: the next script to rewrite a page would
// have had two to choose from and no reason to prefer either.

import { readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";

export function writeFileAtomic(p, content) {
  const tmp = `${p}.tmp-${process.pid}`;
  try {
    writeFileSync(tmp, content, "utf8");
    renameSync(tmp, p);
  } catch (e) {
    try { unlinkSync(tmp); } catch {}
    throw e;
  }
  const onDisk = readFileSync(p, "utf8");
  if (onDisk !== content) {
    throw new Error(`writeFileAtomic: verification failed, ${p} does not match the content just written`);
  }
}
