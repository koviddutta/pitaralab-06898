/**
 * Integration tests for Phase 3 (LP Solver) and Phase 6 (Science Validation)
 * Tests the complete V2 balancing system
 */

import { describe, it, expect } from 'vitest';
import { 
  balanceRecipeLP, 
  balanceRecipeV2, 
  validateRecipeScience,
  getRecipeQualityScore,
  checkTargetFeasibility
} from '@/lib/optimize.balancer.v2';
import { calcMetricsV2 } from '@/lib/calc.v2';
import type { Row, OptimizeTarget } from '@/lib/optimize';
import type { IngredientData } from '@/types/ingredients';

// Mock ingredients for testing
const mockIngredients: IngredientData[] = [
  {
    id: 'whole-milk',
    name: 'Whole Milk',
    category: 'dairy',
    water_pct: 87.5,
    sugars_pct: 4.8,
    fat_pct: 3.5,
    msnf_pct: 8.7,
    other_solids_pct: 0,
    sp_coeff: 0.3,
    pac_coeff: 0.5,
    lactose_pct: 4.8,
    cost_per_kg: 1.5
  },
  {
    id: 'cream-35',
    name: 'Heavy Cream (35%)',
    category: 'dairy',
    water_pct: 57.7,
    sugars_pct: 3.3,
    fat_pct: 35.0,
    msnf_pct: 5.5,
    other_solids_pct: 0,
    sp_coeff: 0.2,
    pac_coeff: 0.3,
    lactose_pct: 3.3,
    cost_per_kg: 5.0
  },
  {
    id: 'sugar',
    name: 'White Sugar (Sucrose)',
    category: 'sugar',
    water_pct: 0,
    sugars_pct: 100,
    fat_pct: 0,
    msnf_pct: 0,
    other_solids_pct: 0,
    sp_coeff: 1.0,
    pac_coeff: 1.0,
    de: 100,
    cost_per_kg: 1.0
  },
  {
    id: 'smp',
    name: 'Skim Milk Powder',
    category: 'dairy',
    water_pct: 4,
    sugars_pct: 52,
    fat_pct: 1,
    msnf_pct: 96,
    other_solids_pct: 0,
    sp_coeff: 0.3,
    pac_coeff: 0.5,
    lactose_pct: 52,
    cost_per_kg: 4.0
  }
];

describe('Phase 3: LP Solver Tests', () => {
  it('should solve a simple recipe optimization', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 600 }, // Milk
      { ing: mockIngredients[1], grams: 200 }, // Cream
      { ing: mockIngredients[2], grams: 150 }, // Sugar
      { ing: mockIngredients[3], grams: 50 }   // SMP
    ];

    const targets: OptimizeTarget = {
      fat_pct: 8.0,
      msnf_pct: 11.0,
      totalSugars_pct: 18.0
    };

    const result = balanceRecipeLP(rows, targets, { tolerance: 0.2 });

    expect(result.success).toBe(true);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.message).toContain('optimal');

    // Verify total weight is preserved
    const originalWeight = rows.reduce((sum, r) => sum + r.grams, 0);
    const newWeight = result.rows.reduce((sum, r) => sum + r.grams, 0);
    expect(Math.abs(newWeight - originalWeight)).toBeLessThan(1);

    // Verify metrics are close to targets
    const metrics = calcMetricsV2(result.rows);
    expect(Math.abs(metrics.fat_pct - targets.fat_pct!)).toBeLessThan(1.0);
    expect(Math.abs(metrics.msnf_pct - targets.msnf_pct!)).toBeLessThan(1.0);
  });

  it('should return infeasible for impossible targets', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 800 }, // Milk only
      { ing: mockIngredients[2], grams: 200 }  // Sugar
    ];

    const targets: OptimizeTarget = {
      fat_pct: 20.0, // Impossible with just milk at 3.5% fat
      msnf_pct: 10.0
    };

    const result = balanceRecipeLP(rows, targets);

    expect(result.success).toBe(false);
    expect(result.message).toContain('infeasible');
  });

  it('should handle empty recipe gracefully', () => {
    const result = balanceRecipeLP([], {}, {});
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Empty recipe');
  });
});

describe('Phase 6: Science Validation Tests', () => {
  it('should validate optimal gelato recipe', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 600 },
      { ing: mockIngredients[1], grams: 150 },
      { ing: mockIngredients[2], grams: 180 },
      { ing: mockIngredients[3], grams: 70 }
    ];

    const metrics = calcMetricsV2(rows);
    const validations = validateRecipeScience(metrics, 'gelato_white');

    expect(validations.length).toBeGreaterThan(0);
    
    // Check that we have validations for key parameters
    const parameterNames = validations.map(v => v.parameter);
    expect(parameterNames).toContain('Total Solids');
    expect(parameterNames).toContain('Fat');
    expect(parameterNames).toContain('MSNF');
    expect(parameterNames).toContain('FPDT');

    // Each validation should have all required fields
    validations.forEach(v => {
      expect(v.parameter).toBeDefined();
      expect(v.value).toBeDefined();
      expect(v.optimalRange).toBeDefined();
      expect(v.acceptableRange).toBeDefined();
      expect(v.severity).toMatch(/optimal|acceptable|warning|critical/);
      expect(v.message).toBeDefined();
    });
  });

  it('should detect critical issues in unbalanced recipe', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 900 }, // Too much milk
      { ing: mockIngredients[2], grams: 100 }  // Too little sugar
    ];

    const metrics = calcMetricsV2(rows);
    const validations = validateRecipeScience(metrics, 'gelato_white');

    const criticalIssues = validations.filter(v => v.severity === 'critical');
    expect(criticalIssues.length).toBeGreaterThan(0);

    // Critical issues should have recommendations
    criticalIssues.forEach(issue => {
      expect(issue.recommendation).toBeDefined();
      expect(issue.recommendation!.length).toBeGreaterThan(0);
    });
  });

  it('should calculate quality score correctly', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 600 },
      { ing: mockIngredients[1], grams: 150 },
      { ing: mockIngredients[2], grams: 180 },
      { ing: mockIngredients[3], grams: 70 }
    ];

    const metrics = calcMetricsV2(rows);
    const validations = validateRecipeScience(metrics, 'gelato_white');
    const qualityScore = getRecipeQualityScore(validations);

    expect(qualityScore.score).toBeGreaterThanOrEqual(0);
    expect(qualityScore.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(qualityScore.grade);
    expect(['success', 'warning', 'destructive']).toContain(qualityScore.color);

    // Score should map correctly to grade
    if (qualityScore.score >= 90) {
      expect(qualityScore.grade).toBe('A');
    } else if (qualityScore.score >= 75) {
      expect(qualityScore.grade).toBe('B');
    }
  });

  it('should handle different product types', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 700 },
      { ing: mockIngredients[2], grams: 250 },
      { ing: mockIngredients[3], grams: 50 }
    ];

    const metrics = calcMetricsV2(rows);

    // Test different product types
    const gelatoValidations = validateRecipeScience(metrics, 'gelato_white');
    const iceCreamValidations = validateRecipeScience(metrics, 'ice_cream');
    const sorbetValidations = validateRecipeScience(metrics, 'sorbet');

    expect(gelatoValidations.length).toBeGreaterThan(0);
    expect(iceCreamValidations.length).toBeGreaterThan(0);
    expect(sorbetValidations.length).toBeGreaterThan(0);

    // Different product types should have different constraints
    const gelatoFat = gelatoValidations.find(v => v.parameter === 'Fat');
    const iceCreamFat = iceCreamValidations.find(v => v.parameter === 'Fat');
    
    expect(gelatoFat?.optimalRange).not.toEqual(iceCreamFat?.optimalRange);
  });
});

describe('Integrated V2 Balancer Tests', () => {
  it('should balance recipe using LP solver first', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 600 },
      { ing: mockIngredients[1], grams: 150 },
      { ing: mockIngredients[2], grams: 180 },
      { ing: mockIngredients[3], grams: 70 }
    ];

    const targets: OptimizeTarget = {
      fat_pct: 8.5,
      msnf_pct: 11.0,
      totalSugars_pct: 18.5
    };

    const result = balanceRecipeV2(rows, targets, mockIngredients, {
      useLPSolver: true,
      enableScienceValidation: true,
      productType: 'gelato_white'
    });

    expect(result.success).toBe(true);
    expect(result.strategy).toContain('Linear Programming');
    expect(result.scienceValidation).toBeDefined();
    expect(result.qualityScore).toBeDefined();
    
    // Quality score should be present
    const score = result.qualityScore;
    expect(score!.score).toBeGreaterThanOrEqual(0);
    expect(score!.grade).toBeDefined();
  });

  it('should fallback to heuristic if LP fails', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 900 },
      { ing: mockIngredients[2], grams: 100 }
    ];

    const targets: OptimizeTarget = {
      fat_pct: 15.0, // Very high, may be infeasible
      msnf_pct: 12.0,
      totalSugars_pct: 20.0
    };

    const result = balanceRecipeV2(rows, targets, mockIngredients, {
      useLPSolver: true,
      enableFeasibilityCheck: true
    });

    // Should either succeed with heuristic or report feasibility issue
    if (result.success) {
      expect(result.strategy).toBeDefined();
    } else {
      expect(result.feasibilityReport).toBeDefined();
      expect(result.feasibilityReport?.suggestions.length).toBeGreaterThan(0);
    }
  });

  it('should check feasibility and provide suggestions', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 1000 } // Only milk
    ];

    const targets: OptimizeTarget = {
      fat_pct: 20.0, // Impossible with just 3.5% fat milk
      msnf_pct: 15.0
    };

    const feasibility = checkTargetFeasibility(rows, targets, mockIngredients);

    expect(feasibility.feasible).toBe(false);
    expect(feasibility.reason).toBeDefined();
    expect(feasibility.suggestions.length).toBeGreaterThan(0);
    expect(feasibility.achievableRanges).toBeDefined();
    
    // Should suggest adding high-fat ingredients
    const suggestionsText = feasibility.suggestions.join(' ').toLowerCase();
    expect(suggestionsText).toContain('fat');
  });

  it('should preserve total weight during optimization', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 500 },
      { ing: mockIngredients[1], grams: 200 },
      { ing: mockIngredients[2], grams: 200 },
      { ing: mockIngredients[3], grams: 100 }
    ];

    const originalWeight = rows.reduce((sum, r) => sum + r.grams, 0);

    const targets: OptimizeTarget = {
      fat_pct: 9.0,
      msnf_pct: 11.5
    };

    const result = balanceRecipeV2(rows, targets, mockIngredients, {
      useLPSolver: true
    });

    const newWeight = result.rows.reduce((sum, r) => sum + r.grams, 0);
    
    // Weight should be preserved within 1g tolerance
    expect(Math.abs(newWeight - originalWeight)).toBeLessThan(1);
  });

  it('should include progress tracking', () => {
    const rows: Row[] = [
      { ing: mockIngredients[0], grams: 600 },
      { ing: mockIngredients[1], grams: 200 },
      { ing: mockIngredients[2], grams: 200 }
    ];

    const targets: OptimizeTarget = {
      fat_pct: 10.0,
      msnf_pct: 10.0
    };

    const result = balanceRecipeV2(rows, targets, mockIngredients);

    expect(result.progress).toBeDefined();
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.adjustmentsSummary).toBeDefined();
  });
});
