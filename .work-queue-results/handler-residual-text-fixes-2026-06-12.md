# handler-residual-text-fixes-2026-06-12 - drained 2026-06-12 loop tick

Three residual fixes from HANDLER_AUDIT-2026-06-12.md, all verified against repo state before applying:

1. YaE CLAUDE.md L23: "3-line meta-refresh stub" -> "16-line meta-refresh stub" (projects/here-there-be-hordes/gdd.html is 16 lines).
2. YaE CLAUDE.md L61: release.ps1 deploy-flow description now leads with the Step 0 dashboard JSON integrity guard (check-status-json.ps1, abort on corrupt status/data/*.json), matching scripts/release.ps1 L21-26.
3. YaC CLAUDE.md L32: index.html "~93KB" -> "~100KB" (actual 101,916 bytes).

Method: Python atomic-write-with-readback on both files; tails verified clean post-edit.
Not committed: .git/index.lock present on all six repos since 06-11 22:02-22:03, not clearable from the sandbox (Operation not permitted). Edits ride the already-dirty CLAUDE.md trees and land with the next Nick-side release (queue item yae-index-lock-clear-2026-06-12 covers the host-side clear).
