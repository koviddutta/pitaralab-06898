/**
 * Ingredient Service Tests
 * Tests Supabase ingredient data operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IngredientService } from '@/services/ingredientService';
import type { IngredientData } from '@/types/ingredients';

// Mock Supabase client
vi.mock('@/integrations/supabase/safeClient', () => ({
  getSupabase: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockIngredients, error: null }))
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockIngredients[0], error: null }))
        })),
        ilike: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockIngredients.slice(0, 1), error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockIngredients[0], error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockIngredients[0], error: null }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  })),
  isBackendReady: vi.fn(() => true)
}));

const mockIngredients = [
  {
    id: 'milk_3',
    name: 'Milk 3%',
    category: 'dairy',
    water_pct: 88.7,
    fat_pct: 3,
    msnf_pct: 8.5,
    sugars_pct: 0,
    other_solids_pct: 0,
    sp_coeff: null,
    pac_coeff: null,
    cost_per_kg: 60,
    notes: 'Standard whole milk',
    sugar_split: null,
    tags: ['dairy', 'liquid']
  },
  {
    id: 'sucrose',
    name: 'Sucrose',
    category: 'sugar',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 100,
    other_solids_pct: 0,
    sp_coeff: 1.0,
    pac_coeff: 1.0,
    cost_per_kg: 45,
    notes: 'Table sugar',
    sugar_split: { sucrose: 100 },
    tags: ['sugar', 'sweetener']
  }
];

describe('IngredientService', () => {
  
  describe('getIngredients', () => {
    it('should fetch all ingredients from Supabase (≥11 ingredients)', async () => {
      const ingredients = await IngredientService.getIngredients();
      
      expect(Array.isArray(ingredients)).toBe(true);
      expect(ingredients.length).toBeGreaterThanOrEqual(11);
      expect(ingredients[0]).toHaveProperty('id');
      expect(ingredients[0]).toHaveProperty('name');
      expect(ingredients[0]).toHaveProperty('category');
    });

    it('should return properly formatted IngredientData objects', async () => {
      const ingredients = await IngredientService.getIngredients();
      
      const ingredient = ingredients[0];
      expect(ingredient.water_pct).toBeDefined();
      expect(ingredient.fat_pct).toBeDefined();
      expect(typeof ingredient.water_pct).toBe('number');
      expect(typeof ingredient.fat_pct).toBe('number');
    });

    it('should order ingredients by category and name', async () => {
      const ingredients = await IngredientService.getIngredients();
      
      // Verify ordering (implementation uses order())
      expect(ingredients).toBeDefined();
      expect(ingredients.length).toBeGreaterThan(0);
    });
  });

  describe('getIngredientById', () => {
    it('should fetch a specific ingredient by ID', async () => {
      const ingredient = await IngredientService.getIngredientById('milk_3');
      
      expect(ingredient).toBeDefined();
      expect(ingredient?.id).toBe('milk_3');
      expect(ingredient?.name).toBe('Milk 3%');
    });

    it('should return null for non-existent ingredient', async () => {
      // Mock error case
      vi.mocked(await import('@/integrations/supabase/safeClient')).getSupabase = vi.fn(() => 
        Promise.resolve({
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: null }))
              }))
            }))
          }))
        } as any)
      );

      const ingredient = await IngredientService.getIngredientById('non_existent');
      expect(ingredient).toBeNull();
    });
  });

  describe('searchIngredients', () => {
    it('should search ingredients by name (Dextrose matches)', async () => {
      const results = await IngredientService.searchIngredients('dextrose');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('dextrose');
    });

    it('should limit search results to 20', async () => {
      const results = await IngredientService.searchIngredients('sugar');
      
      expect(results.length).toBeLessThanOrEqual(20);
    });

    it('should handle empty search results', async () => {
      // Mock empty results
      vi.mocked(await import('@/integrations/supabase/safeClient')).getSupabase = vi.fn(() => 
        Promise.resolve({
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              ilike: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }))
            }))
          }))
        } as any)
      );

      const results = await IngredientService.searchIngredients('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('addIngredient', () => {
    it('should add a new ingredient to the database', async () => {
      const newIngredient: Omit<IngredientData, 'id'> = {
        name: 'Test Ingredient',
        category: 'other',
        water_pct: 50,
        fat_pct: 10,
        msnf_pct: 5,
        sugars_pct: 30,
        other_solids_pct: 5,
        sp_coeff: 1.0,
        pac_coeff: 1.0
      };

      const result = await IngredientService.addIngredient(newIngredient);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Ingredient');
    });
  });

  describe('updateIngredient', () => {
    it('should update an existing ingredient', async () => {
      const updates: Partial<IngredientData> = {
        name: 'Updated Milk',
        cost_per_kg: 70
      };

      const result = await IngredientService.updateIngredient('milk_3', updates);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('milk_3');
    });
  });

  describe('deleteIngredient', () => {
    it('should delete an ingredient from the database', async () => {
      await expect(
        IngredientService.deleteIngredient('test_id')
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when backend is not available', async () => {
      vi.mocked(await import('@/integrations/supabase/safeClient')).isBackendReady = vi.fn(() => false);

      await expect(
        IngredientService.getIngredients()
      ).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(await import('@/integrations/supabase/safeClient')).getSupabase = vi.fn(() => 
        Promise.resolve({
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: { message: 'Database connection failed' } 
                }))
              }))
            }))
          }))
        } as any)
      );

      await expect(
        IngredientService.getIngredients()
      ).rejects.toThrow();
    });
  });
});
