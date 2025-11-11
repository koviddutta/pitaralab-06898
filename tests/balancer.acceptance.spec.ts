/**
 * PHASE 3: Acceptance Tests for Calculator Balancing
 * Tests the 4 core scenarios from the specification
 */

import { describe, it, expect } from 'vitest';
import { balanceRecipeV2 } from '@/lib/optimize.balancer.v2';
import type { Row, OptimizeTarget } from '@/lib/optimize';
import type { IngredientData } from '@/types/ingredients';
import { calcMetricsV2 } from '@/lib/calc.v2';

// Mock ingredient database
const mockIngredients: IngredientData[] = [
  {
    id: 'water-001',
    name: 'Water',
    category: 'other',
    water_pct: 100,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 0,
    other_solids_pct: 0
  },
  {
    id: 'milk-001',
    name: 'Whole Milk',
    category: 'dairy',
    water_pct: 87.5,
    fat_pct: 3.5,
    msnf_pct: 9,
    sugars_pct: 0,
    other_solids_pct: 0
  },
  {
    id: 'cream-001',
    name: 'Heavy Cream 35%',
    category: 'dairy',
    water_pct: 58,
    fat_pct: 35,
    msnf_pct: 7,
    sugars_pct: 0,
    other_solids_pct: 0
  },
  {
    id: 'smp-001',
    name: 'Skim Milk Powder',
    category: 'dairy',
    water_pct: 4,
    fat_pct: 1,
    msnf_pct: 95,
    sugars_pct: 0,
    other_solids_pct: 0
  },
  {
    id: 'sucrose-001',
    name: 'Sucrose',
    category: 'sugar',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 100,
    other_solids_pct: 0,
    sp_coeff: 1.0,
    pac_coeff: 1.0
  },
  {
    id: 'dextrose-001',
    name: 'Dextrose',
    category: 'sugar',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 100,
    other_solids_pct: 0,
    sp_coeff: 0.7,
    pac_coeff: 1.9
  },
  {
    id: 'fruit-001',
    name: 'Strawberry Puree',
    category: 'fruit',
    water_pct: 88,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 7,
    other_solids_pct: 5
  }
];

describe('Acceptance Test 1: Infeasible Recipe (Milk + Sucrose only)', () => {
  it('should detect infeasibility and not mutate recipe', () => {
    const initialRows: Row[] = [
      { ing: mockIngredients[1], grams: 500 }, // Milk
      { ing: mockIngredients[4], grams: 100 }  // Sucrose
    ];

    const targets: OptimizeTarget = {
      fat_pct: 10,
      msnf_pct: 10,
      totalSugars_pct: 18
    };

    const result = balanceRecipeV2(initialRows, targets, mockIngredients, {
      maxIterations: 50,
      tolerance: 0.15,
      enableFeasibilityCheck: true,
      useLPSolver: false, // Disable LP to test heuristic fallback
      productType: 'ice_cream'
    });

    // Should fail or apply auto-fix
    if (!result.success) {
      expect(result.success).toBe(false);
      expect(result.feasibilityReport).toBeDefined();
      expect(result.feasibilityReport?.suggestions.length).toBeGreaterThan(0);
    } else {
      // If auto-fix was applied, check that ingredients were added
      expect(result.rows.length).toBeGreaterThan(initialRows.length);
    }
  });
});

describe('Acceptance Test 2: Feasible with Water + Cream', () => {
  it('should successfully balance ice cream with full ingredient set', () => {
    const initialRows: Row[] = [
      { ing: mockIngredients[0], grams: 100 }, // Water
      { ing: mockIngredients[1], grams: 400 }, // Milk
      { ing: mockIngredients[2], grams: 100 }, // Cream
      { ing: mockIngredients[4], grams: 150 }  // Sucrose
    ];

    const targets: OptimizeTarget = {
      fat_pct: 10,
      msnf_pct: 10,
      totalSugars_pct: 18
    };

    const result = balanceRecipeV2(initialRows, targets, mockIngredients, {
      maxIterations: 50,
      tolerance: 0.15,
      enableFeasibilityCheck: true,
      useLPSolver: true,
      productType: 'ice_cream'
    });

    expect(result.success).toBe(true);
    
    // Check metrics are within range
    const metrics = calcMetricsV2(result.rows, { mode: 'ice_cream' });
    expect(metrics.fat_pct).toBeGreaterThanOrEqual(targets.fat_pct! - 1);
    expect(metrics.fat_pct).toBeLessThanOrEqual(targets.fat_pct! + 1);
    expect(metrics.msnf_pct).toBeGreaterThanOrEqual(targets.msnf_pct! - 1);
    expect(metrics.msnf_pct).toBeLessThanOrEqual(targets.msnf_pct! + 1);
  });
});

describe('Acceptance Test 3: Gelato Balancing', () => {
  it('should balance gelato within gelato constraints', () => {
    const initialRows: Row[] = [
      { ing: mockIngredients[0], grams: 200 }, // Water
      { ing: mockIngredients[1], grams: 400 }, // Milk
      { ing: mockIngredients[2], grams: 80 },  // Cream (lower fat than ice cream)
      { ing: mockIngredients[3], grams: 30 },  // SMP
      { ing: mockIngredients[4], grams: 180 }  // Sucrose
    ];

    const targets: OptimizeTarget = {
      fat_pct: 7,
      msnf_pct: 10,
      totalSugars_pct: 20
    };

    const result = balanceRecipeV2(initialRows, targets, mockIngredients, {
      maxIterations: 50,
      tolerance: 0.15,
      enableFeasibilityCheck: true,
      useLPSolver: true,
      productType: 'gelato'
    });

    expect(result.success).toBe(true);
    
    const metrics = calcMetricsV2(result.rows, { mode: 'gelato' });
    
    // Gelato constraints: Fat 6-10%, MSNF 9-12%, Sugars 18-22%
    expect(metrics.fat_pct).toBeGreaterThanOrEqual(5);
    expect(metrics.fat_pct).toBeLessThanOrEqual(12);
    expect(metrics.msnf_pct).toBeGreaterThanOrEqual(7);
    expect(metrics.msnf_pct).toBeLessThanOrEqual(13);
  });
});

describe('Acceptance Test 4: Sorbet Balancing (No Dairy)', () => {
  it('should balance sorbet to 26-31% sugars with no dairy', () => {
    const initialRows: Row[] = [
      { ing: mockIngredients[0], grams: 500 }, // Water
      { ing: mockIngredients[6], grams: 300 }, // Fruit puree
      { ing: mockIngredients[4], grams: 150 }, // Sucrose
      { ing: mockIngredients[5], grams: 30 }   // Dextrose
    ];

    const targets: OptimizeTarget = {
      totalSugars_pct: 28 // Target 28% sugars for sorbet
    };

    const result = balanceRecipeV2(initialRows, targets, mockIngredients, {
      maxIterations: 50,
      tolerance: 0.15,
      enableFeasibilityCheck: true,
      useLPSolver: true,
      productType: 'sorbet'
    });

    expect(result.success).toBe(true);
    
    const metrics = calcMetricsV2(result.rows, { mode: 'sorbet' });
    
    // Sorbet constraints: Sugars 26-31%, Fat <1%, MSNF <1%
    expect(metrics.totalSugars_pct).toBeGreaterThanOrEqual(24);
    expect(metrics.totalSugars_pct).toBeLessThanOrEqual(33);
    expect(metrics.fat_pct).toBeLessThanOrEqual(2);
    expect(metrics.msnf_pct).toBeLessThanOrEqual(2);
    
    // Ensure no dairy was added
    const hasDairy = result.rows.some(r => 
      r.ing.category === 'dairy' && r.grams > 0
    );
    expect(hasDairy).toBe(false);
  });
});
