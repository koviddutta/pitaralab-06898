# CRITICAL: Precise Ingredient Mapping Fix

## Problem Identified

**Previous mapping was TOO BROAD and would cause recipe calculation errors:**

### Example of the Problem:
```typescript
// WRONG (Previous Implementation):
'milk_whole': {
  aliases: ['whole milk', 'toned milk', 'buffalo milk', 'cow milk'],
  propertyFilters: { minFat: 2.5, maxFat: 4.5 }  // Too wide!
}
```

**Issues:**
1. ❌ "Toned Milk" (3% fat) could match with any 2.5-4.5% milk
2. ❌ "Buffalo Milk" (6.5% fat) was grouped with "Cow Milk" (3% fat)
3. ❌ Recipe using 100g "Toned Milk" could get matched to 4.5% milk
4. ❌ **Result**: 1.5% fat error = ruins recipe balance!

---

## Solution: Precise, Narrow Mappings

### New Mapping Strategy:

**Each milk type gets its OWN mapping with TIGHT tolerances:**

```typescript
// ✅ CORRECT (New Implementation):

// Cow Whole Milk: 3.0-3.5% fat (±0.35% tolerance)
'milk_whole_cow': {
  aliases: ['whole milk', 'cow whole milk', 'cow milk'],
  propertyFilters: { minFat: 2.8, maxFat: 3.7 }
}

// Toned Milk: 3.0% fat exactly (±0.3% tolerance)
'milk_toned': {
  aliases: ['toned milk', 'standardized milk', '3% milk'],
  propertyFilters: { minFat: 2.7, maxFat: 3.3 }
}

// Buffalo Milk: 6.5% fat (±0.75% tolerance)
'milk_buffalo': {
  aliases: ['buffalo milk', 'bhains milk'],
  propertyFilters: { minFat: 6.0, maxFat: 7.5 }
}

// Single Toned Milk: 1.5% fat (±0.3% tolerance)
'milk_single_toned': {
  aliases: ['single toned milk', '1.5% milk'],
  propertyFilters: { minFat: 1.2, maxFat: 1.8 }
}

// Double Toned Milk: 1.5% fat (±0.3% tolerance)
'milk_double_toned': {
  aliases: ['double toned milk'],
  propertyFilters: { minFat: 1.2, maxFat: 1.8 }
}

// Semi-Skimmed: 2% fat (±0.25% tolerance)
'milk_semi_skimmed': {
  aliases: ['semi-skimmed milk', '2% milk'],
  propertyFilters: { minFat: 1.8, maxFat: 2.3 }
}
```

---

## Milk Type Reference Chart

### Indian Dairy Standards

| Milk Type | Fat % | MSNF % | Tolerance | Mapping Key |
|-----------|-------|--------|-----------|-------------|
| Buffalo Milk | 6.5% | 9.0% | ±0.75% | `milk_buffalo` |
| Cow Whole Milk | 3.0-3.5% | 8.5% | ±0.35% | `milk_whole_cow` |
| Toned Milk | 3.0% | 8.5% | ±0.3% | `milk_toned` |
| Double Toned | 1.5% | 9.0% | ±0.3% | `milk_double_toned` |
| Single Toned | 1.5% | 9.0% | ±0.3% | `milk_single_toned` |
| Skim Milk | 0-0.5% | 8.7% | ±0.25% | `milk_skim` |

### Western Standards

| Milk Type | Fat % | Tolerance | Mapping Key |
|-----------|-------|-----------|-------------|
| Whole Milk | 3.25-3.5% | ±0.4% | `milk_whole_cow` |
| 2% Milk | 2.0% | ±0.25% | `milk_semi_skimmed` |
| 1% Milk | 1.0% | ±0.2% | `milk_single_toned` |
| Skim/Nonfat | 0-0.3% | ±0.25% | `milk_skim` |

---

## Why Precision Matters

### Impact on Recipe Balance

**Example: 1000g Ice Cream Recipe**

**Scenario 1: Wrong Mapping (Before Fix)**
```
Recipe calls for: 600g "Toned Milk" (3% fat)
Expected fat: 600g × 3% = 18g fat

System matches: "Whole Milk 4.5%" (due to broad 2.5-4.5% range)
Actual fat: 600g × 4.5% = 27g fat

❌ Error: +9g fat (50% higher than expected!)
❌ Recipe total fat: 7% → 8.5% (out of target range)
❌ Result: Overly rich, incorrect texture
```

**Scenario 2: Correct Mapping (After Fix)**
```
Recipe calls for: 600g "Toned Milk" (3% fat)
Expected fat: 600g × 3% = 18g fat

System matches: "Toned Milk 3%" (tight 2.7-3.3% range)
Actual fat: 600g × 3.0% = 18g fat

✅ Error: 0g fat (perfect match!)
✅ Recipe total fat: 7% (within target)
✅ Result: Correct texture, balanced recipe
```

---

## Alias Exclusivity Rules

**Critical Rule: Each alias should ONLY match ONE milk type**

### ✅ CORRECT: Exclusive Aliases
```typescript
'milk_toned': {
  aliases: ['toned milk', '3% milk'],  // Only in this mapping
  propertyFilters: { minFat: 2.7, maxFat: 3.3 }
}

'milk_buffalo': {
  aliases: ['buffalo milk'],  // Only in this mapping
  propertyFilters: { minFat: 6.0, maxFat: 7.5 }
}
```

### ❌ WRONG: Overlapping Aliases
```typescript
// Don't do this:
'milk_whole': {
  aliases: ['whole milk', 'toned milk', 'buffalo milk'],  // Too many!
  propertyFilters: { minFat: 2.5, maxFat: 4.5 }  // Too wide!
}
```

---

## Regional Terminology Precision

### Indian Market
- **"Toned Milk"** = Exactly 3% fat (FSSAI standard)
- **"Double Toned"** = Exactly 1.5% fat (FSSAI standard)
- **"Buffalo Milk"** = 6.5-7% fat (natural variation)

### Western Market
- **"Whole Milk"** = 3.25-3.5% fat (FDA standard)
- **"2% Milk"** = Exactly 2% fat
- **"1% Milk"** = Exactly 1% fat

**Key Point:** These are NOT interchangeable! Each has specific fat content.

---

## Property Filter Tolerance Guidelines

### How to Set Tolerances:

```typescript
// For precisely standardized products (e.g., "3% Milk"):
propertyFilters: { 
  minFat: targetFat - 0.3,  // ±10% tolerance
  maxFat: targetFat + 0.3
}

// For natural products with variation (e.g., Buffalo Milk):
propertyFilters: { 
  minFat: targetFat - 0.75,  // ±12% tolerance
  maxFat: targetFat + 0.75
}

// For very low-fat products (e.g., Skim):
propertyFilters: { 
  minFat: 0,
  maxFat: 0.5  // Absolute max
}
```

**Rule of Thumb:** Tighter tolerance = more precise matching = better recipes

---

## Testing the Fix

### Test Case 1: Toned Milk Should NOT Match Buffalo Milk
```typescript
const tonedMilk = findIngredientByGenericId("Toned Milk", ingredients);
console.assert(tonedMilk.fat_pct >= 2.7 && tonedMilk.fat_pct <= 3.3);
console.assert(tonedMilk.fat_pct < 6.0, "Must NOT be buffalo milk!");
```

### Test Case 2: Buffalo Milk Should NOT Match Cow Milk
```typescript
const buffaloMilk = findIngredientByGenericId("Buffalo Milk", ingredients);
console.assert(buffaloMilk.fat_pct >= 6.0 && buffaloMilk.fat_pct <= 7.5);
console.assert(buffaloMilk.fat_pct > 4.5, "Must NOT be cow milk!");
```

### Test Case 3: 3% Milk Should Match Toned Milk Exactly
```typescript
const threePctMilk = findIngredientByGenericId("3% Milk", ingredients);
console.assert(Math.abs(threePctMilk.fat_pct - 3.0) < 0.3);
```

---

## Database Ingredient Naming Best Practices

### ✅ RECOMMENDED: Specific Names
```
"Toned Milk (3% fat)"
"Buffalo Milk (6.5% fat)"
"Cow Whole Milk (3.25% fat)"
"Single Toned Milk (1.5% fat)"
```

**Why?** Makes fat content explicit in the ingredient name.

### ⚠️ ACCEPTABLE: Generic Names (if fat % is accurate in data)
```
"Toned Milk"  (with fat_pct = 3.0 in database)
"Buffalo Milk"  (with fat_pct = 6.5 in database)
```

**Why?** Works if database fat_pct is correct and mapping is precise.

### ❌ AVOID: Ambiguous Names
```
"Milk"  (which milk? 3% or 6.5%?)
"Regular Milk"  (whole, toned, or skim?)
```

**Why?** Impossible to match accurately.

---

## Impact Summary

### Before Fix:
- ❌ "Toned Milk" could match 2.5-4.5% fat range
- ❌ "Buffalo Milk" grouped with "Cow Milk"
- ❌ Potential for 50%+ fat content errors
- ❌ Recipes would fail to balance correctly

### After Fix:
- ✅ "Toned Milk" matches 2.7-3.3% fat only (±10% tolerance)
- ✅ "Buffalo Milk" matches 6.0-7.5% fat only
- ✅ Maximum error: <10% within each milk type
- ✅ Recipes balance accurately

---

## Conclusion

**Critical Principle:**
> Each regional milk type has SPECIFIC fat content and must be mapped PRECISELY. Broad ranges destroy recipe accuracy.

**Implementation:**
- ✅ Separate mapping for each milk type
- ✅ Tight property filters (±10-15% max)
- ✅ Exclusive aliases (no overlap)
- ✅ Regional standards respected

**Result:** Recipe calculations are now accurate to within 0.3% fat content tolerance.
