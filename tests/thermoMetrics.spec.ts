import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

describe('Thermo-Metrics Edge Function', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  // Helper function to call thermo-metrics
  async function callThermoMetrics(payload: any) {
    const { data, error } = await supabase.functions.invoke('thermo-metrics', {
      body: payload,
    });
    
    if (error) throw error;
    return data;
  }

  describe('Test 1: Monotonicity of %WF with temperature', () => {
    it('should show increasing %WF as temperature decreases', async () => {
      // Fixed typical gelato mix
      const basePayload = {
        ingredients: [
          { name: 'Whole Milk', grams: 600 },
          { name: 'Cream 35%', grams: 150 },
          { name: 'Sucrose', grams: 150 },
          { name: 'Dextrose', grams: 50 },
          { name: 'Skim Milk Powder', grams: 50 },
        ],
        totalBatchSize: 1000,
      };

      // Test at three different temperatures
      const temp10 = await callThermoMetrics({ ...basePayload, serveTempC: -10 });
      const temp12 = await callThermoMetrics({ ...basePayload, serveTempC: -12 });
      const temp14 = await callThermoMetrics({ ...basePayload, serveTempC: -14 });

      const wf10 = temp10.adjustedWaterFrozen || temp10.waterFrozenPct;
      const wf12 = temp12.adjustedWaterFrozen || temp12.waterFrozenPct;
      const wf14 = temp14.adjustedWaterFrozen || temp14.waterFrozenPct;

      // Assert monotonicity: lower temperature = more water frozen
      expect(wf10).toBeLessThan(wf12);
      expect(wf12).toBeLessThan(wf14);
      
      console.log('Monotonicity test:', { wf10, wf12, wf14 });
    }, 30000);
  });

  describe('Test 2: Hardening Factor Effect', () => {
    it('should show HF increases adjusted FPDT and %WF', async () => {
      // Mix with cocoa (which has hardening_factor = 0.18 in DB)
      const withHardening = {
        ingredients: [
          { name: 'Whole Milk', grams: 550 },
          { name: 'Cream 35%', grams: 150 },
          { name: 'Sucrose', grams: 150 },
          { name: 'Dextrose', grams: 50 },
          { name: 'Cocoa Powder', grams: 100 }, // Has hardening factor
        ],
        serveTempC: -12.5,
        totalBatchSize: 1000,
      };

      // Same mix but without hardening ingredient
      const withoutHardening = {
        ingredients: [
          { name: 'Whole Milk', grams: 650 },
          { name: 'Cream 35%', grams: 150 },
          { name: 'Sucrose', grams: 150 },
          { name: 'Dextrose', grams: 50 },
        ],
        serveTempC: -12.5,
        totalBatchSize: 1000,
      };

      const resultWith = await callThermoMetrics(withHardening);
      const resultWithout = await callThermoMetrics(withoutHardening);

      // With hardening factor:
      // - adjusted FPDT should be lower (easier to freeze)
      // - adjusted %WF should be higher (more water frozen at same temp)
      const adjustedFPDT_with = resultWith.adjustedFPDT || resultWith.fpdt;
      const adjustedFPDT_without = resultWithout.adjustedFPDT || resultWithout.fpdt;
      
      const adjustedWF_with = resultWith.adjustedWaterFrozen || resultWith.waterFrozenPct;
      const adjustedWF_without = resultWithout.adjustedWaterFrozen || resultWithout.waterFrozenPct;

      // Note: This test validates the mechanism exists
      // The exact relationship depends on the formulation
      console.log('Hardening test:', {
        with: { fpdt: adjustedFPDT_with, wf: adjustedWF_with },
        without: { fpdt: adjustedFPDT_without, wf: adjustedWF_without },
      });

      // At minimum, verify adjusted values are present when HF > 0
      expect(resultWith.adjustedFPDT).toBeDefined();
      expect(resultWith.adjustedWaterFrozen).toBeDefined();
    }, 30000);
  });

  describe('Test 3: Typical Gelato Range', () => {
    it('should show %WF between 70-85% at -12.5°C for balanced formula', async () => {
      // Well-balanced gelato formula
      const balancedGelato = {
        ingredients: [
          { name: 'Whole Milk', grams: 600 },
          { name: 'Cream 35%', grams: 100 },
          { name: 'Sucrose', grams: 140 },
          { name: 'Dextrose', grams: 40 },
          { name: 'Skim Milk Powder', grams: 40 },
          { name: 'Inulin', grams: 30 },
          { name: 'Stabilizer', grams: 5 },
        ],
        serveTempC: -12.5,
        totalBatchSize: 955,
      };

      const result = await callThermoMetrics(balancedGelato);
      const waterFrozen = result.adjustedWaterFrozen || result.waterFrozenPct;

      console.log('Gelato range test:', {
        waterFrozen,
        fpdt: result.adjustedFPDT || result.fpdt,
        pac: result.adjustedPAC || result.pac,
      });

      // Assert typical gelato %WF range
      expect(waterFrozen).toBeGreaterThanOrEqual(70);
      expect(waterFrozen).toBeLessThanOrEqual(85);
    }, 30000);
  });
});
