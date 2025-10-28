import { useState } from 'react';
import { Brain, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Zap, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMLPredictions } from '@/hooks/useMLPredictions';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { RecipeInputDialog } from './RecipeInputDialog';

interface SmartInsightsPanelProps {
  recipe?: any[];
  metrics?: any;
  productType?: string;
  onRecipeChange?: (recipe: any[], productType: string) => void;
}

export function SmartInsightsPanel({ recipe = [], metrics, productType = 'ice_cream', onRecipeChange }: SmartInsightsPanelProps) {
  const [mode, setMode] = useState<'ml' | 'ai'>('ml');
  const [localRecipe, setLocalRecipe] = useState(recipe);
  const [localProductType, setLocalProductType] = useState(productType);
  
  const { prediction, isLoading: mlLoading } = useMLPredictions(metrics, localProductType);
  const { analysis, isLoading: aiLoading, analyze } = useAIAnalysis();

  const handleRecipeInput = (newRecipe: any[], newProductType: string) => {
    setLocalRecipe(newRecipe);
    setLocalProductType(newProductType);
    if (onRecipeChange) {
      onRecipeChange(newRecipe, newProductType);
    }
  };

  const handleAIAnalysis = () => {
    setMode('ai');
    analyze(localRecipe, metrics, localProductType);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warn': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'fail': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Zap className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-500';
      case 'warn': return 'bg-yellow-500';
      case 'fail': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Smart Recipe Insights</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <RecipeInputDialog onRecipeSubmit={handleRecipeInput} />
            <Badge variant="outline" className="gap-1">
              {mode === 'ml' ? (
                <>
                  <TrendingUp className="h-3 w-3" />
                  ML Prediction
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  AI Analysis
                </>
              )}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Real-time predictions powered by machine learning and AI
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'ml' | 'ai')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ml" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              ML (Instant)
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI (Deep)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ml" className="space-y-4 mt-4">
            {mlLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Analyzing recipe...</p>
              </div>
            ) : prediction ? (
              <>
                {/* Success Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(prediction.status)}
                      <span className="font-semibold">Success Score</span>
                    </div>
                    <span className="text-2xl font-bold">{prediction.score}</span>
                  </div>
                  <Progress value={prediction.score} className={getStatusColor(prediction.status)} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Confidence: {Math.round(prediction.confidence * 100)}%</span>
                    <span>{prediction.status.toUpperCase()}</span>
                  </div>
                </div>

                {/* Suggestions */}
                {prediction.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Lightbulb className="h-4 w-4" />
                      Suggestions
                    </div>
                    <ul className="space-y-1">
                      {prediction.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button 
                  onClick={handleAIAnalysis} 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Get AI Deep Analysis
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Add ingredients to see ML predictions</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            {aiLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">AI analyzing...</p>
              </div>
            ) : analysis ? (
              <>
                {/* Success Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="font-semibold">AI Score</span>
                    </div>
                    <span className="text-2xl font-bold">{analysis.successScore}</span>
                  </div>
                  <Progress value={analysis.successScore} />
                  <div className="text-xs text-muted-foreground">
                    Predicted Texture: <span className="font-semibold">{analysis.texturePredict}</span>
                  </div>
                </div>

                {/* Warnings */}
                {analysis.warnings.length > 0 && (
                  <div className="space-y-2 bg-destructive/10 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Warnings
                    </div>
                    <ul className="space-y-1">
                      {analysis.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-destructive/80 flex items-start gap-2">
                          <span>•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {analysis.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Lightbulb className="h-4 w-4" />
                      AI Suggestions
                    </div>
                    <ul className="space-y-1">
                      {analysis.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <Sparkles className="h-12 w-12 mx-auto text-primary opacity-50" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Get deep AI analysis of your recipe
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uses advanced AI to predict texture, identify issues, and suggest improvements
                  </p>
                </div>
                <Button 
                  onClick={handleAIAnalysis}
                  disabled={!recipe || recipe.length === 0}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Analyze with AI
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
