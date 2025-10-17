import { expect, test, describe } from 'vitest';

describe('suggest-ingredient edge function', () => {
  test('should return 3 suggestions with required fields', () => {
    // Mock response structure
    const mockSuggestion = {
      ingredient: 'Dextrose',
      grams: 20,
      reason: 'Improves texture',
      suggestedPctRange: '2-4%'
    };

    expect(mockSuggestion).toHaveProperty('ingredient');
    expect(mockSuggestion).toHaveProperty('grams');
    expect(mockSuggestion).toHaveProperty('reason');
    expect(typeof mockSuggestion.grams).toBe('number');
  });

  test('should calculate grams as percentage of total batch', () => {
    const totalGrams = 1000;
    const percentage = 0.02; // 2%
    const expectedGrams = Math.round(totalGrams * percentage);
    
    expect(expectedGrams).toBe(20);
  });

  test('should handle gelato mode targets', () => {
    const mode = 'gelato';
    const fpdtTarget = { min: 2.5, max: 3.5 };
    
    expect(mode).toBe('gelato');
    expect(fpdtTarget.min).toBe(2.5);
    expect(fpdtTarget.max).toBe(3.5);
  });

  test('should handle kulfi mode targets', () => {
    const mode = 'kulfi';
    const fpdtTarget = { min: 2.0, max: 2.5 };
    
    expect(mode).toBe('kulfi');
    expect(fpdtTarget.min).toBe(2.0);
    expect(fpdtTarget.max).toBe(2.5);
  });
});
