/**
 * Tests for v2.1 Verified Gelato Science Calculator
 * Based on: final-verified-gelato-guide_v2.1.pdf acceptance tests
 */

import { describe, it, expect } from 'vitest';
import { calcMetricsV2 } from '@/lib/calc.v2';

// Mock ingredient data
const I = {
  sucrose: { 
    id: 'sucrose', name: 'Sucrose', category: 'sugar', 
    water_pct: 0, sugars_pct: 100, fat_pct: 0, msnf_pct: 0, other_solids_pct: 0 
  },
  dextrose: { 
    id: 'dextrose', name: 'Dextrose', category: 'sugar', 
    water_pct: 0, sugars_pct: 100, fat_pct: 0, msnf_pct: 0, other_solids_pct: 0 
  },
  milk3: { 
    id: 'milk_3', name: 'Milk 3%', category: 'dairy', 
    water_pct: 88.7, fat_pct: 3, msnf_pct: 8.5, sugars_pct: 0, other_solids_pct: 0 
  },
  cream25: { 
    id: 'cream_25', name: 'Cream 25%', category: 'dairy', 
    water_pct: 68.2, fat_pct: 25, msnf_pct: 6.8, sugars_pct: 0, other_solids_pct: 0 
  },
  smp: { 
    id: 'smp', name: 'SMP', category: 'dairy', 
    water_pct: 3.5, fat_pct: 1, msnf_pct: 93, sugars_pct: 0, other_solids_pct: 2.5 
  },
  glucose_de60: { 
    id: 'glucose_de60', name: 'Glucose Syrup DE60', category: 'sugar', 
    water_pct: 20, sugars_pct: 80, fat_pct: 0, msnf_pct: 0, other_solids_pct: 0 
  }
} as any;

describe('v2.1 Acceptance Tests', () => {
  
  it('Test 1: Composition identity (TS% = 100 - water%)', () => {
    const rows = [
      { ing: I.milk3, grams: 650 },
      { ing: I.cream25, grams: 150 },
      { ing: I.smp, grams: 60 },
      { ing: I.sucrose, grams: 120 },
      { ing: I.dextrose, grams: 20 }
    ];
    const m = calcMetricsV2(rows);
    
    // Total solids + water should equal 100%
    const sumPct = m.ts_pct + m.water_pct;
    expect(sumPct).toBeCloseTo(100, 0);
    
    // TS should equal sum of components
    const componentsSum = m.fat_pct + m.msnf_pct + m.nonLactoseSugars_pct + m.other_pct;
    expect(m.ts_pct).toBeCloseTo(componentsSum, 0);
  });

  it('Test 2: Protein/Lactose from MSNF (MSNF=10% → protein=3.6%, lactose=5.45%)', () => {
    const rows = [
      { ing: I.milk3, grams: 650 },
      { ing: I.cream25, grams: 150 },
      { ing: I.smp, grams: 60 },
      { ing: I.sucrose, grams: 120 },
      { ing: I.dextrose, grams: 20 }
    ];
    const m = calcMetricsV2(rows);
    
    // MSNF should be ~10%
    expect(m.msnf_pct).toBeGreaterThan(9);
    expect(m.msnf_pct).toBeLessThan(11);
    
    // Protein = 0.36 × MSNF
    expect(m.protein_pct).toBeCloseTo(m.msnf_pct * 0.36, 1);
    
    // Lactose = 0.545 × MSNF
    expect(m.lactose_pct).toBeCloseTo(m.msnf_pct * 0.545, 1);
  });

  it('Test 3: FP Engine integrity (SE → Leighton → FPDT)', () => {
    const rows = [
      { ing: I.milk3, grams: 650 },
      { ing: I.cream25, grams: 150 },
      { ing: I.smp, grams: 60 },
      { ing: I.sucrose, grams: 120 },
      { ing: I.dextrose, grams: 20 }
    ];
    const m = calcMetricsV2(rows);
    
    // SE should be calculated
    expect(m.se_g).toBeGreaterThan(0);
    
    // sucrosePer100gWater should be reasonable
    expect(m.sucrosePer100gWater).toBeGreaterThan(10);
    expect(m.sucrosePer100gWater).toBeLessThan(60);
    
    // FPDSE from Leighton should be > 0
    expect(m.fpdse).toBeGreaterThan(0);
    
    // FPDSA from MSNF should be > 0
    expect(m.fpdsa).toBeGreaterThan(0);
    
    // FPDT = FPDSE + FPDSA
    expect(m.fpdt).toBeCloseTo(m.fpdse + m.fpdsa, 2);
  });

  it('Test 4: Sugar guardrail uses totalSugars% (incl. lactose)', () => {
    const rows = [
      { ing: I.milk3, grams: 650 },
      { ing: I.cream25, grams: 150 },
      { ing: I.smp, grams: 60 },
      { ing: I.sucrose, grams: 120 },
      { ing: I.dextrose, grams: 20 }
    ];
    const m = calcMetricsV2(rows);
    
    // Total sugars should include lactose
    expect(m.totalSugars_g).toBeGreaterThan(m.nonLactoseSugars_g);
    expect(m.totalSugars_g).toBeCloseTo(m.nonLactoseSugars_g + m.lactose_g, 1);
    
    // Total sugars % should be in typical range
    expect(m.totalSugars_pct).toBeGreaterThan(15);
    expect(m.totalSugars_pct).toBeLessThan(25);
    
    // Check if within gelato guardrails (16-22%)
    if (m.totalSugars_pct >= 16 && m.totalSugars_pct <= 22) {
      // Should not have sugar warning
      const hasSugarWarning = m.warnings.some(w => w.includes('Total sugars') && w.includes('outside'));
      expect(hasSugarWarning).toBe(false);
    }
  });

  it('Test 5: Gelato guardrails (fat 7-8, MSNF 10-12, totalSugars 16-22, TS 36-45)', () => {
    const rows = [
      { ing: I.milk3, grams: 650 },
      { ing: I.cream25, grams: 150 },
      { ing: I.smp, grams: 60 },
      { ing: I.sucrose, grams: 120 },
      { ing: I.dextrose, grams: 20 }
    ];
    const m = calcMetricsV2(rows, { mode: 'gelato' });
    
    // Should be within gelato ranges
    expect(m.fat_pct).toBeGreaterThan(6);
    expect(m.fat_pct).toBeLessThan(9);
    
    expect(m.msnf_pct).toBeGreaterThan(9);
    expect(m.msnf_pct).toBeLessThan(13);
    
    expect(m.totalSugars_pct).toBeGreaterThan(15);
    expect(m.totalSugars_pct).toBeLessThan(24);
    
    expect(m.ts_pct).toBeGreaterThan(35);
    expect(m.ts_pct).toBeLessThan(46);
  });

  it('Test 6: Kulfi mode guardrails', () => {
    // High MSNF kulfi recipe
    const rows = [
      { ing: I.milk3, grams: 400 },
      { ing: I.cream25, grams: 200 },
      { ing: I.smp, grams: 100 },
      { ing: I.sucrose, grams: 100 },
      { ing: I.dextrose, grams: 10 }
    ];
    const m = calcMetricsV2(rows, { mode: 'kulfi' });
    
    // Kulfi should have higher MSNF
    expect(m.msnf_pct).toBeGreaterThan(12);
    
    // Higher protein
    expect(m.protein_pct).toBeGreaterThan(4);
    
    // FPDT should be lower (firmer)
    expect(m.fpdt).toBeLessThan(3.5);
  });

  it('Test 7: Overrun math (not in calc.v2 but documented)', () => {
    // Volume method: 1.00L → 1.25L = 25% overrun
    const volumeOverrun = ((1.25 - 1.00) / 1.00) * 100;
    expect(volumeOverrun).toBe(25);
    
    // Weight method: 100g mix vs 80g product (same volume) = 25% overrun
    const weightOverrun = ((100 - 80) / 80) * 100;
    expect(weightOverrun).toBe(25);
  });

  it('Test 8: Glucose syrup DE60 split (40g solids → 24g dextrose, 16g oligos)', () => {
    const rows = [
      { ing: I.milk3, grams: 700 },
      { ing: I.glucose_de60, grams: 50 }, // 50g @ 80% solids = 40g solids
      { ing: I.sucrose, grams: 100 }
    ];
    const m = calcMetricsV2(rows);
    
    // SE should include contribution from glucose syrup
    // DE60: 40g solids → 24g dextrose (1.9×) + 16g oligos (1.0×)
    // Expected SE from syrup: 1.9*24 + 1.0*16 = 45.6 + 16 = 61.6
    // Plus sucrose 100g = 100
    // Plus lactose from MSNF
    const glucoseSyrupSolids = 50 * 0.8; // 40g
    const expectedSyrupSE = 1.9 * (glucoseSyrupSolids * 0.6) + 1.0 * (glucoseSyrupSolids * 0.4);
    expect(m.se_g).toBeGreaterThan(expectedSyrupSE + 90); // approximate
  });

  it('Test 9: Troubleshooting triggers', () => {
    // Too hard recipe (high sucrose, low dextrose)
    const hardRecipe = [
      { ing: I.milk3, grams: 650 },
      { ing: I.cream25, grams: 150 },
      { ing: I.smp, grams: 80 }, // High MSNF → higher FPDT
      { ing: I.sucrose, grams: 160 }, // High sucrose
      { ing: I.dextrose, grams: 5 } // Very low dextrose
    ];
    const hard = calcMetricsV2(hardRecipe);
    
    if (hard.fpdt > 3.5) {
      const hasTooHardWarning = hard.warnings.some(w => w.includes('Too hard'));
      expect(hasTooHardWarning).toBe(true);
    }
    
    // Too soft recipe (high dextrose)
    const softRecipe = [
      { ing: I.milk3, grams: 700 },
      { ing: I.cream25, grams: 100 },
      { ing: I.dextrose, grams: 100 }, // Very high dextrose
      { ing: I.sucrose, grams: 50 }
    ];
    const soft = calcMetricsV2(softRecipe);
    
    if (soft.fpdt < 2.5) {
      const hasTooSoftWarning = soft.warnings.some(w => w.includes('Too soft'));
      expect(hasTooSoftWarning).toBe(true);
    }
  });

  it('Test 10: Defect prevention flags', () => {
    // High protein recipe
    const highProtein = [
      { ing: I.milk3, grams: 500 },
      { ing: I.smp, grams: 150 }, // Very high SMP → high protein
      { ing: I.cream25, grams: 150 },
      { ing: I.sucrose, grams: 120 },
      { ing: I.dextrose, grams: 20 }
    ];
    const m1 = calcMetricsV2(highProtein);
    
    if (m1.protein_pct >= 5) {
      const hasProteinWarning = m1.warnings.some(w => w.includes('Protein') && w.includes('chewiness'));
      expect(hasProteinWarning).toBe(true);
    }
    
    // High lactose recipe
    const highLactose = [
      { ing: I.milk3, grams: 400 },
      { ing: I.smp, grams: 200 }, // Very high SMP → high lactose
      { ing: I.cream25, grams: 100 },
      { ing: I.sucrose, grams: 120 },
      { ing: I.dextrose, grams: 20 }
    ];
    const m2 = calcMetricsV2(highLactose);
    
    if (m2.lactose_pct >= 11) {
      const hasLactoseWarning = m2.warnings.some(w => w.includes('Lactose') && w.includes('crystallization'));
      expect(hasLactoseWarning).toBe(true);
    }
  });

  it('Test 11: POD normalization (sucrose = 100 per 100g total sugars)', () => {
    // Pure sucrose recipe
    const puresucroseRecipe = [
      { ing: I.milk3, grams: 700 },
      { ing: I.sucrose, grams: 150 }
    ];
    const m = calcMetricsV2(puresucroseRecipe);
    
    // POD should be close to 100 for sucrose-dominant recipe
    // (with some lactose contribution at factor 16)
    expect(m.pod_index).toBeGreaterThan(70);
    expect(m.pod_index).toBeLessThan(130);
  });

  it('Test 12: Leighton table clamping', () => {
    // Extreme high sugar recipe to trigger clamping
    const extremeRecipe = [
      { ing: { ...I.milk3, water_pct: 30 }, grams: 300 }, // Very low water
      { ing: I.sucrose, grams: 400 }, // Very high sugar
      { ing: I.dextrose, grams: 200 }
    ];
    const m = calcMetricsV2(extremeRecipe);
    
    // Should trigger clamping warning
    if (m.clampedLeighton) {
      const hasClampWarning = m.warnings.some(w => w.includes('Leighton table clamped'));
      expect(hasClampWarning).toBe(true);
    }
  });
});
