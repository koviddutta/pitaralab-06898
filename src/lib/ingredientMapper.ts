/**
 * Dynamic Ingredient Mapping System
 * Maps generic ingredient IDs to actual database ingredients using multiple strategies
 */

import type { IngredientData } from '@/types/ingredients';

/**
 * Core ingredient mappings - maps generic IDs to search patterns and property filters
 * Enhanced with common aliases, regional terminology, and industry abbreviations
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
    aliases: ['water', 'h2o', 'potable water', 'drinking water'],
    searchPatterns: [/^water$/i, /pure water/i, /potable/i, /drinking.*water/i],
    propertyFilters: { minFat: 0, maxFat: 0, minMSNF: 0, maxMSNF: 0 }
  },
  
  // Whole Milk (3-4% fat) - includes regional variations
  'milk_whole': {
    aliases: [
      'whole milk', 'full milk', 'milk 3%', '3% milk', 'full fat milk',
      'toned milk', 'standardized milk', 'buffalo milk', 'cow milk',
      'full cream milk', 'regular milk'
    ],
    searchPatterns: [
      /whole.*milk/i, /milk.*whole/i, /full.*milk/i, 
      /milk.*3/i, /3.*milk/i,
      /toned.*milk/i, /standardized.*milk/i,
      /buffalo.*milk/i, /cow.*milk/i,
      /full.*cream.*milk/i, /regular.*milk/i
    ],
    propertyFilters: { minFat: 2.5, maxFat: 4.5, category: 'dairy' }
  },
  
  // Skim Milk (0-0.5% fat)
  'milk_skim': {
    aliases: [
      'skim milk', 'skimmed milk', 'fat-free milk', 'nonfat milk',
      'double toned milk', 'non-fat milk', '0% milk', 'zero fat milk'
    ],
    searchPatterns: [
      /skim.*milk/i, /milk.*skim/i, 
      /fat.?free.*milk/i, /non.?fat.*milk/i, /zero.*fat/i,
      /double.*toned/i, /0%.*milk/i, /0.*milk/i
    ],
    propertyFilters: { minFat: 0, maxFat: 0.5, category: 'dairy' }
  },
  
  // Semi-Skimmed / Low-Fat Milk (1.5-2% fat)
  'milk_lowfat': {
    aliases: [
      'low-fat milk', 'semi-skimmed milk', '1.5% milk', '2% milk',
      'single toned milk', 'reduced fat milk'
    ],
    searchPatterns: [
      /low.?fat.*milk/i, /semi.*skim/i, 
      /1\.5.*milk/i, /2%.*milk/i, /2.*milk/i,
      /single.*toned/i, /reduced.*fat.*milk/i
    ],
    propertyFilters: { minFat: 1, maxFat: 2.5, category: 'dairy' }
  },
  
  // Light Cream (18-22% fat)
  'cream_20': {
    aliases: [
      'light cream', 'cream 20%', '20% cream', 'light cream 20%',
      'table cream', 'coffee cream', 'single cream'
    ],
    searchPatterns: [
      /light.*cream/i, /cream.*20/i, /20.*cream/i,
      /table.*cream/i, /coffee.*cream/i, /single.*cream/i
    ],
    propertyFilters: { minFat: 18, maxFat: 22, category: 'dairy' }
  },
  
  // Heavy Cream (33-40% fat)
  'cream_35': {
    aliases: [
      'heavy cream', 'cream 35%', '35% cream', 'heavy cream 35%',
      'whipping cream', 'double cream', 'thick cream', 'fresh cream',
      'heavy whipping cream', '40% cream'
    ],
    searchPatterns: [
      /heavy.*cream/i, /cream.*35/i, /35.*cream/i,
      /whipping.*cream/i, /double.*cream/i, /thick.*cream/i,
      /fresh.*cream/i, /cream.*40/i, /40.*cream/i
    ],
    propertyFilters: { minFat: 33, maxFat: 40, category: 'dairy' }
  },
  
  // Skim Milk Powder (SMP) - 90%+ MSNF
  'smp': {
    aliases: [
      'skim milk powder', 'skimmed milk powder', 'non-fat dry milk',
      'smp', 'nfdm', 'skim powder', 'milk powder skim',
      'fat-free milk powder', 'nonfat dry milk'
    ],
    searchPatterns: [
      /\bsmp\b/i, /\bnfdm\b/i,
      /skim.*powder/i, /powder.*skim/i,
      /non.?fat.*dry.*milk/i, /milk.*powder.*skim/i,
      /fat.?free.*powder/i, /skim.*milk.*powder/i
    ],
    propertyFilters: { minMSNF: 90, maxFat: 1.5, category: 'dairy' }
  },
  
  // Whole Milk Powder (WMP) - 25%+ fat
  'wmp': {
    aliases: [
      'whole milk powder', 'full cream milk powder', 'wmp',
      'fcmp', 'whole powder', 'milk powder whole',
      'full fat milk powder', 'full cream powder'
    ],
    searchPatterns: [
      /\bwmp\b/i, /\bfcmp\b/i,
      /whole.*milk.*powder/i, /powder.*whole/i,
      /full.*cream.*powder/i, /full.*fat.*powder/i
    ],
    propertyFilters: { minFat: 20, minMSNF: 60, category: 'dairy' }
  },
  
  // Butter (80%+ fat)
  'butter': {
    aliases: [
      'butter', 'unsalted butter', 'salted butter', 'table butter',
      'white butter', 'makkhan', 'fresh butter'
    ],
    searchPatterns: [
      /^butter$/i, /unsalted.*butter/i, /salted.*butter/i,
      /table.*butter/i, /white.*butter/i, /makkhan/i,
      /fresh.*butter/i
    ],
    propertyFilters: { minFat: 75, category: 'dairy' }
  },
  
  // Condensed Milk (8-10% fat, 20%+ MSNF)
  'condensed_milk': {
    aliases: [
      'condensed milk', 'sweetened condensed milk', 'condensed',
      'milkmaid', 'condensed whole milk'
    ],
    searchPatterns: [
      /condensed.*milk/i, /milk.*condensed/i,
      /sweetened.*condensed/i, /milkmaid/i
    ],
    propertyFilters: { minFat: 7, maxFat: 12, minMSNF: 18, category: 'dairy' }
  },
  
  // Sucrose (table sugar)
  'sucrose': {
    aliases: [
      'sucrose', 'white sugar', 'table sugar', 'sugar', 'cane sugar',
      'refined sugar', 'granulated sugar', 'crystal sugar'
    ],
    searchPatterns: [
      /^sucrose$/i, /white.*sugar/i, /table.*sugar/i, 
      /^sugar$/i, /cane.*sugar/i, /refined.*sugar/i,
      /granulated.*sugar/i, /crystal.*sugar/i
    ],
    propertyFilters: { category: 'sugar' }
  },
  
  // Dextrose (glucose)
  'dextrose': {
    aliases: [
      'dextrose', 'glucose', 'dextrose monohydrate', 'corn sugar',
      'grape sugar', 'glucose powder', 'dextrose powder'
    ],
    searchPatterns: [
      /dextrose/i, /^glucose$/i, /corn.*sugar/i,
      /grape.*sugar/i, /glucose.*powder/i
    ],
    propertyFilters: { category: 'sugar' }
  },
  
  // Fructose
  'fructose': {
    aliases: [
      'fructose', 'fruit sugar', 'levulose', 'fructose powder'
    ],
    searchPatterns: [
      /fructose/i, /fruit.*sugar/i, /levulose/i
    ],
    propertyFilters: { category: 'sugar' }
  },
  
  // Invert Sugar
  'invert_sugar': {
    aliases: [
      'invert sugar', 'inverted sugar', 'trimoline', 'invert syrup'
    ],
    searchPatterns: [
      /invert.*sugar/i, /trimoline/i, /invert.*syrup/i
    ],
    propertyFilters: { category: 'sugar' }
  },
  
  // Honey
  'honey': {
    aliases: [
      'honey', 'natural honey', 'pure honey', 'raw honey', 'shahad'
    ],
    searchPatterns: [
      /honey/i, /shahad/i
    ],
    propertyFilters: { category: 'sugar' }
  }
};

/**
 * Find an ingredient in the database using a generic ID or search term
 * Uses multiple strategies: exact match, alias match, pattern match, property-based filtering
 */
export function findIngredientByGenericId(
  genericId: string,
  availableIngredients: IngredientData[]
): IngredientData | null {
  const searchTerm = genericId.toLowerCase().trim();
  
  // Strategy 0: Check if this matches any alias in any mapping
  for (const [mappingKey, mapping] of Object.entries(CORE_INGREDIENT_MAPPINGS)) {
    // Check if search term matches any alias exactly
    for (const alias of mapping.aliases) {
      if (alias.toLowerCase() === searchTerm) {
        // Found a match! Now find the actual ingredient using full mapping logic
        return findIngredientByMapping(mapping, availableIngredients);
      }
    }
    
    // Check if search term matches any pattern
    for (const pattern of mapping.searchPatterns) {
      if (pattern.test(searchTerm)) {
        return findIngredientByMapping(mapping, availableIngredients);
      }
    }
  }
  
  // Strategy 1: Try direct mapping lookup (for substitution rules using generic IDs)
  const mapping = CORE_INGREDIENT_MAPPINGS[searchTerm];
  if (mapping) {
    return findIngredientByMapping(mapping, availableIngredients);
  }

  // Strategy 2: Try direct name/ID match as fallback
  const directMatch = availableIngredients.find(ing => 
    ing.name.toLowerCase() === searchTerm ||
    ing.id.toLowerCase() === searchTerm
  );
  if (directMatch) return directMatch;

  // Strategy 3: Try fuzzy matching on partial words
  const words = searchTerm.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue; // Skip very short words
    
    const fuzzyMatch = availableIngredients.find(ing => 
      ing.name.toLowerCase().includes(word) ||
      ing.id.toLowerCase().includes(word)
    );
    if (fuzzyMatch) return fuzzyMatch;
  }

  // No match found
  return null;
}

/**
 * Helper function to find ingredient using a mapping configuration
 */
function findIngredientByMapping(
  mapping: typeof CORE_INGREDIENT_MAPPINGS[string],
  availableIngredients: IngredientData[]
): IngredientData | null {
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
