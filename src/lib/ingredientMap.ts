import type { IngredientData } from '@/types/ingredients';

/**
 * Canonical ingredient aliases for robust mapping and DB health checks
 * Supports regional terms, abbreviations, and common variations
 */

export const CANONICALS = {
  water: ['water', 'drinking water', 'aqua', 'purified water', 'h2o'],
  cream_35: ['heavy cream', 'cream 35', 'cream 36', 'heavy cream 35%', 
             'fresh cream 36', 'malai', 'cream 38', 'double cream'],
  butter: ['butter', 'unsalted butter', 'salted butter', 'white butter'],
  smp: ['skim milk powder', 'smp', 'low fat milk powder', 
        'non-fat dry milk', 'nfdm', 'skimmed milk powder']
};

export type CanonicalIngredient = 'water' | 'cream_35' | 'butter' | 'smp';

/**
 * Find canonical type by ingredient name or ID (case-insensitive, partial match)
 * @param ingredient - Ingredient data object or name string
 * @returns Canonical type or null if no match
 */
export function findCanonical(
  ingredient: IngredientData | string
): CanonicalIngredient | null {
  const searchTerm = typeof ingredient === 'string' 
    ? ingredient.toLowerCase()
    : ingredient.name.toLowerCase();
    
  for (const [canonical, aliases] of Object.entries(CANONICALS)) {
    if (aliases.some(alias => searchTerm.includes(alias))) {
      return canonical as CanonicalIngredient;
    }
  }
  return null;
}

/**
 * Check database health for balancing essentials
 * @param allIngredients - Full ingredient database
 * @returns Health report with missing ingredients
 */
export function checkDbHealth(allIngredients: IngredientData[]) {
  const hasWater = allIngredients.some(ing => 
    findCanonical(ing) === 'water' && ing.water_pct >= 95
  );
  
  const hasCream35 = allIngredients.some(ing => 
    findCanonical(ing) === 'cream_35' && ing.fat_pct >= 30
  );
  
  const hasButter = allIngredients.some(ing => 
    findCanonical(ing) === 'butter' && ing.fat_pct >= 75
  );
  
  const hasSMP = allIngredients.some(ing => 
    findCanonical(ing) === 'smp' && (ing.msnf_pct || 0) >= 85
  );
  
  const missing: string[] = [];
  if (!hasWater) missing.push('Water (diluent)');
  if (!hasCream35 && !hasButter) missing.push('Heavy Cream 35%+ or Butter');
  if (!hasSMP) missing.push('Skim Milk Powder (SMP)');
  
  return {
    hasWater,
    hasCream35OrButter: hasCream35 || hasButter,
    hasSMP,
    missing,
    healthy: missing.length === 0
  };
}
