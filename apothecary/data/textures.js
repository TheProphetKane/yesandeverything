// textures.js - parchment background texture registry.
//
// scripts/fetch-parchment.ps1 downloads PNG textures into data/textures/.
// This file lists the slot IDs the editor offers; the renderer fetches the
// matching PNG. If a slot's PNG is missing on disk, the renderer falls back
// to the SVG gradient parchment.
//
// To add or remove slots, update both this list and re-run the fetch script.

export const PARCHMENT_TEXTURES = [
  { id: 'gradient',     label: 'Parchment (default gradient)', file: null },
  { id: 'parchment-01', label: 'Parchment 01',                 file: 'parchment-01.png' },
  { id: 'parchment-02', label: 'Parchment 02',                 file: 'parchment-02.png' },
  { id: 'parchment-03', label: 'Parchment 03',                 file: 'parchment-03.png' },
  { id: 'parchment-04', label: 'Parchment 04',                 file: 'parchment-04.png' },
  { id: 'parchment-05', label: 'Parchment 05',                 file: 'parchment-05.png' },
  { id: 'parchment-06', label: 'Parchment 06',                 file: 'parchment-06.png' },
  { id: 'parchment-07', label: 'Parchment 07',                 file: 'parchment-07.png' },
  { id: 'parchment-08', label: 'Parchment 08',                 file: 'parchment-08.png' },
  { id: 'parchment-09', label: 'Parchment 09',                 file: 'parchment-09.png' },
  { id: 'parchment-10', label: 'Parchment 10',                 file: 'parchment-10.png' },
  { id: 'parchment-11', label: 'Parchment 11',                 file: 'parchment-11.png' },
  { id: 'parchment-12', label: 'Parchment 12',                 file: 'parchment-12.png' },
  { id: 'parchment-13', label: 'Parchment 13',                 file: 'parchment-13.png' },
  { id: 'parchment-14', label: 'Parchment 14',                 file: 'parchment-14.png' },
  { id: 'parchment-15', label: 'Parchment 15',                 file: 'parchment-15.png' },
  { id: 'parchment-16', label: 'Parchment 16',                 file: 'parchment-16.png' },
  { id: 'parchment-17', label: 'Parchment 17',                 file: 'parchment-17.png' },
  { id: 'parchment-18', label: 'Parchment 18',                 file: 'parchment-18.png' },
  { id: 'parchment-19', label: 'Parchment 19',                 file: 'parchment-19.png' },
  { id: 'parchment-20', label: 'Parchment 20',                 file: 'parchment-20.png' },
  { id: 'parchment-21', label: 'Parchment 21',                 file: 'parchment-21.png' },
  { id: 'parchment-22', label: 'Parchment 22',                 file: 'parchment-22.png' },
  { id: 'parchment-23', label: 'Parchment 23',                 file: 'parchment-23.png' },
  { id: 'parchment-24', label: 'Parchment 24',                 file: 'parchment-24.png' },
  { id: 'parchment-25', label: 'Parchment 25',                 file: 'parchment-25.png' },
];

export const DEFAULT_PARCHMENT = 'gradient';
