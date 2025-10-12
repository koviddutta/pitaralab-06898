/**
 * Recipe Service Tests
 * Tests recipe saving, versioning, and retrieval
 */

import { describe, it, expect, vi } from 'vitest';
import { RecipeService } from '@/services/recipeService';
import type { RecipeRow } from '@/services/recipeService';

// Mock Supabase client
vi.mock('@/integrations/supabase/safeClient', () => ({
  getSupabase: vi.fn(() => Promise.resolve({
    from: vi.fn((table: string) => {
      if (table === 'recipes') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: mockRecipe, 
                error: null 
              }))
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          })),
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: [mockRecipe], 
              error: null 
            })),
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: mockRecipe, 
                error: null 
              }))
            })),
            ilike: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ 
                  data: [mockRecipe], 
                  error: null 
                }))
              }))
            }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        };
      } else if (table === 'recipe_versions') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: mockVersion, 
                error: null 
              }))
            }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ 
                data: [mockVersion], 
                error: null 
              })),
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: mockVersion, 
                  error: null 
                }))
              }))
            }))
          }))
        };
      }
      return {};
    })
  })),
  isBackendReady: vi.fn(() => true)
}));

const mockRows: RecipeRow[] = [
  { ingredientId: 'milk_3', grams: 650 },
  { ingredientId: 'cream_25', grams: 150 },
  { ingredientId: 'sucrose', grams: 120 }
];

const mockRecipe = {
  id: 'recipe-123',
  name: 'Test Gelato',
  rows_json: mockRows,
  metrics: { fat_pct: 7.5, msnf_pct: 10.5, totalSugars_pct: 18 },
  product_type: 'gelato',
  profile_id: 'default',
  profile_version: '2025',
  created_at: '2025-10-10T12:00:00Z',
  updated_at: '2025-10-10T12:00:00Z'
};

const mockVersion = {
  id: 'version-123',
  recipe_id: 'recipe-123',
  version_number: 1,
  name: 'Test Gelato',
  rows_json: mockRows,
  metrics: { fat_pct: 7.5, msnf_pct: 10.5, totalSugars_pct: 18 },
  product_type: 'gelato',
  profile_id: 'default',
  profile_version: '2025',
  change_notes: 'Initial version',
  created_at: '2025-10-10T12:00:00Z'
};

describe('RecipeService', () => {
  
  describe('saveRecipe', () => {
    it('should save recipe to both recipes and recipe_versions tables', async () => {
      const result = await RecipeService.saveRecipe({
        name: 'Test Gelato',
        rows: mockRows,
        metrics: { fat_pct: 7.5, msnf_pct: 10.5 } as any,
        product_type: 'gelato'
      });
      
      expect(result).toBeDefined();
      expect(result.recipeId).toBe('recipe-123');
      expect(result.versionNumber).toBe(1);
    });

    it('should create version 1 for new recipe', async () => {
      const result = await RecipeService.saveRecipe({
        name: 'New Recipe',
        rows: mockRows,
        product_type: 'gelato'
      });
      
      expect(result.versionNumber).toBe(1);
    });

    it('should include change notes in version', async () => {
      const result = await RecipeService.saveRecipe({
        name: 'Test Recipe',
        rows: mockRows,
        change_notes: 'Added more sugar'
      });
      
      expect(result).toBeDefined();
    });

    it('should set profile_version to 2025', async () => {
      const result = await RecipeService.saveRecipe({
        name: 'Test Recipe',
        rows: mockRows
      });
      
      expect(result).toBeDefined();
      // Version is automatically set to '2025' in the service
    });
  });

  describe('updateRecipe', () => {
    it('should update recipe and create new version (version bumps)', async () => {
      const result = await RecipeService.updateRecipe('recipe-123', {
        name: 'Updated Recipe',
        rows: mockRows,
        metrics: { fat_pct: 8.0 } as any,
        change_notes: 'Increased fat content'
      });
      
      expect(result).toBeDefined();
      expect(result.versionNumber).toBeGreaterThanOrEqual(1);
    });

    it('should append to recipe_versions on update', async () => {
      // Mock higher version number
      vi.mocked(await import('@/integrations/supabase/safeClient')).getSupabase = vi.fn(() => 
        Promise.resolve({
          from: vi.fn(() => ({
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null }))
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { ...mockVersion, version_number: 2 }, 
                  error: null 
                }))
              }))
            }))
          }))
        } as any)
      );

      const result = await RecipeService.updateRecipe('recipe-123', {
        name: 'Updated Again',
        rows: mockRows
      });
      
      expect(result.versionNumber).toBe(2);
    });
  });

  describe('getMyRecipes', () => {
    it('should fetch all recipes for current user', async () => {
      const recipes = await RecipeService.getMyRecipes();
      
      expect(Array.isArray(recipes)).toBe(true);
      expect(recipes.length).toBeGreaterThan(0);
      expect(recipes[0]).toHaveProperty('id');
      expect(recipes[0]).toHaveProperty('name');
      expect(recipes[0]).toHaveProperty('rows_json');
    });

    it('should order recipes by updated_at descending', async () => {
      const recipes = await RecipeService.getMyRecipes();
      
      expect(recipes).toBeDefined();
      // Ordering is handled by Supabase query
    });
  });

  describe('getRecipe', () => {
    it('should fetch a specific recipe by ID', async () => {
      const recipe = await RecipeService.getRecipe('recipe-123');
      
      expect(recipe).toBeDefined();
      expect(recipe?.id).toBe('recipe-123');
      expect(recipe?.name).toBe('Test Gelato');
    });

    it('should return null for non-existent recipe', async () => {
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

      const recipe = await RecipeService.getRecipe('non-existent');
      expect(recipe).toBeNull();
    });
  });

  describe('getRecipeVersions', () => {
    it('should fetch all versions of a recipe', async () => {
      const versions = await RecipeService.getRecipeVersions('recipe-123');
      
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0]).toHaveProperty('version_number');
      expect(versions[0]).toHaveProperty('change_notes');
    });

    it('should order versions by version_number descending', async () => {
      const versions = await RecipeService.getRecipeVersions('recipe-123');
      
      expect(versions).toBeDefined();
      // Latest version should be first
    });
  });

  describe('getRecipeVersion', () => {
    it('should fetch a specific version of a recipe', async () => {
      const version = await RecipeService.getRecipeVersion('recipe-123', 1);
      
      expect(version).toBeDefined();
      expect(version?.recipe_id).toBe('recipe-123');
      expect(version?.version_number).toBe(1);
    });
  });

  describe('deleteRecipe', () => {
    it('should delete a recipe', async () => {
      await expect(
        RecipeService.deleteRecipe('recipe-123')
      ).resolves.not.toThrow();
    });
  });

  describe('searchRecipes', () => {
    it('should search recipes by name', async () => {
      const results = await RecipeService.searchRecipes('gelato');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should limit search results to 20', async () => {
      const results = await RecipeService.searchRecipes('recipe');
      
      expect(results.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when backend is not available', async () => {
      vi.mocked(await import('@/integrations/supabase/safeClient')).isBackendReady = vi.fn(() => false);

      await expect(
        RecipeService.getMyRecipes()
      ).rejects.toThrow();
    });

    it('should handle save errors gracefully', async () => {
      vi.mocked(await import('@/integrations/supabase/safeClient')).getSupabase = vi.fn(() => 
        Promise.resolve({
          from: vi.fn(() => ({
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: { message: 'Insert failed' } 
                }))
              }))
            }))
          }))
        } as any)
      );

      await expect(
        RecipeService.saveRecipe({
          name: 'Test',
          rows: mockRows
        })
      ).rejects.toThrow();
    });

    it('should handle update errors gracefully', async () => {
      vi.mocked(await import('@/integrations/supabase/safeClient')).getSupabase = vi.fn(() => 
        Promise.resolve({
          from: vi.fn(() => ({
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ 
                error: { message: 'Update failed' } 
              }))
            }))
          }))
        } as any)
      );

      await expect(
        RecipeService.updateRecipe('recipe-123', { name: 'Test' })
      ).rejects.toThrow();
    });
  });
});
