import { describe, it, expect } from 'vitest';
import { findCanonical, classifyIngredient, checkDbHealth } from '@/lib/ingredientMap';
import type { IngredientData } from '@/types/ingredients';

describe('Ingredient Mapping & Classification', () => {
  describe('findCanonical', () => {
    it('should identify water variants', () => {
      expect(findCanonical('water')).toBe('water');
      expect(findCanonical('drinking water')).toBe('water');
      expect(findCanonical('Aqua')).toBe('water');
      expect(findCanonical('purified water')).toBe('water');
    });

    it('should identify cream variants', () => {
      expect(findCanonical('heavy cream')).toBe('cream_35');
      expect(findCanonical('cream 35')).toBe('cream_35');
      expect(findCanonical('Fresh Cream 36')).toBe('cream_35');
      expect(findCanonical('double cream')).toBe('cream_35');
    });

    it('should identify butter variants', () => {
      expect(findCanonical('butter')).toBe('butter');
      expect(findCanonical('unsalted butter')).toBe('butter');
      expect(findCanonical('White Butter')).toBe('butter');
    });

    it('should identify SMP variants', () => {
      expect(findCanonical('skim milk powder')).toBe('smp');
      expect(findCanonical('SMP')).toBe('smp');
      expect(findCanonical('non-fat dry milk')).toBe('smp');
      expect(findCanonical('skimmed milk powder')).toBe('smp');
    });

    it('should return null for non-canonical ingredients', () => {
      expect(findCanonical('strawberry puree')).toBeNull();
      expect(findCanonical('cocoa powder')).toBeNull();
      expect(findCanonical('pistachio paste')).toBeNull();
    });
  });

  describe('classifyIngredient', () => {
    it('should classify flavor ingredients as core', () => {
      const strawberry: IngredientData = {
        id: '1',
        name: 'Strawberry Puree',
        category: 'fruit',
        water_pct: 85,
        sugars_pct: 10,
        fat_pct: 0,
        msnf_pct: 0,
        other_solids_pct: 5,
      };
      expect(classifyIngredient(strawberry)).toBe('core');
    });

    it('should classify chocolate as core', () => {
      const chocolate: IngredientData = {
        id: '2',
        name: 'Dark Chocolate',
        category: 'flavor',
        water_pct: 2,
        sugars_pct: 50,
        fat_pct: 35,
        msnf_pct: 0,
        other_solids_pct: 13,
      };
      expect(classifyIngredient(chocolate)).toBe('core');
    });

    it('should classify dairy/sugars as balancing', () => {
      const milk: IngredientData = {
        id: '3',
        name: 'Whole Milk',
        category: 'dairy',
        water_pct: 87.5,
        sugars_pct: 4.8,
        fat_pct: 3.5,
        msnf_pct: 8.5,
        other_solids_pct: 0,
      };
      expect(classifyIngredient(milk)).toBe('balancing');
    });
  });

  describe('checkDbHealth', () => {
    it('should pass with all essential ingredients', () => {
      const ingredients: IngredientData[] = [
        { id: '1', name: 'Water', category: 'liquid', water_pct: 100, sugars_pct: 0, fat_pct: 0, msnf_pct: 0, other_solids_pct: 0 },
        { id: '2', name: 'Heavy Cream', category: 'dairy', water_pct: 60, sugars_pct: 0, fat_pct: 35, msnf_pct: 5, other_solids_pct: 0 },
        { id: '3', name: 'Skim Milk Powder', category: 'dairy', water_pct: 4, sugars_pct: 0, fat_pct: 1, msnf_pct: 95, other_solids_pct: 0 },
      ];
      
      const health = checkDbHealth(ingredients);
      expect(health.healthy).toBe(true);
      expect(health.missing).toHaveLength(0);
    });

    it('should flag missing water', () => {
      const ingredients: IngredientData[] = [
        { id: '2', name: 'Heavy Cream', category: 'dairy', water_pct: 60, sugars_pct: 0, fat_pct: 35, msnf_pct: 5, other_solids_pct: 0 },
        { id: '3', name: 'Skim Milk Powder', category: 'dairy', water_pct: 4, sugars_pct: 0, fat_pct: 1, msnf_pct: 95, other_solids_pct: 0 },
      ];
      
      const health = checkDbHealth(ingredients);
      expect(health.healthy).toBe(false);
      expect(health.hasWater).toBe(false);
      expect(health.missing).toContain('Water (diluent)');
    });

    it('should flag missing fat source', () => {
      const ingredients: IngredientData[] = [
        { id: '1', name: 'Water', category: 'liquid', water_pct: 100, sugars_pct: 0, fat_pct: 0, msnf_pct: 0, other_solids_pct: 0 },
        { id: '3', name: 'Skim Milk Powder', category: 'dairy', water_pct: 4, sugars_pct: 0, fat_pct: 1, msnf_pct: 95, other_solids_pct: 0 },
      ];
      
      const health = checkDbHealth(ingredients);
      expect(health.healthy).toBe(false);
      expect(health.hasCream35OrButter).toBe(false);
      expect(health.missing).toContain('Heavy Cream 35%+ or Butter');
    });

    it('should flag missing SMP', () => {
      const ingredients: IngredientData[] = [
        { id: '1', name: 'Water', category: 'liquid', water_pct: 100, sugars_pct: 0, fat_pct: 0, msnf_pct: 0, other_solids_pct: 0 },
        { id: '2', name: 'Heavy Cream', category: 'dairy', water_pct: 60, sugars_pct: 0, fat_pct: 35, msnf_pct: 5, other_solids_pct: 0 },
      ];
      
      const health = checkDbHealth(ingredients);
      expect(health.healthy).toBe(false);
      expect(health.hasSMP).toBe(false);
      expect(health.missing).toContain('Skim Milk Powder (SMP)');
    });
  });
});
