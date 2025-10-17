import { getSupabase } from "@/integrations/supabase/safeClient";
import { RecipeRow } from "./recipeService";

export type ProductionPlan = {
  id?: string;
  user_id?: string;
  name: string;
  total_liters: number;
  sku_size: number;
  waste_factor: number;
  recipe_allocations: Array<{ recipe_id: string; ratio: number }>;
  procurement_list: Array<{
    ingredient: string;
    total_kg: number;
    cost_per_kg: number;
    total_cost: number;
    supplier?: string;
  }>;
  total_cost: number;
  created_at?: string;
  updated_at?: string;
};

export type RecipeAllocation = {
  recipe: RecipeRow;
  ratio: number;
  production_liters: number;
  units: number;
  ingredient_cost: number;
};

export async function saveProductionPlan(plan: ProductionPlan) {
  const supabase = await getSupabase();
  
  if (!plan.id) {
    const { data, error } = await supabase
      .from("production_plans")
      .insert({
        name: plan.name,
        total_liters: plan.total_liters,
        sku_size: plan.sku_size,
        waste_factor: plan.waste_factor,
        recipe_allocations: plan.recipe_allocations as any,
        procurement_list: plan.procurement_list as any,
        total_cost: plan.total_cost,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("production_plans")
      .update({
        name: plan.name,
        total_liters: plan.total_liters,
        sku_size: plan.sku_size,
        waste_factor: plan.waste_factor,
        recipe_allocations: plan.recipe_allocations as any,
        procurement_list: plan.procurement_list as any,
        total_cost: plan.total_cost,
      })
      .eq("id", plan.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function getMyProductionPlans(): Promise<ProductionPlan[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("production_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as ProductionPlan[];
}

export async function deleteProductionPlan(id: string) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("production_plans")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export function calculateAggregatedProcurement(
  allocations: RecipeAllocation[],
  wasteFactor: number
): Array<{
  ingredient: string;
  total_kg: number;
  cost_per_kg: number;
  total_cost: number;
  supplier?: string;
}> {
  const ingredientMap = new Map<string, {
    total_grams: number;
    cost_per_kg: number;
  }>();

  // Aggregate ingredients across all recipes
  allocations.forEach(({ recipe, production_liters }) => {
    if (!recipe.rows_json || !Array.isArray(recipe.rows_json)) return;

    // Assume base recipe is 1000g, scale to production liters
    const scaleFactor = production_liters;

    recipe.rows_json.forEach((row: any) => {
      const name = row.ingredient || row.name;
      const grams = (row.grams || 0) * scaleFactor;
      const costPerKg = row.cost_per_kg || 0;

      if (ingredientMap.has(name)) {
        const existing = ingredientMap.get(name)!;
        existing.total_grams += grams;
      } else {
        ingredientMap.set(name, {
          total_grams: grams,
          cost_per_kg: costPerKg,
        });
      }
    });
  });

  // Apply waste factor and calculate costs
  const procurementList: Array<{
    ingredient: string;
    total_kg: number;
    cost_per_kg: number;
    total_cost: number;
    supplier?: string;
  }> = [];

  ingredientMap.forEach((value, key) => {
    const totalKg = (value.total_grams / 1000) * (1 + wasteFactor / 100);
    const totalCost = totalKg * value.cost_per_kg;

    procurementList.push({
      ingredient: key,
      total_kg: parseFloat(totalKg.toFixed(2)),
      cost_per_kg: value.cost_per_kg,
      total_cost: parseFloat(totalCost.toFixed(2)),
    });
  });

  return procurementList.sort((a, b) => b.total_cost - a.total_cost);
}
