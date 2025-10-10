/**
 * Utility to convert between legacy and modern ingredient formats
 * Ensures consistent calculations across all calculator components
 * 
 * NOTE: All ingredient lookups now use Supabase as source of truth
 */

import { IngredientData } from './ingredientLibrary';

/**
 * Convert legacy recipe format {[name: string]: number} to modern format
 * @param recipe - Legacy recipe object with ingredient names as keys
 * @param availableIngredients - Ingredients from Supabase (pass from caller)
 */
export function convertLegacyRecipeToRows(
  recipe: { [key: string]: number },
  availableIngredients: IngredientData[]
): Array<{ ing: IngredientData; grams: number }> {
  return Object.entries(recipe).map(([name, grams]) => {
    // Try to find exact match first
    let ing = availableIngredients.find(i => i.name.toLowerCase() === name.toLowerCase());
    
    // If not found, try fuzzy matching
    if (!ing) {
      const nameLower = name.toLowerCase();
      ing = availableIngredients.find(i => 
        i.name.toLowerCase().includes(nameLower) ||
        nameLower.includes(i.name.toLowerCase()) ||
        i.id.toLowerCase() === nameLower.replace(/\s+/g, '_')
      );
    }
    
    // If still not found, create a default ingredient with milk-like properties
    if (!ing) {
      ing = {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name,
        category: 'other',
        water_pct: 88,
        fat_pct: 3,
        sugars_pct: 5,
        other_solids_pct: 0,
        sp_coeff: 0.5,
        pac_coeff: 50,
      };
    }
    
    return { ing, grams: grams || 0 };
  });
}

/**
 * Smart ingredient name matching with common aliases
 * @param searchName - Name or alias to search for
 * @param availableIngredients - Ingredients from Supabase (pass from caller)
 */
export function matchIngredientName(
  searchName: string,
  availableIngredients: IngredientData[]
): IngredientData | null {
  const aliases: { [key: string]: string } = {
    'sugar': 'Sucrose',
    'table sugar': 'Sucrose',
    'white sugar': 'Sucrose',
    'dextrose monohydrate': 'Dextrose',
    'glucose': 'Glucose Syrup DE60',
    'corn syrup': 'Glucose Syrup DE60',
    'milk': 'Milk 3% fat',
    'whole milk': 'Milk 3% fat',
    'cream': 'Cream 25% fat',
    'heavy cream': 'Heavy Cream',
    'whipping cream': 'Cream 25% fat',
    'skim milk powder': 'Skim Milk Powder',
    'nonfat dry milk': 'Skim Milk Powder',
    'stabilizer': 'Stabilizer Blend',
    'egg yolk': 'Egg Yolks',
    'vanilla': 'Vanilla Extract',
  };
  
  const searchLower = searchName.toLowerCase();
  const resolvedName = aliases[searchLower] || searchName;
  
  return availableIngredients.find(ing => 
    ing.name.toLowerCase() === resolvedName.toLowerCase()
  ) || null;
}
