/**
 * Optimization Service
 * Manages optimization presets and history
 */

import { supabase } from '@/integrations/supabase/client';
import { OptimizeTarget } from '@/lib/optimize';
import { OptimizerConfig } from '@/lib/optimize.advanced';

export interface OptimizationPreset {
  id: string;
  preset_name: string;
  product_type: string;
  target_metrics: OptimizeTarget;
  algorithm: 'genetic' | 'pso' | 'hybrid' | 'basic';
  config?: OptimizerConfig;
  created_at: string;
  updated_at: string;
}

export interface OptimizationResult {
  beforeRecipe: any[];
  afterRecipe: any[];
  beforeMetrics: any;
  afterMetrics: any;
  improvement: {
    score: number;
    changes: string[];
  };
}

/**
 * Save optimization preset
 */
export async function saveOptimizationPreset(
  presetName: string,
  productType: string,
  targetMetrics: OptimizeTarget,
  algorithm: OptimizationPreset['algorithm'],
  config?: OptimizerConfig
): Promise<{ data: OptimizationPreset | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('optimization_presets')
    .insert({
      user_id: user.id,
      preset_name: presetName,
      product_type: productType,
      target_metrics: targetMetrics as any,
      algorithm,
      config: config as any,
    })
    .select()
    .single();

  return { data: data as any, error };
}

/**
 * Load user's optimization presets
 */
export async function loadOptimizationPresets(
  productType?: string
): Promise<{ data: OptimizationPreset[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  let query = supabase
    .from('optimization_presets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (productType) {
    query = query.eq('product_type', productType);
  }

  const { data, error } = await query;
  return { data: data as any, error };
}

/**
 * Delete optimization preset
 */
export async function deleteOptimizationPreset(
  presetId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('optimization_presets')
    .delete()
    .eq('id', presetId);

  return { error };
}

/**
 * Log optimization to history
 */
export async function logOptimization(
  recipeName: string,
  recipeData: any[],
  results: OptimizationResult
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('analysis_history')
    .insert({
      user_id: user.id,
      analysis_type: 'optimization',
      recipe_name: recipeName,
      recipe_data: recipeData as any,
      results: results as any,
    });

  return { error };
}

/**
 * Get optimization history
 */
export async function getOptimizationHistory(
  limit: number = 10
): Promise<{ data: any[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('user_id', user.id)
    .eq('analysis_type', 'optimization')
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
}

/**
 * Get default optimization targets for product type
 */
export function getDefaultTargets(productType: string): OptimizeTarget {
  const targets: { [key: string]: OptimizeTarget } = {
    ice_cream: {
      sugars_pct: 16,
      fat_pct: 10,
      msnf_pct: 11,
      fpdt: -2.8,
    },
    gelato: {
      sugars_pct: 20,
      fat_pct: 7,
      msnf_pct: 9,
      fpdt: -3.5,
    },
    sorbet: {
      sugars_pct: 25,
      fat_pct: 0,
      msnf_pct: 0,
      fpdt: -4.5,
    },
    kulfi: {
      sugars_pct: 14,
      fat_pct: 9,
      msnf_pct: 16,
      fpdt: -2.5,
    },
  };

  return targets[productType] || targets['ice_cream'];
}

/**
 * Built-in optimization presets
 */
export const BUILT_IN_PRESETS: Omit<OptimizationPreset, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    preset_name: 'Maximize Creaminess',
    product_type: 'ice_cream',
    target_metrics: {
      sugars_pct: 16,
      fat_pct: 14,
      msnf_pct: 11,
      fpdt: -2.8,
    },
    algorithm: 'genetic',
  },
  {
    preset_name: 'Reduce Cost',
    product_type: 'ice_cream',
    target_metrics: {
      sugars_pct: 16,
      fat_pct: 8,
      msnf_pct: 10,
      fpdt: -2.8,
    },
    algorithm: 'genetic',
  },
  {
    preset_name: 'Fruit Sorbet Perfect',
    product_type: 'sorbet',
    target_metrics: {
      sugars_pct: 26,
      fat_pct: 0,
      msnf_pct: 0,
      fpdt: -4.2,
    },
    algorithm: 'genetic',
  },
  {
    preset_name: 'Authentic Kulfi',
    product_type: 'kulfi',
    target_metrics: {
      sugars_pct: 14,
      fat_pct: 9,
      msnf_pct: 18,
      fpdt: -2.3,
    },
    algorithm: 'genetic',
  },
];