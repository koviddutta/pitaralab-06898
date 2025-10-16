import React from 'react';
import { Brain, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AIInsightsPanelProps {
  recipe: { ingredientId: string; grams: number }[];
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ recipe }) => {
  // Mock data for now (no backend integration yet)
  const mockData = {
    successScore: 85,
    texturePredict: "Creamy",
    warnings: ["FPDT slightly low"],
    suggestions: ["Add 5g dextrose for softer texture"]
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
                🤖 AI Insights (Beta)
              </CardTitle>
            </AccordionTrigger>
          </CardHeader>
          <AccordionContent>
            <CardContent className="space-y-4 pt-2">
              {/* Success Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Recipe Success Score</span>
                  </div>
                  <Badge variant={getScoreBadgeVariant(mockData.successScore)}>
                    {mockData.successScore}%
                  </Badge>
                </div>
                <Progress value={mockData.successScore} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Based on ingredient balance and historical data
                </p>
              </div>

              {/* Texture Prediction */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Predicted Texture</span>
                <Badge variant="secondary">{mockData.texturePredict}</Badge>
              </div>

              {/* AI Warnings */}
              {mockData.warnings.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    AI Warnings
                  </div>
                  {mockData.warnings.map((warning, index) => (
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
              {mockData.suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    AI Suggestions
                  </div>
                  {mockData.suggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className="p-3 rounded-lg bg-primary/5 border-l-4 border-primary"
                    >
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Beta Notice */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  🧪 AI features are in beta. Predictions are experimental and should be verified.
                </p>
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};
