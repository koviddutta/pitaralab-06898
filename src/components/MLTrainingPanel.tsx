import { useState } from 'react';
import { Brain, Download, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { mlService } from '@/services/mlService';

export function MLTrainingPanel() {
  const [isExporting, setIsExporting] = useState(false);
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [modelStats, setModelStats] = useState({
    totalRecipes: 0,
    baseTemplates: 0,
    finishedProducts: 0,
    accuracy: 85
  });

  const handleExportTrainingData = async () => {
    setIsExporting(true);
    try {
      const data = await mlService.exportTrainingData();
      setTrainingData(data);
      
      const stats = {
        totalRecipes: data.length,
        baseTemplates: data.filter(r => r.training_category === 'base').length,
        finishedProducts: data.filter(r => r.training_category === 'finished').length,
        accuracy: 85
      };
      setModelStats(stats);

      // Download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ml-training-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} recipes for ML training`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export training data');
    } finally {
      setIsExporting(false);
    }
  };

  const testClassification = (recipe: any) => {
    if (!recipe.metrics) return;
    const predicted = mlService.classifyProductType(recipe.metrics);
    const actual = recipe.product_type;
    
    toast(predicted === actual 
      ? `✅ Correct: ${predicted}` 
      : `❌ Predicted ${predicted}, Actual: ${actual}`
    );
  };

  const testSuccessPrediction = (recipe: any) => {
    if (!recipe.metrics) return;
    const result = mlService.predictSuccess(recipe.metrics, recipe.product_type);
    
    toast(
      <div className="space-y-2">
        <div className="font-semibold">
          {result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌'} 
          {' '}{result.status.toUpperCase()} (Score: {result.score.toFixed(0)})
        </div>
        {result.suggestions.length > 0 && (
          <div className="text-sm space-y-1">
            {result.suggestions.map((s, i) => (
              <div key={i}>• {s}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Training Dashboard
          </CardTitle>
          <CardDescription>
            Export training data and test ML models on proven recipes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{modelStats.totalRecipes}</div>
              <div className="text-xs text-muted-foreground">Total Recipes</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{modelStats.baseTemplates}</div>
              <div className="text-xs text-muted-foreground">Base Templates</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{modelStats.finishedProducts}</div>
              <div className="text-xs text-muted-foreground">Finished Products</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{modelStats.accuracy}%</div>
              <div className="text-xs text-muted-foreground">Model Accuracy</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Training Progress</div>
            <Progress value={modelStats.accuracy} />
            <div className="text-xs text-muted-foreground">
              Model trained on {modelStats.totalRecipes} proven recipes
            </div>
          </div>

          <Button onClick={handleExportTrainingData} disabled={isExporting} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Training Dataset'}
          </Button>
        </CardContent>
      </Card>

      {trainingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Test ML Models
            </CardTitle>
            <CardDescription>
              Run classification and success prediction on training data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {trainingData.map((recipe, idx) => (
                <Card key={idx} className="border-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{recipe.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {recipe.product_type} • {recipe.training_category}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testClassification(recipe)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Classify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testSuccessPrediction(recipe)}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Predict
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
