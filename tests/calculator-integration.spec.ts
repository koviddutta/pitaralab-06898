/**
 * Integration tests for RecipeCalculatorV2
 * Tests complete user workflows and component integration
 */

import { describe, it, expect } from 'vitest';
import { calcMetricsV2 } from '@/lib/calc.v2';

// Mock complete ingredient library
const INGREDIENT_LIBRARY = {
  milk_3: { 
    id: 'milk_3', name: 'Milk 3%', category: 'dairy', 
    water_pct: 88.7, fat_pct: 3, msnf_pct: 8.5, sugars_pct: 0, other_solids_pct: 0 
  },
  cream_25: { 
    id: 'cream_25', name: 'Cream 25%', category: 'dairy', 
    water_pct: 68.2, fat_pct: 25, msnf_pct: 6.8, sugars_pct: 0, other_solids_pct: 0 
  },
  heavy_cream: { 
    id: 'heavy_cream', name: 'Heavy Cream 35%', category: 'dairy', 
    water_pct: 57.3, fat_pct: 35, msnf_pct: 5.5, sugars_pct: 0, other_solids_pct: 0 
  },
  smp: { 
    id: 'smp', name: 'SMP', category: 'dairy', 
    water_pct: 3.5, fat_pct: 1, msnf_pct: 93, sugars_pct: 0, other_solids_pct: 2.5 
  },
  sucrose: { 
    id: 'sucrose', name: 'Sucrose', category: 'sugar', 
    water_pct: 0, sugars_pct: 100, fat_pct: 0, msnf_pct: 0, other_solids_pct: 0 
  },
  dextrose: { 
    id: 'dextrose', name: 'Dextrose', category: 'sugar', 
    water_pct: 0, sugars_pct: 100, fat_pct: 0, msnf_pct: 0, other_solids_pct: 0 
  },
  fructose: { 
    id: 'fructose', name: 'Fructose', category: 'sugar', 
    water_pct: 0, sugars_pct: 100, fat_pct: 0, msnf_pct: 0, other_solids_pct: 0 
  },
  glucose_de60: { 
    id: 'glucose_de60', name: 'Glucose Syrup DE60', category: 'sugar', 
    water_pct: 20, sugars_pct: 80, fat_pct: 0, msnf_pct: 0, other_solids_pct: 0 
  },
  stabilizer: { 
    id: 'stabilizer', name: 'Stabilizer', category: 'stabilizer', 
    water_pct: 0, sugars_pct: 0, fat_pct: 0, msnf_pct: 0, other_solids_pct: 100 
  }
} as any;

describe('Calculator Integration Tests', () => {
  
  describe('Gelato Mode - Standard Recipes', () => {
    it('should calculate vanilla gelato correctly', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 600 },
        { ing: INGREDIENT_LIBRARY.heavy_cream, grams: 200 },
        { ing: INGREDIENT_LIBRARY.smp, grams: 40 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 140 },
        { ing: INGREDIENT_LIBRARY.dextrose, grams: 20 },
        { ing: INGREDIENT_LIBRARY.stabilizer, grams: 3 }
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'gelato' });
      
      // Verify basic composition
      expect(metrics.total_g).toBeCloseTo(1003, 0);
      expect(metrics.fat_pct).toBeGreaterThan(6);
      expect(metrics.fat_pct).toBeLessThan(9);
      expect(metrics.msnf_pct).toBeGreaterThan(10);
      expect(metrics.msnf_pct).toBeLessThan(12);
      expect(metrics.totalSugars_pct).toBeGreaterThan(16);
      expect(metrics.totalSugars_pct).toBeLessThan(22);
      expect(metrics.ts_pct).toBeGreaterThan(36);
      expect(metrics.ts_pct).toBeLessThan(45);
      
      // Verify freezing point
      expect(metrics.fpdt).toBeGreaterThan(2.5);
      expect(metrics.fpdt).toBeLessThan(3.5);
      
      // Verify POD
      expect(metrics.pod_index).toBeGreaterThan(80);
      expect(metrics.pod_index).toBeLessThan(120);
      
      // Should have minimal warnings
      expect(metrics.warnings.length).toBeLessThan(3);
    });

    it('should handle low-fat gelato', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 750 },
        { ing: INGREDIENT_LIBRARY.cream_25, grams: 100 },
        { ing: INGREDIENT_LIBRARY.smp, grams: 50 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 150 },
        { ing: INGREDIENT_LIBRARY.dextrose, grams: 30 }
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'gelato' });
      
      expect(metrics.fat_pct).toBeGreaterThan(4);
      expect(metrics.fat_pct).toBeLessThan(7);
      
      // Check for fat warning
      const hasFatWarning = metrics.warnings.some(w => w.toLowerCase().includes('fat'));
      expect(hasFatWarning).toBe(true);
    });

    it('should handle fruit gelato with sugar split', () => {
      const strawberry = {
        id: 'strawberry',
        name: 'Strawberry Puree',
        category: 'fruit',
        water_pct: 90,
        sugars_pct: 5,
        fat_pct: 0,
        msnf_pct: 0,
        other_solids_pct: 1,
        sugar_split: { glucose: 40, fructose: 50, sucrose: 10 }
      };
      
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 500 },
        { ing: INGREDIENT_LIBRARY.heavy_cream, grams: 150 },
        { ing: strawberry, grams: 200 },
        { ing: INGREDIENT_LIBRARY.smp, grams: 30 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 100 },
        { ing: INGREDIENT_LIBRARY.dextrose, grams: 20 }
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'gelato' });
      
      // Sugar split should affect SE and POD
      expect(metrics.se_g).toBeGreaterThan(0);
      expect(metrics.pod_index).toBeGreaterThan(90); // Fructose is sweeter
    });
  });

  describe('Kulfi Mode - Standard Recipes', () => {
    it('should calculate traditional kulfi correctly', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 400 },
        { ing: INGREDIENT_LIBRARY.heavy_cream, grams: 200 },
        { ing: INGREDIENT_LIBRARY.smp, grams: 100 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 140 },
        { ing: INGREDIENT_LIBRARY.dextrose, grams: 10 }
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'kulfi' });
      
      // Kulfi should have higher fat and MSNF
      expect(metrics.fat_pct).toBeGreaterThan(10);
      expect(metrics.fat_pct).toBeLessThan(12);
      expect(metrics.msnf_pct).toBeGreaterThan(18);
      expect(metrics.msnf_pct).toBeLessThan(25);
      expect(metrics.protein_pct).toBeGreaterThan(6);
      expect(metrics.protein_pct).toBeLessThan(9);
      
      // Kulfi should be firmer (lower FPDT)
      expect(metrics.fpdt).toBeGreaterThan(2.0);
      expect(metrics.fpdt).toBeLessThan(2.5);
    });
  });

  describe('Edge Cases & Validation', () => {
    it('should handle empty recipe', () => {
      const metrics = calcMetricsV2([], { mode: 'gelato' });
      
      expect(metrics.total_g).toBe(0);
      expect(metrics.fat_pct).toBe(0);
      expect(metrics.warnings.length).toBeGreaterThan(0);
    });

    it('should handle single ingredient', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 1000 }
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'gelato' });
      
      expect(metrics.total_g).toBe(1000);
      expect(metrics.fat_pct).toBeCloseTo(3, 0);
    });

    it('should detect lactose crystallization risk', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 400 },
        { ing: INGREDIENT_LIBRARY.smp, grams: 200 }, // Very high SMP
        { ing: INGREDIENT_LIBRARY.cream_25, grams: 100 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 120 }
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'gelato' });
      
      if (metrics.lactose_pct >= 11) {
        const hasLactoseWarning = metrics.warnings.some(
          w => w.toLowerCase().includes('lactose') && w.toLowerCase().includes('crystallization')
        );
        expect(hasLactoseWarning).toBe(true);
      }
    });

    it('should detect protein chewiness risk', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 500 },
        { ing: INGREDIENT_LIBRARY.smp, grams: 150 }, // High protein
        { ing: INGREDIENT_LIBRARY.cream_25, grams: 150 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 120 }
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'gelato' });
      
      if (metrics.protein_pct >= 5) {
        const hasProteinWarning = metrics.warnings.some(
          w => w.toLowerCase().includes('protein') && w.toLowerCase().includes('chewiness')
        );
        expect(hasProteinWarning).toBe(true);
      }
    });

    it('should handle very high sugar (soft texture)', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 600 },
        { ing: INGREDIENT_LIBRARY.cream_25, grams: 100 },
        { ing: INGREDIENT_LIBRARY.dextrose, grams: 200 } // Very high dextrose
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'gelato' });
      
      if (metrics.fpdt < 2.5) {
        const hasSoftWarning = metrics.warnings.some(
          w => w.toLowerCase().includes('too soft')
        );
        expect(hasSoftWarning).toBe(true);
      }
    });

    it('should handle very low sugar (hard texture)', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 700 },
        { ing: INGREDIENT_LIBRARY.cream_25, grams: 200 },
        { ing: INGREDIENT_LIBRARY.smp, grams: 80 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 50 } // Very low sugar
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'gelato' });
      
      if (metrics.fpdt > 3.5) {
        const hasHardWarning = metrics.warnings.some(
          w => w.toLowerCase().includes('too hard')
        );
        expect(hasHardWarning).toBe(true);
      }
    });
  });

  describe('Sugar System Validation', () => {
    it('should calculate SE correctly for different sugar types', () => {
      // Pure sucrose
      const sucrose_rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 700 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 100 }
      ];
      
      // Pure dextrose
      const dextrose_rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 700 },
        { ing: INGREDIENT_LIBRARY.dextrose, grams: 100 }
      ];
      
      const m1 = calcMetricsV2(sucrose_rows);
      const m2 = calcMetricsV2(dextrose_rows);
      
      // Dextrose should have higher SE (1.9x factor)
      expect(m2.se_g).toBeGreaterThan(m1.se_g);
      
      // SE difference should be approximately 90g (100g × 0.9 extra factor)
      expect(m2.se_g - m1.se_g).toBeCloseTo(90, 5);
    });

    it('should handle glucose syrup DE correctly', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 700 },
        { ing: INGREDIENT_LIBRARY.glucose_de60, grams: 100 } // 80g solids
      ];
      
      const metrics = calcMetricsV2(rows);
      
      // Glucose DE60: 80g solids → 48g dextrose (1.9×) + 32g oligos (1.0×)
      // Expected contribution: 1.9*48 + 1.0*32 = 91.2 + 32 = 123.2
      expect(metrics.se_g).toBeGreaterThan(100);
    });

    it('should calculate POD correctly for different sweetness levels', () => {
      // Low sweetness (mostly sucrose)
      const low_sweet = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 700 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 150 }
      ];
      
      // High sweetness (with fructose)
      const high_sweet = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 700 },
        { ing: INGREDIENT_LIBRARY.fructose, grams: 150 }
      ];
      
      const m1 = calcMetricsV2(low_sweet);
      const m2 = calcMetricsV2(high_sweet);
      
      // Fructose should have higher POD (120 vs 100)
      expect(m2.pod_index).toBeGreaterThan(m1.pod_index);
    });
  });

  describe('Performance Tests', () => {
    it('should calculate large recipes quickly', () => {
      const largeRecipe = Array(50).fill(null).map((_, i) => ({
        ing: i % 2 === 0 ? INGREDIENT_LIBRARY.milk_3 : INGREDIENT_LIBRARY.sucrose,
        grams: 10
      }));
      
      const start = performance.now();
      const metrics = calcMetricsV2(largeRecipe);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100); // Should complete in <100ms
      expect(metrics.total_g).toBeGreaterThan(0);
    });

    it('should handle repeated calculations efficiently', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 600 },
        { ing: INGREDIENT_LIBRARY.cream_25, grams: 200 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 140 }
      ];
      
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        calcMetricsV2(rows);
      }
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1000); // 1000 calculations in <1s
    });
  });

  describe('Composition Balance', () => {
    it('should always maintain composition identity (TS% + Water% = 100%)', () => {
      const testRecipes = [
        [
          { ing: INGREDIENT_LIBRARY.milk_3, grams: 600 },
          { ing: INGREDIENT_LIBRARY.cream_25, grams: 200 },
          { ing: INGREDIENT_LIBRARY.sucrose, grams: 140 }
        ],
        [
          { ing: INGREDIENT_LIBRARY.milk_3, grams: 800 },
          { ing: INGREDIENT_LIBRARY.smp, grams: 100 }
        ],
        [
          { ing: INGREDIENT_LIBRARY.heavy_cream, grams: 500 },
          { ing: INGREDIENT_LIBRARY.dextrose, grams: 200 }
        ]
      ];
      
      testRecipes.forEach(rows => {
        const metrics = calcMetricsV2(rows);
        const sum = metrics.ts_pct + metrics.water_pct;
        expect(sum).toBeCloseTo(100, 0);
      });
    });

    it('should correctly split MSNF into protein and lactose', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 600 },
        { ing: INGREDIENT_LIBRARY.smp, grams: 60 }
      ];
      
      const metrics = calcMetricsV2(rows);
      
      // Protein = 0.36 × MSNF
      expect(metrics.protein_pct).toBeCloseTo(metrics.msnf_pct * 0.36, 1);
      
      // Lactose = 0.545 × MSNF
      expect(metrics.lactose_pct).toBeCloseTo(metrics.msnf_pct * 0.545, 1);
    });
  });

  describe('Real-world Recipe Validation', () => {
    it('should validate fior di latte gelato', () => {
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 650 },
        { ing: INGREDIENT_LIBRARY.cream_25, grams: 200 },
        { ing: INGREDIENT_LIBRARY.smp, grams: 45 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 145 },
        { ing: INGREDIENT_LIBRARY.dextrose, grams: 25 },
        { ing: INGREDIENT_LIBRARY.stabilizer, grams: 4 }
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'gelato' });
      
      // Should be within all gelato guardrails
      expect(metrics.fat_pct).toBeGreaterThan(6);
      expect(metrics.fat_pct).toBeLessThan(9);
      expect(metrics.msnf_pct).toBeGreaterThan(10);
      expect(metrics.msnf_pct).toBeLessThan(12);
      expect(metrics.totalSugars_pct).toBeGreaterThan(16);
      expect(metrics.totalSugars_pct).toBeLessThan(22);
      expect(metrics.fpdt).toBeGreaterThan(2.5);
      expect(metrics.fpdt).toBeLessThan(3.5);
      
      // Should have few or no warnings
      const criticalWarnings = metrics.warnings.filter(w => !w.startsWith('🔧'));
      expect(criticalWarnings.length).toBeLessThanOrEqual(2);
    });

    it('should validate chocolate gelato with cocoa', () => {
      const cocoa = {
        id: 'cocoa',
        name: 'Cocoa Powder',
        category: 'flavor',
        water_pct: 3,
        fat_pct: 11,
        sugars_pct: 0,
        msnf_pct: 0,
        other_solids_pct: 86
      };
      
      const rows = [
        { ing: INGREDIENT_LIBRARY.milk_3, grams: 600 },
        { ing: INGREDIENT_LIBRARY.cream_25, grams: 180 },
        { ing: INGREDIENT_LIBRARY.smp, grams: 40 },
        { ing: cocoa, grams: 30 },
        { ing: INGREDIENT_LIBRARY.sucrose, grams: 150 },
        { ing: INGREDIENT_LIBRARY.dextrose, grams: 20 }
      ];
      
      const metrics = calcMetricsV2(rows, { mode: 'gelato' });
      
      expect(metrics.total_g).toBeGreaterThan(1000);
      expect(metrics.other_g).toBeGreaterThan(25); // From cocoa
      expect(metrics.ts_pct).toBeGreaterThan(36);
    });
  });
});
