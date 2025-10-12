import { getSupabase } from "@/integrations/supabase/safeClient";
import { z } from "zod";
import type { IngredientData } from "@/types/ingredients";

const DbIngredientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.enum(['dairy','sugar','stabilizer','fruit','flavor','fat','other']),
  tags: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
  water_pct: z.number(),
  sugars_pct: z.number().nullable().optional(),
  fat_pct: z.number(),
  msnf_pct: z.number().nullable().optional(),
  other_solids_pct: z.number().nullable().optional(),
  sugar_split: z.record(z.number()).nullable().optional(),
  sp_coeff: z.number().nullable().optional(),
  pac_coeff: z.number().nullable().optional(),
  cost_per_kg: z.number().nullable().optional(),
});

function transformToIngredientData(dbRow: z.infer<typeof DbIngredientSchema>): IngredientData {
  return {
    id: dbRow.id,
    name: dbRow.name,
    category: dbRow.category,
    tags: dbRow.tags || undefined,
    notes: dbRow.notes ? [dbRow.notes] : undefined,
    water_pct: dbRow.water_pct,
    sugars_pct: dbRow.sugars_pct || undefined,
    fat_pct: dbRow.fat_pct,
    msnf_pct: dbRow.msnf_pct || undefined,
    other_solids_pct: dbRow.other_solids_pct || undefined,
    sugar_split: dbRow.sugar_split || undefined,
    sp_coeff: dbRow.sp_coeff || undefined,
    pac_coeff: dbRow.pac_coeff || undefined,
    cost_per_kg: dbRow.cost_per_kg || undefined,
  };
}

export async function getAllIngredients(): Promise<IngredientData[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("ingredients").select("*").order("category").order("name");
  if (error) throw error;
  const parsed = DbIngredientSchema.array().parse(data);
  return parsed.map(transformToIngredientData);
}

export async function getByCategory(category: IngredientData["category"]): Promise<IngredientData[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("ingredients").select("*").eq("category", category).order("name");
  if (error) throw error;
  const parsed = DbIngredientSchema.array().parse(data);
  return parsed.map(transformToIngredientData);
}

export async function getById(id: string): Promise<IngredientData | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("ingredients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? transformToIngredientData(DbIngredientSchema.parse(data)) : null;
}

export async function searchIngredients(q: string): Promise<IngredientData[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("ingredients").select("*").ilike("name", `%${q}%`).order("name").limit(20);
  if (error) throw error;
  const parsed = DbIngredientSchema.array().parse(data);
  return parsed.map(transformToIngredientData);
}

// Service wrapper for tests
export const IngredientService = {
  async getIngredients(): Promise<IngredientData[]> {
    return getAllIngredients();
  },
  async getIngredientById(id: string): Promise<IngredientData | null> {
    return getById(id);
  },
  async searchIngredients(query: string): Promise<IngredientData[]> {
    return searchIngredients(query);
  },
  async addIngredient(ingredient: Omit<IngredientData, 'id'>): Promise<IngredientData> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("ingredients")
      .insert({
        name: ingredient.name,
        category: ingredient.category,
        water_pct: ingredient.water_pct,
        fat_pct: ingredient.fat_pct,
        msnf_pct: ingredient.msnf_pct || 0,
        sugars_pct: ingredient.sugars_pct || 0,
        other_solids_pct: ingredient.other_solids_pct || 0,
        sp_coeff: ingredient.sp_coeff,
        pac_coeff: ingredient.pac_coeff,
        cost_per_kg: ingredient.cost_per_kg,
        notes: ingredient.notes?.[0],
        tags: ingredient.tags,
        sugar_split: ingredient.sugar_split as any,
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to add ingredient: ${error.message}`);
    return transformToIngredientData(DbIngredientSchema.parse(data));
  },
  async updateIngredient(id: string, updates: Partial<IngredientData>): Promise<IngredientData> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("ingredients")
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
        tags: updates.tags,
        sugar_split: updates.sugar_split as any,
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update ingredient: ${error.message}`);
    return transformToIngredientData(DbIngredientSchema.parse(data));
  },
  async deleteIngredient(id: string): Promise<void> {
    const supabase = await getSupabase();
    const { error } = await supabase.from("ingredients").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete ingredient: ${error.message}`);
  }
};
