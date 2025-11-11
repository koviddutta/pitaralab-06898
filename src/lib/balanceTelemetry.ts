import { getSupabase } from "@/integrations/supabase/safeClient";

/**
 * Balance Telemetry - Log balancing attempts for analysis
 * Tracks success rates, failure patterns, and optimization strategies
 */

export interface BalanceEventData {
  productType: string;
  mode: string;
  feasible: boolean;
  success: boolean;
  initialRows: any[];
  finalRows?: any[];
  targets: Record<string, any>;
  metrics?: Record<string, any>;
  suggestions?: string[];
  errorReason?: string;
  strategy?: string;
}

/**
 * Log a balance event (fire-and-forget, silent fail)
 */
export async function logBalanceEvent(data: BalanceEventData) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Use 'any' cast until types regenerate
    await (supabase as any).from("balance_events").insert({
      user_id: user?.id || null,
      product_type: data.productType,
      mode: data.mode,
      feasible: data.feasible,
      success: data.success,
      initial_rows: data.initialRows,
      final_rows: data.finalRows || null,
      targets: data.targets,
      metrics: data.metrics || null,
      suggestions: data.suggestions || null,
      error_reason: data.errorReason || null,
      strategy: data.strategy || null,
    });
  } catch (error) {
    // Silent fail - telemetry should never break user experience
    console.debug('Balance telemetry failed:', error);
  }
}

/**
 * Analytics helper: Get balance success rate by mode
 */
export async function getBalanceSuccessRate(mode?: string) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Use 'any' cast until types regenerate
    const supabaseAny = supabase as any;
    let query = supabaseAny
      .from("balance_events")
      .select("success, feasible")
      .eq("user_id", user?.id);
    
    if (mode) {
      query = query.eq("mode", mode);
    }
    
    const { data, error } = await query;
    
    if (error || !data) return null;
    
    const total = data.length;
    const successful = data.filter((e: any) => e.success).length;
    const feasible = data.filter((e: any) => e.feasible).length;
    
    return {
      total,
      successful,
      feasible,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) : '0.0',
      feasibilityRate: total > 0 ? (feasible / total * 100).toFixed(1) : '0.0',
    };
  } catch (error) {
    console.debug('Failed to fetch balance stats:', error);
    return null;
  }
}
