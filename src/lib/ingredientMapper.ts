/**
 * Dynamic Ingredient Mapping System
 * Maps generic ingredient IDs to actual database ingredients using multiple strategies
 */

import type { IngredientData } from '@/types/ingredients';

/**
 * Core ingredient mappings - maps generic IDs to search patterns and property filters
 */
export const CORE_INGREDIENT_MAPPINGS: Record<string, {
  aliases: string[];
  searchPatterns: RegExp[];
  propertyFilters?: {
    minFat?: number;
    maxFat?: number;
    minMSNF?: number;
    maxMSNF?: number;
    category?: string;
  };
}> = {
  // Water
  'water': {
    aliases: ['water', 'h2o'],
    searchPatterns: [/^water$/i, /pure water/i],
    propertyFilters: { minFat: 0, maxFat: 0, minMSNF: 0, maxMSNF: 0 }
  },
  
  // Milk variations
  'milk_whole': {
    aliases: ['whole milk', 'full milk', 'milk 3%', '3% milk'],
    searchPatterns: [/whole.*milk/i, /milk.*whole/i, /full.*milk/i, /milk.*3/i],
    propertyFilters: { minFat: 2.5, maxFat: 4.5, category: 'dairy' }
  },
  'milk_skim': {
    aliases: ['skim milk', 'skimmed milk', 'fat-free milk', 'nonfat milk'],
    searchPatterns: [/skim.*milk/i, /milk.*skim/i, /fat.?free.*milk/i, /non.?fat.*milk/i],
    propertyFilters: { minFat: 0, maxFat: 0.5, category: 'dairy' }
  },
  
  // Creams
  'cream_20': {
    aliases: ['light cream', 'cream 20%', '20% cream', 'light cream 20%'],
    searchPatterns: [/light.*cream/i, /cream.*20/i, /20.*cream/i],
    propertyFilters: { minFat: 18, maxFat: 22, category: 'dairy' }
  },
  'cream_35': {
    aliases: ['heavy cream', 'cream 35%', '35% cream', 'heavy cream 35%', 'whipping cream'],
    searchPatterns: [/heavy.*cream/i, /cream.*35/i, /35.*cream/i, /whipping.*cream/i],
    propertyFilters: { minFat: 33, maxFat: 40, category: 'dairy' }
  },
  
  // Powders
  'smp': {
    aliases: ['skim milk powder', 'skimmed milk powder', 'non-fat dry milk', 'smp'],
    searchPatterns: [/skim.*powder/i, /smp/i, /non.?fat.*dry.*milk/i, /milk.*powder.*skim/i],
    propertyFilters: { minMSNF: 90, category: 'dairy' }
  },
  'wmp': {
    aliases: ['whole milk powder', 'full cream milk powder', 'wmp'],
    searchPatterns: [/whole.*milk.*powder/i, /wmp/i, /full.*cream.*powder/i],
    propertyFilters: { minFat: 20, minMSNF: 60, category: 'dairy' }
  },
  
  // Butter and high-fat sources
  'butter': {
    aliases: ['butter', 'unsalted butter'],
    searchPatterns: [/^butter$/i, /unsalted.*butter/i],
    propertyFilters: { minFat: 75, category: 'dairy' }
  },
  
  // Sugars
  'sucrose': {
    aliases: ['sucrose', 'white sugar', 'table sugar', 'sugar'],
    searchPatterns: [/^sucrose$/i, /white.*sugar/i, /table.*sugar/i, /^sugar$/i],
    propertyFilters: { category: 'sugar' }
  },
  'dextrose': {
    aliases: ['dextrose', 'glucose', 'dextrose monohydrate'],
    searchPatterns: [/dextrose/i, /^glucose$/i],
    propertyFilters: { category: 'sugar' }
  }
};

/**
 * Find an ingredient in the database using a generic ID
 * Uses multiple strategies: exact match, alias match, pattern match, property-based filtering
 */
export function findIngredientByGenericId(
  genericId: string,
  availableIngredients: IngredientData[]
): IngredientData | null {
  const mapping = CORE_INGREDIENT_MAPPINGS[genericId.toLowerCase()];
  
  if (!mapping) {
    // No mapping defined - try direct name match as fallback
    return availableIngredients.find(ing => 
      ing.name.toLowerCase() === genericId.toLowerCase() ||
      ing.id.toLowerCase() === genericId.toLowerCase()
    ) || null;
  }

  // Strategy 1: Try exact alias matches first
  for (const alias of mapping.aliases) {
    const match = availableIngredients.find(ing => 
      ing.name.toLowerCase() === alias.toLowerCase()
    );
    if (match) return match;
  }

  // Strategy 2: Try regex pattern matching
  for (const pattern of mapping.searchPatterns) {
    const match = availableIngredients.find(ing => 
      pattern.test(ing.name) || pattern.test(ing.id)
    );
    if (match) return match;
  }

  // Strategy 3: Property-based filtering (find best match)
  if (mapping.propertyFilters) {
    const candidates = availableIngredients.filter(ing => {
      const filters = mapping.propertyFilters!;
      
      // Category filter
      if (filters.category && ing.category !== filters.category) {
        return false;
      }
      
      // Fat range filter
      if (filters.minFat !== undefined && ing.fat_pct < filters.minFat) {
        return false;
      }
      if (filters.maxFat !== undefined && ing.fat_pct > filters.maxFat) {
        return false;
      }
      
      // MSNF range filter
      if (filters.minMSNF !== undefined && (ing.msnf_pct || 0) < filters.minMSNF) {
        return false;
      }
      if (filters.maxMSNF !== undefined && (ing.msnf_pct || 0) > filters.maxMSNF) {
        return false;
      }
      
      return true;
    });

    // Return the best candidate (prefer exact property matches)
    if (candidates.length > 0) {
      return candidates[0];
    }
  }

  // No match found
  return null;
}

/**
 * Diagnose why balancing failed and provide actionable suggestions
 */
export function diagnoseBalancingFailure(
  rows: { ing: IngredientData; grams: number }[],
  availableIngredients: IngredientData[],
  targets: any
): {
  missingIngredients: string[];
  suggestions: string[];
  hasWater: boolean;
  hasFatSource: boolean;
  hasMSNFSource: boolean;
} {
  const missingIngredients: string[] = [];
  const suggestions: string[] = [];

  // Check for essential balancing ingredients
  const hasWater = rows.some(r => r.ing.water_pct > 95) || 
                   availableIngredients.some(ing => ing.water_pct > 95);
  const hasFatSource = rows.some(r => r.ing.fat_pct > 15) || 
                       availableIngredients.some(ing => ing.fat_pct > 15);
  const hasMSNFSource = rows.some(r => (r.ing.msnf_pct || 0) > 70) || 
                        availableIngredients.some(ing => (ing.msnf_pct || 0) > 70);

  if (!hasWater) {
    missingIngredients.push('Water');
    suggestions.push('Add "Water" ingredient to enable fat/MSNF dilution');
  }

  if (!hasFatSource && targets.fat_pct !== undefined) {
    missingIngredients.push('High-fat ingredient (Butter or Heavy Cream 35%)');
    suggestions.push('Add heavy cream (35%+) or butter to adjust fat content');
  }

  if (!hasMSNFSource && targets.msnf_pct !== undefined) {
    missingIngredients.push('MSNF source (Skim Milk Powder)');
    suggestions.push('Add skim milk powder (SMP) to adjust MSNF independently of fat');
  }

  // Check ingredient diversity
  const ingredientCount = rows.length;
  if (ingredientCount < 3) {
    suggestions.push(`Add more ingredients (current: ${ingredientCount}, recommended: 4+)`);
  }

  // Check for locked/inflexible ingredients
  const allLocked = rows.every(r => 
    r.ing.category === 'stabilizer' || 
    r.ing.category === 'flavor' || 
    r.ing.category === 'fruit'
  );
  
  if (allLocked) {
    suggestions.push('Recipe contains only locked ingredients (flavors/stabilizers). Add dairy or water ingredients.');
  }

  return {
    missingIngredients,
    suggestions,
    hasWater,
    hasFatSource,
    hasMSNFSource
  };
}

/**
 * Get user-friendly ingredient suggestions based on what's needed
 */
export function getIngredientSuggestions(
  parameter: 'fat' | 'msnf' | 'sugars',
  direction: 'increase' | 'decrease',
  availableIngredients: IngredientData[]
): string[] {
  const suggestions: string[] = [];

  if (parameter === 'fat') {
    if (direction === 'increase') {
      const hasHeavyCream = findIngredientByGenericId('cream_35', availableIngredients);
      const hasButter = findIngredientByGenericId('butter', availableIngredients);
      
      if (!hasHeavyCream) suggestions.push('Add Heavy Cream 35% to increase fat');
      if (!hasButter) suggestions.push('Add Butter for high-fat content');
    } else {
      const hasWater = findIngredientByGenericId('water', availableIngredients);
      const hasSkimMilk = findIngredientByGenericId('milk_skim', availableIngredients);
      
      if (!hasWater) suggestions.push('Add Water to dilute fat content');
      if (!hasSkimMilk) suggestions.push('Add Skim Milk to replace high-fat milk');
    }
  }

  if (parameter === 'msnf') {
    if (direction === 'increase') {
      const hasSMP = findIngredientByGenericId('smp', availableIngredients);
      if (!hasSMP) suggestions.push('Add Skim Milk Powder (SMP) to increase MSNF');
    } else {
      const hasWater = findIngredientByGenericId('water', availableIngredients);
      if (!hasWater) suggestions.push('Add Water to dilute MSNF');
    }
  }

  return suggestions;
}
