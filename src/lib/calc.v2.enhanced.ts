/**
 * Enhanced calc.v2.ts with PHASE 2-5 implementations
 * Context-aware MSNF/Stabilizer guardrails, Analytical Compensation, Sugar Spectrum Policy, SP/AFP validation
 */

import { IngredientData } from '@/types/ingredients';
import { MetricsV2, CalcOptionsV2, calcMetricsV2 } from './calc.v2';

// ============================================================================
// PHASE 2: CONTEXT-AWARE MSNF & STABILIZER GUARDRAILS
// ============================================================================

export interface ContextualConstraints {
  msnf: [number, number];
  stabilizer: [number, number];
  context: string;
}

/**
 * Get context-aware MSNF and stabilizer constraints based on recipe inclusions
 */
export function getContextualConstraints(
  rows: { ing: IngredientData; grams: number }[]
): ContextualConstraints {
  const hasChocolate = rows.some(r => 
    r.ing.name.toLowerCase().includes('chocolate') ||
    r.ing.name.toLowerCase().includes('cocoa') ||
    r.ing.name.toLowerCase().includes('cacao')
  );
  
  const hasNutsOrEggs = rows.some(r => 
    r.ing.category === 'other' && (
      r.ing.name.toLowerCase().includes('nut') ||
      r.ing.name.toLowerCase().includes('almond') ||
      r.ing.name.toLowerCase().includes('pistachio') ||
      r.ing.name.toLowerCase().includes('hazelnut')
    ) ||
    r.ing.name.toLowerCase().includes('egg')
  );
  
  if (hasChocolate) {
    return {
      msnf: [7, 9],
      stabilizer: [0.3, 0.5],
      context: 'Dark chocolate/cocoa mass present'
    };
  } else if (hasNutsOrEggs) {
    return {
      msnf: [8, 10],
      stabilizer: [0.4, 0.5],
      context: 'Eggs/nuts present'
    };
  } else {
    return {
      msnf: [9, 12],
      stabilizer: [0.5, 0.6],
      context: 'Standard recipe'
    };
  }
}

// ============================================================================
// PHASE 3: ANALYTICAL COMPENSATION FRAMEWORK
// ============================================================================

export interface CompensationResult {
  adjustedSugars: number;
  adjustedAFP: number;
  notes: string[];
}

/**
 * Apply analytical compensation for flavoring inclusions
 * Based on characterization % and flavoring class
 */
export function applyAnalyticalCompensation(
  rows: { ing: IngredientData; grams: number }[],
  metrics: MetricsV2
): CompensationResult {
  const notes: string[] = [];
  let totalChar = 0;
  let compensationNeeded = 0;
  
  for (const { ing, grams } of rows) {
    if (!ing.characterization_pct || ing.characterization_pct === 0) continue;
    
    const charPct = (grams * (ing.characterization_pct / 100)) / metrics.total_g * 100;
    totalChar += charPct;
    
    // Determine flavoring class and target ranges
    const category = ing.category;
    const name = ing.name.toLowerCase();
    
    // Nuts: char 8-15% → sugars 18-20%, AFP 22-26
    if (category === 'other' && (name.includes('nut') || name.includes('almond') || name.includes('pistachio'))) {
      const targetSugars = 19; // midpoint
      const deltaS = targetSugars - metrics.totalSugars_pct;
      compensationNeeded += deltaS * (charPct / 12); // 12% = mid of 8-15%
      notes.push(`Nut inclusion ${charPct.toFixed(1)}% → adjust sugars toward 18-20%`);
    }
    // Dairy products: char 5-45% → sugars 19-21%, AFP 23-27
    else if (category === 'dairy' || name.includes('milk') || name.includes('cream')) {
      const targetSugars = 20;
      const deltaS = targetSugars - metrics.totalSugars_pct;
      compensationNeeded += deltaS * (charPct / 25); // 25% = mid of 5-45%
      notes.push(`Dairy inclusion ${charPct.toFixed(1)}% → adjust sugars toward 19-21%`);
    }
    // Sugary pastes: char 2-10% → sugars 20-22%, AFP 24-28
    else if ((name.includes('paste') || name.includes('jam')) && (ing.sugars_pct || 0) > 30) {
      const targetSugars = 21;
      const deltaS = targetSugars - metrics.totalSugars_pct;
      compensationNeeded += deltaS * (charPct / 6); // 6% = mid of 2-10%
      notes.push(`Sugary paste ${charPct.toFixed(1)}% → adjust sugars toward 20-22%`);
    }
    // Fruit: char 5-45% → sugars 22-24%, AFP 25-29
    else if (category === 'fruit') {
      const targetSugars = 23;
      const deltaS = targetSugars - metrics.totalSugars_pct;
      compensationNeeded += deltaS * (charPct / 25); // 25% = mid of 5-45%
      notes.push(`Fruit inclusion ${charPct.toFixed(1)}% → adjust sugars toward 22-24%`);
    }
    // Chocolate: char 5-25% → sugars 19-21%, AFP 23-27
    else if (name.includes('chocolate') || name.includes('cocoa')) {
      const targetSugars = 20;
      const deltaS = targetSugars - metrics.totalSugars_pct;
      compensationNeeded += deltaS * (charPct / 15); // 15% = mid of 5-25%
      notes.push(`Chocolate ${charPct.toFixed(1)}% → adjust sugars toward 19-21%`);
    }
  }
  
  return {
    adjustedSugars: metrics.totalSugars_pct + compensationNeeded,
    adjustedAFP: metrics.fpdt + (compensationNeeded * 0.15), // rough AFP correlation
    notes
  };
}

// ============================================================================
// PHASE 4: SUGAR SPECTRUM POLICY ENFORCEMENT
// ============================================================================

export interface SugarSpectrumResult {
  disaccharides_pct: number;
  monosaccharides_pct: number;
  polysaccharides_pct: number;
  warnings: string[];
}

/**
 * Calculate sugar type breakdown and validate against spectrum policy
 * Disaccharides (sucrose, lactose): 50-100%
 * Monosaccharides (glucose, fructose, dextrose): 0-25%
 * Polysaccharides (glucose syrup, maltodextrin): 0-35%
 */
export function validateSugarSpectrum(
  rows: { ing: IngredientData; grams: number }[],
  metrics: MetricsV2
): SugarSpectrumResult {
  const warnings: string[] = [];
  const totalSugars_g = metrics.totalSugars_g;
  
  if (totalSugars_g === 0) {
    return { disaccharides_pct: 0, monosaccharides_pct: 0, polysaccharides_pct: 0, warnings: [] };
  }
  
  let disaccharides_g = metrics.lactose_g; // Start with lactose from MSNF
  let monosaccharides_g = 0;
  let polysaccharides_g = 0;
  
  for (const { ing, grams } of rows) {
    const sug_g = grams * (ing.sugars_pct || 0) / 100;
    
    if (sug_g <= 0) continue;
    
    const id = (ing.id || '').toLowerCase();
    const name = (ing.name || '').toLowerCase();
    
    // Categorize sugar types
    if (name.includes('sucrose') || id.includes('sucrose')) {
      disaccharides_g += sug_g;
    } else if (name.includes('dextrose') || id.includes('dextrose')) {
      monosaccharides_g += sug_g;
    } else if (name.includes('glucose') && !name.includes('syrup')) {
      monosaccharides_g += sug_g;
    } else if (name.includes('fructose') || id.includes('fructose')) {
      monosaccharides_g += sug_g;
    } else if (name.includes('glucose syrup') || name.includes('maltodextrin') || name.includes('corn syrup')) {
      polysaccharides_g += sug_g;
    } else if (ing.category === 'fruit' && ing.sugar_split) {
      // Handle fruit sugar splits
      const s = ing.sugar_split;
      const norm = (s.glucose ?? 0) + (s.fructose ?? 0) + (s.sucrose ?? 0) || 100;
      monosaccharides_g += sug_g * ((s.glucose ?? 0) + (s.fructose ?? 0)) / norm;
      disaccharides_g += sug_g * ((s.sucrose ?? 0) / norm);
    } else {
      // Default to disaccharides (sucrose baseline)
      disaccharides_g += sug_g;
    }
  }
  
  const disaccharides_pct = (disaccharides_g / totalSugars_g) * 100;
  const monosaccharides_pct = (monosaccharides_g / totalSugars_g) * 100;
  const polysaccharides_pct = (polysaccharides_g / totalSugars_g) * 100;
  
  // Validate ranges
  if (disaccharides_pct < 50) {
    warnings.push(`⚠️ Sugar spectrum: Disaccharides ${disaccharides_pct.toFixed(1)}% below target 50-100% (risk of poor structure)`);
  }
  if (monosaccharides_pct > 25) {
    warnings.push(`⚠️ Sugar spectrum: Monosaccharides ${monosaccharides_pct.toFixed(1)}% exceeds target 0-25% (risk of too soft texture)`);
  }
  if (polysaccharides_pct > 35) {
    warnings.push(`⚠️ Sugar spectrum: Polysaccharides ${polysaccharides_pct.toFixed(1)}% exceeds target 0-35% (risk of gumminess)`);
  }
  
  return {
    disaccharides_pct,
    monosaccharides_pct,
    polysaccharides_pct,
    warnings
  };
}

/**
 * Three-Sugar Balance (70/10/20 split)
 * Balances sucrose/dextrose/glucose syrup for optimal PAC/FPDT
 */
export function balanceSugarSpectrum(totalSugars_g: number): {
  sucrose_g: number;
  dextrose_g: number;
  glucose_g: number;
} {
  return {
    sucrose_g: totalSugars_g * 0.70,
    dextrose_g: totalSugars_g * 0.10,
    glucose_g: totalSugars_g * 0.20
  };
}

// ============================================================================
// PHASE 5: SP/AFP TARGET VALIDATION
// ============================================================================

export interface SPAFPValidation {
  sp: number;
  afp_sugars: number;
  warnings: string[];
}

/**
 * Validate Sweetening Power (SP) and AFP from sugars against product targets
 */
export function validateSPAFP(
  metrics: MetricsV2,
  mode: 'gelato' | 'ice_cream' | 'sorbet' | 'kulfi'
): SPAFPValidation {
  const warnings: string[] = [];
  
  // SP is essentially the POD index (normalized sweetness)
  const sp = metrics.pod_index;
  
  // AFP from sugars is the SE per 100g water
  const afp_sugars = metrics.sucrosePer100gWater;
  
  // Validate based on product mode
  if (mode === 'gelato') {
    // Milk-based Gelato: SP 12-22, AFP 22-28
    if (sp < 12 || sp > 22) {
      warnings.push(`SP ${sp.toFixed(1)} outside gelato target 12-22 (adjust sugar types for sweetness balance)`);
    }
    if (afp_sugars < 22 || afp_sugars > 28) {
      warnings.push(`AFP(sugars) ${afp_sugars.toFixed(1)} outside gelato target 22-28 (adjust total sugars or sugar types)`);
    }
  } else if (mode === 'ice_cream') {
    // Ice Cream: similar to gelato but slightly lower
    if (sp < 10 || sp > 20) {
      warnings.push(`SP ${sp.toFixed(1)} outside ice cream target 10-20`);
    }
    if (afp_sugars < 20 || afp_sugars > 26) {
      warnings.push(`AFP(sugars) ${afp_sugars.toFixed(1)} outside ice cream target 20-26`);
    }
  } else if (mode === 'sorbet') {
    // Fruit Sorbets: SP 20-28, AFP 28-33
    if (sp < 20 || sp > 28) {
      warnings.push(`SP ${sp.toFixed(1)} outside sorbet target 20-28`);
    }
    if (afp_sugars < 28 || afp_sugars > 33) {
      warnings.push(`AFP(sugars) ${afp_sugars.toFixed(1)} outside sorbet target 28-33`);
    }
  }
  // Kulfi doesn't have specific SP/AFP targets in the spec
  
  return {
    sp,
    afp_sugars,
    warnings
  };
}

// ============================================================================
// INTEGRATED ENHANCED CALCULATION
// ============================================================================

export interface EnhancedMetricsV2 extends MetricsV2 {
  contextualConstraints: ContextualConstraints;
  compensation?: CompensationResult;
  sugarSpectrum: SugarSpectrumResult;
  spAfpValidation: SPAFPValidation;
}

/**
 * Enhanced calculation with all Phase 2-5 features
 */
export function calcMetricsV2Enhanced(
  rows: { ing: IngredientData; grams: number }[],
  opts: CalcOptionsV2 = {}
): EnhancedMetricsV2 {
  // Calculate base metrics
  const baseMetrics = calcMetricsV2(rows, opts);
  
  // Apply Phase 2: Context-aware constraints
  const contextualConstraints = getContextualConstraints(rows);
  
  // Apply context-aware MSNF validation
  if (baseMetrics.msnf_pct < contextualConstraints.msnf[0] || baseMetrics.msnf_pct > contextualConstraints.msnf[1]) {
    baseMetrics.warnings.push(
      `⚠️ MSNF ${baseMetrics.msnf_pct.toFixed(1)}% outside ${contextualConstraints.context} range ` +
      `${contextualConstraints.msnf[0]}-${contextualConstraints.msnf[1]}%`
    );
  }
  
  // Apply Phase 3: Analytical compensation (if any characterization)
  const hasCharacterization = rows.some(r => (r.ing.characterization_pct || 0) > 0);
  const compensation = hasCharacterization ? applyAnalyticalCompensation(rows, baseMetrics) : undefined;
  
  if (compensation) {
    compensation.notes.forEach(note => baseMetrics.warnings.push(`🧪 ${note}`));
  }
  
  // Apply Phase 4: Sugar spectrum validation
  const sugarSpectrum = validateSugarSpectrum(rows, baseMetrics);
  sugarSpectrum.warnings.forEach(w => baseMetrics.warnings.push(w));
  
  // Apply Phase 5: SP/AFP validation
  const mode = opts.mode || 'gelato';
  const spAfpValidation = validateSPAFP(baseMetrics, mode);
  spAfpValidation.warnings.forEach(w => baseMetrics.warnings.push(w));
  
  return {
    ...baseMetrics,
    contextualConstraints,
    compensation,
    sugarSpectrum,
    spAfpValidation
  };
}
