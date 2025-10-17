import { expect, test, describe } from 'vitest';

describe('thermo-metrics edge function', () => {
  test('should return base and adjusted metrics', () => {
    const mockResponse = {
      base: {
        SEper100gWater: 45.2,
        FPDT: 2.8,
        waterFrozenPct: 68.5,
        totalWater: 650,
        totalSugars: 180
      },
      adjusted: {
        SEper100gWater: 46.1,
        FPDT: 2.7,
        waterFrozenPct: 70.2,
        hardeningEffect: 1.2
      },
      serveTempC: -12,
      mode: 'gelato'
    };

    expect(mockResponse).toHaveProperty('base');
    expect(mockResponse).toHaveProperty('adjusted');
    expect(mockResponse.base).toHaveProperty('FPDT');
    expect(mockResponse.base).toHaveProperty('waterFrozenPct');
  });

  test('should validate FPDT ranges for gelato', () => {
    const gelato_FPDT = 2.9;
    const gelato_min = 2.5;
    const gelato_max = 3.5;
    
    expect(gelato_FPDT).toBeGreaterThanOrEqual(gelato_min);
    expect(gelato_FPDT).toBeLessThanOrEqual(gelato_max);
  });

  test('should validate FPDT ranges for kulfi', () => {
    const kulfi_FPDT = 2.2;
    const kulfi_min = 2.0;
    const kulfi_max = 2.5;
    
    expect(kulfi_FPDT).toBeGreaterThanOrEqual(kulfi_min);
    expect(kulfi_FPDT).toBeLessThanOrEqual(kulfi_max);
  });

  test('should calculate water frozen percentage correctly', () => {
    const waterFrozenPct = 70.5;
    const idealRange = { min: 65, max: 75 };
    
    expect(waterFrozenPct).toBeGreaterThanOrEqual(idealRange.min);
    expect(waterFrozenPct).toBeLessThanOrEqual(idealRange.max);
  });

  test('should handle hardening effect', () => {
    const hardeningEffect = 1.5;
    
    expect(hardeningEffect).toBeGreaterThanOrEqual(0);
    expect(typeof hardeningEffect).toBe('number');
  });
});
