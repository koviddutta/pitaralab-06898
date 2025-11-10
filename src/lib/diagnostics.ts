import type { Row, OptimizeTarget } from './optimize';
import type { IngredientData } from '@/types/ingredients';

/**
 * Feasibility analysis for recipe balancing
 * Hard gate to prevent infeasible balance attempts
 */

export interface Feasibility {
  feasible: boolean;
  reason?: string;
  suggestions: string[];
  flags: {
    hasWater: boolean;
    hasFatSource: boolean;
    hasMSNFSource: boolean;
    hasSugarSource: boolean;
  };
}

/**
 * Pre-flight feasibility check before balancing
 * More strict than diagnoseBalancingFailure - hard gate
 * @param rows - Current recipe rows
 * @param allIngredients - Full ingredient database
 * @param targets - Target ranges for balancing
 * @returns Feasibility report with actionable suggestions
 */
export function diagnoseFeasibility(
  rows: Row[],
  allIngredients: IngredientData[],
  targets: OptimizeTarget
): Feasibility {
  const suggestions: string[] = [];
  
  // Check recipe ingredients AND database availability
  const hasWaterInRecipe = rows.some(r => r.ing.water_pct >= 80);
  const hasWaterInDB = allIngredients.some(ing => ing.water_pct >= 95);
  const hasWater = hasWaterInRecipe || hasWaterInDB;
  
  const hasFatInRecipe = rows.some(r => r.ing.fat_pct >= 2);
  const hasFatSourceInDB = allIngredients.some(ing => ing.fat_pct >= 30);
  const hasFatSource = hasFatInRecipe || hasFatSourceInDB;
  
  const hasMSNFInRecipe = rows.some(r => (r.ing.msnf_pct || 0) >= 5);
  const hasMSNFSourceInDB = allIngredients.some(ing => (ing.msnf_pct || 0) >= 85);
  const hasMSNFSource = hasMSNFInRecipe || hasMSNFSourceInDB;
  
  const hasSugarInRecipe = rows.some(r => (r.ing.sugars_pct || 0) >= 90);
  const hasSugarSource = hasSugarInRecipe || 
    allIngredients.some(ing => (ing.sugars_pct || 0) >= 90);
  
  // Build suggestions for missing ingredients
  if (!hasWater) {
    suggestions.push('Add "Water" ingredient (diluent for dilution)');
  }
  
  if (!hasFatSource && targets.fat_pct !== undefined) {
    suggestions.push('Add "Heavy Cream 35%" or "Butter" (fat adjustment)');
  }
  
  if (!hasMSNFSource && targets.msnf_pct !== undefined) {
    suggestions.push('Add "Skim Milk Powder (SMP)" (MSNF adjustment independent of fat)');
  }
  
  if (!hasSugarSource) {
    suggestions.push('Add "Sucrose" or "Dextrose" (sweetness and FPD control)');
  }
  
  // Check ingredient count
  if (rows.length < 3) {
    suggestions.push(`Add more ingredients (current: ${rows.length}, minimum: 3+)`);
  }
  
  // Determine feasibility
  const feasible = hasWater && 
                   (hasFatSource || targets.fat_pct === undefined) &&
                   (hasMSNFSource || targets.msnf_pct === undefined) &&
                   rows.length >= 3;
  
  let reason: string | undefined;
  if (!feasible) {
    if (rows.length < 3) {
      reason = 'Recipe too simple - need at least 3 ingredients for balancing';
    } else if (!hasWater) {
      reason = 'Missing water/diluent - cannot adjust concentrations';
    } else if (!hasFatSource && targets.fat_pct !== undefined) {
      reason = 'Missing high-fat ingredient (cream/butter) in recipe or database';
    } else if (!hasMSNFSource && targets.msnf_pct !== undefined) {
      reason = 'Missing MSNF source (skim milk powder) in recipe or database';
    }
  }
  
  return {
    feasible,
    reason,
    suggestions,
    flags: {
      hasWater,
      hasFatSource,
      hasMSNFSource,
      hasSugarSource
    }
  };
}
