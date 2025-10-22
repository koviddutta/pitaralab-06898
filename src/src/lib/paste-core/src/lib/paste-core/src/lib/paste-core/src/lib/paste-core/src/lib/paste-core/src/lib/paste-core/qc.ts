// lib/paste-core/qc.ts
export function qcChecklist() {
  return {
    daily: ['Water activity', 'pH (4.5-6.5)', 'Viscosity (50 rpm, 25C)', 'Color L*a*b*'],
    weekly: ['TPC <10^3 CFU/g', 'Yeast/Mold <10^2 CFU/g', 'Peroxide value <10 meq/kg'],
    monthly: ['Anisidine value', 'Texture profile', 'Sensory panel']
  };
}
