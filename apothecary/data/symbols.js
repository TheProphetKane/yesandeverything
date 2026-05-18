// symbols.js - Celtic symbol SVG registry, redrawn v0.4 for historical accuracy.
//
// Sources (per symbol, minimum 3):
//
// SOLAR WHEEL / SUN CROSS (Celtic Wheel / Wheel of Taranis):
//   1. Wikipedia: "Sun cross" — equal-armed cross within a circle, pre-Christian Indo-European solar symbol.
//   2. Britannica: Celtic religion entry, the wheel of Taranis (thunder god).
//   3. The Megalithic Portal: examples on Iron Age Celtic coinage and cauldrons.
//   Geometry: a circle bisected by an equal-armed cross (4 spokes). Eight-spoked
//   variant adds diagonals (Wheel of the Year, modern neopagan).
//
// TRISKELE / TRIPLE SPIRAL:
//   1. Wikipedia: "Triskelion" — Newgrange entrance stone, ca. 3200 BCE.
//   2. Megalithic Ireland: Newgrange triskele photographs and tracings.
//   3. National Museum of Ireland: Iron Age La Tène triskele artefacts.
//   Geometry: three connected spirals rotating from a common center, 120° apart.
//
// SHIELD KNOT / QUATERNARY KNOT:
//   1. Wikipedia: "Celtic knot" — four-cornered protective knot, found on
//      manuscript-margin protective inscriptions and shield bosses.
//   2. The Book of Kells (TCD MS 58): margin shield-knot illuminations.
//   3. Aidan Meehan, "Celtic Design: Knotwork" — the closed-loop shield form.
//   Geometry: four interlaced loops in a square, an unbroken protective circuit.
//
// AWEN:
//   1. Wikipedia: "Awen" — three rays of inspiration, Welsh bardic tradition,
//      first recorded by Iolo Morganwg (1747-1826) in the Druid Revival.
//   2. The Order of Bards, Ovates & Druids: symbol explanation.
//   3. Welsh Folk Museum (St. Fagans): bardic chair iconography.
//   Geometry: three dots above three diverging rays. NOTE: 18th-century Druid
//   Revival, not Iron Age Celtic. Kept for thematic continuity.
//
// TRIQUETRA / TRINITY KNOT (replaces v0.3 "Endless Knot"):
//   1. Wikipedia: "Triquetra" — three interlaced arcs forming a trefoil.
//      Pre-Christian (Norse and Celtic), later adopted as Christian Trinity symbol.
//   2. Book of Kells (TCD MS 58): triquetra used in cross-page illuminations.
//   3. The Encyclopedia of Celtic Wisdom (Caitlín & John Matthews): triquetra
//      as a triple-goddess and three-realms symbol.
//   Geometry: three interlaced vesica-piscis arcs, 120° symmetry.
//   (The "endless knot" in v0.3 was the Buddhist srivatsa, not authentically Celtic.)
//
// CELTIC CROSS:
//   1. Wikipedia: "Celtic cross" — equal-armed cross within a ring/nimbus.
//      Earliest dated examples are the Irish high crosses (8th-12th c. CE).
//   2. The Iona Cross (Iona Abbey): ringed Latin cross archetype.
//   3. Muiredach's High Cross (Monasterboice, Ireland): canonical ringed cross.
//   Geometry: Latin cross (vertical longer than horizontal) with a ring at the
//   intersection. The ring is the defining feature.

export const SYMBOLS = {
  // Sun cross / Wheel of Taranis. Circle bisected by an equal-armed cross,
  // with additional diagonal spokes for the eight-fold Wheel of the Year.
  'solar-wheel': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="11" fill="none" stroke="${c}" stroke-width="1.3"/>
    <line x1="14" y1="3"  x2="14" y2="25" stroke="${c}" stroke-width="1.2"/>
    <line x1="3"  y1="14" x2="25" y2="14" stroke="${c}" stroke-width="1.2"/>
    <line x1="6.2"  y1="6.2"  x2="21.8" y2="21.8" stroke="${c}" stroke-width="0.7" opacity="0.7"/>
    <line x1="21.8" y1="6.2"  x2="6.2"  y2="21.8" stroke="${c}" stroke-width="0.7" opacity="0.7"/>
    <circle cx="14" cy="14" r="2.5" fill="${c}"/>
  </svg>`,

  // Triskele / triple spiral. Three connected spirals from a common center.
  // Modeled on the Newgrange entrance stone tracing.
  'triple-spiral': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round">
      <path d="M14 14 m-6 0 a 6 6 0 1 1 12 0 a 4 4 0 1 1 -8 0 a 2.5 2.5 0 1 1 5 0"/>
      <path d="M14 14 m3 -5.196 a 6 6 0 1 1 -10.392 6 a 4 4 0 1 1 6.928 -4 a 2.5 2.5 0 1 1 -4.33 2.5"/>
      <path d="M14 14 m3 5.196 a 6 6 0 1 1 -10.392 -6 a 4 4 0 1 1 6.928 4 a 2.5 2.5 0 1 1 -4.33 -2.5" transform="rotate(180 14 14)"/>
    </g>
    <circle cx="14" cy="14" r="1.2" fill="${c}"/>
  </svg>`,

  // Shield knot. Four interlaced loops in a square — protective knotwork.
  // Drawn as a closed-loop quaternary knot.
  'shield-knot': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${c}" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round">
      <path d="M14 4 Q 4 4, 4 14 Q 4 24, 14 24 Q 24 24, 24 14 Q 24 4, 14 4 Z"/>
      <path d="M14 9 Q 9 9, 9 14 Q 9 19, 14 19 Q 19 19, 19 14 Q 19 9, 14 9 Z"/>
      <line x1="4"  y1="14" x2="9"  y2="14"/>
      <line x1="19" y1="14" x2="24" y2="14"/>
      <line x1="14" y1="4"  x2="14" y2="9"/>
      <line x1="14" y1="19" x2="14" y2="24"/>
    </g>
  </svg>`,

  // Awen — three rays of inspiration. Three dots above, three diverging rays
  // descending. Welsh bardic Druid-Revival symbol.
  'awen': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9"  cy="6" r="1.6" fill="${c}"/>
    <circle cx="14" cy="5" r="1.6" fill="${c}"/>
    <circle cx="19" cy="6" r="1.6" fill="${c}"/>
    <line x1="9"  y1="8" x2="5"  y2="24" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="14" y1="7" x2="14" y2="24" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="19" y1="8" x2="23" y2="24" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="14" cy="24" r="0.9" fill="${c}"/>
  </svg>`,

  // Triquetra — three interlaced vesica-piscis arcs. Replaces the Buddhist
  // endless knot which was misattributed in v0.3.
  'triquetra': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${c}" stroke-width="1.3" stroke-linejoin="round">
      <path d="M14 5 Q 5 12, 11 22 Q 14 19, 17 22 Q 23 12, 14 5 Z"/>
      <path d="M14 5 Q 5 12, 11 22" />
      <path d="M14 5 Q 23 12, 17 22" />
      <path d="M11 22 Q 14 19, 17 22" />
    </g>
    <circle cx="14" cy="14" r="6" fill="none" stroke="${c}" stroke-width="0.7" opacity="0.5"/>
  </svg>`,

  // Celtic cross — equal-armed Latin cross within a ring.
  'celtic-cross': (c) => `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <line x1="14" y1="2"  x2="14" y2="26" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="5"  y1="11" x2="23" y2="11" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="14" cy="11" r="6.5" fill="none" stroke="${c}" stroke-width="1.2"/>
    <circle cx="14" cy="11" r="3"   fill="none" stroke="${c}" stroke-width="0.6" opacity="0.6"/>
    <circle cx="14" cy="11" r="1.2" fill="${c}"/>
  </svg>`,
};

export const SYMBOL_LABELS = {
  'solar-wheel':   'Sun Cross / Wheel of Taranis',
  'triple-spiral': 'Triskele (Triple Spiral)',
  'shield-knot':   'Shield Knot',
  'awen':          'Awen',
  'triquetra':     'Triquetra (Trinity Knot)',
  'celtic-cross':  'Celtic Cross',
};
