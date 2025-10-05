import { IngredientData } from '@/types/ingredients';
import { calcMetricsV2, MetricsV2 } from './calc.v2';

export type Metrics = {
  total_g: number;

  water_g: number; sugars_g: number; fat_g: number; msnf_g: number; other_g: number;
  water_pct: number; sugars_pct: number; fat_pct: number; msnf_pct: number; other_pct: number;

  ts_add_g: number; ts_mass_g: number;
  ts_add_pct: number; ts_mass_pct: number;

  sp: number;   // ~12–28 typical (legacy - use pod_index from v2)
  pac: number;  // ~22–33 typical (legacy - use fpdt from v2)
  
  // v2.1 additions
  protein_g?: number;
  protein_pct?: number;
  lactose_g?: number;
  lactose_pct?: number;
  totalSugars_g?: number;
  totalSugars_pct?: number;
  fpdt?: number;
  fpdse?: number;
  fpdsa?: number;
  pod_index?: number;
  warnings?: string[];
};

// Export v2 types for direct use
export type { MetricsV2 } from './calc.v2';
export { calcMetricsV2 } from './calc.v2';

export type CalcOptions = { evaporation_pct?: number };

export function calcMetrics(
  rows: { ing: IngredientData; grams: number }[],
  opts: CalcOptions = {}
): Metrics {
  // Calculate using v2.1 science
  const v2 = calcMetricsV2(rows, opts);
  
  // Map to legacy format for backward compatibility
  const total_g = rows.reduce((a, r) => a + (r.grams || 0), 0);

  let water_g=0, sugars_g=0, fat_g=0, msnf_g=0, other_g=0;
  for (const { ing, grams } of rows) {
    const g = grams || 0;
    water_g += g * (ing.water_pct || 0) / 100;
    sugars_g += g * (ing.sugars_pct || 0) / 100;
    fat_g    += g * ( ing.fat_pct   || 0) / 100;
    msnf_g   += g * (ing.msnf_pct   || 0) / 100;
    other_g  += g * (ing.other_solids_pct || 0) / 100;
  }

  // Evaporation reduces water, then percentages use final mass
  // SAFETY: Ensure evaporation never produces negative or impossible values
  const evap = Math.max(0, Math.min(100, opts.evaporation_pct ?? 0));
  const water_evap_g = Math.max(0, water_g * (1 - evap / 100)); // SAFETY: never negative
  const water_loss_g = water_g - water_evap_g;
  const total_after_evap_g = Math.max(0, total_g - water_loss_g); // SAFETY: never negative
  
  // SAFETY: Prevent division by zero
  const pct = (x: number) => total_after_evap_g > 0 ? (x / total_after_evap_g) * 100 : 0;
  
  // VALIDATION: Check for physically impossible results
  if (water_evap_g < 0) {
    console.warn('⚠️ Evaporation produced negative water content! Check recipe inputs.');
  }
  if (total_after_evap_g <= 0) {
    console.warn('⚠️ Total mass after evaporation is zero or negative! Check evaporation percentage.');
  }

  const ts_add_g  = sugars_g + fat_g + msnf_g + other_g;
  const ts_mass_g = total_after_evap_g - water_evap_g;

  // SP & PAC from weight fraction of sugars on final mass × coeff × 100
  const coeff = {
    sucrose:       { sp: 1.00, pac: 1.00 },
    dextrose:      { sp: 0.74, pac: 1.90 },
    fructose:      { sp: 1.73, pac: 1.90 },
    invert:        { sp: 1.25, pac: 1.90 },
    lactose:       { sp: 0.16, pac: 1.00 },
    glucose_de60:  { sp: 0.50, pac: 1.18 }
  };

  let sp = 0, pac = 0;
  for (const { ing, grams } of rows) {
    const g = grams || 0;
    const sug_g = g * (ing.sugars_pct || 0) / 100;
    
    // SAFETY: Skip if no sugars or invalid mass
    if (sug_g <= 0 || total_after_evap_g <= 0) continue;
    
    // SAFETY: Check for NaN in sugar content
    if (isNaN(sug_g) || !isFinite(sug_g)) {
      console.warn(`⚠️ NaN detected in sugar calculation for ${ing.name}. Skipping this ingredient.`);
      continue;
    }

    if (ing.category === 'fruit' && ing.sugar_split) {
      const s = ing.sugar_split;
      const norm = (s.glucose ?? 0) + (s.fructose ?? 0) + (s.sucrose ?? 0) || 100;
      const g_glu = sug_g * ((s.glucose  ?? 0)/norm);
      const g_fru = sug_g * ((s.fructose ?? 0)/norm);
      const g_suc = sug_g * ((s.sucrose  ?? 0)/norm);

      sp  += (g_glu/total_after_evap_g) * coeff.dextrose.sp * 100
           + (g_fru/total_after_evap_g) * coeff.fructose.sp * 100
           + (g_suc/total_after_evap_g) * coeff.sucrose.sp  * 100;
      pac += (g_glu/total_after_evap_g) * coeff.dextrose.pac * 100
           + (g_fru/total_after_evap_g) * coeff.fructose.pac * 100
           + (g_suc/total_after_evap_g) * coeff.sucrose.pac  * 100;
    } else {
      const id = (ing.id || '').toLowerCase();
      const name = (ing.name || '').toLowerCase();
      
      // Try to match by ID first, then by name, then use coefficients from ingredient data if available
      let c = coeff[id as keyof typeof coeff];
      
      if (!c) {
        // Check ingredient-specific coefficients if available
        if (ing.sp_coeff !== undefined && ing.pac_coeff !== undefined) {
          // SAFETY: Validate coefficients are not NaN
          if (isNaN(ing.sp_coeff) || isNaN(ing.pac_coeff)) {
            console.warn(`⚠️ NaN coefficients for ${ing.name}. Using sucrose baseline.`);
            c = coeff.sucrose;
          } else {
            c = { sp: ing.sp_coeff, pac: ing.pac_coeff / 100 }; // pac_coeff is stored as percentage
          }
        } else if (id.includes('dextrose') || name.includes('dextrose') || id.includes('glucose') || name.includes('glucose')) {
          c = coeff.dextrose;
        } else if (id.includes('fructose') || name.includes('fructose')) {
          c = coeff.fructose;
        } else if (id.includes('invert') || name.includes('invert')) {
          c = coeff.invert;
        } else if (id.includes('lactose') || name.includes('lactose')) {
          c = coeff.lactose;
        } else if (id.includes('glucose_de60') || name.includes('glucose syrup')) {
          c = coeff.glucose_de60;
        } else {
          c = coeff.sucrose; // Default fallback
        }
      }
      
      const sp_contribution = (sug_g / total_after_evap_g) * c.sp  * 100;
      const pac_contribution = (sug_g / total_after_evap_g) * c.pac * 100;
      
      // SAFETY: Check for NaN before adding
      if (!isNaN(sp_contribution) && isFinite(sp_contribution)) {
        sp += sp_contribution;
      } else {
        console.warn(`⚠️ NaN SP contribution from ${ing.name}. Check coefficients.`);
      }
      
      if (!isNaN(pac_contribution) && isFinite(pac_contribution)) {
        pac += pac_contribution;
      } else {
        console.warn(`⚠️ NaN PAC contribution from ${ing.name}. Check coefficients.`);
      }
    }
  }
  
  // FINAL SAFETY: Ensure SP and PAC are valid numbers
  sp = isNaN(sp) || !isFinite(sp) ? 0 : sp;
  pac = isNaN(pac) || !isFinite(pac) ? 0 : pac;

  return {
    total_g: v2.total_g,

    water_g: v2.water_g, 
    sugars_g: v2.nonLactoseSugars_g, 
    fat_g: v2.fat_g, 
    msnf_g: v2.msnf_g, 
    other_g: v2.other_g,
    
    water_pct: v2.water_pct, 
    sugars_pct: v2.nonLactoseSugars_pct, 
    fat_pct: v2.fat_pct,
    msnf_pct: v2.msnf_pct, 
    other_pct: v2.other_pct,

    ts_add_g: v2.ts_g, 
    ts_mass_g: v2.ts_g, 
    ts_add_pct: v2.ts_pct, 
    ts_mass_pct: v2.ts_pct,

    // Legacy SP/PAC - keep for backward compat but use v2 values where possible
    sp: v2.pod_index, 
    pac: v2.fpdt * 10, // Scale FPDT to approximate old PAC range
    
    // v2.1 new fields
    protein_g: v2.protein_g,
    protein_pct: v2.protein_pct,
    lactose_g: v2.lactose_g,
    lactose_pct: v2.lactose_pct,
    totalSugars_g: v2.totalSugars_g,
    totalSugars_pct: v2.totalSugars_pct,
    fpdt: v2.fpdt,
    fpdse: v2.fpdse,
    fpdsa: v2.fpdsa,
    pod_index: v2.pod_index,
    warnings: v2.warnings
  };
}