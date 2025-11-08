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

// ============================================================================
// PHASE 6: ICE CREAM SCIENCE VALIDATION
// ============================================================================

export type ValidationSeverity = 'optimal' | 'acceptable' | 'warning' | 'critical';

export interface ScienceValidation {
  parameter: string;
  value: number;
  optimalRange: { min: number; max: number };
  acceptableRange: { min: number; max: number };
  severity: ValidationSeverity;
  message: string;
  recommendation?: string;
}

export interface ProductConstraints {
  totalSolids: { optimal: [number, number]; acceptable: [number, number] };
  fat: { optimal: [number, number]; acceptable: [number, number] };
  msnf: { optimal: [number, number]; acceptable: [number, number] };
  fpdt: { optimal: [number, number]; acceptable: [number, number] };
}

const PRODUCT_CONSTRAINTS: Record<string, ProductConstraints> = {
  gelato_white: {
    totalSolids: { optimal: [36, 40], acceptable: [34, 42] },
    fat: { optimal: [6, 10], acceptable: [5, 12] },
    msnf: { optimal: [9, 12], acceptable: [8, 13] },
    fpdt: { optimal: [2.0, 3.0], acceptable: [1.5, 3.5] }
  },
  gelato_finished: {
    totalSolids: { optimal: [36, 40], acceptable: [34, 42] },
    fat: { optimal: [6, 10], acceptable: [5, 12] },
    msnf: { optimal: [8, 11], acceptable: [7, 12] },
    fpdt: { optimal: [2.0, 3.0], acceptable: [1.5, 3.5] }
  },
  ice_cream: {
    totalSolids: { optimal: [36, 42], acceptable: [34, 44] },
    fat: { optimal: [10, 16], acceptable: [8, 18] },
    msnf: { optimal: [9, 12], acceptable: [8, 14] },
    fpdt: { optimal: [2.2, 3.2], acceptable: [1.8, 3.5] }
  },
  sorbet: {
    totalSolids: { optimal: [28, 35], acceptable: [25, 38] },
    fat: { optimal: [0, 0.5], acceptable: [0, 1] },
    msnf: { optimal: [0, 0.5], acceptable: [0, 1] },
    fpdt: { optimal: [2.0, 3.0], acceptable: [1.5, 3.5] }
  }
};

/**
 * Validate recipe metrics against ice cream science constraints
 */
export function validateRecipeScience(
  metrics: MetricsV2,
  productType: string = 'gelato_white'
): ScienceValidation[] {
  const validations: ScienceValidation[] = [];
  const constraints = PRODUCT_CONSTRAINTS[productType] || PRODUCT_CONSTRAINTS.gelato_white;

  // Total Solids Validation
  const ts = metrics.ts_pct;
  const tsValidation = validateParameter(
    'Total Solids',
    ts,
    constraints.totalSolids.optimal,
    constraints.totalSolids.acceptable,
    '%'
  );
  if (tsValidation.severity === 'critical' && ts < constraints.totalSolids.acceptable[0]) {
    tsValidation.recommendation = 'Increase solids: add milk powder, reduce water, or increase sugar';
  } else if (tsValidation.severity === 'critical' && ts > constraints.totalSolids.acceptable[1]) {
    tsValidation.recommendation = 'Reduce solids: add water or reduce concentrated ingredients';
  }
  validations.push(tsValidation);

  // Fat Validation
  const fat = metrics.fat_pct;
  const fatValidation = validateParameter(
    'Fat',
    fat,
    constraints.fat.optimal,
    constraints.fat.acceptable,
    '%'
  );
  if (fatValidation.severity === 'critical' && fat < constraints.fat.acceptable[0]) {
    fatValidation.recommendation = 'Increase fat: add cream, butter, or egg yolk';
  } else if (fatValidation.severity === 'critical' && fat > constraints.fat.acceptable[1]) {
    fatValidation.recommendation = 'Reduce fat: replace cream with milk or add water';
  }
  validations.push(fatValidation);

  // MSNF Validation
  const msnf = metrics.msnf_pct;
  const msnfValidation = validateParameter(
    'MSNF',
    msnf,
    constraints.msnf.optimal,
    constraints.msnf.acceptable,
    '%'
  );
  if (msnfValidation.severity === 'critical' && msnf < constraints.msnf.acceptable[0]) {
    msnfValidation.recommendation = 'Increase MSNF: add skim milk powder or increase milk';
  } else if (msnfValidation.severity === 'critical' && msnf > constraints.msnf.acceptable[1]) {
    msnfValidation.recommendation = 'Reduce MSNF: replace milk with water and cream';
  }
  validations.push(msnfValidation);

  // FPDT Validation
  const fpdt = metrics.fpdt;
  const fpdtValidation = validateParameter(
    'FPDT',
    fpdt,
    constraints.fpdt.optimal,
    constraints.fpdt.acceptable,
    '°C'
  );
  if (fpdtValidation.severity === 'critical' && fpdt < constraints.fpdt.acceptable[0]) {
    fpdtValidation.recommendation = 'Too hard: increase sugars or use higher-FPDT sugars like dextrose';
  } else if (fpdtValidation.severity === 'critical' && fpdt > constraints.fpdt.acceptable[1]) {
    fpdtValidation.recommendation = 'Too soft: reduce sugars or use lower-FPDT sugars';
  }
  validations.push(fpdtValidation);

  return validations;
}

/**
 * Helper to validate a single parameter against optimal and acceptable ranges
 */
function validateParameter(
  name: string,
  value: number,
  optimal: [number, number],
  acceptable: [number, number],
  unit: string
): ScienceValidation {
  let severity: ValidationSeverity;
  let message: string;

  if (value >= optimal[0] && value <= optimal[1]) {
    severity = 'optimal';
    message = `${name} is in optimal range`;
  } else if (value >= acceptable[0] && value <= acceptable[1]) {
    severity = 'acceptable';
    if (value < optimal[0]) {
      message = `${name} is slightly low but acceptable`;
    } else {
      message = `${name} is slightly high but acceptable`;
    }
  } else if (value < acceptable[0] || value > acceptable[1]) {
    const diff = value < acceptable[0] 
      ? (acceptable[0] - value).toFixed(1)
      : (value - acceptable[1]).toFixed(1);
    severity = 'critical';
    message = value < acceptable[0]
      ? `${name} is ${diff}${unit} below acceptable minimum`
      : `${name} is ${diff}${unit} above acceptable maximum`;
  } else {
    severity = 'warning';
    message = `${name} is approaching limits`;
  }

  return {
    parameter: name,
    value,
    optimalRange: { min: optimal[0], max: optimal[1] },
    acceptableRange: { min: acceptable[0], max: acceptable[1] },
    severity,
    message
  };
}

/**
 * Get overall recipe quality score based on science validations
 */
export function getRecipeQualityScore(validations: ScienceValidation[]): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: 'success' | 'warning' | 'destructive';
} {
  const weights = {
    optimal: 1.0,
    acceptable: 0.7,
    warning: 0.4,
    critical: 0.0
  };

  const totalScore = validations.reduce((sum, v) => sum + weights[v.severity], 0);
  const maxScore = validations.length;
  const score = (totalScore / maxScore) * 100;

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  let color: 'success' | 'warning' | 'destructive';

  if (score >= 90) {
    grade = 'A';
    color = 'success';
  } else if (score >= 75) {
    grade = 'B';
    color = 'success';
  } else if (score >= 60) {
    grade = 'C';
    color = 'warning';
  } else if (score >= 50) {
    grade = 'D';
    color = 'warning';
  } else {
    grade = 'F';
    color = 'destructive';
  }

  return { score, grade, color };
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
  scienceValidation?: ScienceValidation[];
  qualityScore?: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    color: 'success' | 'warning' | 'destructive';
  };
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
    useLPSolver?: boolean;
    productType?: string;
    enableScienceValidation?: boolean;
  } = {}
): BalanceResultV2 {
  const maxIterations = options.maxIterations || 50;
  const tolerance = options.tolerance || 0.1; // 0.1% tolerance
  const enableFeasibilityCheck = options.enableFeasibilityCheck !== false;
  const useLPSolver = options.useLPSolver !== false; // Default: try LP first
  const productType = options.productType || 'gelato_white';
  const enableScienceValidation = options.enableScienceValidation !== false;

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
        const scienceValidation = enableScienceValidation 
          ? validateRecipeScience(lpMetrics, productType)
          : undefined;
        const qualityScore = scienceValidation 
          ? getRecipeQualityScore(scienceValidation)
          : undefined;

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
          adjustmentsSummary: ['Linear Programming solver found mathematically optimal solution'],
          scienceValidation,
          qualityScore
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
      const scienceValidation = enableScienceValidation 
        ? validateRecipeScience(currentMetrics, productType)
        : undefined;
      const qualityScore = scienceValidation 
        ? getRecipeQualityScore(scienceValidation)
        : undefined;

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
        feasibilityReport,
        scienceValidation,
        qualityScore
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
  
  const scienceValidation = enableScienceValidation 
    ? validateRecipeScience(finalMetrics, productType)
    : undefined;
  const qualityScore = scienceValidation 
    ? getRecipeQualityScore(scienceValidation)
    : undefined;

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
    feasibilityReport,
    scienceValidation,
    qualityScore
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
