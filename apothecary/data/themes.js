// Theme registry. A theme controls label background, border, and text colors.
// Switch themes by changing the active theme id in state.

export const THEMES = {
  'parchment-gold': {
    id: 'parchment-gold',
    name: 'Parchment & Gold',
    // Label paper
    paperGradStart: '#F8EDCF',
    paperGradEnd: '#E5D5A5',
    paperGrain: true,
    // Label text base colors (accent overrides where applicable)
    shopColor: '#1C0A00',
    shopShadow: '0 0 3px rgba(196,146,42,0.5), 0 0 6px rgba(196,146,42,0.25)',
    latinColor: '#A07820',
    descColor: '#2E1A08',
    // Border
    borderOpacityOuter: 0.7,
    borderOpacityInner: 0.5,
  },
  // Add new themes here. Same shape; reference from label-templates.js.
};
