/**
 * Test fixtures with known correct ingredient data
 * Used to avoid dependency on database state in unit tests
 */

import type { IngredientData } from '@/types/ingredients';

export const TEST_INGREDIENTS: Record<string, IngredientData> = {
  milk_3: {
    id: 'milk_3',
    name: 'Whole Milk 3%',
    category: 'dairy',
    water_pct: 87.5,
    fat_pct: 3,
    msnf_pct: 8.5,
    sugars_pct: 0,
    other_solids_pct: 1,
    sp_coeff: 0,
    pac_coeff: 0,
  },
  cream_25: {
    id: 'cream_25',
    name: 'Cream 25%',
    category: 'dairy',
    water_pct: 68,
    fat_pct: 25,
    msnf_pct: 6,
    sugars_pct: 0,
    other_solids_pct: 1,
    sp_coeff: 0,
    pac_coeff: 0,
  },
  heavy_cream: {
    id: 'heavy_cream',
    name: 'Heavy Cream 35%',
    category: 'dairy',
    water_pct: 58,
    fat_pct: 35,
    msnf_pct: 5.5,
    sugars_pct: 0,
    other_solids_pct: 1.5,
    sp_coeff: 0,
    pac_coeff: 0,
  },
  sucrose: {
    id: 'sucrose',
    name: 'Sucrose (Sugar)',
    category: 'sugar',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 100,
    other_solids_pct: 0,
    sp_coeff: 1.0,
    pac_coeff: 100,
  },
  dextrose: {
    id: 'dextrose',
    name: 'Dextrose',
    category: 'sugar',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 100,
    other_solids_pct: 0,
    sp_coeff: 0.74,
    pac_coeff: 190,
  },
  fructose: {
    id: 'fructose',
    name: 'Fructose',
    category: 'sugar',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 100,
    other_solids_pct: 0,
    sp_coeff: 1.73,
    pac_coeff: 190,
  },
  lactose: {
    id: 'lactose',
    name: 'Lactose',
    category: 'sugar',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 100,
    other_solids_pct: 0,
    sp_coeff: 0.16,
    pac_coeff: 62,
  },
  smp: {
    id: 'smp',
    name: 'Skim Milk Powder',
    category: 'dairy',
    water_pct: 3.5,
    fat_pct: 1,
    msnf_pct: 93,
    sugars_pct: 0,
    other_solids_pct: 2.5,
    sp_coeff: 0,
    pac_coeff: 0,
  },
  stabilizer: {
    id: 'stabilizer',
    name: 'Stabilizer',
    category: 'stabilizer',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 0,
    other_solids_pct: 100,
    sp_coeff: 0,
    pac_coeff: 0,
  },
  mango_alphonso: {
    id: 'mango_alphonso',
    name: 'Mango Alphonso Pulp',
    category: 'fruit',
    water_pct: 83,
    fat_pct: 0.4,
    msnf_pct: 0,
    sugars_pct: 14.8,
    other_solids_pct: 1.8,
    sp_coeff: 1.1,
    pac_coeff: 140,
    sugar_split: { glucose: 13.5, fructose: 30.4, sucrose: 56.1 },
  },
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry Puree',
    category: 'fruit',
    water_pct: 90,
    fat_pct: 0.3,
    msnf_pct: 0,
    sugars_pct: 5,
    other_solids_pct: 4.7,
    sp_coeff: 1.2,
    pac_coeff: 160,
    sugar_split: { glucose: 40, fructose: 45, sucrose: 15 },
  },
  passion_fruit: {
    id: 'passion_fruit',
    name: 'Passion Fruit Puree',
    category: 'fruit',
    water_pct: 73,
    fat_pct: 0.7,
    msnf_pct: 0,
    sugars_pct: 11.3,
    other_solids_pct: 15,
    sp_coeff: 1.1,
    pac_coeff: 145,
    sugar_split: { glucose: 35, fructose: 40, sucrose: 25 },
  },
};

/**
 * Get a test ingredient by ID
 */
export function getTestIngredientById(id: string): IngredientData | undefined {
  return TEST_INGREDIENTS[id];
}

/**
 * Get all test ingredients as an array
 */
export function getAllTestIngredients(): IngredientData[] {
  return Object.values(TEST_INGREDIENTS);
}
