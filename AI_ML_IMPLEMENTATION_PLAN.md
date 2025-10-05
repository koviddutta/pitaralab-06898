# MeethaPitara AI/ML Implementation Plan

## Overview
This document outlines the implementation plan for adding AI/ML capabilities to the MeethaPitara calculator, based on the verified gelato science v2.1 and the AI/ML specification v1.

## Current Status ✅

### Implemented (v2.1 Science)
- ✅ Total sugars calculation including lactose from MSNF
- ✅ Protein & lactose calculations (0.36× and 0.545× MSNF)
- ✅ Sucrose Equivalents (SE) calculation
- ✅ Leighton table lookup with clamping warnings
- ✅ FPDT calculation (FPDSE + FPDSA)
- ✅ Glucose syrup DE split handling
- ✅ POD normalization (per 100g total sugars)
- ✅ Gelato and Kulfi mode guardrails
- ✅ Defect prevention flags
- ✅ Troubleshooting suggestions

## Phase 1: Foundation (2-3 weeks)

### 1.1 Data Schema & Logging
**Objective**: Establish data collection infrastructure

**Tables to Create**:
```sql
-- Recipe formulations log
CREATE TABLE formulations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT,
  created_at TIMESTAMP,
  batch_data JSONB, -- Full composition metrics
  paste_data JSONB, -- Paste properties if used
  process_data JSONB, -- Temperature profiles, hold times
  fpdt DECIMAL,
  pod_index DECIMAL,
  novelty_score DECIMAL,
  tags TEXT[]
);

-- Sensory evaluation results
CREATE TABLE sensory_evaluations (
  id UUID PRIMARY KEY,
  formulation_id UUID REFERENCES formulations,
  evaluated_at TIMESTAMP,
  liking_score INTEGER CHECK (liking_score BETWEEN 1 AND 9),
  smoothness INTEGER,
  creaminess INTEGER,
  sweetness INTEGER,
  iciness INTEGER,
  overall_liking INTEGER,
  notes TEXT
);

-- Ingredient embeddings (for complement/substitute logic)
CREATE TABLE ingredient_embeddings (
  id UUID PRIMARY KEY,
  ingredient_name TEXT UNIQUE,
  embedding VECTOR(128), -- Using pgvector extension
  category TEXT,
  co_occurrence_count INTEGER DEFAULT 0
);

-- Pairing relationships
CREATE TABLE ingredient_pairings (
  id UUID PRIMARY KEY,
  ingredient_a TEXT,
  ingredient_b TEXT,
  pmi_score DECIMAL, -- Pointwise Mutual Information
  co_occurrence INTEGER,
  relationship_type TEXT, -- 'complement' or 'substitute'
  UNIQUE(ingredient_a, ingredient_b)
);
```

### 1.2 Novelty Score Calculator
**Objective**: Calculate recipe novelty based on distance from known recipes

**Implementation**:
```typescript
// src/lib/ml/novelty.ts
export interface RecipeVector {
  fatPct: number;
  msnfPct: number;
  totalSugarsPct: number;
  lactosePct: number;
  fpdt: number;
  podIndex: number;
  // ... other normalized features
}

export function calculateNovelty(
  recipeVector: RecipeVector,
  corpus: RecipeVector[]
): number {
  // Calculate cosine distance to nearest neighbor
  const distances = corpus.map(ref => 
    cosineSimilarity(recipeVector, ref)
  );
  const minDistance = Math.min(...distances);
  // Scale to 0-1 range
  return 1 - minDistance;
}
```

**UI Component**:
```typescript
// src/components/ml/NoveltySlider.tsx
export const NoveltySlider = () => {
  const [noveltyLevel, setNoveltyLevel] = useState<'safe' | 'balanced' | 'bold'>('balanced');
  
  return (
    <div className="space-y-4">
      <Label>Recipe Exploration Mode</Label>
      <Slider
        value={[noveltyLevel === 'safe' ? 0 : noveltyLevel === 'balanced' ? 50 : 100]}
        onValueChange={(val) => {
          if (val[0] < 33) setNoveltyLevel('safe');
          else if (val[0] < 67) setNoveltyLevel('balanced');
          else setNoveltyLevel('bold');
        }}
      />
      <div className="flex justify-between text-xs">
        <span>Safe (Traditional)</span>
        <span>Balanced</span>
        <span>Bold (Innovative)</span>
      </div>
    </div>
  );
};
```

### 1.3 Complement & Substitute Recommender
**Objective**: Suggest ingredient pairings based on co-occurrence and embeddings

**Edge Function**:
```typescript
// supabase/functions/ml-suggest/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { batch, ingredientName } = await req.json();
  
  // Query ingredient embeddings and pairings
  const { data: pairings } = await supabase
    .from('ingredient_pairings')
    .select('*')
    .or(`ingredient_a.eq.${ingredientName},ingredient_b.eq.${ingredientName}`)
    .order('pmi_score', { ascending: false })
    .limit(10);
  
  // Separate complements and substitutes
  const complements = pairings.filter(p => p.relationship_type === 'complement');
  const substitutes = pairings.filter(p => p.relationship_type === 'substitute');
  
  return new Response(JSON.stringify({ complements, substitutes }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### 1.4 Safe Mode Generator
**Objective**: Generate recipe candidates within composition guardrails

**Implementation**:
```typescript
// src/lib/ml/generator.ts
export interface GeneratorConstraints {
  mode: 'gelato' | 'kulfi';
  fpdtTarget: [number, number]; // [min, max]
  fatTarget?: [number, number];
  maxCostPer100ml?: number;
  allergenFree?: string[];
  noveltyLevel: 'safe' | 'balanced' | 'bold';
}

export function generateCandidates(
  constraints: GeneratorConstraints,
  count: number = 5
): Array<RecipeCandidate> {
  // Initialize with Dirichlet priors for sugar ratios
  // Apply constraints from v2.1 guardrails
  // Use coordinate descent + stochastic jumps
  // Score = w1*constraintsFit + w2*predictedLiking + w3*noveltyBonus
  // Return top N ranked candidates
}
```

## Phase 2: Predictive Models (4-6 weeks)

### 2.1 Liking Score Predictor
**Objective**: Predict consumer liking (1-9 scale) from recipe composition

**Model Training**:
```python
# ML training script (run separately, not in Lovable)
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import cross_val_score

# Features: composition, FPDT, overrun, POD, novelty, price
X = df[['fatPct', 'msnfPct', 'totalSugarsPct', 'fpdt', 'pod_index', 'novelty', 'price']]
y = df['liking_score']

model = GradientBoostingRegressor(n_estimators=100, max_depth=4)
scores = cross_val_score(model, X, y, cv=5, scoring='r2')
print(f"R² = {scores.mean():.2f} ± {scores.std():.2f}")

# Export model coefficients or use ONNX for deployment
```

**Edge Function**:
```typescript
// supabase/functions/ml-predict-liking/index.ts
serve(async (req) => {
  const { batch } = await req.json();
  
  // Simple linear model for MVP (upgrade to GB later)
  const features = extractFeatures(batch);
  const likingMean = dotProduct(modelWeights, features);
  const ci = calculateConfidenceInterval(likingMean, features);
  
  return new Response(JSON.stringify({ likingMean, ci }));
});
```

### 2.2 Active Learning Planner
**Objective**: Suggest experiments that maximize information gain

**Implementation**:
```typescript
// src/lib/ml/activeLearning.ts
export function planExperiments(
  currentData: Formulation[],
  uncertaintyGrid: RecipeVector[]
): Formulation[] {
  // Calculate prediction uncertainty across grid
  // Select top-5 recipes that maximize expected information gain
  // Balance safe vs bold exploration based on slider
  // Ensure diversity in feature space
  return topExperiments;
}
```

### 2.3 Market-Aware Scoring
**Objective**: Incorporate sales data and regional preferences

**Schema Addition**:
```sql
CREATE TABLE sales_data (
  id UUID PRIMARY KEY,
  formulation_id UUID REFERENCES formulations,
  date DATE,
  units_sold INTEGER,
  repeat_rate DECIMAL,
  returns INTEGER,
  city TEXT,
  channel TEXT, -- 'retail', 'online', 'cafe'
  revenue DECIMAL
);
```

## Phase 3: Advanced Features (Future)

### 3.1 Paste-Specific Predictors
- Water activity (aw) predictor
- Viscosity optimizer for paste formulations
- Shelf-life estimator

### 3.2 Image-Based Analysis (Optional)
- Meltdown rate from photos
- Texture assessment from close-up images
- Color consistency verification

### 3.3 Indian Context Intelligence
- Jaggery vs refined sugar FPDT adjustments
- Buffalo milk vs cow milk fat profile differences
- Traditional spice pairing graphs (saffron-pista, rose-cardamom)
- Regional preference models (North vs South India)

## API Endpoints

### POST /ml/vectorize
Converts batch composition to feature vector
```json
{
  "batch": { "fatPct": 7.5, ... },
  "paste": { "sugarPct": 65, "aw": 0.85, ... }
}
→ { "vector": [0.075, 0.12, ...] }
```

### POST /ml/novelty
Calculates novelty score
```json
{ "vector": [...] }
→ { "score": 0.65, "neighbors": [...] }
```

### POST /ml/suggest
Suggests complements and substitutes
```json
{ "batch": {...}, "ingredient": "saffron" }
→ { 
  "complements": [{ "name": "pistachio", "pmi": 0.85, "reason": "co-occurred in 132 formulas" }],
  "substitutes": [...]
}
```

### POST /ml/predict-liking
Predicts consumer liking
```json
{ "batch": {...} }
→ { "likingMean": 7.2, "ci": [6.8, 7.6] }
```

### POST /ml/generate
Generates recipe candidates
```json
{
  "batch": {...},
  "objectives": { "fpdtTarget": [2.5, 3.5], "maxCost": 150 },
  "noveltyLevel": "balanced"
}
→ { "candidates": [...] }
```

### POST /ml/plan-experiments
Plans active learning experiments
```json
{ "currentData": [...] }
→ { "experiments": [...] }
```

## Data Collection Strategy

### Minimum Viable Data (Week 1-4)
- 50+ formulations with full composition
- 20+ sensory evaluations (internal panel)
- Basic ingredient co-occurrence from existing recipes

### Growth Phase (Month 2-6)
- 200+ formulations across product types
- 100+ sensory evaluations with trained panel
- Sales data integration (if available)
- Regional preference signals

### Continuous Learning
- Weekly model retraining from logged data
- A/B testing of AI suggestions
- User feedback loops (thumbs up/down on suggestions)

## Acceptance Tests

### 1. Novelty Score
- ✅ Identical recipe → novelty ≈ 0
- ✅ Far-away recipe → novelty ≥ 0.7

### 2. Complements/Substitutes
- ✅ Saffron-pistachio appears in top-5 with PMI > 0
- ✅ Rose-cardamom appears in top-5 with PMI > 0

### 3. Ratio Priors
- ✅ Sugar mix initializes near 70/10/20 (sucrose/dextrose/glucose syrup)
- ✅ Adjusts based on constraints

### 4. Liking Model
- ✅ CV R² ≥ 0.55 on internal panel
- ✅ Calibration curve is monotonic

### 5. Generator (Safe Mode)
- ✅ Candidates within 5% L2 distance from seed
- ✅ All candidates satisfy v2.1 guardrails

### 6. Generator (Bold Mode)
- ✅ Candidates ≥ 20% distance from seed
- ✅ Constraints still satisfied

### 7. Active Learning
- ✅ Batch of 5 experiments reduces prediction std ≥ 15%

## Integration with Existing Codebase

### Leverage Existing
- Use `calcMetricsV2()` from `src/lib/calc.v2.ts` for all FPDT calculations
- Integrate with `FlavourEngine` component for AI suggestions
- Use `PasteStudio` component for paste-specific intelligence
- Extend `EnhancedCalculator` with ML insights

### New Components Needed
- `NoveltySlider.tsx` - Control exploration level
- `MLInsights.tsx` - Display AI predictions and suggestions
- `ExperimentPlanner.tsx` - Active learning interface
- `PairingGraph.tsx` - Visual ingredient relationship network

## Guardrails & Safety

### Hard Constraints (Never Violate)
- FPDT windows: Gelato 2.5-3.5°C, Kulfi 2.0-2.5°C
- Total sugars: 16-22% for gelato (hard cap ~24%)
- Lactose ≤ 11% (crystallization risk)
- Protein ≤ ~5% for gelato (chewiness risk)
- Stabilizer: 0.3-0.5%
- Emulsifier: 0.1-0.3%

### Soft Constraints (Warn if Violated)
- Fat: 6-9% for gelato (optimal 7-8%)
- MSNF: 10-12% for gelato
- Total solids: 36-45% for gelato

### Cultural & Dietary
- Allergen flags (nuts, lactose, gluten)
- Halal/vegetarian compatibility
- Regional authenticity tags for Indian sweets

## Roadmap Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| **Phase 1** | 2-3 weeks | Schema, novelty calculator, complement suggester, safe generator, tests |
| **Phase 2** | 4-6 weeks | Liking predictor, active learning, market scoring, bold mode |
| **Phase 3** | Ongoing | Paste predictors, image analysis, expanded Indian context |

## Next Steps

1. **Enable pgvector extension** in Supabase for embeddings
2. **Create database tables** for formulations and evaluations
3. **Seed initial data** from existing recipes
4. **Implement Phase 1.2** (Novelty Score) as proof of concept
5. **User testing** of novelty slider and safe generator
6. **Collect sensory data** to train liking predictor

## References

- Verified Gelato Science Guide v2.1
- MeethaPitara Calculator AI/ML Spec v1
- Datasets and Sources for Ice Creams, Indian Sweets, and Dessert Pastes
- Existing implementation: `src/lib/calc.v2.ts`, `V2.1_IMPLEMENTATION_SUMMARY.md`
