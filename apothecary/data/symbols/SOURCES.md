# data/symbols/ SOURCES

The eleven symbol PNGs in this folder are one hand-supplied set. None of them came from Wikimedia Commons, and none of them came out of `scripts/fetch-symbols.ps1`.

## Origin

The set entered the repository on 2026-05-19 in two commits, as files named in title case with spaces (`Celtic Knot Solid.png`, `Awen Hollow.png` and so on):

- `b8833cd` added the celtic-cross and celtic-knot pairs and `Shield Knot Hollow.png`.
- `b44a277` added the awen and triskele pairs, `Shield Knot Solid.png` and `Solar Wheel.png`, and deleted every file the fetch script had pulled from Commons (`triquetra.png`, `triple-spiral.png`, `celtic-cross.png`, `shield-knot.png`, `awen.png`, `solar-wheel.png` and their SVG twins).
- `37eaa58` renamed the set to the lowercase hyphenated ids that ship today. The bytes did not change.

Each hollow file arrived beside its solid sibling as part of the same set. Neither was cut from the other by a script.

## Licence status

No upstream source or licence is recorded for the set. The app footer no longer credits Commons authors for it.

Earlier versions of this file listed nineteen Commons pages as candidate sources, carried over from the fetch script's log. Those pages described the deleted files. On 2026-11-28 each shipped file was compared against every candidate page and against the Commons search the fetch script runs, by overlapping the two silhouettes. No page is the source of any file. The closest page for each file, with the share of the two silhouettes that overlaps:

| file | closest Commons page | overlap |
|------|----------------------|---------|
| celtic-cross-solid.png | Celtic cross (bold).svg | 0.82 |
| solar-wheel.png | Simple crossed circle.svg | 0.71 |
| shield-knot-solid.png | Shield Knot (basic form).svg | 0.67 |
| celtic-knot-solid.png | Purple Trinity Knot.png | 0.64 |
| triskele-solid.png | Triple-spiral-wheeled-simple.png | 0.48 |
| awen-solid.png | USVA headstone emb-65 (Druid - Awen).svg | 0.30 |

Side by side, each pair differs in shape: the cross has a thinner ring, the wheel carries an inner ring and eight spokes where the page has four, the shield knot bands are solid where the page's are outlined, the triskele has no centre mark, and the awen sits inside a circle. No pair is the same drawing.

## The files

| filename | source | licence | credit |
|----------|--------|---------|--------|
| awen-hollow.png | the hand-supplied set, `b44a277` | none recorded | none owed |
| awen-solid.png | the hand-supplied set, `b44a277` | none recorded | none owed |
| celtic-cross-hollow.png | the hand-supplied set, `b8833cd` | none recorded | none owed |
| celtic-cross-solid.png | the hand-supplied set, `b8833cd` | none recorded | none owed |
| celtic-knot-hollow.png | the hand-supplied set, `b8833cd` | none recorded | none owed |
| celtic-knot-solid.png | the hand-supplied set, `b8833cd` | none recorded | none owed |
| shield-knot-hollow.png | the hand-supplied set, `b8833cd` | none recorded | none owed |
| shield-knot-solid.png | the hand-supplied set, `b44a277` | none recorded | none owed |
| solar-wheel.png | the hand-supplied set, `b44a277` | none recorded | none owed |
| triskele-hollow.png | the hand-supplied set, `b44a277` | none recorded | none owed |
| triskele-solid.png | the hand-supplied set, `b44a277` | none recorded | none owed |

## Adding a symbol

A new symbol file gets its row here when it is added: where it came from, its licence, and the credit it owes. `scripts/fetch-symbols.ps1` still appends Commons rows to this file when it runs, under its own old ids. Its output does not ship unless a file it writes is renamed into the set, and then that file's row replaces the script's log lines.
