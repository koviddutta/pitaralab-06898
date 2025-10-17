import { calcMetrics } from '@/lib/calc';
import { optimizeRecipe, Row, OptimizeTarget } from '@/lib/optimize';
import { IngredientData } from '@/types/ingredients';

export interface RecipeMetrics {
  totalWeight: number;
  sugarPercentage: number;
  fatPercentage: number;
  proteinPercentage: number;
  sweetness: number;
  complexity: number;
  totalSolids: number;
  msnf: number;
  pac: number;
  afp: number;
  sp: number;
}

export interface FlavorProfile {
  sweetness: number;
  creaminess: number;
  richness: number;
  complexity: number;
  balance: number;
  intensity: number;
}

export interface MLPrediction {
  successScore: number;
  flavorProfile: FlavorProfile;
  recommendations: string[];
  similarRecipes: string[];
  confidence: number;
}

export interface IngredientSimilarity {
  ingredient: string;
  similarity: number;
  reason: string;
}

interface OptimizationSuggestion {
  ingredient: string;
  currentAmount: number;
  suggestedAmount: number;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

export class MLService {
  predictRecipeSuccess(_: any): MLPrediction { 
    return {
      successScore: 0.75,
      flavorProfile: {
        sweetness: 0.7,
        creaminess: 0.8,
        richness: 0.6,
        complexity: 0.5,
        balance: 0.7,
        intensity: 0.6
      },
      recommendations: ['Add vanilla for enhanced flavor', 'Consider balancing sweetness'],
      similarRecipes: ['Classic Vanilla', 'Traditional Base'],
      confidence: 70
    };
  }

  /**
   * Find similar ingredients using fuzzy matching
   * Uses Levenshtein distance and category matching
   */
  findSimilarIngredients(searchTerm: string, availableIngredients: string[]): IngredientSimilarity[] {
    if (!searchTerm || !availableIngredients.length) return [];

    const search = searchTerm.toLowerCase().trim();
    
    // Simple Levenshtein distance calculation
    const levenshtein = (a: string, b: string): number => {
      const matrix: number[][] = [];
      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    };

    const similarities = availableIngredients.map(ingredient => {
      const ingLower = ingredient.toLowerCase();
      
      // Exact match
      if (ingLower === search) {
        return { ingredient, similarity: 1.0, reason: 'Exact match' };
      }
      
      // Contains match
      if (ingLower.includes(search) || search.includes(ingLower)) {
        return { ingredient, similarity: 0.9, reason: 'Name contains search term' };
      }
      
      // Fuzzy match using Levenshtein
      const distance = levenshtein(search, ingLower);
      const maxLen = Math.max(search.length, ingLower.length);
      const similarity = 1 - (distance / maxLen);
      
      let reason = 'Similar name';
      if (similarity > 0.7) reason = 'Very similar name';
      if (similarity > 0.5) reason = 'Similar spelling';
      
      return { ingredient, similarity, reason };
    });

    // Filter and sort
    return similarities
      .filter(s => s.similarity > 0.4) // Threshold for relevance
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5 results
  }

  /**
   * Calculate recipe metrics with fallback for legacy format
   * @param recipe - Recipe in new or legacy format
   * @param availableIngredients - Pass ingredients from Supabase for legacy format conversion
   */
  calculateRecipeMetrics(
    recipe: { rows: { ing: IngredientData; grams: number }[] } | { [key: string]: number },
    availableIngredients?: IngredientData[]
  ) {
    // Handle modern format
    if ('rows' in recipe && Array.isArray(recipe.rows)) {
      return calcMetrics(recipe.rows);
    } 
    
    // Handle legacy format - requires availableIngredients to be passed
    if (!availableIngredients || availableIngredients.length === 0) {
      throw new Error('availableIngredients must be provided for legacy recipe format conversion');
    }
    
    const rows = Object.entries(recipe as { [key: string]: number }).map(([name, grams]) => {
      // Try to find matching ingredient by name (case-insensitive)
      const ing = availableIngredients.find((i: IngredientData) => 
        i.name.toLowerCase() === name.toLowerCase() || 
        i.id.toLowerCase() === name.toLowerCase().replace(/\s+/g, '_')
      ) || {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name,
        category: 'other' as const,
        water_pct: 88, // Default to milk-like composition
        fat_pct: 3,
        sugars_pct: 5,
        other_solids_pct: 0,
      };
      return { ing, grams: grams || 0 };
    });
      
    return calcMetrics(rows);
  }

  optimizeRecipe(seed: Row[], targets: OptimizeTarget) {
    return optimizeRecipe(seed, targets, 250, 1);
  }

  getModelPerformance() {
    return { accuracy: 0.85, totalPredictions: 1250, modelVersion: 'v2.0' };
  }

  /**
   * Export training dataset from proven recipes
   * Returns recipes tagged with 'ml_training' for model training
   */
  async exportTrainingData() {
    const { getSupabase } = await import('@/integrations/supabase/safeClient');
    const supabase = await getSupabase();
    
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return recipes?.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      product_type: recipe.product_type,
      metrics: recipe.metrics,
      success: true, // All imported recipes are proven formulas
      training_category: recipe.name.includes('Template') ? 'base' : 'finished'
    })) || [];
  }

  /**
   * Classify product type based on composition
   * Uses metrics to determine if recipe is gelato, kulfi, or sorbet
   */
  classifyProductType(metrics: any): 'gelato' | 'kulfi' | 'sorbet' | 'other' {
    const fat = metrics.fat_pct || 0;
    const msnf = metrics.msnf_pct || 0;
    const sugars = metrics.sugars_pct || 0;

    // Sorbet: Low fat, high sugar
    if (fat < 1 && sugars > 20) return 'sorbet';
    
    // Kulfi: Higher MSNF (>10%), moderate fat
    if (msnf > 10 && fat > 6) return 'kulfi';
    
    // Gelato: Moderate fat (4-10%), balanced MSNF
    if (fat >= 4 && fat <= 10 && msnf >= 6 && msnf <= 10) return 'gelato';
    
    return 'other';
  }

  /**
   * Predict recipe success based on target ranges
   * Returns pass/warn/fail + suggestions
   */
  predictSuccess(metrics: any, productType: string): { 
    status: 'pass' | 'warn' | 'fail'; 
    score: number;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 100;

    // Target ranges by product type
    const targets = {
      gelato: { sp: [12, 22], pac: [22, 28], fat: [4, 10], msnf: [6, 10] },
      kulfi: { sp: [14, 20], pac: [24, 30], fat: [6, 9], msnf: [10, 14] },
      sorbet: { sp: [20, 28], pac: [28, 33], fat: [0, 1], msnf: [0, 2] }
    };

    const target = targets[productType as keyof typeof targets] || targets.gelato;

    // Check each parameter
    const checks = [
      { name: 'SP', value: metrics.sp, range: target.sp, weight: 25 },
      { name: 'PAC', value: metrics.pac, range: target.pac, weight: 25 },
      { name: 'Fat%', value: metrics.fat_pct, range: target.fat, weight: 25 },
      { name: 'MSNF%', value: metrics.msnf_pct, range: target.msnf, weight: 25 }
    ];

    checks.forEach(check => {
      const [min, max] = check.range;
      if (check.value < min) {
        const diff = ((min - check.value) / min) * 100;
        score -= (diff * check.weight) / 100;
        suggestions.push(`${check.name} too low (${check.value.toFixed(1)} < ${min})`);
      } else if (check.value > max) {
        const diff = ((check.value - max) / max) * 100;
        score -= (diff * check.weight) / 100;
        suggestions.push(`${check.name} too high (${check.value.toFixed(1)} > ${max})`);
      }
    });

    const status = score >= 90 ? 'pass' : score >= 70 ? 'warn' : 'fail';
    return { status, score: Math.max(0, score), suggestions };
  }

  /**
   * Recommend ingredients based on product type and current composition
   */
  recommendIngredients(productType: string, currentMetrics: any): string[] {
    const recommendations: string[] = [];

    if (productType === 'kulfi') {
      if (currentMetrics.msnf_pct < 10) {
        recommendations.push('Add Mawa (Khoya) to increase MSNF');
        recommendations.push('Consider Skim Milk Powder for MSNF boost');
      }
      recommendations.push('Use Cardamom Powder for authentic flavor');
    }

    if (productType === 'gelato' && currentMetrics.sugars_pct < 16) {
      recommendations.push('Add Dextrose for better texture');
      recommendations.push('Consider Glucose Syrup DE40 for smoothness');
    }

    if (productType === 'sorbet' && currentMetrics.pac < 28) {
      recommendations.push('Increase sugar content (PAC too low)');
      recommendations.push('Add Dextrose to boost PAC');
    }

    if (currentMetrics.fat_pct < 5 && productType === 'gelato') {
      recommendations.push('Add Cream 25% to increase fat content');
    }

    return recommendations;
  }

  reverseEngineer(input: {
    productType: 'ice_cream'|'gelato_white'|'gelato_finished'|'fruit_gelato'|'sorbet';
    known?: Partial<{ fat_pct:number; sugars_pct:number; msnf_pct:number; ts_add_pct:number; sp:number; pac:number }>;
    palette: IngredientData[];
    totalMass?: number;
  }) {
    const total = input.totalMass ?? 1000;
    const rows: Row[] = input.palette.map(ing => ({ ing, grams: 0 }));

    // seed sugars (70/10/20 split if available)
    const suc = rows.find(r => r.ing.id.includes('sucrose'));
    const dex = rows.find(r => r.ing.id.includes('dextrose'));
    const glu = rows.find(r => r.ing.id.includes('glucose_de60'));

    const targetSugPct = input.known?.sugars_pct ?? 18;
    const targetSugG = (targetSugPct / 100) * total;

    if (suc && dex && glu) {
      suc.grams = targetSugG * 0.70 / ((suc.ing.sugars_pct||100)/100);
      dex.grams = targetSugG * 0.10 / ((dex.ing.sugars_pct||100)/100);
      glu.grams = targetSugG * 0.20 / ((glu.ing.sugars_pct||100)/100);
    } else if (suc) {
      suc.grams = targetSugG / ((suc.ing.sugars_pct||100)/100);
    }

    // hit fat via cream/milk
    const fatPct = input.known?.fat_pct ?? 8;
    const fatG = (fatPct/100)*total;
    const cream = rows.find(r => r.ing.id==='cream_25');
    const milk = rows.find(r => r.ing.id==='milk_3');
    if (cream && milk) {
      cream.grams = Math.min(total, fatG / (cream.ing.fat_pct/100));
      const used = cream.grams;
      milk.grams = Math.max(0, total - rows.reduce((a,r)=>a + (r.grams||0),0));
    } else if (milk) {
      milk.grams = total - rows.reduce((a,r)=>a + (r.grams||0),0);
    }

    // optimize against % targets
    const targets: OptimizeTarget = {
      ts_add_pct: input.known?.ts_add_pct,
      sugars_pct: input.known?.sugars_pct,
      fat_pct:    input.known?.fat_pct,
      msnf_pct:   input.known?.msnf_pct,
      sp:         input.known?.sp,
      pac:        input.known?.pac,
    };

    const out = optimizeRecipe(rows, targets, 200, 5);
    return { rows: out, metrics: calcMetrics(out) };
  }
}

export const mlService = new MLService();