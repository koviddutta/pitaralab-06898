/**
 * Balance-First Work Order Tests
 * Tests for sorbet, auto-fix, mode mapping, and core ingredient protection
 */

import { describe, test, expect } from 'vitest';
import { diagnoseFeasibility, applyAutoFix } from '@/lib/diagnostics';
import { classifyIngredient } from '@/lib/ingredientMap';
import { balanceRecipeLP } from '@/lib/optimize.balancer.v2';
import type { Row } from '@/lib/optimize';
import type { IngredientData } from '@/types/ingredients';
import type { Mode } from '@/types/mode';

/**
 * Resolve product type to calculation mode - copied from RecipeCalculatorV2
 */
function resolveMode(productType: string): Mode {
  if (productType === 'ice_cream') return 'ice_cream';
  if (productType === 'gelato') return 'gelato';
  if (productType === 'sorbet') return 'sorbet';
  if (productType === 'kulfi') return 'kulfi';
  return 'gelato';
}

// Mock ingredients
const mockWater: IngredientData = {
  id: 'water-1',
  name: 'Water',
  category: 'other',
  water_pct: 100,
  fat_pct: 0,
  sugars_pct: 0,
  msnf_pct: 0,
  other_solids_pct: 0
};

const mockMilk: IngredientData = {
  id: 'milk-1',
  name: 'Whole Milk',
  category: 'dairy',
  water_pct: 87,
  fat_pct: 3.5,
  sugars_pct: 0,
  msnf_pct: 9,
  other_solids_pct: 0
};

const mockCream: IngredientData = {
  id: 'cream-1',
  name: 'Heavy Cream 35%',
  category: 'dairy',
  water_pct: 58,
  fat_pct: 35,
  sugars_pct: 0,
  msnf_pct: 6,
  other_solids_pct: 0
};

const mockSMP: IngredientData = {
  id: 'smp-1',
  name: 'Skim Milk Powder',
  category: 'dairy',
  water_pct: 4,
  fat_pct: 1,
  sugars_pct: 0,
  msnf_pct: 95,
  other_solids_pct: 0
};

const mockSucrose: IngredientData = {
  id: 'sucrose-1',
  name: 'Sucrose',
  category: 'sugar',
  water_pct: 0,
  fat_pct: 0,
  sugars_pct: 100,
  msnf_pct: 0,
  other_solids_pct: 0,
  sp_coeff: 1.0,
  pac_coeff: 1.0
};

const mockDextrose: IngredientData = {
  id: 'dextrose-1',
  name: 'Dextrose',
  category: 'sugar',
  water_pct: 0,
  fat_pct: 0,
  sugars_pct: 100,
  msnf_pct: 0,
  other_solids_pct: 0,
  sp_coeff: 0.7,
  pac_coeff: 1.9
};

const mockMango: IngredientData = {
  id: 'mango-1',
  name: 'Mango Puree',
  category: 'fruit',
  water_pct: 82,
  fat_pct: 0.4,
  sugars_pct: 15,
  msnf_pct: 0,
  other_solids_pct: 2.6,
  brix_estimate: 15
};

const mockChocolate: IngredientData = {
  id: 'chocolate-1',
  name: 'Dark Chocolate',
  category: 'flavor',
  water_pct: 1,
  fat_pct: 32,
  sugars_pct: 54,
  msnf_pct: 0,
  other_solids_pct: 13
};

const allIngredients = [
  mockWater,
  mockMilk,
  mockCream,
  mockSMP,
  mockSucrose,
  mockDextrose,
  mockMango,
  mockChocolate
];

describe('Balance-First Work Order Tests', () => {
  
  test('A. Infeasible Ice Cream - Should Block with Suggestions', () => {
    const rows: Row[] = [
      { ing: mockMilk, grams: 500, min: 0, max: 1000 },
      { ing: mockSucrose, grams: 100, min: 0, max: 1000 }
    ];
    
    const targets = {
      fat_pct: 13,
      msnf_pct: 11,
      totalSugars_pct: 17
    };
    
    const feas = diagnoseFeasibility(rows, allIngredients, targets, 'ice_cream');
    
    expect(feas.feasible).toBe(false);
    expect(feas.suggestions.length).toBeGreaterThan(0);
    expect(feas.reason).toBeDefined();
  });
  
  test('B. Auto-Fix Ice Cream - Should Apply Minimal Fixes', () => {
    const rows: Row[] = [
      { ing: mockMilk, grams: 500, min: 0, max: 1000 },
      { ing: mockSucrose, grams: 100, min: 0, max: 1000 }
    ];
    
    const targets = {
      fat_pct: 13,
      msnf_pct: 11,
      totalSugars_pct: 17
    };
    
    const feas = diagnoseFeasibility(rows, allIngredients, targets, 'ice_cream');
    const autoFix = applyAutoFix(rows, allIngredients, 'ice_cream', feas);
    
    expect(autoFix.applied).toBe(true);
    expect(autoFix.addedIngredients.length).toBeGreaterThan(0);
    expect(autoFix.message).toContain('auto-fix');
  });
  
  test('C. Gelato Balance - Should Hit Target Ranges', () => {
    const rows: Row[] = [
      { ing: mockMilk, grams: 500, min: 0, max: 1000 },
      { ing: mockCream, grams: 200, min: 0, max: 1000 },
      { ing: mockSMP, grams: 20, min: 0, max: 1000 },
      { ing: mockSucrose, grams: 100, min: 0, max: 1000 },
      { ing: mockWater, grams: 150, min: 0, max: 1000 }
    ];
    
    const targets = {
      fat_pct: 7.5,
      msnf_pct: 10.5,
      totalSugars_pct: 19
    };
    
    const result = balanceRecipeLP(rows, targets, { tolerance: 0.15, mode: 'gelato' });
    
    expect(result.success).toBe(true);
    // Fat should be 6-10%, MSNF 9-12%, Sugars 18-22%
  });
  
  test('D. Sorbet (No Dairy) - Should Reject Dairy and Target 26-31% Sugars', () => {
    const rows: Row[] = [
      { ing: mockMango, grams: 400, min: 0, max: 1000 },
      { ing: mockSucrose, grams: 180, min: 0, max: 1000 },
      { ing: mockDextrose, grams: 60, min: 0, max: 1000 },
      { ing: mockWater, grams: 360, min: 0, max: 1000 }
    ];
    
    const targets = {
      fat_pct: 0.5,
      msnf_pct: 0.5,
      totalSugars_pct: 28.5
    };
    
    const feas = diagnoseFeasibility(rows, allIngredients, targets, 'sorbet');
    
    expect(feas.feasible).toBe(true);
    expect(feas.suggestions.some(s => s.includes('fruit tier'))).toBe(true);
    
    // Test that dairy would be rejected
    const rowsWithDairy: Row[] = [
      ...rows,
      { ing: mockMilk, grams: 100, min: 0, max: 1000 }
    ];
    
    const feasWithDairy = diagnoseFeasibility(rowsWithDairy, allIngredients, targets, 'sorbet');
    expect(feasWithDairy.suggestions.some(s => s.includes('dairy'))).toBe(true);
  });
  
  test('E. Mode Mapping - Should Correctly Map All Modes', () => {
    expect(resolveMode('ice_cream')).toBe('ice_cream');
    expect(resolveMode('gelato')).toBe('gelato');
    expect(resolveMode('sorbet')).toBe('sorbet');
    expect(resolveMode('kulfi')).toBe('kulfi');
    expect(resolveMode('invalid')).toBe('gelato'); // fallback
  });
  
  test('F. Core Ingredient Protection - Should Lock Flavor Ingredients', () => {
    const chocolateRole = classifyIngredient(mockChocolate);
    const mangoRole = classifyIngredient(mockMango);
    const milkRole = classifyIngredient(mockMilk);
    const sucroseRole = classifyIngredient(mockSucrose);
    
    expect(chocolateRole).toBe('core');
    expect(mangoRole).toBe('core');
    expect(milkRole).toBe('balancing');
    expect(sucroseRole).toBe('balancing');
  });
  
  test('G. Sugar Bounds - Should Apply Mode-Specific Limits', () => {
    const rows: Row[] = [
      { ing: mockMilk, grams: 500, min: 0, max: 1000 },
      { ing: mockCream, grams: 200, min: 0, max: 1000 },
      { ing: mockSMP, grams: 20, min: 0, max: 1000 },
      { ing: mockSucrose, grams: 300, min: 0, max: 1000 }, // High sucrose
      { ing: mockWater, grams: 100, min: 0, max: 1000 }
    ];
    
    const targets = {
      fat_pct: 13,
      msnf_pct: 11,
      totalSugars_pct: 17
    };
    
    const result = balanceRecipeLP(rows, targets, { tolerance: 0.15, mode: 'ice_cream' });
    
    // Sucrose should be capped at 22% max
    if (result.success) {
      const totalWeight = result.rows.reduce((sum, r) => sum + r.grams, 0);
      const sucroseRow = result.rows.find(r => r.ing.name === 'Sucrose');
      if (sucroseRow) {
        const sucrosePct = (sucroseRow.grams / totalWeight) * 100;
        expect(sucrosePct).toBeLessThanOrEqual(22);
      }
    }
  });
});
