// lib/paste-core/shelf_life.ts
export type Packaging =
  | 'LDPE'
  | 'Paper+LDPE'
  | 'MetalizedBOPP'
  | 'Poster+AlFoil'
  | 'Glass_N2';
export type MapProfile = 'NONE' | 'RABRI_70N2_30CO2' | 'GJ_50N2_50CO2';

const PACKAGING_BASE = {
  LDPE: { days: 6 },
  'Paper+LDPE': { days: 12 },
  MetalizedBOPP: { days: 38 },
  'Poster+AlFoil': { days: 60 },
  Glass_N2: { days: 365 },
} as const;

function mapBonus(map: MapProfile, paste: 'rabri'|'gulab_jamun'|'jalebi'|'other') {
  if (map === 'NONE') return 1;
  if (map === 'RABRI_70N2_30CO2' && paste === 'rabri') return 4.2;
  if (map === 'GJ_50N2_50CO2' && (paste==='gulab_jamun' || paste==='jalebi')) return 1.5;
  return 1.2;
}

function awFactor(aw: number) {
  if (aw < 0.70) return 1.8;
  if (aw < 0.85) return 1.0;
  if (aw < 0.94) return 0.6;
  return 0.3;
}

function tempFactor(storageC: number) {
  if (storageC <= 8) return 1.6;
  if (storageC <= 12) return 1.2;
  if (storageC <= 25) return 1.0;
  return 0.7;
}

export function estimateShelfLifeDays(
  packaging: Packaging,
  aw: number,
  storageC: number,
  map: MapProfile,
  paste: 'rabri'|'gulab_jamun'|'jalebi'|'other'
) {
  const base = PACKAGING_BASE[packaging].days;
  const safeAw = Math.max(0.6, Math.min(0.99, aw));
  return Math.round(base * awFactor(safeAw) * tempFactor(storageC) * mapBonus(map, paste));
}
