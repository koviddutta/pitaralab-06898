/**
 * Verified Gelato Science v2.1 Calculator
 * Implements: final-verified-gelato-guide_v2.1.pdf
 */

import { IngredientData } from '@/types/ingredients';
import leightonTable from './leightonTable.json';

export type MetricsV2 = {
  // Basic composition (g)
  total_g: number;
  water_g: number;
  nonLactoseSugars_g: number;
  fat_g: number;
  msnf_g: number;
  other_g: number;

  // Basic composition (%)
  water_pct: number;
  nonLactoseSugars_pct: number;
  fat_pct: number;
  msnf_pct: number;
  other_pct: number;

  // Derived from MSNF
  protein_g: number;
  protein_pct: number;
  lactose_g: number;
  lactose_pct: number;

  // Total sugars (incl. lactose)
  totalSugars_g: number;
  totalSugars_pct: number;

  // Total solids
  ts_g: number;
  ts_pct: number;

  // Freezing point depression
  se_g: number; // Sucrose Equivalents
  sucrosePer100gWater: number;
  fpdse: number; // From sugars (Leighton)
  fpdsa: number; // From salts/MSNF
  fpdt: number;  // Total freezing point depression

  // POD (normalized sweetness index)
  pod_index: number;

  // Warnings
  warnings: string[];
  clampedLeighton?: boolean;
};

export type CalcOptionsV2 = {
  evaporation_pct?: number;
  mode?: 'gelato' | 'kulfi';
};

/**
 * Linear interpolation in Leighton table with clamping
 */
function leightonLookup(sucrosePer100gWater: number): { fpdse: number; clamped: boolean } {
  const data = leightonTable.data;
  const x = sucrosePer100gWater;

  // Clamp to table bounds
  if (x <= data[0].sucrosePer100gWater) {
    return { fpdse: data[0].fpdse, clamped: x < data[0].sucrosePer100gWater };
  }
  if (x >= data[data.length - 1].sucrosePer100gWater) {
    return { fpdse: data[data.length - 1].fpdse, clamped: x > data[data.length - 1].sucrosePer100gWater };
  }

  // Linear interpolation
  for (let i = 0; i < data.length - 1; i++) {
    const p1 = data[i];
    const p2 = data[i + 1];
    if (x >= p1.sucrosePer100gWater && x <= p2.sucrosePer100gWater) {
      const t = (x - p1.sucrosePer100gWater) / (p2.sucrosePer100gWater - p1.sucrosePer100gWater);
      const fpdse = p1.fpdse + t * (p2.fpdse - p1.fpdse);
      return { fpdse, clamped: false };
    }
  }

  return { fpdse: data[data.length - 1].fpdse, clamped: true };
}

/**
 * Calculate glucose syrup contribution by DE split
 */
function calcGlucoseSyrupSE(solids_g: number, de: number): number {
  const dextrose_g = solids_g * (de / 100);
  const oligo_g = solids_g - dextrose_g;
  return 1.9 * dextrose_g + 1.0 * oligo_g;
}

/**
 * Main v2.1 calculation function
 */
export function calcMetricsV2(
  rows: { ing: IngredientData; grams: number }[],
  opts: CalcOptionsV2 = {}
): MetricsV2 {
  const warnings: string[] = [];
  
  // 1. Calculate batch totals
  const total_g = rows.reduce((a, r) => a + (r.grams || 0), 0);

  let water_g = 0, nonLactoseSugars_g = 0, fat_g = 0, msnf_g = 0, other_g = 0;
  for (const { ing, grams } of rows) {
    const g = grams || 0;
    water_g += g * (ing.water_pct || 0) / 100;
    nonLactoseSugars_g += g * (ing.sugars_pct || 0) / 100;
    fat_g += g * (ing.fat_pct || 0) / 100;
    msnf_g += g * (ing.msnf_pct || 0) / 100;
    other_g += g * (ing.other_solids_pct || 0) / 100;
  }

  // 2. Apply evaporation
  const evap = Math.max(0, Math.min(100, opts.evaporation_pct ?? 0));
  const water_after_evap_g = water_g * (1 - evap / 100);
  const water_loss_g = water_g - water_after_evap_g;
  const total_after_evap_g = total_g - water_loss_g;

  // 3. Protein & Lactose from MSNF
  const protein_g = msnf_g * 0.36;
  const lactose_g = msnf_g * 0.545;

  // 4. Total sugars (incl. lactose)
  const totalSugars_g = nonLactoseSugars_g + lactose_g;

  // 5. Total solids
  const ts_g = fat_g + msnf_g + nonLactoseSugars_g + other_g;

  // 6. Percentages
  const pct = (x: number) => total_after_evap_g > 0 ? (x / total_after_evap_g) * 100 : 0;
  
  const water_pct = pct(water_after_evap_g);
  const nonLactoseSugars_pct = pct(nonLactoseSugars_g);
  const fat_pct = pct(fat_g);
  const msnf_pct = pct(msnf_g);
  const other_pct = pct(other_g);
  const protein_pct = pct(protein_g);
  const lactose_pct = pct(lactose_g);
  const totalSugars_pct = pct(totalSugars_g);
  const ts_pct = pct(ts_g);

  // 7. Calculate Sucrose Equivalents (SE)
  let se_g = 0;
  
  for (const { ing, grams } of rows) {
    const g = grams || 0;
    const sug_g = g * (ing.sugars_pct || 0) / 100;
    
    if (sug_g <= 0) continue;

    // Handle fruit with sugar split
    if (ing.category === 'fruit' && ing.sugar_split) {
      const s = ing.sugar_split;
      const norm = (s.glucose ?? 0) + (s.fructose ?? 0) + (s.sucrose ?? 0) || 100;
      const g_glu = sug_g * ((s.glucose ?? 0) / norm);
      const g_fru = sug_g * ((s.fructose ?? 0) / norm);
      const g_suc = sug_g * ((s.sucrose ?? 0) / norm);

      se_g += g_suc + 1.90 * g_glu + 1.90 * g_fru;
      continue;
    }

    // Handle glucose syrup with DE split
    const id = (ing.id || '').toLowerCase();
    const name = (ing.name || '').toLowerCase();
    
    if (id.includes('glucose_syrup') || name.includes('glucose syrup')) {
      // Extract DE from name/id (e.g., "glucose_de60" or "Glucose Syrup DE60")
      const deMatch = (id + name).match(/de\s*(\d+)/i);
      const de = deMatch ? parseInt(deMatch[1]) : 60; // default DE60
      se_g += calcGlucoseSyrupSE(sug_g, de);
      continue;
    }

    // Standard sugar types
    if (id.includes('dextrose') || name.includes('dextrose') || id.includes('glucose') || name.includes('glucose')) {
      se_g += 1.90 * sug_g;
    } else if (id.includes('fructose') || name.includes('fructose')) {
      se_g += 1.90 * sug_g;
    } else if (id.includes('invert') || name.includes('invert')) {
      se_g += 1.90 * sug_g; // Invert ~50/50 glucose/fructose
    } else {
      se_g += sug_g; // Default: sucrose (1.0)
    }
  }

  // Add lactose contribution to SE (0.545 from MSNF)
  se_g += 0.545 * msnf_g;

  // 8. Freezing Point Depression
  const sucrosePer100gWater = water_after_evap_g > 0 ? (se_g / water_after_evap_g) * 100 : 0;
  const leightonResult = leightonLookup(sucrosePer100gWater);
  const fpdse = leightonResult.fpdse;
  
  if (leightonResult.clamped) {
    warnings.push(`⚠️ Leighton table clamped: ${sucrosePer100gWater.toFixed(1)} g sucrose/100g water is outside normal range`);
  }

  const fpdsa = water_after_evap_g > 0 ? (msnf_g * 2.37) / water_after_evap_g : 0;
  const fpdt = fpdse + fpdsa;

  // 9. POD (normalized sweetness index per 100g total sugars)
  let pod_numerator = 0;
  
  for (const { ing, grams } of rows) {
    const g = grams || 0;
    const sug_g = g * (ing.sugars_pct || 0) / 100;
    
    if (sug_g <= 0) continue;

    if (ing.category === 'fruit' && ing.sugar_split) {
      const s = ing.sugar_split;
      const norm = (s.glucose ?? 0) + (s.fructose ?? 0) + (s.sucrose ?? 0) || 100;
      const g_glu = sug_g * ((s.glucose ?? 0) / norm);
      const g_fru = sug_g * ((s.fructose ?? 0) / norm);
      const g_suc = sug_g * ((s.sucrose ?? 0) / norm);

      pod_numerator += 70 * g_glu + 120 * g_fru + 100 * g_suc;
    } else {
      const id = (ing.id || '').toLowerCase();
      const name = (ing.name || '').toLowerCase();
      
      if (id.includes('dextrose') || name.includes('dextrose') || id.includes('glucose')) {
        pod_numerator += 70 * sug_g;
      } else if (id.includes('fructose') || name.includes('fructose')) {
        pod_numerator += 120 * sug_g;
      } else {
        pod_numerator += 100 * sug_g; // sucrose baseline
      }
    }
  }

  // Add lactose contribution to POD
  pod_numerator += 16 * lactose_g;
  
  const pod_index = totalSugars_g > 0 ? pod_numerator / totalSugars_g : 100;

  // 10. Validation warnings
  const mode = opts.mode || 'gelato';
  
  if (mode === 'gelato') {
    // Gelato guardrails
    if (fat_pct < 6 || fat_pct > 9) {
      warnings.push(`Fat ${fat_pct.toFixed(1)}% outside gelato range 6-9%`);
    }
    if (msnf_pct < 10 || msnf_pct > 12) {
      warnings.push(`MSNF ${msnf_pct.toFixed(1)}% outside gelato range 10-12%`);
    }
    if (totalSugars_pct < 16 || totalSugars_pct > 22) {
      warnings.push(`Total sugars ${totalSugars_pct.toFixed(1)}% outside gelato range 16-22%`);
    }
    if (ts_pct < 36 || ts_pct > 45) {
      warnings.push(`Total solids ${ts_pct.toFixed(1)}% outside gelato range 36-45%`);
    }
    if (fpdt < 2.5 || fpdt > 3.5) {
      warnings.push(`FPDT ${fpdt.toFixed(2)}°C outside gelato target 2.5-3.5°C`);
    }
  } else {
    // Kulfi guardrails
    if (fat_pct < 10 || fat_pct > 12) {
      warnings.push(`Fat ${fat_pct.toFixed(1)}% outside kulfi range 10-12%`);
    }
    if (protein_pct < 6 || protein_pct > 9) {
      warnings.push(`Protein ${protein_pct.toFixed(1)}% outside kulfi range 6-9%`);
    }
    if (msnf_pct < 18 || msnf_pct > 25) {
      warnings.push(`MSNF ${msnf_pct.toFixed(1)}% outside kulfi range 18-25%`);
    }
    if (ts_pct < 38 || ts_pct > 42) {
      warnings.push(`Total solids ${ts_pct.toFixed(1)}% outside kulfi range 38-42%`);
    }
    if (fpdt < 2.0 || fpdt > 2.5) {
      warnings.push(`FPDT ${fpdt.toFixed(2)}°C outside kulfi target 2.0-2.5°C`);
    }
  }

  // Defect prevention flags
  if (protein_pct >= 5) {
    warnings.push(`⚠️ Protein ≥5% (${protein_pct.toFixed(1)}%) → risk of chewiness/sandiness. Consider lowering MSNF.`);
  }
  if (lactose_pct >= 11) {
    warnings.push(`⚠️ Lactose ≥11% (${lactose_pct.toFixed(1)}%) → risk of crystallization. Shift sugars to glucose syrup or reduce MSNF.`);
  }

  // Troubleshooting suggestions
  if (fpdt < 2.5) {
    warnings.push(`🔧 Too soft (FPDT < 2.5°C): Lower dextrose/raise sucrose; reduce total sugars; or raise total solids.`);
  }
  if (fpdt > 3.5) {
    warnings.push(`🔧 Too hard (FPDT > 3.5°C): Add dextrose 2-4% or increase water within guardrails.`);
  }

  return {
    total_g: total_after_evap_g,
    water_g: water_after_evap_g,
    nonLactoseSugars_g,
    fat_g,
    msnf_g,
    other_g,

    water_pct,
    nonLactoseSugars_pct,
    fat_pct,
    msnf_pct,
    other_pct,

    protein_g,
    protein_pct,
    lactose_g,
    lactose_pct,

    totalSugars_g,
    totalSugars_pct,

    ts_g,
    ts_pct,

    se_g,
    sucrosePer100gWater,
    fpdse,
    fpdsa,
    fpdt,

    pod_index,

    warnings,
    clampedLeighton: leightonResult.clamped
  };
}
