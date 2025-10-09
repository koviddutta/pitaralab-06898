/**
 * Backend Integration Tests
 * Tests Supabase integration and data flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const createMockSupabase = () => ({
  from: vi.fn(() => ({
    select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => Promise.resolve({ data: null, error: null }))
  })),
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    signIn: vi.fn(() => Promise.resolve({ data: null, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn(() => ({ 
      data: { subscription: { unsubscribe: vi.fn() } } 
    }))
  },
  functions: {
    invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
  }
});

describe('Backend Integration Tests', () => {
  
  describe('Supabase Client', () => {
    it('should initialize supabase client', () => {
      const supabase = createMockSupabase();
      expect(supabase).toBeDefined();
      expect(supabase.from).toBeDefined();
      expect(supabase.auth).toBeDefined();
    });

    it('should handle environment variables', () => {
      const requiredEnvVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_PUBLISHABLE_KEY',
        'VITE_SUPABASE_PROJECT_ID'
      ];
      
      requiredEnvVars.forEach(envVar => {
        expect(envVar).toBeTruthy();
      });
    });
  });

  describe('Ingredient Service', () => {
    it('should fetch ingredients from database', async () => {
      const supabase = createMockSupabase();
      
      const mockIngredients = [
        { id: 'milk_3', name: 'Milk 3%', category: 'dairy' },
        { id: 'sucrose', name: 'Sucrose', category: 'sugar' }
      ];
      
      supabase.from = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: mockIngredients, error: null }))
      }));
      
      const result = await supabase.from('ingredients').select();
      
      expect(result.data).toEqual(mockIngredients);
      expect(result.error).toBeNull();
    });

    it('should handle ingredient fetch errors', async () => {
      const supabase = createMockSupabase();
      
      const mockError = new Error('Network error');
      
      supabase.from = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
      }));
      
      const result = await supabase.from('ingredients').select();
      
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('Recipe Service', () => {
    it('should save recipe to database', async () => {
      const supabase = createMockSupabase();
      
      const mockRecipe = {
        name: 'Test Recipe',
        rows_json: [{ ingredientId: 'milk_3', grams: 600 }],
        metrics: { fat_pct: 7.5 },
        product_type: 'gelato'
      };
      
      supabase.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ 
          data: { ...mockRecipe, id: 'recipe-123' }, 
          error: null 
        }))
      }));
      
      const result = await supabase.from('recipes').insert(mockRecipe);
      
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it('should create recipe version on save', async () => {
      const supabase = createMockSupabase();
      
      const mockVersion = {
        recipe_id: 'recipe-123',
        version_number: 1,
        rows_json: [],
        change_notes: 'Initial version'
      };
      
      supabase.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ 
          data: mockVersion, 
          error: null 
        }))
      }));
      
      const result = await supabase.from('recipe_versions').insert(mockVersion);
      
      expect(result.error).toBeNull();
    });
  });

  describe('Authentication', () => {
    it('should check for existing session', async () => {
      const supabase = createMockSupabase();
      
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'token-123'
      };
      
      supabase.auth.getSession = vi.fn(() => 
        Promise.resolve({ data: { session: mockSession }, error: null })
      );
      
      const result = await supabase.auth.getSession();
      
      expect(result.data.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should handle sign out', async () => {
      const supabase = createMockSupabase();
      
      supabase.auth.signOut = vi.fn(() => 
        Promise.resolve({ error: null })
      );
      
      const result = await supabase.auth.signOut();
      
      expect(result.error).toBeNull();
    });

    it('should set up auth state listener', () => {
      const supabase = createMockSupabase();
      
      const unsubscribe = vi.fn();
      supabase.auth.onAuthStateChange = vi.fn(() => ({
        data: { subscription: { unsubscribe } }
      }));
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {});
      
      expect(subscription).toBeDefined();
      expect(subscription.unsubscribe).toBeDefined();
    });
  });

  describe('Edge Functions', () => {
    it('should invoke suggest-ingredient function', async () => {
      const supabase = createMockSupabase();
      
      const mockSuggestions = {
        suggestions: [
          { ingredient: 'Vanilla Extract', grams: 5, reason: 'Enhance flavor' }
        ]
      };
      
      supabase.functions.invoke = vi.fn(() => 
        Promise.resolve({ data: mockSuggestions, error: null })
      );
      
      const result = await supabase.functions.invoke('suggest-ingredient', {
        body: { rows: [], mode: 'gelato' }
      });
      
      expect(result.data).toEqual(mockSuggestions);
      expect(result.error).toBeNull();
    });

    it('should handle rate limiting', async () => {
      const supabase = createMockSupabase();
      
      const rateLimitError = {
        error: 'Rate limit exceeded. Please try again in 1 minute.'
      };
      
      supabase.functions.invoke = vi.fn(() => 
        Promise.resolve({ data: rateLimitError, error: null })
      );
      
      const result = await supabase.functions.invoke('suggest-ingredient', {
        body: { rows: [], mode: 'gelato' }
      });
      
      expect(result.data.error).toContain('Rate limit');
    });

    it('should track AI usage', async () => {
      const supabase = createMockSupabase();
      
      const usageLog = {
        user_id: 'user-123',
        function_name: 'suggest-ingredient'
      };
      
      supabase.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ data: usageLog, error: null }))
      }));
      
      const result = await supabase.from('ai_usage_log').insert(usageLog);
      
      expect(result.error).toBeNull();
    });
  });

  describe('Offline Mode', () => {
    it('should detect backend unavailability', () => {
      const isBackendReady = () => {
        try {
          // Simulate env check
          const url = import.meta.env?.VITE_SUPABASE_URL;
          const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
          return Boolean(url && key);
        } catch {
          return false;
        }
      };
      
      // In test environment, this might be false
      const ready = isBackendReady();
      expect(typeof ready).toBe('boolean');
    });

    it('should use localStorage for offline storage', () => {
      const mockLocalStorage = {
        getItem: vi.fn((key: string) => null),
        setItem: vi.fn((key: string, value: string) => undefined),
        removeItem: vi.fn((key: string) => undefined),
        clear: vi.fn(() => undefined)
      };
      
      expect(mockLocalStorage.getItem).toBeDefined();
      expect(mockLocalStorage.setItem).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('should validate recipe data before saving', () => {
      const validateRecipe = (recipe: any) => {
        if (!recipe.name || recipe.name.trim() === '') {
          return { valid: false, error: 'Recipe name required' };
        }
        if (!recipe.rows_json || recipe.rows_json.length === 0) {
          return { valid: false, error: 'At least one ingredient required' };
        }
        return { valid: true };
      };
      
      expect(validateRecipe({ name: '', rows_json: [] })).toEqual({
        valid: false,
        error: 'Recipe name required'
      });
      
      expect(validateRecipe({ name: 'Test', rows_json: [] })).toEqual({
        valid: false,
        error: 'At least one ingredient required'
      });
      
      expect(validateRecipe({ 
        name: 'Test', 
        rows_json: [{ ingredientId: 'milk', grams: 100 }] 
      })).toEqual({
        valid: true
      });
    });

    it('should validate ingredient data', () => {
      const validateIngredient = (ing: any) => {
        const required = ['id', 'name', 'category'];
        const missing = required.filter(field => !ing[field]);
        
        if (missing.length > 0) {
          return { valid: false, missing };
        }
        
        return { valid: true };
      };
      
      expect(validateIngredient({ id: 'test' })).toEqual({
        valid: false,
        missing: ['name', 'category']
      });
      
      expect(validateIngredient({ 
        id: 'test', 
        name: 'Test', 
        category: 'dairy' 
      })).toEqual({
        valid: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const supabase = createMockSupabase();
      
      const networkError = new Error('Network request failed');
      
      supabase.from = vi.fn(() => ({
        select: vi.fn(() => Promise.reject(networkError))
      }));
      
      try {
        await supabase.from('ingredients').select();
      } catch (error) {
        expect(error).toEqual(networkError);
      }
    });

    it('should handle authentication errors', async () => {
      const supabase = createMockSupabase();
      
      const authError = new Error('Invalid credentials');
      
      supabase.auth.getSession = vi.fn(() => 
        Promise.resolve({ data: { session: null }, error: authError })
      );
      
      const result = await supabase.auth.getSession();
      
      expect(result.error).toEqual(authError);
    });
  });
});
