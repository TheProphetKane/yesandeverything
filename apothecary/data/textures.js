// textures.js - parchment background texture registry.
//
// scripts/fetch-parchment.ps1 downloads PNG textures into data/textures/.
// This file lists the slot IDs the editor offers; the renderer fetches the
// matching PNG. If a slot's PNG is missing on disk, the renderer falls back
// to the SVG gradient parchment.
//
// v0.8.1 trim: slots 02, 03, 04, 05, 07, 08, 11, 13, 16-20 were duplicates
// of other slots after the initial fetch run (Wikimedia search returned the
// same physical file via different titles). Trimmed to the unique, usable
// slots. To add more, re-run fetch-parchment.ps1 with -Force and additional
// search variants, then add slot IDs here for each NEW file produced.

export const PARCHMENT_TEXTURES = [
  { id: 'gradient',     label: 'Parchment (default gradient)', file: null },
  { id: 'parchment-01', label: 'Parchment 01',                 file: 'parchment-01.png' },
  { id: 'parchment-06', label: 'Parchment 06',                 file: 'parchment-06.png' },
  { id: 'parchment-09', label: 'Parchment 09',                 file: 'parchment-09.png' },
  { id: 'parchment-10', label: 'Parchment 10',                 file: 'parchment-10.png' },
  { id: 'parchment-12', label: 'Parchment 12',                 file: 'parchment-12.png' },
  { id: 'parchment-14', label: 'Parchment 14',                 file: 'parchment-14.png' },
  { id: 'parchment-15', label: 'Parchment 15',                 file: 'parchment-15.png' },
  { id: 'parchment-21', label: 'Parchment 21',                 file: 'parchment-21.png' },
  { id: 'parchment-22', label: 'Parchment 22',                 file: 'parchment-22.png' },
  { id: 'parchment-23', label: 'Parchment 23',                 file: 'parchment-23.png' },
  { id: 'parchment-24', label: 'Parchment 24',                 file: 'parchment-24.png' },
  { id: 'parchment-25', label: 'Parchment 25',                 file: 'parchment-25.png' },
];

export const DEFAULT_PARCHMENT = 'gradient';
