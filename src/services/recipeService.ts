import { supabase } from '@/integrations/supabase/client';
import { MetricsV2 } from '@/lib/calc.v2';

export interface RecipeRow {
  ingredientId: string;
  grams: number;
}

export interface Recipe {
  id: string;
  name: string;
  rows_json: RecipeRow[];
  metrics?: MetricsV2;
  product_type?: string;
  profile_id?: string;
  profile_version?: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeVersion {
  id: string;
  recipe_id: string;
  version_number: number;
  name: string;
  rows_json: RecipeRow[];
  metrics?: MetricsV2;
  product_type?: string;
  profile_id?: string;
  profile_version?: string;
  change_notes?: string;
  created_at: string;
}

export class RecipeService {
  /**
   * Save a new recipe with automatic versioning
   */
  static async saveRecipe(recipe: {
    name: string;
    rows: RecipeRow[];
    metrics?: MetricsV2;
    product_type?: string;
    profile_id?: string;
    change_notes?: string;
  }): Promise<{ recipeId: string; versionNumber: number }> {
    // Insert recipe into recipes table
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name: recipe.name,
        rows_json: recipe.rows as any,
        metrics: recipe.metrics as any,
        product_type: recipe.product_type,
        profile_id: recipe.profile_id,
        profile_version: '2025'
      })
      .select()
      .single();

    if (recipeError) {
      console.error('Error saving recipe:', recipeError);
      throw new Error(`Failed to save recipe: ${recipeError.message}`);
    }

    // Create first version in recipe_versions table
    const { data: versionData, error: versionError } = await supabase
      .from('recipe_versions')
      .insert({
        recipe_id: recipeData.id,
        name: recipe.name,
        rows_json: recipe.rows as any,
        metrics: recipe.metrics as any,
        product_type: recipe.product_type,
        profile_id: recipe.profile_id,
        profile_version: '2025',
        change_notes: recipe.change_notes || 'Initial version'
      })
      .select()
      .single();

    if (versionError) {
      console.error('Error creating recipe version:', versionError);
      // Non-critical error - recipe was saved successfully
    }

    return {
      recipeId: recipeData.id,
      versionNumber: versionData?.version_number || 1
    };
  }

  /**
   * Update an existing recipe and create a new version
   */
  static async updateRecipe(
    recipeId: string,
    updates: {
      name?: string;
      rows?: RecipeRow[];
      metrics?: MetricsV2;
      product_type?: string;
      profile_id?: string;
      change_notes?: string;
    }
  ): Promise<{ versionNumber: number }> {
    // Update the main recipe record
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        name: updates.name,
        rows_json: updates.rows as any,
        metrics: updates.metrics as any,
        product_type: updates.product_type,
        profile_id: updates.profile_id
      })
      .eq('id', recipeId);

    if (updateError) {
      console.error('Error updating recipe:', updateError);
      throw new Error(`Failed to update recipe: ${updateError.message}`);
    }

    // Create a new version
    const { data: versionData, error: versionError } = await supabase
      .from('recipe_versions')
      .insert({
        recipe_id: recipeId,
        name: updates.name!,
        rows_json: updates.rows! as any,
        metrics: updates.metrics as any,
        product_type: updates.product_type,
        profile_id: updates.profile_id,
        profile_version: '2025',
        change_notes: updates.change_notes
      })
      .select()
      .single();

    if (versionError) {
      console.error('Error creating version:', versionError);
      throw new Error(`Failed to create version: ${versionError.message}`);
    }

    return { versionNumber: versionData.version_number };
  }

  /**
   * Get all recipes
   */
  static async getRecipes(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipes:', error);
      throw new Error(`Failed to fetch recipes: ${error.message}`);
    }

    return (data || []).map(row => ({
      ...row,
      rows_json: row.rows_json as any as RecipeRow[],
      metrics: row.metrics as any as MetricsV2
    }));
  }

  /**
   * Get a single recipe by ID
   */
  static async getRecipe(id: string): Promise<Recipe | null> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching recipe:', error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      rows_json: data.rows_json as any as RecipeRow[],
      metrics: data.metrics as any as MetricsV2
    };
  }

  /**
   * Get all versions of a recipe
   */
  static async getRecipeVersions(recipeId: string): Promise<RecipeVersion[]> {
    const { data, error } = await supabase
      .from('recipe_versions')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching recipe versions:', error);
      throw new Error(`Failed to fetch versions: ${error.message}`);
    }

    return (data || []).map(row => ({
      ...row,
      rows_json: row.rows_json as any as RecipeRow[],
      metrics: row.metrics as any as MetricsV2
    }));
  }

  /**
   * Get a specific version of a recipe
   */
  static async getRecipeVersion(recipeId: string, versionNumber: number): Promise<RecipeVersion | null> {
    const { data, error } = await supabase
      .from('recipe_versions')
      .select('*')
      .eq('recipe_id', recipeId)
      .eq('version_number', versionNumber)
      .single();

    if (error) {
      console.error('Error fetching recipe version:', error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      rows_json: data.rows_json as any as RecipeRow[],
      metrics: data.metrics as any as MetricsV2
    };
  }

  /**
   * Delete a recipe
   */
  static async deleteRecipe(id: string): Promise<void> {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting recipe:', error);
      throw new Error(`Failed to delete recipe: ${error.message}`);
    }
  }

  /**
   * Search recipes by name
   */
  static async searchRecipes(query: string): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching recipes:', error);
      throw new Error(`Failed to search recipes: ${error.message}`);
    }

    return (data || []).map(row => ({
      ...row,
      rows_json: row.rows_json as any as RecipeRow[],
      metrics: row.metrics as any as MetricsV2
    }));
  }
}
