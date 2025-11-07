# Calculator Math & Logic Audit
**Date**: 2025-11-07

## Issues Identified

### 1. **NULL/Undefined Handling in balanceRecipe**
Lines 285-289 in RecipeCalculatorV2.tsx don't use null coalescing:
```typescript
sugars_g: (ing.sugars_pct / 100) * qty,
fat_g: (ing.fat_pct / 100) * qty,
```

Should be:
```typescript
sugars_g: ((ing.sugars_pct ?? 0) / 100) * qty,
fat_g: ((ing.fat_pct ?? 0) / 100) * qty,
```

### 2. **Optimization Convergence Issues**
The optimize.ts algorithm uses:
- Step size: 0.5g (very small)
- Max iterations: 500
- Simple greedy approach

Problems:
- Too slow for multiple ingredients
- Gets stuck in local minima
- No global optimization strategy
- Doesn't scale quantities proportionally

### 3. **Mode Mismatch**
calcMetricsV2 is called with mode in calculateMetrics but the optimization targets might not align with the actual validation ranges.

### 4. **Total Solids Calculation Bug**
Lines 289 and 178 calculate total_solids_g incorrectly:
```typescript
total_solids_g: ((ing.sugars_pct + ing.fat_pct + ing.msnf_pct + ing.other_solids_pct) / 100) * qty
```

This doesn't match the calc.v2.ts definition where ts = fat + msnf + nonLactoseSugars + other (line 141).
The issue is that `sugars_pct` in ingredients is NON-LACTOSE sugars, but the calculation adds all components together which is correct. However, the formula should use individual percentages properly.

Actually wait, let me re-check: in calc.v2.ts line 141:
```typescript
const ts_g = fat_g + msnf_g + nonLactoseSugars_g + other_g;
```

So total solids = fat + msnf + sugars (non-lactose) + other
This is correct and matches the UI calculation.

### 5. **Optimization Doesn't Pass Mode**
The optimize function calls calcMetricsV2 but doesn't pass the mode option, so it always uses 'gelato' mode validation even for kulfi recipes.

## Fixes Needed

1. Add null coalescing to all ingredient percentage calculations in balanceRecipe
2. Improve optimization algorithm:
   - Use larger step sizes (1-5g)
   - Add proportional scaling
   - Implement simulated annealing or better heuristic
   - Pass mode to calcMetricsV2 inside optimization
3. Ensure mode is passed through optimization chain
