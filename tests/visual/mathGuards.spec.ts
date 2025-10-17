import { describe, it, expect } from 'vitest';
import { safeDivide, clamp, safePercent } from '@/lib/math';

describe('Math Guards - Prevent NaN/Infinity', () => {
  describe('safeDivide', () => {
    it('should return fallback when dividing by zero', () => {
      expect(safeDivide(10, 0)).toBe(0);
      expect(safeDivide(10, 0, 999)).toBe(999);
    });

    it('should return fallback when numerator is NaN', () => {
      expect(safeDivide(NaN, 5)).toBe(0);
      expect(safeDivide(NaN, 5, -1)).toBe(-1);
    });

    it('should return fallback when denominator is NaN', () => {
      expect(safeDivide(10, NaN)).toBe(0);
    });

    it('should return fallback when result would be Infinity', () => {
      expect(safeDivide(Infinity, 10)).toBe(0);
      expect(safeDivide(10, 0)).toBe(0);
    });

    it('should perform normal division for valid inputs', () => {
      expect(safeDivide(10, 2)).toBe(5);
      expect(safeDivide(100, 4)).toBe(25);
      expect(safeDivide(7, 2)).toBe(3.5);
    });

    it('should handle negative numbers correctly', () => {
      expect(safeDivide(-10, 2)).toBe(-5);
      expect(safeDivide(10, -2)).toBe(-5);
    });
  });

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle NaN by returning minimum', () => {
      expect(clamp(NaN, 0, 100)).toBe(0);
      expect(clamp(NaN, -50, 50)).toBe(-50);
    });

    it('should handle Infinity', () => {
      expect(clamp(Infinity, 0, 100)).toBe(0);
      expect(clamp(-Infinity, 0, 100)).toBe(0);
    });

    it('should work with percentage ranges', () => {
      expect(clamp(150, 0, 100)).toBe(100);
      expect(clamp(-10, 0, 100)).toBe(0);
      expect(clamp(50, 0, 100)).toBe(50);
    });
  });

  describe('safePercent', () => {
    it('should format valid numbers as percentages', () => {
      expect(safePercent(12.5, 1)).toBe('12.5%');
      expect(safePercent(100, 0)).toBe('100%');
      expect(safePercent(33.333, 2)).toBe('33.33%');
    });

    it('should return "0%" for NaN', () => {
      expect(safePercent(NaN)).toBe('0%');
      expect(safePercent(NaN, 2)).toBe('0%');
    });

    it('should return "0%" for Infinity', () => {
      expect(safePercent(Infinity)).toBe('0%');
      expect(safePercent(-Infinity)).toBe('0%');
    });

    it('should use default decimals of 1', () => {
      expect(safePercent(12.567)).toBe('12.6%');
    });
  });

  describe('Edge Cases in Composition Rendering', () => {
    it('should handle empty recipe (all zeros)', () => {
      const metrics = {
        fat_pct: 0,
        msnf_pct: 0,
        totalSugars_pct: 0,
        water_pct: 0,
        other_pct: 0,
        ts_pct: 0,
        total_g: 0
      };

      // Simulate composition bar calculations
      const segments = [
        { value: metrics.fat_pct },
        { value: metrics.msnf_pct },
        { value: metrics.totalSugars_pct },
        { value: metrics.other_pct },
        { value: metrics.water_pct }
      ];

      segments.forEach(seg => {
        const width = clamp(seg.value, 0, 100);
        expect(isFinite(width)).toBe(true);
        expect(width).toBeGreaterThanOrEqual(0);
        expect(width).toBeLessThanOrEqual(100);
      });
    });

    it('should handle invalid division results in percentage calculations', () => {
      const used = 5;
      const limit = 0; // Edge case: invalid limit
      
      const percentage = clamp(safeDivide(used, limit) * 100, 0, 100);
      
      expect(isFinite(percentage)).toBe(true);
      expect(percentage).toBe(0);
    });

    it('should handle FPDT marker positioning with zero ranges', () => {
      const fpdt = 2.5;
      const range = 0; // Edge case: zero range
      
      const position = clamp(safeDivide((fpdt - 1.0), range) * 100, 0, 100);
      
      expect(isFinite(position)).toBe(true);
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThanOrEqual(100);
    });

    it('should never produce NaN in style width calculations', () => {
      const values = [0, NaN, Infinity, -Infinity, 50, 100, 150];
      
      values.forEach(value => {
        const width = clamp(isFinite(value) ? value : 0, 0, 100);
        const style = `width: ${width}%`;
        
        expect(style).not.toContain('NaN');
        expect(style).not.toContain('Infinity');
        expect(isFinite(width)).toBe(true);
      });
    });
  });

  describe('Sugar Spectrum with Zero Totals', () => {
    it('should handle zero sugar grams without NaN', () => {
      const sugars = {
        sucrose_g: 0,
        dextrose_g: 0,
        fructose_g: 0,
        lactose_g: 0
      };
      
      const total = sugars.sucrose_g + sugars.dextrose_g + sugars.fructose_g + sugars.lactose_g;
      
      // Simulate percentage calculation
      const sucrosePercent = safeDivide(sugars.sucrose_g, total) * 100;
      
      expect(isFinite(sucrosePercent)).toBe(true);
      expect(sucrosePercent).toBe(0);
    });
  });

  describe('POD Index Clamping', () => {
    it('should clamp POD values to valid gauge range', () => {
      expect(clamp(50, 0, 150)).toBe(50);
      expect(clamp(200, 0, 150)).toBe(150);
      expect(clamp(-10, 0, 150)).toBe(0);
      expect(clamp(NaN, 0, 150)).toBe(0);
    });
  });
});
