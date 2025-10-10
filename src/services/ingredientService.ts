import { supabase } from "@/integrations/supabase/client";
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
  const { data, error } = await supabase.from("ingredients").select("*").order("name");
  if (error) throw error;
  const parsed = DbIngredientSchema.array().parse(data);
  return parsed.map(transformToIngredientData);
}

export async function getByCategory(category: IngredientData["category"]): Promise<IngredientData[]> {
  const { data, error } = await supabase.from("ingredients").select("*").eq("category", category).order("name");
  if (error) throw error;
  const parsed = DbIngredientSchema.array().parse(data);
  return parsed.map(transformToIngredientData);
}

export async function getById(id: string): Promise<IngredientData | null> {
  const { data, error } = await supabase.from("ingredients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? transformToIngredientData(DbIngredientSchema.parse(data)) : null;
}

export async function searchIngredients(q: string): Promise<IngredientData[]> {
  const { data, error } = await supabase.from("ingredients").select("*").ilike("name", `%${q}%`).order("name");
  if (error) throw error;
  const parsed = DbIngredientSchema.array().parse(data);
  return parsed.map(transformToIngredientData);
}
