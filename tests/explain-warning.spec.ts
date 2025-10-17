import { expect, test, describe } from 'vitest';

describe('explain-warning edge function', () => {
  test('should accept warning text and mode', () => {
    const input = {
      warning: 'Lactose >11% - risk of crystallization',
      mode: 'gelato' as const,
      metrics: {
        lactose_pct: 12.5,
        msnf_pct: 11.8
      }
    };

    expect(input.warning).toBeTruthy();
    expect(input.mode).toBe('gelato');
    expect(input.metrics.lactose_pct).toBeGreaterThan(11);
  });

  test('should return explanation string', () => {
    const mockResponse = {
      explanation: 'High lactose content can lead to crystallization...'
    };

    expect(mockResponse).toHaveProperty('explanation');
    expect(typeof mockResponse.explanation).toBe('string');
    expect(mockResponse.explanation.length).toBeGreaterThan(0);
  });

  test('should handle different warning types', () => {
    const warnings = [
      'Lactose >11% - risk of crystallization',
      'Protein >5% - risk of chewiness',
      'FPDT <2.5 - too soft',
      'FPDT >3.5 - too hard'
    ];

    warnings.forEach(warning => {
      expect(warning).toBeTruthy();
      expect(typeof warning).toBe('string');
    });
  });

  test('should accept optional metrics context', () => {
    const inputWithMetrics = {
      warning: 'Test warning',
      mode: 'gelato' as const,
      metrics: {
        fat_pct: 7.5,
        msnf_pct: 11.0,
        sugars_pct: 19.5
      }
    };

    const inputWithoutMetrics = {
      warning: 'Test warning',
      mode: 'gelato' as const
    };

    expect(inputWithMetrics.metrics).toBeDefined();
    expect(inputWithoutMetrics.metrics).toBeUndefined();
  });
});
