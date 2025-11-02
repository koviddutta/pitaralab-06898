# Complete System Audit Report
**Date:** 2025-11-02  
**Status:** CRITICAL ISSUES FOUND

## Executive Summary
The system has fundamental calculation and integration problems. While individual components exist, they're not properly connected, using wrong calculation engines, and producing invalid results.

---

## 1. DATABASE ANALYSIS

### ✅ WORKING:
- **Ingredients Table**: 41 ingredients loaded correctly
- **Database Connection**: Supabase connected and functioning
- **RLS Policies**: Properly configured

### ❌ CRITICAL PROBLEMS:
```sql
-- Recipe Analysis:
Recipe ID: 1571af55-c259-4a29-8eb5-a262406b7b4e
  - sugars_pct: 1154.37% (IMPOSSIBLE!)
  - This means calculations are fundamentally broken
  
Most recipes show:
  - fat_pct: 0
  - fpdt: 0  
  - msnf_pct: 0
  - These should NEVER be zero if recipes have ingredients
```

**ROOT CAUSE**: Old components saving wrong data format to database.

---

## 2. CALCULATOR (RecipeCalculatorV2.tsx)

### ✅ JUST FIXED:
- Now uses `calcMetricsV2` (science v2.1)
- Balance Recipe button added
- Proper validation with color-coded badges
- Comprehensive warning system

### ⚠️ TESTING NEEDED:
Need to verify:
1. Does calculateMetrics() actually work?
2. Does balanceRecipe() converge to valid results?
3. Are the saved metrics in correct format?

---

## 3. OPTIMIZATION ENGINE (optimize.ts)

### ❌ CRITICAL PROBLEM:
```typescript
// Line 2: Uses OLD calculation engine!
import { calcMetrics, Metrics } from './calc';

// Should be:
import { calcMetricsV2, MetricsV2 } from './calc.v2';
```

**IMPACT**: Balance Recipe button uses wrong formulas, won't hit scientific targets.

---

## 4. AI ENGINE (FlavourEngine.tsx)

### ❌ MAJOR PROBLEMS:

1. **Wrong Calculation Engine** (Lines 188-195):
```typescript
const modernMetrics = modernRecipeRows.length > 0 ? calcMetrics(modernRecipeRows) : ...
const modernMetricsV2 = modernRecipeRows.length > 0 ? calcMetricsV2(modernRecipeRows) : null;
```
Uses BOTH old and new - creates confusion.

2. **Optimize Function** (Lines 224-288):
   - Uses `advancedOptimize` from optimize.advanced.ts
   - That file uses old calc engine too
   - Won't meet scientific targets

3. **Recipe Saving** (Lines 307-348):
   - Doesn't save calculated metrics to database
   - Only saves recipe name and type
   - No validation or metrics persistence

---

## 5. SCIENTIFIC VALIDATION (calc.v2.ts)

### ✅ FORMULAS VERIFIED:
Looking at the code:
- ✅ Leighton table lookup for FPDT
- ✅ Protein = MSNF × 0.36
- ✅ Lactose = MSNF × 0.545
- ✅ Total sugars includes lactose
- ✅ SE calculation with proper coefficients
- ✅ Glucose syrup DE split handling
- ✅ POD index calculation

### ⚠️ POTENTIAL ISSUES:

1. **Water Calculation** (Line 112):
```typescript
water_g += g * (ing.water_pct || 0) / 100;
```
If ingredient water_pct is NULL in DB, defaults to 0 - this is wrong!

2. **Missing MSNF defaults** (Line 115):
```typescript
msnf_g += g * (ing.msnf_pct || 0) / 100;
```
Same issue - NULL becomes 0.

---

## 6. IMPORT TAB (IntelligentCSVImporter.tsx)

### Status from previous fixes:
- Should be calculating metrics correctly
- But if it uses old components, metrics might be wrong

---

## 7. SMART INSIGHTS (SmartInsightsPanel.tsx)

### Status from previous fixes:
- Edge function should return proper structure
- But recipes in DB have wrong metrics, so analysis will be garbage

---

## 8. BASE RECIPES (BaseRecipeSelector.tsx)

### Status from previous fixes:
- Loads from database dynamically
- But if saved metrics are wrong, displayed data is wrong

---

## PRIORITY FIXES NEEDED

### 🔴 IMMEDIATE (Blocking all functionality):

1. **Fix optimize.ts to use calc.v2**
   - Update imports
   - Change objective function to use MetricsV2 fields
   - Update all references

2. **Fix FlavourEngine calculation**
   - Remove old calcMetrics calls
   - Use only calcMetricsV2
   - Update save function to persist v2 metrics

3. **Clean corrupt database recipes**
   - Delete recipes with impossible values (>100%)
   - Recalculate all existing recipes with v2 engine

4. **Add NULL protection in calc.v2**
   - Default NULL percentages to 0 with warning
   - Validate input data before calculation

### 🟡 IMPORTANT (Improves reliability):

5. **Add end-to-end test**
   - Create test recipe with known ingredients
   - Verify all calculations match expected values
   - Test optimization convergence

6. **Add validation in save flow**
   - Reject recipes with >100% of anything
   - Warn if critical values are 0
   - Validate before database insert

### 🟢 ENHANCEMENT (Better UX):

7. **Add visual indicators**
   - Show which calculation engine is active
   - Display confidence in results
   - Highlight when data might be corrupt

---

## TEST RECIPE VALIDATION

**Sample Test**: Classic Gelato
- Whole Milk: 600g (water: 87%, fat: 3.5%, MSNF: 9%, sugars: 5%)
- Cream: 200g (water: 60%, fat: 35%, MSNF: 5%)
- Sucrose: 150g (sugars: 100%)
- Dextrose: 30g (sugars: 100%)
- Stabilizer: 3g (other: 100%)

**Expected Results** (manual calculation):
- Total batch: 983g
- Fat: (600×3.5 + 200×35)/983 = 9.3%
- MSNF: (600×9 + 200×5)/983 = 6.5%
- Total sugars: (600×5 + 150 + 30)/983 = 21.4%
- FPDT: ~2.8-3.2°C (from Leighton table)

**Action**: Create this test recipe and verify results.

---

## CONCLUSION

The system has the RIGHT science engine (calc.v2.ts) but:
1. ❌ Not all components use it
2. ❌ Database has corrupt data from old calculations
3. ❌ Optimization uses wrong engine
4. ❌ AI Engine mixes old and new calculations

**RECOMMENDATION**: 
Before adding any new features, we MUST:
1. Fix all components to use calc.v2
2. Clean database
3. Test with known recipes
4. Verify end-to-end flow

The v2.1 science is correct, but integration is broken.
