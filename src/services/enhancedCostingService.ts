/**
 * Enhanced Costing Service
 * Connects costing to real recipe data and user-specific pricing
 */

import { supabase } from '@/integrations/supabase/client';
import { calculateCostBreakdown, CostBreakdown, CostingParams, DEFAULT_COSTING_PARAMS } from './costingService';

export interface IngredientCostData {
  id: string;
  ingredient_name: string;
  cost_per_kg: number;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get ingredient cost from database or default
 */
export async function getIngredientCost(ingredientName: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from('ingredient_costs' as any)
    .select('cost_per_kg')
    .eq('user_id', user.id)
    .eq('ingredient_name', ingredientName)
    .single();

  if (error || !data) return 0;
  return (data as any).cost_per_kg;
}

/**
 * Set ingredient cost
 */
export async function setIngredientCost(
  ingredientName: string,
  costPerKg: number,
  notes?: string
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('ingredient_costs' as any)
    .upsert({
      user_id: user.id,
      ingredient_name: ingredientName,
      cost_per_kg: costPerKg,
      notes,
    }, {
      onConflict: 'user_id,ingredient_name',
    });

  return { error };
}

/**
 * Get all user's ingredient costs
 */
export async function getAllIngredientCosts(): Promise<{ data: IngredientCostData[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('ingredient_costs' as any)
    .select('*')
    .eq('user_id', user.id)
    .order('ingredient_name');

  return { data: data as any, error };
}

/**
 * Calculate cost for real recipe with database pricing
 */
export async function calculateRecipeCost(
  ingredients: Array<{ name: string; weight: number }>,
  params: CostingParams = DEFAULT_COSTING_PARAMS
): Promise<CostBreakdown> {
  // Fetch all ingredient costs at once
  const costPromises = ingredients.map(ing => getIngredientCost(ing.name));
  const costs = await Promise.all(costPromises);

  // Combine ingredients with their costs
  const ingredientsWithCosts = ingredients.map((ing, i) => ({
    ...ing,
    costPerKg: costs[i],
  }));

  return calculateCostBreakdown(ingredientsWithCosts, params);
}

/**
 * Log cost analysis to history
 */
export async function logCostAnalysis(
  recipeName: string,
  recipeData: any[],
  costBreakdown: CostBreakdown,
  params: CostingParams
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('analysis_history' as any)
    .insert({
      user_id: user.id,
      analysis_type: 'cost',
      recipe_name: recipeName,
      recipe_data: recipeData as any,
      results: {
        costBreakdown,
        params,
      } as any,
    });

  return { error };
}

/**
 * Get cost analysis history
 */
export async function getCostAnalysisHistory(
  limit: number = 10
): Promise<{ data: any[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('analysis_history' as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('analysis_type', 'cost')
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
}

/**
 * Bulk update ingredient costs
 */
export async function bulkUpdateIngredientCosts(
  costs: Array<{ ingredientName: string; costPerKg: number; notes?: string }>
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const records = costs.map(cost => ({
    user_id: user.id,
    ingredient_name: cost.ingredientName,
    cost_per_kg: cost.costPerKg,
    notes: cost.notes,
  }));

  const { error } = await supabase
    .from('ingredient_costs' as any)
    .upsert(records, {
      onConflict: 'user_id,ingredient_name',
    });

  return { error };
}