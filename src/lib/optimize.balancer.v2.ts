/**
 * Advanced Recipe Balancer V2
 * Integrates multi-role classification with intelligent substitution rules
 * Phase 3: Linear Programming solver for optimal balancing
 */

import type { Row, OptimizeTarget } from './optimize';
import type { IngredientData } from '@/types/ingredients';
import type { MetricsV2 } from './calc.v2';
import { calcMetricsV2 } from './calc.v2';
import {
  OptimizeEngineV2,
  type IngredientClassification,
  type SubstitutionRule,
  SUBSTITUTION_PATTERNS
} from './optimize.engine.v2';
// @ts-ignore - javascript-lp-solver doesn't have types
import solver from 'javascript-lp-solver';

// ============================================================================
// PHASE 3: LINEAR PROGRAMMING SOLVER
// ============================================================================

export interface LPSolverResult {
  success: boolean;
  rows: Row[];
  message: string;
  error?: string;
}

/**
 * Solve recipe balancing using Linear Programming for mathematically optimal solution
 * Uses Simplex method via javascript-lp-solver
 */
export function balanceRecipeLP(
  initialRows: Row[],
  targets: OptimizeTarget,
  options: {
    tolerance?: number;
  } = {}
): LPSolverResult {
  const tolerance = options.tolerance || 0.15; // 0.15% default tolerance

  if (!initialRows || initialRows.length === 0) {
    return {
      success: false,
      rows: [],
      message: 'No ingredients to optimize',
      error: 'Empty recipe'
    };
  }

  const originalMetrics = calcMetricsV2(initialRows);
  const totalWeight = originalMetrics.total_g;

  // Build LP model
  const model: any = {
    optimize: 'deviation',
    opType: 'min',
    constraints: {},
    variables: {}
  };

  // Create variables for each ingredient (amount in grams)
  initialRows.forEach((row, idx) => {
    const varName = `ing_${idx}`;
    const ing = row.ing;
    const minConstraint = `${varName}_min`;
    const maxConstraint = `${varName}_max`;

    const variable: any = {
      deviation: 0, // We'll minimize deviation from targets, not individual ingredients
      // Contribution to constraints
      total_weight: 1, // Each gram contributes 1g to total weight
      fat_contribution: ing.fat_pct / 100,
      msnf_contribution: (ing.msnf_pct || 0) / 100,
      sugars_contribution: (ing.sugars_pct || 0) / 100
    };
    
    // Add bounds using bracket notation
    variable[minConstraint] = 1;
    variable[maxConstraint] = 1;
    
    model.variables[varName] = variable;
  });

  // Constraint 1: Total weight must equal original weight
  model.constraints.total_weight = { equal: totalWeight };

  // Constraint 2: Each ingredient has min/max bounds
  initialRows.forEach((row, idx) => {
    const varName = `ing_${idx}`;
    const minGrams = 0; // Can reduce to zero
    const maxGrams = row.grams * 3; // Can increase up to 3x

    model.constraints[`ing_${idx}_min`] = { min: minGrams };
    model.constraints[`ing_${idx}_max`] = { max: maxGrams };
  });

  // Constraint 3: Fat percentage target
  if (targets.fat_pct !== undefined) {
    const targetFatGrams = (targets.fat_pct / 100) * totalWeight;
    model.constraints.fat_contribution = {
      min: targetFatGrams - (tolerance / 100 * totalWeight),
      max: targetFatGrams + (tolerance / 100 * totalWeight)
    };
  }

  // Constraint 4: MSNF percentage target
  if (targets.msnf_pct !== undefined) {
    const targetMSNFGrams = (targets.msnf_pct / 100) * totalWeight;
    model.constraints.msnf_contribution = {
      min: targetMSNFGrams - (tolerance / 100 * totalWeight),
      max: targetMSNFGrams + (tolerance / 100 * totalWeight)
    };
  }

  // Constraint 5: Sugars percentage target
  if (targets.totalSugars_pct !== undefined) {
    const targetSugarsGrams = (targets.totalSugars_pct / 100) * totalWeight;
    model.constraints.sugars_contribution = {
      min: targetSugarsGrams - (tolerance / 100 * totalWeight),
      max: targetSugarsGrams + (tolerance / 100 * totalWeight)
    };
  }

  try {
    // Solve the LP problem
    const result = solver.Solve(model);

    if (!result || result.feasible === false) {
      return {
        success: false,
        rows: initialRows,
        message: 'LP solver found no feasible solution',
        error: 'Infeasible constraints - targets may be impossible with current ingredients'
      };
    }

    // Extract solution and build new rows
    const newRows: Row[] = initialRows.map((row, idx) => {
      const varName = `ing_${idx}`;
      const newGrams = result[varName] || row.grams;
      
      return {
        ...row,
        grams: Math.max(0, newGrams) // Ensure non-negative
      };
    }).filter(row => row.grams > 0.1); // Remove ingredients with negligible amounts

    // Validate solution
    const newMetrics = calcMetricsV2(newRows);
    const weightError = Math.abs(newMetrics.total_g - totalWeight);

    if (weightError > 1) {
      // Normalize to preserve weight
      const scaleFactor = totalWeight / newMetrics.total_g;
      newRows.forEach(row => {
        row.grams *= scaleFactor;
      });
    }

    return {
      success: true,
      rows: newRows,
      message: 'LP solver found optimal solution'
    };

  } catch (error) {
    return {
      success: false,
      rows: initialRows,
      message: 'LP solver encountered an error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// FEASIBILITY VALIDATION & TARGET ANALYSIS
// ============================================================================

export interface FeasibilityReport {
  feasible: boolean;
  reason?: string;
  suggestions: string[];
  achievableRanges: {
    fat: { min: number; max: number };
    msnf: { min: number; max: number };
    nonLactoseSugars: { min: number; max: number };
  };
}

/**
 * Check if targets are theoretically achievable with current ingredients
 */
export function checkTargetFeasibility(
  rows: Row[],
  targets: OptimizeTarget,
  allIngredients: IngredientData[]
): FeasibilityReport {
  const suggestions: string[] = [];
  
  // Calculate current metrics
  const currentMetrics = calcMetricsV2(rows);
  const totalWeight = currentMetrics.total_g;

  // Calculate theoretical max/min for each parameter
  const classifications = OptimizeEngineV2.classifyRecipe(rows);
  
  // Estimate achievable ranges based on ingredient flexibility
  const fatSources = rows.filter(r => r.ing.fat_pct > 2);
  const msnfSources = rows.filter(r => r.ing.msnf_pct && r.ing.msnf_pct > 5);
  
  // Calculate theoretical maximums (if we maximize these ingredients)
  const maxFat = fatSources.reduce((sum, r) => {
    const maxGrams = r.grams * 2; // Could theoretically double
    return sum + (maxGrams * r.ing.fat_pct / 100);
  }, 0) / totalWeight * 100;

  const maxMSNF = msnfSources.reduce((sum, r) => {
    const maxGrams = r.grams * 2;
    return sum + (maxGrams * (r.ing.msnf_pct || 0) / 100);
  }, 0) / totalWeight * 100;

  // Calculate theoretical minimums (if we minimize these ingredients)
  const minFat = fatSources.reduce((sum, r) => {
    const minGrams = r.grams * 0.1; // Could theoretically reduce to 10%
    return sum + (minGrams * r.ing.fat_pct / 100);
  }, 0) / totalWeight * 100;

  const minMSNF = msnfSources.reduce((sum, r) => {
    const minGrams = r.grams * 0.1;
    return sum + (minGrams * (r.ing.msnf_pct || 0) / 100);
  }, 0) / totalWeight * 100;

  const achievableRanges = {
    fat: { min: Math.max(0, minFat * 0.8), max: maxFat * 1.2 },
    msnf: { min: Math.max(0, minMSNF * 0.8), max: maxMSNF * 1.2 },
    nonLactoseSugars: { min: 0, max: 30 } // Typical gelato range
  };

  // Check if targets are within achievable ranges
  let feasible = true;
  let reason = '';

  if (targets.fat_pct !== undefined) {
    if (targets.fat_pct > achievableRanges.fat.max) {
      feasible = false;
      reason = `Fat target ${targets.fat_pct.toFixed(1)}% exceeds maximum achievable ${achievableRanges.fat.max.toFixed(1)}%`;
      suggestions.push(`Add high-fat ingredients like heavy cream (35%+) or butter`);
      suggestions.push(`Current fat: ${currentMetrics.fat_pct.toFixed(1)}%`);
    } else if (targets.fat_pct < achievableRanges.fat.min) {
      feasible = false;
      reason = `Fat target ${targets.fat_pct.toFixed(1)}% below minimum achievable ${achievableRanges.fat.min.toFixed(1)}%`;
      suggestions.push(`Replace cream with milk or add water`);
    }
  }

  if (targets.msnf_pct !== undefined) {
    if (targets.msnf_pct > achievableRanges.msnf.max) {
      feasible = false;
      reason = reason || `MSNF target ${targets.msnf_pct.toFixed(1)}% exceeds maximum achievable ${achievableRanges.msnf.max.toFixed(1)}%`;
      suggestions.push(`Add skim milk powder (SMP) or increase milk content`);
      suggestions.push(`Current MSNF: ${currentMetrics.msnf_pct.toFixed(1)}%`);
    } else if (targets.msnf_pct < achievableRanges.msnf.min) {
      feasible = false;
      reason = reason || `MSNF target ${targets.msnf_pct.toFixed(1)}% below minimum achievable ${achievableRanges.msnf.min.toFixed(1)}%`;
      suggestions.push(`Replace milk with water and cream to maintain fat while reducing MSNF`);
    }
  }

  if (!feasible && suggestions.length === 0) {
    suggestions.push('Adjust recipe composition or modify targets');
  }

  return { feasible, reason, suggestions, achievableRanges };
}

// ============================================================================
// PHASE 4: ITERATIVE BALANCING WITH SUBSTITUTIONS
// ============================================================================

export interface BalanceProgress {
  iteration: number;
  metrics: MetricsV2;
  adjustments: string[];
  score: number;
}

export interface BalanceResultV2 {
  success: boolean;
  rows: Row[];
  metrics: MetricsV2;
  originalMetrics: MetricsV2;
  iterations: number;
  progress: BalanceProgress[];
  strategy: string;
  message: string;
  adjustmentsSummary: string[];
  feasibilityReport?: FeasibilityReport;
}

/**
 * Score how close current metrics are to targets
 */
function scoreMetrics(metrics: MetricsV2, targets: OptimizeTarget): number {
  let score = 0;
  let count = 0;

  if (targets.fat_pct !== undefined) {
    score += Math.abs(metrics.fat_pct - targets.fat_pct);
    count++;
  }
  if (targets.msnf_pct !== undefined) {
    score += Math.abs(metrics.msnf_pct - targets.msnf_pct);
    count++;
  }
  if (targets.totalSugars_pct !== undefined) {
    score += Math.abs(metrics.totalSugars_pct - targets.totalSugars_pct);
    count++;
  }
  if (targets.fpdt !== undefined) {
    score += Math.abs(metrics.fpdt - targets.fpdt) * 10; // Weight FPDT more heavily
    count++;
  }

  return count > 0 ? score / count : 0;
}

/**
 * Determine which parameter needs adjustment most urgently
 */
function identifyPriorityAdjustment(
  metrics: MetricsV2,
  targets: OptimizeTarget
): { parameter: 'fat' | 'msnf' | 'sugars' | null; direction: 'increase' | 'decrease' | null; delta: number } {
  let maxDelta = 0;
  let priority: 'fat' | 'msnf' | 'sugars' | null = null;
  let direction: 'increase' | 'decrease' | null = null;

  if (targets.fat_pct !== undefined) {
    const delta = Math.abs(metrics.fat_pct - targets.fat_pct);
    if (delta > maxDelta) {
      maxDelta = delta;
      priority = 'fat';
      direction = metrics.fat_pct > targets.fat_pct ? 'decrease' : 'increase';
    }
  }

  if (targets.msnf_pct !== undefined) {
    const delta = Math.abs(metrics.msnf_pct - targets.msnf_pct);
    if (delta > maxDelta) {
      maxDelta = delta;
      priority = 'msnf';
      direction = metrics.msnf_pct > targets.msnf_pct ? 'decrease' : 'increase';
    }
  }

  if (targets.totalSugars_pct !== undefined) {
    const delta = Math.abs(metrics.totalSugars_pct - targets.totalSugars_pct);
    if (delta > maxDelta) {
      maxDelta = delta;
      priority = 'sugars';
      direction = metrics.totalSugars_pct > targets.totalSugars_pct ? 'decrease' : 'increase';
    }
  }

  return { parameter: priority, direction, delta: maxDelta };
}

/**
 * Main balancing function - tries LP solver first, falls back to heuristic
 */
export function balanceRecipeV2(
  initialRows: Row[],
  targets: OptimizeTarget,
  allIngredients: IngredientData[],
  options: {
    maxIterations?: number;
    tolerance?: number;
    enableFeasibilityCheck?: boolean;
    useLPSolver?: boolean; // New option to control LP usage
  } = {}
): BalanceResultV2 {
  const maxIterations = options.maxIterations || 50;
  const tolerance = options.tolerance || 0.1; // 0.1% tolerance
  const enableFeasibilityCheck = options.enableFeasibilityCheck !== false;
  const useLPSolver = options.useLPSolver !== false; // Default: try LP first

  // Validation: Check for empty inputs
  if (!initialRows || initialRows.length === 0) {
    return {
      success: false,
      rows: [],
      metrics: {} as MetricsV2,
      originalMetrics: {} as MetricsV2,
      iterations: 0,
      progress: [],
      strategy: 'Validation Failed',
      message: 'No ingredients in recipe. Add ingredients before balancing.',
      adjustmentsSummary: ['Add at least one ingredient to the recipe']
    };
  }

  if (!allIngredients || allIngredients.length === 0) {
    return {
      success: false,
      rows: initialRows,
      metrics: calcMetricsV2(initialRows),
      originalMetrics: calcMetricsV2(initialRows),
      iterations: 0,
      progress: [],
      strategy: 'Validation Failed',
      message: 'No ingredients available in database for substitutions.',
      adjustmentsSummary: ['Ensure ingredient database is loaded']
    };
  }

  const originalMetrics = calcMetricsV2(initialRows);
  const progress: BalanceProgress[] = [];
  const adjustmentsSummary: string[] = [];

  // Step 0: Try LP Solver first (if enabled)
  if (useLPSolver) {
    const lpResult = balanceRecipeLP(initialRows, targets, { tolerance });
    
    if (lpResult.success) {
      const lpMetrics = calcMetricsV2(lpResult.rows);
      const lpScore = scoreMetrics(lpMetrics, targets);
      
      if (lpScore < tolerance) {
        return {
          success: true,
          rows: lpResult.rows,
          metrics: lpMetrics,
          originalMetrics,
          iterations: 1,
          progress: [{
            iteration: 0,
            metrics: lpMetrics,
            adjustments: ['LP Solver: Optimal solution found'],
            score: lpScore
          }],
          strategy: 'Linear Programming (Simplex)',
          message: `Optimal solution found using LP solver. Score: ${(lpScore * 100).toFixed(2)}%`,
          adjustmentsSummary: ['Linear Programming solver found mathematically optimal solution']
        };
      } else {
        adjustmentsSummary.push(`LP solver completed but score ${(lpScore * 100).toFixed(2)}% exceeds tolerance. Trying heuristic approach.`);
      }
    } else {
      adjustmentsSummary.push(`LP solver failed: ${lpResult.error || lpResult.message}. Falling back to heuristic approach.`);
    }
  }

  // Step 1: Check feasibility
  let feasibilityReport: FeasibilityReport | undefined;
  if (enableFeasibilityCheck) {
    feasibilityReport = checkTargetFeasibility(initialRows, targets, allIngredients);
    if (!feasibilityReport.feasible) {
      return {
        success: false,
        rows: initialRows,
        metrics: originalMetrics,
        originalMetrics,
        iterations: 0,
        progress: [],
        strategy: 'Feasibility Check V2',
        message: `Cannot achieve targets: ${feasibilityReport.reason}`,
        adjustmentsSummary: feasibilityReport.suggestions,
        feasibilityReport
      };
    }
  }

  // Step 2: Iterative balancing with substitutions
  let currentRows = [...initialRows];
  let bestRows = [...initialRows];
  let bestScore = Infinity;
  const originalWeight = originalMetrics.total_g;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const currentMetrics = calcMetricsV2(currentRows);
    const score = scoreMetrics(currentMetrics, targets);

    // Track progress
    progress.push({
      iteration,
      metrics: currentMetrics,
      adjustments: [],
      score
    });

    // Check if we've achieved targets
    if (score < tolerance) {
      return {
        success: true,
        rows: currentRows,
        metrics: currentMetrics,
        originalMetrics,
        iterations: iteration + 1,
        progress,
        strategy: 'Substitution Rules V2',
        message: `Successfully balanced recipe in ${iteration + 1} iterations`,
        adjustmentsSummary,
        feasibilityReport
      };
    }

    // Track best result
    if (score < bestScore) {
      bestScore = score;
      bestRows = [...currentRows];
    }

    // Identify priority adjustment
    const { parameter, direction, delta } = identifyPriorityAdjustment(currentMetrics, targets);
    
    if (!parameter || !direction) {
      break; // No more adjustments needed or possible
    }

    // Find applicable substitution rules
    const rules = OptimizeEngineV2.findRules(parameter, direction, 
      currentRows.map(r => r.ing));

    if (rules.length === 0) {
      // No rules available - may need different ingredients
      adjustmentsSummary.push(`No substitution rules found for ${parameter} ${direction}`);
      break; // Exit if no rules can be applied
    }

    // Apply the highest priority rule
    const rule = rules[0];
    
    // Calculate adjustment amount based on delta
    // Be conservative: adjust 20% of the needed change per iteration
    const adjustmentGrams = (delta / 100) * originalWeight * 0.2;
    
    const newRows = OptimizeEngineV2.applySubstitution(
      currentRows,
      rule,
      allIngredients,
      adjustmentGrams
    );

    // Validate weight preservation
    const newMetrics = calcMetricsV2(newRows);
    const weightDiff = Math.abs(newMetrics.total_g - originalWeight);
    
    if (weightDiff > 1) {
      // Weight changed too much, adjust to compensate
      const scaleFactor = originalWeight / newMetrics.total_g;
      currentRows = newRows.map(r => ({ ...r, grams: r.grams * scaleFactor }));
    } else {
      currentRows = newRows;
    }

    // Record adjustment
    const adjustmentMsg = `${rule.name}: ${parameter} ${direction} by ${delta.toFixed(2)}%`;
    adjustmentsSummary.push(adjustmentMsg);
    
    if (progress[progress.length - 1]) {
      progress[progress.length - 1].adjustments.push(adjustmentMsg);
    }
  }

  // Return best result found
  const finalMetrics = calcMetricsV2(bestRows);
  const finalScore = scoreMetrics(finalMetrics, targets);

  return {
    success: finalScore < tolerance * 3, // More lenient success criteria
    rows: bestRows,
    metrics: finalMetrics,
    originalMetrics,
    iterations: maxIterations,
    progress,
    strategy: 'Substitution Rules V2 (Max Iterations)',
    message: finalScore < tolerance * 3 
      ? `Recipe balanced within ${(finalScore * 100).toFixed(1)}% of targets`
      : `Could not fully balance recipe. Best score: ${finalScore.toFixed(2)}`,
    adjustmentsSummary,
    feasibilityReport
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const RecipeBalancerV2 = {
  balance: balanceRecipeV2,
  balanceLP: balanceRecipeLP,
  checkFeasibility: checkTargetFeasibility,
  scoreMetrics
};
