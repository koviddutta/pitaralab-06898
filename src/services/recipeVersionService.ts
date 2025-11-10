import { supabase } from '@/integrations/supabase/client';

export interface RecipeVersion {
  id: string;
  recipe_id: string;
  version_number: number;
  recipe_name: string;
  product_type: string;
  ingredients_json: any;
  metrics_json: any;
  change_description: string | null;
  created_by: string;
  created_at: string;
}

/**
 * Save a new version of a recipe
 */
export async function saveRecipeVersion(
  recipeId: string,
  recipeName: string,
  productType: string,
  ingredientsJson: any[],
  metricsJson: any,
  changeDescription?: string
): Promise<{ success: boolean; version?: RecipeVersion; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('recipe_versions')
      .insert({
        recipe_id: recipeId,
        recipe_name: recipeName,
        product_type: productType,
        ingredients_json: ingredientsJson,
        metrics_json: metricsJson,
        change_description: changeDescription,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving recipe version:', error);
      return { success: false, error: error.message };
    }

    return { success: true, version: data };
  } catch (e: any) {
    console.error('Exception saving recipe version:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Get all versions for a recipe
 */
export async function getRecipeVersions(
  recipeId: string
): Promise<{ success: boolean; versions?: RecipeVersion[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('recipe_versions')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching recipe versions:', error);
      return { success: false, error: error.message };
    }

    return { success: true, versions: data || [] };
  } catch (e: any) {
    console.error('Exception fetching recipe versions:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Get a specific version
 */
export async function getRecipeVersion(
  versionId: string
): Promise<{ success: boolean; version?: RecipeVersion; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('recipe_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) {
      console.error('Error fetching recipe version:', error);
      return { success: false, error: error.message };
    }

    return { success: true, version: data };
  } catch (e: any) {
    console.error('Exception fetching recipe version:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Compare two versions and return differences
 */
export function compareVersions(
  version1: RecipeVersion,
  version2: RecipeVersion
): {
  nameChanged: boolean;
  productTypeChanged: boolean;
  ingredientsChanged: { added: any[]; removed: any[]; modified: any[] };
  metricsChanged: boolean;
} {
  const nameChanged = version1.recipe_name !== version2.recipe_name;
  const productTypeChanged = version1.product_type !== version2.product_type;

  // Compare ingredients
  const ing1 = Array.isArray(version1.ingredients_json) ? version1.ingredients_json : [];
  const ing2 = Array.isArray(version2.ingredients_json) ? version2.ingredients_json : [];
  
  const ing1Map = new Map(ing1.map(i => [i.ingredient, i]));
  const ing2Map = new Map(ing2.map(i => [i.ingredient, i]));

  const added = ing2.filter(i => !ing1Map.has(i.ingredient));
  const removed = ing1.filter(i => !ing2Map.has(i.ingredient));
  const modified = ing2.filter(i => {
    const old = ing1Map.get(i.ingredient);
    return old && old.quantity_g !== i.quantity_g;
  });

  const metricsChanged = JSON.stringify(version1.metrics_json) !== JSON.stringify(version2.metrics_json);

  return {
    nameChanged,
    productTypeChanged,
    ingredientsChanged: { added, removed, modified },
    metricsChanged
  };
}
