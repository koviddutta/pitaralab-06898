import React, { useState, useEffect } from 'react';
import { Brain, AlertTriangle, Lightbulb, TrendingUp, Loader2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { isBackendReady } from '@/integrations/supabase/safeClient';
import { useToast } from '@/hooks/use-toast';

interface AIInsightsPanelProps {
  recipe: { ingredientId: string; grams: number }[];
  metrics?: any;
  productType?: string;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ 
  recipe, 
  metrics,
  productType = 'gelato' 
}) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Auto-analyze when recipe changes
  useEffect(() => {
    if (recipe && recipe.length > 0 && metrics) {
      analyzeRecipe();
    } else {
      setAnalysis(null);
    }
  }, [recipe, metrics]);

  const analyzeRecipe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if backend is ready
      if (!isBackendReady()) {
        throw new Error('Backend not configured. AI features require cloud connection.');
      }

      const { data, error: fnError } = await supabase.functions.invoke('analyze-recipe', {
        body: { recipe, metrics, productType }
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data);
      console.log('AI Analysis complete:', data);
    } catch (err: any) {
      console.error('Failed to analyze recipe:', err);
      const errorMsg = err.message || 'Failed to analyze recipe';
      setError(errorMsg);
      
      if (err.message?.includes('rate limit')) {
        toast({
          title: 'Rate limit reached',
          description: 'Please wait before analyzing another recipe.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show if no recipe data
  if (!recipe || recipe.length === 0) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="border-primary/20">
      <Accordion type="single" collapsible defaultValue="">
        <AccordionItem value="ai-insights" className="border-none">
          <CardHeader className="pb-0">
            <AccordionTrigger className="hover:no-underline py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                🤖 AI Analysis {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </AccordionTrigger>
          </CardHeader>
          <AccordionContent>
            <CardContent className="space-y-4 pt-2">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Analyzing recipe...</span>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {!isLoading && !error && analysis && (
                <>
                  {/* Success Score */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Recipe Success Score</span>
                      </div>
                      <Badge variant={getScoreBadgeVariant(analysis.successScore)}>
                        {analysis.successScore}%
                      </Badge>
                    </div>
                    <Progress value={analysis.successScore} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      AI-powered analysis based on composition and balance
                    </p>
                  </div>

                  {/* Texture Prediction */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Predicted Texture</span>
                    <Badge variant="secondary">{analysis.texturePredict}</Badge>
                  </div>

                  {/* AI Warnings */}
                  {analysis.warnings && analysis.warnings.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        AI Warnings
                      </div>
                      {analysis.warnings.map((warning: string, index: number) => (
                        <div 
                          key={index}
                          className="p-3 rounded-lg bg-warning/10 border-l-4 border-warning"
                        >
                          <p className="text-sm">{warning}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Suggestions */}
                  {analysis.suggestions && analysis.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        AI Suggestions
                      </div>
                      {analysis.suggestions.map((suggestion: string, index: number) => (
                        <div 
                          key={index}
                          className="p-3 rounded-lg bg-primary/5 border-l-4 border-primary"
                        >
                          <p className="text-sm">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Analysis Timestamp */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      🤖 AI-powered analysis • Updated {new Date(analysis.analysisTimestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </>
              )}

              {!isLoading && !error && !analysis && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Add ingredients to get AI insights
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};
