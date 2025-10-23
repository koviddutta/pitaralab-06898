import { useState } from 'react';
import { Brain, Download, Upload, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { mlService } from '@/services/mlService';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

export function MLTrainingPanel() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [modelStats, setModelStats] = useState({
    totalRecipes: 0,
    baseTemplates: 0,
    finishedProducts: 0,
    accuracy: 0,
    version: 'untrained',
    lastTrained: null as string | null,
  });

  const loadDataFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('recipe_outcomes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTrainingData(data || []);
      
      const stats = {
        totalRecipes: data?.length || 0,
        baseTemplates: data?.filter(r => r.outcome === 'success').length || 0,
        finishedProducts: data?.filter(r => r.outcome === 'needs_improvement').length || 0,
        accuracy: modelStats.accuracy,
        version: modelStats.version,
        lastTrained: modelStats.lastTrained,
      };
      setModelStats(stats);

      toast.success(`Loaded ${data?.length || 0} recipes from database`);
    } catch (error: any) {
      console.error('Load error:', error);
      toast.error('Failed to load training data from database');
    }
  };

  const handleExportTrainingData = async () => {
    setIsExporting(true);
    try {
      const data = await mlService.exportTrainingData();
      
      const stats = {
        totalRecipes: data.length,
        baseTemplates: data.filter(r => r.training_category === 'base').length,
        finishedProducts: data.filter(r => r.training_category === 'finished').length,
        accuracy: modelStats.accuracy,
        version: modelStats.version,
        lastTrained: modelStats.lastTrained,
      };
      setModelStats(stats);

      // Download as CSV for better compatibility
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ml-training-data-${Date.now()}.csv`;
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

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();

      if (fileExt === 'json') {
        // Parse JSON
        const text = await file.text();
        const data = JSON.parse(text);
        await importToDatabase(Array.isArray(data) ? data : [data]);
      } else if (fileExt === 'csv') {
        // Parse CSV
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            await importToDatabase(results.data);
          },
          error: (error) => {
            console.error('CSV parse error:', error);
            toast.error('Failed to parse CSV file');
            setIsImporting(false);
          }
        });
      } else {
        toast.error('Unsupported file format. Please use JSON or CSV files.');
        setIsImporting(false);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Failed to import file: ${error.message}`);
      setIsImporting(false);
    }
  };

  const importToDatabase = async (data: any[]) => {
    try {
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to import data');
        setIsImporting(false);
        return;
      }

      // Transform data to match recipe_outcomes schema
      const outcomes = data.map(item => ({
        user_id: user.id,
        recipe_id: item.recipe_id || null,
        outcome: item.outcome || 'success',
        metrics: item.metrics || {},
        actual_texture: item.actual_texture || null,
        notes: item.notes || null
      }));

      const { error } = await supabase
        .from('recipe_outcomes')
        .insert(outcomes);

      if (error) throw error;

      toast.success(`Imported ${outcomes.length} recipes to database!`);
      await loadDataFromDatabase();
    } catch (error: any) {
      console.error('Database import error:', error);
      toast.error(`Failed to save to database: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    try {
      const weights = await mlService.trainModel();
      
      setModelStats({
        ...modelStats,
        accuracy: Math.round(weights.accuracy * 100),
        version: weights.version,
        lastTrained: weights.trained_at,
      });

      toast.success('Model trained successfully!', {
        description: `Accuracy: ${Math.round(weights.accuracy * 100)}%`,
      });
    } catch (error: any) {
      console.error('Training error:', error);
      toast.error('Failed to train model', {
        description: error.message,
      });
    } finally {
      setIsTraining(false);
    }
  };

  const testClassification = (recipe: any) => {
    if (!recipe.metrics) return;
    const predicted = mlService.classifyProductType(recipe.metrics);
    const actual = recipe.product_type || 'unknown';
    
    toast(predicted === actual 
      ? `✅ Correct: ${predicted}` 
      : `❌ Predicted ${predicted}, Actual: ${actual}`
    );
  };

  const testSuccessPrediction = (recipe: any) => {
    if (!recipe.metrics) return;
    const result = mlService.predictSuccess(recipe.metrics, recipe.product_type || 'gelato');
    
    toast(
      <div className="space-y-2">
        <div className="font-semibold">
          {result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌'} 
          {' '}{result.status.toUpperCase()} (Score: {result.score}, Confidence: {(result.confidence || 0) * 100}%)
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

  const loadModelStats = async () => {
    const model = mlService.loadModel();
    
    if (model) {
      setModelStats({
        totalRecipes: trainingData.length || 0,
        baseTemplates: 0,
        finishedProducts: 0,
        accuracy: Math.round((model.accuracy || 0) * 100),
        version: model.version,
        lastTrained: model.trained_at,
      });
    }

    // Load from database
    await loadDataFromDatabase();
  };

  useState(() => {
    loadModelStats();
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Training Dashboard
          </CardTitle>
          <CardDescription>
            Train models on real recipe data. Import CSV/JSON files or export training data.
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
              <div className="text-xs text-muted-foreground">Successful</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{modelStats.finishedProducts}</div>
              <div className="text-xs text-muted-foreground">Needs Work</div>
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
              {modelStats.version === 'untrained' 
                ? 'No model trained yet' 
                : `Model v${modelStats.version} trained on ${new Date(modelStats.lastTrained || '').toLocaleString()}`
              }
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-file">Import Training Data (CSV/JSON)</Label>
            <div className="flex gap-2">
              <Input
                id="import-file"
                type="file"
                accept=".csv,.json"
                onChange={handleImportFile}
                disabled={isImporting}
                className="flex-1"
              />
              <Button 
                onClick={handleExportTrainingData} 
                disabled={isExporting}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
            {isImporting && (
              <div className="text-sm text-muted-foreground">Importing to database...</div>
            )}
          </div>

          <Button 
            onClick={handleTrainModel} 
            disabled={isTraining || trainingData.length === 0}
            className="w-full"
          >
            <Brain className="h-4 w-4 mr-2" />
            {isTraining ? 'Training...' : 'Train Model'}
          </Button>
        </CardContent>
      </Card>

      {trainingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Test ML Predictions ({trainingData.length} recipes)
            </CardTitle>
            <CardDescription>
              Run classification and success prediction on training data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {trainingData.slice(0, 20).map((recipe, idx) => (
                <Card key={idx} className="border-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">Recipe {recipe.recipe_id || idx + 1}</div>
                        <div className="text-sm text-muted-foreground">
                          {recipe.outcome}
                          {recipe.actual_texture && ` • ${recipe.actual_texture}`}
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
