import { useState } from 'react';
import { Brain, Lightbulb, TrendingUp, AlertTriangle, Loader2, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAIUsageLimit } from '@/hooks/useAIUsageLimit';
import { useQuery } from '@tanstack/react-query';

type RecipeRow = {
  ingredient: string;
  quantity_g: number;
};

type Recipe = {
  recipe_name: string;
  product_type: string;
  rows: RecipeRow[];
};

type Metrics = {
  sugars_pct?: number;
  fat_pct?: number;
  msnf_pct?: number;
  total_solids_pct?: number;
  sp?: number;
  pac?: number;
  fpdt?: number;
};

type AIAnalysis = {
  balance_assessment: string;
  optimization_suggestions: string[];
  texture_prediction: string;
  risk_warnings: string[];
  recommended_adjustments: string[];
};

type SmartInsightsPanelProps = {
  recipe?: Recipe | any[];
  metrics?: Metrics;
  productType?: string;
};

export function SmartInsightsPanel({ recipe, metrics, productType }: SmartInsightsPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const { remaining, refetch } = useAIUsageLimit();

  // Fetch user's recipes from database
  const { data: savedRecipes } = useQuery({
    queryKey: ['user-recipes'],
    queryFn: async () => {
      const { data: recipes } = await supabase
        .from('recipes')
        .select(`
          id,
          recipe_name,
          product_type,
          recipe_rows (
            ingredient,
            quantity_g,
            sugars_g,
            fat_g,
            msnf_g,
            other_solids_g,
            total_solids_g
          ),
          calculated_metrics (
            sugars_pct,
            fat_pct,
            msnf_pct,
            total_solids_pct,
            sp,
            pac,
            fpdt
          )
        `)
        .order('created_at', { ascending: false });
      
      return recipes || [];
    }
  });

  const handleAIAnalysis = async (sourceRecipe?: Recipe | any, sourceMetrics?: Metrics) => {
    if (remaining <= 0) {
      toast.error('AI usage limit reached. Please wait before making more requests.');
      return;
    }

    const recipeToAnalyze = sourceRecipe || recipe;
    const metricsToAnalyze = sourceMetrics || metrics;

    // Handle both Recipe type and array type
    const hasRows = Array.isArray(recipeToAnalyze) 
      ? recipeToAnalyze.length > 0 
      : recipeToAnalyze?.rows && recipeToAnalyze.rows.length > 0;

    if (!hasRows) {
      toast.error('No recipe data to analyze');
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-recipe', {
        body: {
          recipe: recipeToAnalyze,
          metrics: metricsToAnalyze,
          productType: productType || recipeToAnalyze.product_type || 'ice_cream'
        }
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      toast.success('AI analysis complete!');
      refetch(); // Update usage count
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to analyze recipe');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadRecipe = async () => {
    if (!selectedRecipeId || !savedRecipes) return;

    const selected = savedRecipes.find(r => r.id === selectedRecipeId);
    if (!selected) return;

    const recipeData: Recipe = {
      recipe_name: selected.recipe_name,
      product_type: selected.product_type,
      rows: (selected.recipe_rows as any[] || []).map((r: any) => ({
        ingredient: r.ingredient,
        quantity_g: r.quantity_g
      }))
    };

    const metricsData: Metrics = (selected.calculated_metrics as any)?.[0] || {};

    await handleAIAnalysis(recipeData, metricsData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Recipe Insights
        </CardTitle>
        <CardDescription>
          Get intelligent recommendations and analysis powered by AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipe selection from database */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Load Recipe from Database</label>
          <div className="flex gap-2">
            <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a saved recipe" />
              </SelectTrigger>
              <SelectContent>
                {savedRecipes?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.recipe_name} ({r.product_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleLoadRecipe} 
              disabled={!selectedRecipeId || isAnalyzing}
              variant="outline"
            >
              <Database className="h-4 w-4 mr-2" />
              Analyze
            </Button>
          </div>
        </div>

        {/* Analyze current calculator recipe */}
        {recipe && (Array.isArray(recipe) ? recipe.length > 0 : recipe.rows && recipe.rows.length > 0) && (
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>Current recipe: {Array.isArray(recipe) ? 'From Calculator' : (recipe.recipe_name || 'Untitled')}</span>
              <Button 
                onClick={() => handleAIAnalysis()} 
                disabled={isAnalyzing}
                size="sm"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Current Recipe
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isAnalyzing && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {analysis && !isAnalyzing && (
          <div className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Balance Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{analysis.balance_assessment}</p>
              </CardContent>
            </Card>

            {analysis.texture_prediction && (
              <Card className="border-blue-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-500" />
                    Texture Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{analysis.texture_prediction}</p>
                </CardContent>
              </Card>
            )}

            {analysis.optimization_suggestions && analysis.optimization_suggestions.length > 0 && (
              <Card className="border-green-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-green-500" />
                    Optimization Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.optimization_suggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">
                        {idx + 1}
                      </Badge>
                      <p className="text-sm flex-1">{suggestion}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {analysis.risk_warnings && analysis.risk_warnings.length > 0 && (
              <Card className="border-orange-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Risk Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.risk_warnings.map((warning, idx) => (
                    <Alert key={idx} variant="destructive">
                      <AlertDescription>{warning}</AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            )}

            {analysis.recommended_adjustments && analysis.recommended_adjustments.length > 0 && (
              <Card className="border-purple-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    Recommended Adjustments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.recommended_adjustments.map((adjustment, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">
                        {idx + 1}
                      </Badge>
                      <p className="text-sm flex-1">{adjustment}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!analysis && !isAnalyzing && (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              Select a recipe from your database or use the calculator to create a recipe, then click "Analyze" to get AI-powered insights.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
