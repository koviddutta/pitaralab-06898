import { getSupabase } from "@/integrations/supabase/safeClient";

export type RecipeRow = {
  id?: string;
  name: string;
  rows_json: any;
  metrics?: any;
  product_type: "gelato" | "kulfi" | "sorbet" | "other";
  profile_version?: string;
  is_public?: boolean;
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

export async function getMyRecipes() {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getRecipeById(id: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
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
