// Prints the source hash deploy.ps1 stamps into the Worker and check-dashboard-live.ps1
// compares against the live version route. Line endings are normalised so a checkout
// setting cannot change the hash.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const files = ["src/worker.js", "src/auth.js", "src/attempts.mjs"];
const h = createHash("sha256");
for (const f of files) {
  h.update(f + "\n");
  h.update(readFileSync(join(here, f), "utf8").replace(/\r\n/g, "\n"));
}
process.stdout.write(h.digest("hex").slice(0, 16) + "\n");
