# data/symbols/ SOURCES

Celtic symbol PNGs, sourced from Wikimedia Commons. License values:
  PD          public domain
  CC0         creative commons zero
  CC-BY       attribution required (see file page)

11 files ship in data/symbols/: five symbols each with a hollow and solid variant (awen,
celtic-cross, celtic-knot, shield-knot, triskele), plus one single-variant symbol
(solar-wheel), matching data/symbols.js SYMBOL_LABELS. The solid variant of each pair is
the file the old single-name symbol registry pointed at before the hollow/solid split;
SYMBOL_ALIASES still resolves those old ids (triquetra -> celtic-knot-solid, triple-spiral
-> triskele-solid, awen -> awen-solid, celtic-cross -> celtic-cross-solid, shield-knot ->
shield-knot-solid) so legacy herbs.json entries keep working. Several prior regen passes
recorded a different candidate Commons source for the same solid file without ever settling
on one; every candidate is kept below rather than picking one at random. The five hollow
variants are newer files with no source ever recorded by any regen pass.

| filename | source URL | license | sourced | note |
|----------|------------|---------|---------|------|
| awen-solid.png | https://commons.wikimedia.org/wiki/File%3AAwen%20-%20sitelen%20sitelen%20word%20symbol.svg | CC-BY | 2026-05-19 | candidate 1 of 2, unresolved; shipped under the old id "awen" |
| awen-solid.png | https://commons.wikimedia.org/wiki/File%3AAwen%20Symbol%20Vegetables.jpg | CC-BY | 2026-05-19 | candidate 2 of 2, unresolved; shipped under the old id "awen" |
| awen-hollow.png | (not recorded) | - | - | no regen pass ever logged a source for this file |
| celtic-cross-solid.png | https://commons.wikimedia.org/wiki/File%3ACeltic%20key%20Cross.svg | PD | 2026-05-19 | candidate 1 of 4, unresolved; shipped under the old id "celtic-cross" |
| celtic-cross-solid.png | https://commons.wikimedia.org/wiki/File%3ACeltic%20square%20cross.svg | PD | 2026-05-19 | candidate 2 of 4, unresolved; shipped under the old id "celtic-cross" |
| celtic-cross-solid.png | https://commons.wikimedia.org/wiki/File%3ACeltic%20memorial%20cross%20at%20St%20Conan's%20Kirk.JPG | CC-BY | 2026-05-19 | candidate 3 of 4, unresolved; shipped under the old id "celtic-cross" |
| celtic-cross-solid.png | https://commons.wikimedia.org/wiki/File%3ASimple%20Celtic%20Cross%20symbolism%20on%20gravestone%2C%20St%20Columba's%2C%20Stewarton%2C%20East%20Ayrshire%2C%20Scotland.jpg | CC-BY | 2026-05-19 | candidate 4 of 4, unresolved; shipped under the old id "celtic-cross" |
| celtic-cross-hollow.png | (not recorded) | - | - | no regen pass ever logged a source for this file |
| celtic-knot-solid.png | https://commons.wikimedia.org/wiki/File%3ATriquetra%20Black.svg | PD | 2026-05-19 | candidate 1 of 3, unresolved; shipped under the old id "triquetra" |
| celtic-knot-solid.png | https://commons.wikimedia.org/wiki/File%3ATriquetra-circle-interlaced-black.svg | CC-BY | 2026-05-19 | candidate 2 of 3, unresolved; shipped under the old id "triquetra" |
| celtic-knot-solid.png | https://commons.wikimedia.org/wiki/File%3A12crossings-rose-rhodonea-limacon-symmetrical-knot.svg | PD | 2026-05-19 | candidate 3 of 3, unresolved; shipped under the old id "triquetra" |
| celtic-knot-hollow.png | (not recorded) | - | - | no regen pass ever logged a source for this file |
| shield-knot-solid.png | https://commons.wikimedia.org/wiki/File%3AShield%20knot%20(basic%20form%2C%20grey).svg | CC0 | 2026-05-19 | candidate 1 of 2, unresolved; shipped under the old id "shield-knot" |
| shield-knot-solid.png | https://commons.wikimedia.org/wiki/File%3AGevlochten%20Iers%20kruis%20Irish%20cross.svg | PD | 2026-05-19 | candidate 2 of 2, unresolved; shipped under the old id "shield-knot" |
| shield-knot-hollow.png | (not recorded) | - | - | no regen pass ever logged a source for this file |
| solar-wheel.png | https://commons.wikimedia.org/wiki/File%3AEarth%20symbol%20(black).svg | CC-BY | 2026-05-19 | candidate 1 of 3, unresolved |
| solar-wheel.png | https://commons.wikimedia.org/wiki/File%3ACoa%20Illustration%20Taranis%20Wheel.svg | CC-BY | 2026-05-19 | candidate 2 of 3, unresolved |
| solar-wheel.png | https://commons.wikimedia.org/wiki/File%3ABlack%20Sun%20three%20swastikas.svg | CC-BY | 2026-05-19 | candidate 3 of 3, unresolved |
| triskele-solid.png | https://commons.wikimedia.org/wiki/File%3ATriple-Spiral-Symbol.svg | PD | 2026-05-19 | candidate 1 of 2, unresolved; shipped under the old id "triple-spiral" |
| triskele-solid.png | https://commons.wikimedia.org/wiki/File%3ATriskele-Symbol1.svg | PD | 2026-05-19 | candidate 2 of 2, unresolved; shipped under the old id "triple-spiral" |
| triskele-hollow.png | (not recorded) | - | - | no regen pass ever logged a source for this file |
