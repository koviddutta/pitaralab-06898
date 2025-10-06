import { getSupabase, isBackendReady } from '@/integrations/supabase/safeClient';
import { IngredientData } from '@/types/ingredients';

export class IngredientService {
  /**
   * Fetch all ingredients from Supabase
   */
  static async getIngredients(): Promise<IngredientData[]> {
    if (!isBackendReady()) {
      throw new Error('Backend not available');
    }
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching ingredients:', error);
      throw new Error(`Failed to fetch ingredients: ${error.message}`);
    }

    // Transform database rows to IngredientData format
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      category: row.category as IngredientData['category'],
      water_pct: row.water_pct || 0,
      fat_pct: row.fat_pct || 0,
      msnf_pct: row.msnf_pct || undefined,
      sugars_pct: row.sugars_pct || undefined,
      other_solids_pct: row.other_solids_pct || undefined,
      sp_coeff: row.sp_coeff || undefined,
      pac_coeff: row.pac_coeff || undefined,
      cost_per_kg: row.cost_per_kg || undefined,
      notes: row.notes ? [row.notes] : undefined,
      sugar_split: row.sugar_split as IngredientData['sugar_split'],
      tags: row.tags || undefined
    }));
  }

  /**
   * Get ingredient by ID
   */
  static async getIngredientById(id: string): Promise<IngredientData | null> {
    if (!isBackendReady()) {
      throw new Error('Backend not available');
    }
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ingredient:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      category: data.category as IngredientData['category'],
      water_pct: data.water_pct || 0,
      fat_pct: data.fat_pct || 0,
      msnf_pct: data.msnf_pct || undefined,
      sugars_pct: data.sugars_pct || undefined,
      other_solids_pct: data.other_solids_pct || undefined,
      sp_coeff: data.sp_coeff || undefined,
      pac_coeff: data.pac_coeff || undefined,
      cost_per_kg: data.cost_per_kg || undefined,
      notes: data.notes ? [data.notes] : undefined,
      sugar_split: data.sugar_split as IngredientData['sugar_split'],
      tags: data.tags || undefined
    };
  }

  /**
   * Get ingredients by category
   */
  static async getIngredientsByCategory(category: string): Promise<IngredientData[]> {
    if (!isBackendReady()) {
      throw new Error('Backend not available');
    }
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching ingredients by category:', error);
      throw new Error(`Failed to fetch ingredients: ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      category: row.category as IngredientData['category'],
      water_pct: row.water_pct || 0,
      fat_pct: row.fat_pct || 0,
      msnf_pct: row.msnf_pct || undefined,
      sugars_pct: row.sugars_pct || undefined,
      other_solids_pct: row.other_solids_pct || undefined,
      sp_coeff: row.sp_coeff || undefined,
      pac_coeff: row.pac_coeff || undefined,
      cost_per_kg: row.cost_per_kg || undefined,
      notes: row.notes ? [row.notes] : undefined,
      sugar_split: row.sugar_split as IngredientData['sugar_split'],
      tags: row.tags || undefined
    }));
  }

  /**
   * Search ingredients by name
   */
  static async searchIngredients(query: string): Promise<IngredientData[]> {
    if (!isBackendReady()) {
      throw new Error('Backend not available');
    }
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Error searching ingredients:', error);
      throw new Error(`Failed to search ingredients: ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      category: row.category as IngredientData['category'],
      water_pct: row.water_pct || 0,
      fat_pct: row.fat_pct || 0,
      msnf_pct: row.msnf_pct || undefined,
      sugars_pct: row.sugars_pct || undefined,
      other_solids_pct: row.other_solids_pct || undefined,
      sp_coeff: row.sp_coeff || undefined,
      pac_coeff: row.pac_coeff || undefined,
      cost_per_kg: row.cost_per_kg || undefined,
      notes: row.notes ? [row.notes] : undefined,
      sugar_split: row.sugar_split as IngredientData['sugar_split'],
      tags: row.tags || undefined
    }));
  }

  /**
   * Add a new ingredient
   */
  static async addIngredient(ingredient: Omit<IngredientData, 'id'>): Promise<IngredientData> {
    if (!isBackendReady()) {
      throw new Error('Backend not available');
    }
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('ingredients')
      .insert({
        name: ingredient.name,
        category: ingredient.category,
        water_pct: ingredient.water_pct,
        fat_pct: ingredient.fat_pct,
        msnf_pct: ingredient.msnf_pct,
        sugars_pct: ingredient.sugars_pct,
        other_solids_pct: ingredient.other_solids_pct,
        sp_coeff: ingredient.sp_coeff,
        pac_coeff: ingredient.pac_coeff,
        cost_per_kg: ingredient.cost_per_kg,
        notes: ingredient.notes?.[0],
        sugar_split: ingredient.sugar_split,
        tags: ingredient.tags
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding ingredient:', error);
      throw new Error(`Failed to add ingredient: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      category: data.category as IngredientData['category'],
      water_pct: data.water_pct || 0,
      fat_pct: data.fat_pct || 0,
      msnf_pct: data.msnf_pct || undefined,
      sugars_pct: data.sugars_pct || undefined,
      other_solids_pct: data.other_solids_pct || undefined,
      sp_coeff: data.sp_coeff || undefined,
      pac_coeff: data.pac_coeff || undefined,
      cost_per_kg: data.cost_per_kg || undefined,
      notes: data.notes ? [data.notes] : undefined,
      sugar_split: data.sugar_split as IngredientData['sugar_split'],
      tags: data.tags || undefined
    };
  }

  /**
   * Update an ingredient
   */
  static async updateIngredient(id: string, updates: Partial<IngredientData>): Promise<IngredientData> {
    if (!isBackendReady()) {
      throw new Error('Backend not available');
    }
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('ingredients')
      .update({
        name: updates.name,
        category: updates.category,
        water_pct: updates.water_pct,
        fat_pct: updates.fat_pct,
        msnf_pct: updates.msnf_pct,
        sugars_pct: updates.sugars_pct,
        other_solids_pct: updates.other_solids_pct,
        sp_coeff: updates.sp_coeff,
        pac_coeff: updates.pac_coeff,
        cost_per_kg: updates.cost_per_kg,
        notes: updates.notes?.[0],
        sugar_split: updates.sugar_split,
        tags: updates.tags
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ingredient:', error);
      throw new Error(`Failed to update ingredient: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      category: data.category as IngredientData['category'],
      water_pct: data.water_pct || 0,
      fat_pct: data.fat_pct || 0,
      msnf_pct: data.msnf_pct || undefined,
      sugars_pct: data.sugars_pct || undefined,
      other_solids_pct: data.other_solids_pct || undefined,
      sp_coeff: data.sp_coeff || undefined,
      pac_coeff: data.pac_coeff || undefined,
      cost_per_kg: data.cost_per_kg || undefined,
      notes: data.notes ? [data.notes] : undefined,
      sugar_split: data.sugar_split as IngredientData['sugar_split'],
      tags: data.tags || undefined
    };
  }

  /**
   * Delete an ingredient
   */
  static async deleteIngredient(id: string): Promise<void> {
    if (!isBackendReady()) {
      throw new Error('Backend not available');
    }
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ingredient:', error);
      throw new Error(`Failed to delete ingredient: ${error.message}`);
    }
  }
}
