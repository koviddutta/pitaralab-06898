import { getSupabase } from "@/integrations/supabase/safeClient";

export type RecipeRow = {
  id?: string;
  name: string;
  rows_json: any;
  metrics?: any;
  product_type: "gelato" | "kulfi" | "sorbet" | "other";
  profile_version?: string;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
};

const bumpVersion = (v: string) => {
  const m = v?.match(/v(\d+)/);
  const n = m ? (+m[1] + 1) : 2;
  return `v${n}`;
};

export async function saveRecipe(r: RecipeRow) {
  const supabase = await getSupabase();
  if (!r.id) {
    // New recipe
    const { data, error } = await supabase
      .from("recipes")
      .insert({
        name: r.name,
        rows_json: r.rows_json as any,
        metrics: r.metrics as any,
        product_type: r.product_type,
        profile_version: r.profile_version ?? "v1"
      })
      .select()
      .single();

    if (error) throw error;

    // Create initial version
    await supabase
      .from("recipe_versions")
      .insert({
        recipe_id: data.id,
        name: r.name,
        rows_json: r.rows_json as any,
        metrics: r.metrics as any,
        profile_version: data.profile_version,
        product_type: r.product_type
      } as any);

    return data;
  } else {
    // Update existing recipe - bump version
    const next = bumpVersion(r.profile_version ?? "v1");
    const { data, error } = await supabase
      .from("recipes")
      .update({
        name: r.name,
        rows_json: r.rows_json as any,
        metrics: r.metrics as any,
        product_type: r.product_type,
        profile_version: next
      })
      .eq("id", r.id)
      .select()
      .single();

    if (error) throw error;

    // Append new version
    await supabase
      .from("recipe_versions")
      .insert({
        recipe_id: r.id,
        name: r.name,
        rows_json: r.rows_json as any,
        metrics: r.metrics as any,
        profile_version: next,
        product_type: r.product_type
      } as any);

    return data;
  }
}

export async function getMyRecipes(): Promise<RecipeRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as RecipeRow[];
}

export async function getRecipeById(id: string): Promise<RecipeRow | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as RecipeRow | null;
}

export async function updateRecipe(id: string, patch: Partial<RecipeRow>) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("recipes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecipe(id: string) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Service wrapper for tests
export const RecipeService = {
  async saveRecipe(params: {
    name: string;
    rows: Array<{ ingredientId: string; grams: number }>;
    metrics?: any;
    product_type?: string;
    profile_id?: string;
    change_notes?: string;
  }): Promise<{ recipeId: string; versionNumber: number }> {
    const supabase = await getSupabase();
    
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        name: params.name,
        rows_json: params.rows as any,
        metrics: params.metrics as any,
        product_type: params.product_type || 'gelato',
        profile_id: params.profile_id || 'default',
        profile_version: '2025'
      })
      .select()
      .single();

    if (recipeError) throw new Error(`Failed to save recipe: ${recipeError.message}`);

    const { data: version, error: versionError } = await supabase
      .from("recipe_versions")
      .insert({
        recipe_id: recipe.id,
        name: params.name,
        rows_json: params.rows as any,
        metrics: params.metrics as any,
        product_type: params.product_type || 'gelato',
        profile_id: params.profile_id || 'default',
        profile_version: '2025',
        change_notes: params.change_notes || 'Initial version'
      } as any)
      .select()
      .single();

    if (versionError) throw new Error(`Failed to create version: ${versionError.message}`);

    return {
      recipeId: recipe.id,
      versionNumber: version.version_number
    };
  },

  async updateRecipe(recipeId: string, params: {
    name?: string;
    rows?: Array<{ ingredientId: string; grams: number }>;
    metrics?: any;
    change_notes?: string;
  }): Promise<{ recipeId: string; versionNumber: number }> {
    const supabase = await getSupabase();
    
    const { error: updateError } = await supabase
      .from("recipes")
      .update({
        name: params.name,
        rows_json: params.rows as any,
        metrics: params.metrics as any
      })
      .eq("id", recipeId);

    if (updateError) throw new Error(`Failed to update recipe: ${updateError.message}`);

    const { data: version, error: versionError } = await supabase
      .from("recipe_versions")
      .insert({
        recipe_id: recipeId,
        name: params.name || 'Updated Recipe',
        rows_json: params.rows as any,
        metrics: params.metrics as any,
        change_notes: params.change_notes || 'Updated recipe'
      } as any)
      .select()
      .single();

    if (versionError) throw new Error(`Failed to create version: ${versionError.message}`);

    return {
      recipeId,
      versionNumber: version.version_number
    };
  },

  async getMyRecipes(): Promise<RecipeRow[]> {
    return getMyRecipes();
  },

  async getRecipe(id: string): Promise<RecipeRow | null> {
    return getRecipeById(id);
  },

  async getRecipeVersions(recipeId: string): Promise<any[]> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("recipe_versions")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("version_number", { ascending: false });

    if (error) throw new Error(`Failed to fetch versions: ${error.message}`);
    return data || [];
  },

  async getRecipeVersion(recipeId: string, versionNumber: number): Promise<any | null> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("recipe_versions")
      .select("*")
      .eq("recipe_id", recipeId)
      .eq("version_number", versionNumber)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch version: ${error.message}`);
    return data;
  },

  async deleteRecipe(id: string): Promise<void> {
    return deleteRecipe(id);
  },

  async searchRecipes(query: string): Promise<RecipeRow[]> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .ilike("name", `%${query}%`)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(`Failed to search recipes: ${error.message}`);
    return data as RecipeRow[];
  }
};
