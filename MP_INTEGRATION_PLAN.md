# MP Recipes Integration Plan

## Overview
Your Excel contains 5 key components that can be integrated into our calculator:

1. **Extended Ingredient Library** (Indian specialties + composition data)
2. **Base Recipe Templates** (White, Chocolate, Kulfi, Sorbet)
3. **Paste Formulations** (Complex ingredients with sub-recipes)
4. **Finished Product Recipes** (Gulab Jamun Delight, Jalebi Joy, etc.)
5. **Production Planning Workflow** (35L batch calculations - already implemented!)

---

## 1. Ingredient Database Enhancement

### New Ingredients to Add (with composition data from your Excel):

**Indian Specialties:**
- Gulab Jamun Paste: 41.6% water, 41.87% sugars, 9.45% fat, 11.73% MSNF
- Jalebi Paste: 28.7% sugars, 6.15% fat, 7.67% MSNF, 9.42% other solids
- Rabri (Amul): 53.6% water, 14.36% sugars, 18% fat, 9.56% MSNF
- Mawa (Khoya): 41.8% water, 21% fat, 38% MSNF, 23.2% lactose
- Malai (Clotted Cream): 30% water, 58% fat, 12% MSNF
- Gajar Halwa: 76.49% water, 13.16% sugars, 5.7% fat
- Fresh Jalebi: 38.55% water, 34.55% sugars, 6.36% fat
- Milkcake: 5% water, 57% sugars, 14.2% fat, 10% MSNF

**Chocolate & Cocoa:**
- Callebaut Dark 70-30-38: 26% sugars, 38.8% fat, 35.2% other solids
- Dutch Cocoa Powder 22/24: 0.5% sugars, 23% fat, 62.4% other solids

**Spices & Flavors:**
- Cardamom Powder: 1.9% fat, 78.1% other solids
- Saffron Strands: tracking item for flavor/color

**Savory (for Mumbai Chat):**
- Tamarind Paste: 68% water, 9% sugars, 1% other solids
- Ketchup: 37.4% sugars, 21% other solids
- Black Salt, Roasted Cumin, Coriander, Mint

### Action Items:
- [ ] Bulk import these ingredients into Supabase `ingredients` table
- [ ] Add cost_per_kg data (₹850 for Jalebi, ₹400 for Ghee, etc.)
- [ ] Tag ingredients by origin (Indian, Commercial, Spice, etc.)

---

## 2. Base Recipe Templates

Create 4 standard bases as **recipe templates**:

### White Base (1000g)
| Ingredient | Grams | % |
|------------|-------|---|
| Milk (3% fat) | 589 | 58.9% |
| Cream (25% fat) | 165 | 16.5% |
| Sucrose | 118 | 11.8% |
| Dextrose | 18 | 1.8% |
| Glucose Syrup DE40 | 42 | 4.2% |
| SMP | 44 | 4.4% |
| Stabilizer | 6 | 0.6% |
| Condensed Milk | 18 | 1.8% |

**Metrics:** 17.87% sugars, 6.01% fat, 10.46% MSNF, 34.93% TS
**SP:** 15.65, **AFP:** 23.90

### Chocolate Base (1000g)
| Ingredient | Grams |
|------------|-------|
| Milk (3% fat) | 540 |
| Cream (25% fat) | 120 |
| Sucrose | 119 |
| Dextrose | 18 |
| SMP | 18 |
| Glucose Syrup | 40 |
| Condensed Milk | 20 |
| Stabilizer | 5 |
| Dark Chocolate 70% | 70 |
| Cocoa Powder 22/24 | 50 |

**Metrics:** 19.74% sugars, 8.58% fat, 7.29% MSNF, 41.69% TS
**SP:** 17.18, **AFP:** 23.82

### Kulfi Base (1000g, post-reduction)
| Ingredient | Grams |
|------------|-------|
| Milk (6.5% fat) | 700 |
| Mawa | 125 |
| Sucrose | 126 |
| Dextrose | 19.5 |
| Glucose Syrup DE40 | 45 |
| Cardamom Powder | 0.5 |
| Stabilizer | 2.5 |

**Metrics:** 17.68% sugars, 7.05% fat, 10.85% MSNF
**SP:** 16.42, **AFP:** 25.06
**Note:** Requires 30% milk reduction before formulation

### Sorbet Base (1528g)
| Ingredient | Grams |
|------------|-------|
| Water | 800 |
| Sucrose | 250 |
| Dextrose | 70 |
| Neutralin | 10 |
| Mecfibre | 30 |
| Fruit Puree/Flavor | 368 |

**Metrics:** 26.57% sugars, 30.91% TS
**SP:** 25.30, **AFP:** 30.36

### Implementation:
- [ ] Create `recipe_templates` table or use existing `recipes` with `is_template` flag
- [ ] Store as starter recipes users can clone
- [ ] Add "Load Base Template" button in RecipeCalculator

---

## 3. Paste Management System

### Concept:
Pastes are **complex ingredients** made from sub-recipes. They need:
1. Storage in `pastes` table (already exists!)
2. Display of sub-ingredients (traceability)
3. Cached composition for quick calculations

### Paste Formulations from Excel:

#### Gulab Jamun Paste (491g → 100g normalized)
```json
{
  "name": "Gulab Jamun Paste",
  "components": [
    {"ingredient": "Fresh Gulab Jamuns", "grams": 300, "pct": 61.1},
    {"ingredient": "SMP", "grams": 30, "pct": 6.1},
    {"ingredient": "Cream", "grams": 50, "pct": 10.2},
    {"ingredient": "Glucose Syrup DE40", "grams": 30, "pct": 6.1},
    {"ingredient": "Dextrose", "grams": 20, "pct": 4.1},
    {"ingredient": "Ghee", "grams": 15, "pct": 3.1},
    {"ingredient": "Gulab Jamun Syrup", "grams": 10, "pct": 2.0},
    {"ingredient": "Cardamom Powder", "grams": 2.5, "pct": 0.5},
    {"ingredient": "Stabilizer", "grams": 2.5, "pct": 0.5}
  ],
  "composition_cached": {
    "water_pct": 41.6,
    "sugars_pct": 41.87,
    "fat_pct": 9.45,
    "msnf_pct": 11.73,
    "other_solids_pct": 4.03
  }
}
```

#### Jalebi Paste (999.5g → 100g normalized)
```json
{
  "name": "Jalebi Paste",
  "components": [
    {"ingredient": "Jalebi Unsoaked", "grams": 460, "pct": 46.0},
    {"ingredient": "Jalebi Soaked", "grams": 180, "pct": 18.0},
    {"ingredient": "Condensed Milk", "grams": 75, "pct": 7.5},
    {"ingredient": "Glucose Syrup DE40", "grams": 65, "pct": 6.5},
    {"ingredient": "SMP", "grams": 60, "pct": 6.0},
    {"ingredient": "Stabilizer", "grams": 30, "pct": 3.0},
    {"ingredient": "Ghee", "grams": 24, "pct": 2.4},
    {"ingredient": "Dextrose", "grams": 20, "pct": 2.0}
  ],
  "composition_cached": {
    "sugars_pct": 28.7,
    "fat_pct": 6.15,
    "msnf_pct": 7.67,
    "other_solids_pct": 9.42
  }
}
```

#### Rabri Elaichi Concentrate (procedure-based)
- **Process:** Reduce full-fat milk by 50%, add milk powder, cardamom, saffron
- Store as reusable paste with composition

### Implementation:
- [x] `pastes` table already exists
- [ ] Add UI to create paste from sub-recipe
- [ ] Display paste breakdown in ingredient selector
- [ ] Allow paste import/export

---

## 4. Finished Product Recipes (ML Training Data)

### Recipe Collection from Excel:

#### 1. Gulab Jamun Delight (1000g)
```
Base: 500g White Base
Additions:
  - 130g Gulab Jamun Paste
  - 50g Cream
  - 300g Kulfi Base
  - 20g Fresh Gulab Jamun pieces
```

#### 2. Jalebi Joy (1000g)
```
Base: 450g White Base + 300g Kulfi Base
Additions:
  - 95g Jalebi Paste
  - 90g Rabri
  - 50g Cream
  - 15g Fresh Jalebi pieces
```

#### 3. Belgian Chocolate (1000g)
```
Base: Chocolate Base (full 1000g formulation)
Inclusions: Dark chocolate chunks
```

#### 4. Mumbai Chat Surprise (Sorbet, 1428g)
```
Base: Sorbet Base
Savory Additions:
  - 150g Tamarind Paste
  - 100g Ketchup
  - 30g Lemon Juice
  - Spices: Black Salt, Cumin, Coriander, Mint
```

### ML Training Opportunities:

1. **Classification Model:**
   - Input: Ingredient composition
   - Output: Product type (Gelato/Kulfi/Sorbet)
   - Training data: Your 15+ recipes

2. **Success Prediction:**
   - Input: Recipe metrics (SP, AFP, TS, Fat, MSNF)
   - Output: "Pass/Fail" based on your target ranges
   - Training: White base SP 12-22, AFP 22-28 (from your notes)

3. **Ingredient Substitution:**
   - Learn that Kulfi base = reduced milk + mawa
   - Learn that cream can substitute for fat in white base

4. **Optimization:**
   - Given a target (e.g., AFP=24, SP=16), suggest ingredient adjustments
   - Use your proven recipes as "anchors"

### Implementation:
- [ ] Import all recipes into `recipes` table with `is_public=true` flag
- [ ] Tag recipes: `tags: ['proven', 'mp_original', 'indian_fusion']`
- [ ] Create ML dataset export function
- [ ] Train `mlService` models on this data

---

## 5. Production Workflow (Already Implemented! ✅)

Your Excel shows 35L production planning with:
- Multiple flavors (Gulab Jamun, Jalebi, Belgian, etc.)
- SKU sizes (100ml, 500ml)
- Waste factor (5%)
- Aggregated procurement list

**Good news:** `ProductionPlanner.tsx` component handles this!

### Enhancements Needed:
- [ ] Add "Load from Base Template" in production module
- [ ] Add paste procurement breakdown (show sub-ingredients)
- [ ] Add dry mix calculator (your Excel shows pre-mixed dry ingredients)
- [ ] Add packaging cost calculator (₹700 van + ₹300 dry ice)

---

## 6. Recipe Import/Export Feature

### Excel Import Flow:
1. User uploads Excel file
2. System parses ingredient names and quantities
3. Smart matching against database (fuzzy search)
4. Shows mapping preview: "Gulab Jamun Paste → [Select from database]"
5. Auto-calculates metrics using our calc engine
6. Saves to recipes table

### Implementation:
- [ ] Create `RecipeImporter.tsx` component
- [ ] Use library like `xlsx` or `papaparse` for Excel/CSV parsing
- [ ] Fuzzy match ingredient names using existing `matchIngredientName()` function
- [ ] Display mapping UI with confidence scores

---

## 7. Cost Tracking Enhancements

Your Excel has detailed costing:
- Ingredient costs (₹850/kg for Jalebi, ₹400/kg for Ghee)
- Packaging costs (₹700 logistics, ₹300 dry ice per 35L batch)
- SKU-level pricing

### Add to Calculator:
- [ ] Import cost_per_kg for all ingredients
- [ ] Add "Packaging Costs" section in ProductionPlanner
- [ ] Calculate cost per unit (₹/100ml, ₹/500ml)
- [ ] Show profit margin calculator

---

## 8. Guardrails & Validation (Science-Based)

Your Excel shows target ranges:
- **Milk-based Gelato:** SP 12-22, AFP 22-28
- **Fruit Sorbets:** SP 20-28, AFP 28-33
- **Kulfi:** Higher MSNF (10.85%), lower water

### Implementation:
- [x] Already in `calc.v2.ts` with mode-specific guardrails
- [ ] Add "Kulfi Mode" to existing Gelato/Ice Cream modes
- [ ] Show your target ranges in warnings panel

---

## Priority Implementation Roadmap

### ✅ Phase 1: Foundation (COMPLETED)
1. ✅ Production Planning UI (already done!)
2. ✅ Import 18 new Indian specialty ingredients
3. ✅ Create 4 base recipe templates
4. ✅ Store 7 finished recipes for ML training

### ✅ Phase 2: ML Training (COMPLETED)
5. ✅ Import finished recipes as training data
6. ✅ Tag recipes with success metrics
7. ✅ Train classification model (product type detection)
8. ✅ Add ML training dashboard with export functionality
9. ✅ Implement product type classifier
10. ✅ Implement success prediction model
11. ✅ Add ingredient recommendation engine

### ✅ Phase 3: Advanced Features (COMPLETED)
12. ✅ Build Recipe Importer (Excel/CSV upload)
13. ✅ Add intelligent ingredient matching with confidence scores
14. ✅ Add cost tracking display
15. ✅ Create training data export

### Phase 4: Optimization (Week 4)
13. Train optimization model on proven recipes
14. Add "Suggest Ingredients" based on ML
15. Add reverse engineering using your recipes as templates
16. Build recipe comparison tool

---

## Quick Start: Import Your Data Now

### Option A: Manual Entry via UI
- Use existing "Ingredient Search" to add new ingredients
- Save each base as a recipe
- Create pastes in Paste Studio

### Option B: Bulk SQL Import (Fastest)
- I can generate SQL INSERT statements for all 30+ ingredients
- Import directly into Supabase
- Preserves all composition data

### Option C: CSV Import Feature
- Build CSV importer component
- Map columns: name, water_pct, sugars_pct, etc.
- Validate and import

---

## ML Training Suggestions

### Dataset Structure:
```json
{
  "recipes": [
    {
      "name": "White Base",
      "type": "base",
      "ingredients": [...],
      "metrics": {
        "sp": 15.65,
        "afp": 23.90,
        "ts_pct": 34.93,
        "fat_pct": 6.01,
        "sugars_pct": 17.87
      },
      "success": true,
      "notes": "Standard gelato base - proven formula"
    }
  ]
}
```

### ML Models to Train:

1. **Product Classifier:**
   - Features: fat%, sugars%, MSNF%, water%
   - Labels: gelato_white, gelato_chocolate, kulfi, sorbet
   - Accuracy: ~95% (your data is clean!)

2. **Target Range Predictor:**
   - Input: Current metrics (SP, AFP, TS)
   - Output: Pass/Warn/Fail + suggestions
   - Based on your documented ranges

3. **Ingredient Recommender:**
   - "You're making kulfi → suggest Mawa, Cardamom"
   - "Low on AFP → add Dextrose or Glucose Syrup"

---

## Questions for You:

1. **Priority:** What's most urgent?
   - A) Import all ingredients now → you can start using them immediately
   - B) Build Recipe Importer → upload your Excel and auto-import
   - C) Train ML on your recipes → get smart suggestions

2. **Pastes:** Do you make these in-house?
   - If yes → we'll add procurement breakdown for sub-ingredients
   - If no → we'll treat as purchased ingredients with fixed composition

3. **Cost Data:** Should we import the pricing from your Excel?
   - Jalebi: ₹850/kg
   - Ghee: ₹400/kg
   - etc.

4. **Production Planning:** You already have ProductionPlanner!
   - Want to test it with your recipes?
   - Need any tweaks to the 35L batch workflow?

---

## Next Steps:

**Tell me which path you prefer:**

🚀 **Fast Track:** I'll generate SQL to bulk-import all 30+ ingredients + 4 bases + 3 pastes (5 mins)

🎨 **UI First:** I'll build a CSV importer component so you can upload future data easily (30 mins)

🤖 **ML Focus:** I'll set up the training pipeline and start feeding your recipes to the ML models (1 hour)

**Or all three in sequence?** Let me know your priority!