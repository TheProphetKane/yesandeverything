# Voice rules for public artifacts

Load when auditing CHANGELOG.md, README.md, docs/*.md, docs/*.html, recruitment posts, in-code comments that will ship to GitHub. The solo-dev voice rule says every public artifact must read as a solo dev tracking their own work, never as AI collaboration.

## Hard-blocked tokens (BLOCK)

### Em dash

Banned in BOTH literal form (U+2014, `\u2014`) AND HTML entity form (`&mdash;`, `&ndash;`). Hyphen, comma, parens, semicolon, or period.

Hit BR v0.16.x via the entity form (voice audit only checked literal form initially).

### "per Nick"

Reframe as solo-dev decision or drop entirely. AI-collaboration tell.

### AI tool names

`Midjourney`, `Claude`, `ChatGPT`, `GPT-N`, `OpenAI`, `Anthropic`. Use generic descriptors ("the art generator", "the assistant") or drop.

Hit BR v0.13.1: two `Midjourney` references shipped in the GDD changelog.

### First-person `I` / `I'll` / `we` in changelog context

`I`, `I'll`, `we` read as AI voice. Reframe as imperative or third-person.

```
BAD: "I cleaned up the dual-path divergence by extracting the constants."
GOOD: "Dual-path divergence cleaned by extracting constants to autoload."
```

### AI vocabulary

`let me`, `I'll`, `you should consider`, `as an AI`, `feel free to`, `happy to`. All AI-flavor.

### Inline `<svg>` in public artifacts (BR-specific BLOCK)

Inline `<svg>` tags read as a visual AI fingerprint (image generators default to SVG output). Use Unicode glyph characters in `<span>` containers instead.

Banned in any public artifact: `docs/`, `CHANGELOG.md`, `README.md`, in-source comments, and any rendered GDD content.

### Co-Authored-By trailers naming AI

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Public commit history exposes the trailer. If git auto-injects it via `~/.claude/CLAUDE.md` or a prepare-commit-msg hook, strip the hook.

Reference: YaB commit 7130ae4 (2026-05-26) shipped this trailer.

## High-severity smells (HIGH)

### Reflective listening that amplifies negativity

Avoid responses that mirror user frustration back ("That sounds really difficult"). In docs/changelogs the equivalent is "this was a tough fix" framing — drop the frame, state the fix.

### Overly hedged claims

"This might be helpful" → drop. "Useful for handling X" is sharper.

### Marketing language in technical docs

"Industry-leading", "best-in-class", "robust" without specifics. State the specific property.

## Medium / style (MEDIUM)

### Heavy formatting in prose

`**bold**` on every other word, headers for two-sentence sections, bullets for things that should be sentences. The bar-raise reports + canonical-audit reports + the existing skills all use minimal formatting.

### Excessive postamble after a fix description

"As you can see, the fix works by..." Don't explain what the diff already says.

## Detection

Most of these have regex patterns. `checks/voice_violations.py` covers em dash (literal + entity), AI tool names, first-person collective in changelog context, inline svg. The harder ones (overly hedged, marketing language, reflective listening) need the LLM semantic pass.

## Where to enforce

- `docs/GDD.html` changelog footer (HBH, BR)
- `CHANGELOG.md` top entries (YaB, YaC, Scheduler, YaApothecary)
- `README.md` (all)
- Commit messages (all). Caught at preship time via the git-commit hook or as a post-commit scan.
- Public-rendered HTML (`yesandeverything.com/*`, `*.github.io/*`)

## Sibling skill

`solo-dev-voice-audit` is the focused voice-only skill. This catalog is what code-audit uses to inline-check during the broader code review pass.
