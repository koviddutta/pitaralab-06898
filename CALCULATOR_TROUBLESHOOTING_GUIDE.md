# Calculator Troubleshooting Guide

## Issue Fixed: `require()` Error

**Problem:** Browser was throwing `ReferenceError: require is not defined`

**Root Cause:** Used Node.js `require()` syntax in browser-side React code

**Solution:** Changed to ES6 imports at the top of files:
```typescript
// ❌ WRONG (Node.js only):
const { diagnoseBalancingFailure } = require('./ingredientMapper');

// ✅ CORRECT (ES6 modules):
import { diagnoseBalancingFailure } from './ingredientMapper';
```

---

## How to Test the Calculator

### Step 1: Open Browser Console
1. Open Calculator tab
2. Press F12 (or right-click → Inspect → Console)
3. Watch for debug logs starting with 🔧, 🎯, 📊, ⚙️, ✅, ❌

### Step 2: Test with Simple Recipe Template
1. Click "📋 Templates" button
2. Select "Classic Gelato Base"
3. Click "Calculate Metrics" 
4. Verify metrics appear
5. Click "⚡ Balance Recipe"
6. Watch console logs:
   ```
   🔧 Starting balancing process...
   🎯 Balancing targets: {...}
   📊 Recipe ingredients: [...]
   ⚙️ Calling RecipeBalancerV2.balance...
   ✅ Balancing result: {...}
   ```

### Step 3: Check for Errors
If you see ❌ errors, check:
1. **Missing ingredients?**
   - Error: "Missing essential ingredients: Water, Butter"
   - Fix: Add those ingredients to database

2. **Invalid ingredient data?**
   - Error: "Ingredient not found"
   - Fix: Check ingredient names match database

3. **Infeasible targets?**
   - Error: "Fat target 10% exceeds maximum achievable 7%"
   - Fix: Adjust targets or add high-fat ingredients

---

## Debug Console Logs Explained

### 🔧 Starting balancing
```javascript
🔧 Starting balancing process... {
  rowCount: 5,              // Number of ingredients
  productType: "gelato",    // Product type
  availableIngredientsCount: 85  // Total ingredients in database
}
```
**What it means:** Balancer starting with 5 ingredients, 85 available for substitutions

---

### 🎯 Balancing targets
```javascript
🎯 Balancing targets: {
  fat_pct: 7.5,
  msnf_pct: 11,
  totalSugars_pct: 19,
  ts_pct: 40.5,
  fpdt: 3.0
}
```
**What it means:** Calculator will try to hit these exact percentages

---

### 📊 Recipe ingredients
```javascript
📊 Recipe ingredients: [
  { name: "Whole Milk", grams: 650, fat_pct: 3.25, msnf_pct: 8.5 },
  { name: "Heavy Cream 35%", grams: 100, fat_pct: 35, msnf_pct: 5.5 },
  { name: "Sucrose", grams: 150, fat_pct: 0, msnf_pct: 0 },
  { name: "Water", grams: 100, fat_pct: 0, msnf_pct: 0 }
]
```
**What it means:** Starting recipe composition before balancing

---

### ⚙️ Calling balancer
```javascript
⚙️ Calling RecipeBalancerV2.balance...
```
**What it means:** About to run optimization algorithm

---

### ✅ Success
```javascript
✅ Balancing result: {
  success: true,
  strategy: "Linear Programming (Simplex)",
  iterations: 1,
  message: "Optimal solution found using LP solver"
}
```
**What it means:** Recipe balanced successfully using LP solver in 1 iteration

---

### ❌ Failure
```javascript
❌ Balancing error: ReferenceError: require is not defined
Error stack: ...
```
**What it means:** Code error - check the stack trace for the file/line causing the issue

---

## Common Issues & Solutions

### Issue 1: "Missing essential ingredients"
**Symptoms:**
```
⚠️ Missing essential ingredients for balancing: Water, Butter

💡 To fix this:
• Add "Water" ingredient to enable fat/MSNF dilution
• Add heavy cream (35%+) or butter to adjust fat content
```

**Solution:**
1. Go to Database tab
2. Add missing ingredients:
   - Water (0% fat, 0% MSNF)
   - Butter (82% fat, 2% MSNF)
   - Heavy Cream 35% (35% fat, 5.5% MSNF)

---

### Issue 2: "Ingredient not found in library"
**Symptoms:**
```
⚠️ Substitution target ingredient "smp" not found in library
```

**Solution:**
1. Check ingredient mapper aliases in `src/lib/ingredientMapper.ts`
2. Verify database has ingredient with matching name/properties
3. Add ingredient to database if missing

---

### Issue 3: "LP solver found no feasible solution"
**Symptoms:**
```
⚠️ LP solver found no feasible solution
Infeasible constraints - targets may be impossible
```

**Solution:**
1. Check if targets are achievable:
   - Can't get 15% fat with only skim milk
   - Can't get 2% fat with only buffalo milk (6.5% fat)
2. Add appropriate ingredients:
   - Need high-fat? Add cream or butter
   - Need low-fat? Add water or skim milk
   - Need MSNF? Add skim milk powder
3. Or adjust targets to be more realistic

---

### Issue 4: Recipe doesn't change after clicking Balance
**Symptoms:**
- Click "Balance Recipe"
- Loading spinner shows
- Recipe ingredients stay the same
- No error message

**Solution:**
1. Check console for hidden errors
2. Verify ingredients have valid data:
   ```javascript
   // Check in console:
   rows.forEach(r => {
     console.log(r.ingredientData);
   });
   ```
3. Ensure at least 3 ingredients in recipe
4. Verify database connection (check "✅ Supabase configured" logs)

---

### Issue 5: Calculation shows NaN or Infinity
**Symptoms:**
- Metrics show "NaN%" or "Infinity%"
- Balance button does nothing

**Solution:**
1. Check for divide-by-zero:
   - Total weight = 0? (all ingredients at 0g)
   - Missing ingredient properties (fat_pct undefined)
2. Verify all ingredients have numeric values:
   ```sql
   SELECT name, fat_pct, msnf_pct, water_pct 
   FROM ingredients 
   WHERE fat_pct IS NULL OR msnf_pct IS NULL;
   ```
3. Fix any NULL values in database

---

## Testing Checklist

### ✅ Basic Functionality
- [ ] Calculator loads without errors
- [ ] Can add ingredient rows
- [ ] Can search and select ingredients
- [ ] Can enter quantities
- [ ] Calculate Metrics button works
- [ ] Metrics display correctly (no NaN)
- [ ] Balance Recipe button appears
- [ ] Templates button shows templates

### ✅ Templates
- [ ] Classic Gelato Base template loads
- [ ] Strawberry Gelato template loads
- [ ] Alphonso Mango Sorbet template loads
- [ ] Template ingredients match database
- [ ] Can calculate metrics after loading template
- [ ] Can balance after loading template

### ✅ Balancing
- [ ] Balance button triggers optimization
- [ ] Loading spinner shows during balance
- [ ] Console shows debug logs (🔧, 🎯, 📊, ⚙️)
- [ ] Either success or clear error message
- [ ] Recipe updates after successful balance
- [ ] Metrics recalculate after balance
- [ ] Can balance multiple times

### ✅ Error Handling
- [ ] Clear error for empty recipe
- [ ] Clear error for missing ingredients
- [ ] Clear error for infeasible targets
- [ ] Error messages show specific fixes
- [ ] Console logs show detailed error info

---

## Expected Console Output (Success)

```
🔧 Starting balancing process... { rowCount: 4, productType: "gelato", availableIngredientsCount: 85 }
🎯 Balancing targets: { fat_pct: 7.5, msnf_pct: 11, totalSugars_pct: 19, ... }
📊 Recipe ingredients: [
  { name: "Whole Milk", grams: 650, fat_pct: 3.25, msnf_pct: 8.5 },
  { name: "Heavy Cream 35%", grams: 100, fat_pct: 35, msnf_pct: 5.5 },
  { name: "Sucrose", grams: 150, fat_pct: 0, msnf_pct: 0 },
  { name: "Water", grams: 100, fat_pct: 0, msnf_pct: 0 }
]
⚙️ Calling RecipeBalancerV2.balance...
✅ Balancing result: {
  success: true,
  strategy: "Linear Programming (Simplex)",
  iterations: 1,
  message: "Optimal solution found using LP solver. Score: 0.05%"
}
```

---

## What to Report if Issues Persist

1. **Console Logs:** Copy entire console output (especially ❌ errors)
2. **Recipe Details:**
   ```javascript
   // In console, type:
   console.log(rows);
   console.log(availableIngredients.length);
   ```
3. **Database State:** 
   - Count of ingredients: `SELECT COUNT(*) FROM ingredients;`
   - Essential ingredients present: `SELECT name FROM ingredients WHERE name IN ('Water', 'Butter', 'Heavy Cream 35%');`
4. **Steps to Reproduce:**
   - What template/recipe used
   - What button clicked
   - Expected vs actual behavior

---

## Quick Fixes

### Fix 1: Clear and Restart
1. Refresh page (Ctrl+R or Cmd+R)
2. Clear browser cache (Ctrl+Shift+Del)
3. Re-test with simple template

### Fix 2: Reset Database
1. Go to Database tab
2. Re-run seed data
3. Verify ingredients loaded

### Fix 3: Check for JavaScript Errors
1. Open Console (F12)
2. Look for red errors
3. Report full error message + stack trace

---

## Advanced Debugging

### Enable Verbose Logging
Add to `src/lib/optimize.balancer.v2.ts`:
```typescript
console.log('DEBUG: Entering balanceRecipeV2', { initialRows, targets });
console.log('DEBUG: After diagnosis', { diagnosis });
console.log('DEBUG: LP result', { lpResult });
```

### Test Ingredient Mapper
Open Console and test:
```javascript
import { findIngredientByGenericId } from './src/lib/ingredientMapper';
const ingredients = await fetch('/api/ingredients').then(r => r.json());

// Test aliases
console.log('SMP:', findIngredientByGenericId('SMP', ingredients));
console.log('Toned Milk:', findIngredientByGenericId('toned milk', ingredients));
console.log('25% Cream:', findIngredientByGenericId('25% cream', ingredients));
```

### Test Balancer Directly
```javascript
import { RecipeBalancerV2 } from './src/lib/optimize.balancer.v2';

const testRecipe = [
  { ing: { id: 'milk', name: 'Whole Milk', fat_pct: 3.25, msnf_pct: 8.5, ... }, grams: 650 },
  { ing: { id: 'cream', name: 'Heavy Cream 35%', fat_pct: 35, msnf_pct: 5.5, ... }, grams: 100 },
  // ... more ingredients
];

const targets = { fat_pct: 7.5, msnf_pct: 11 };

const result = RecipeBalancerV2.balance(testRecipe, targets, allIngredients);
console.log(result);
```

---

## Status: FIXED ✅

- [x] `require()` error resolved
- [x] ES6 imports properly configured
- [x] Debug logging added
- [x] Error messages improved
- [x] Ingredient mapper integrated
- [x] Ultra-precise milk/cream mappings

**Next:** Test with templates and verify balancing works end-to-end.
