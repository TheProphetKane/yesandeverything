// Label template descriptors. A template describes a physical label format:
// size, theme reference, zones, and which fields the editor exposes.
//
// To add a new label kind (e.g. tea, soap, talisman), add a new entry here.
// The renderer and editor read this descriptor; nothing else needs to change.

export const TEMPLATES = {
  'apothecary-3x1.5': {
    id: 'apothecary-3x1.5',
    name: 'Celtic Apothecary 3×1.5"',
    size: { wIn: 3, hIn: 1.5 },
    previewScale: 2.6,
    theme: 'parchment-gold',
    // Zones describe horizontal columns. Each lists the items it renders.
    zones: [
      { id: 'left',   width: '25%', items: ['symbol', 'botanical'] },
      { id: 'center', width: '50%', items: [
        'shop',
        'divider-top',
        'herb-name',
        'latin',
        'props',
        'divider-bot',
        'description',
      ]},
      { id: 'right',  width: '25%', items: ['rune-1', 'rune-2', 'rune-3'] },
    ],
    // Which editor fields this template exposes.
    fields: [
      'shopName',
      'herbName',
      'latin',
      'props',
      'description',
      'accent',
      'symbol',
      'rune1', 'rune2', 'rune3',
    ],
    // Description constraint shown in the editor.
    descMaxChars: 120,
    descLineHint: '~2 lines',
  },

  // Example second template stub (commented out — uncomment to enable):
  //
  // 'tea-2x2': {
  //   id: 'tea-2x2',
  //   name: 'Tea Blend 2×2"',
  //   size: { wIn: 2, hIn: 2 },
  //   previewScale: 3.0,
  //   theme: 'parchment-gold',
  //   zones: [
  //     { id: 'top',    width: '100%', items: ['shop', 'divider-top'] },
  //     { id: 'middle', width: '100%', items: ['botanical', 'herb-name', 'latin'] },
  //     { id: 'bottom', width: '100%', items: ['description'] },
  //   ],
  //   fields: ['shopName', 'herbName', 'latin', 'description', 'accent'],
  //   descMaxChars: 200,
  //   descLineHint: '~4 lines',
  // },
};

export const DEFAULT_TEMPLATE_ID = 'apothecary-3x1.5';
