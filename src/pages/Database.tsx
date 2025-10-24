import { useState } from 'react';
import { Upload, Database as DatabaseIcon, Brain, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mlService } from '@/services/mlService';
import Papa from 'papaparse';
import { z } from 'zod';

// Validation schemas
const ImportRowSchema = z.object({
  'Recipe Name': z.string().min(1).max(200),
  'Ingredient': z.string().min(1).max(200),
  'Grams': z.number().positive().max(100000)
});

export default function Database() {
  const { toast } = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Fetch database stats
  const { data: stats } = useQuery({
    queryKey: ['database-stats'],
    queryFn: async () => {
      const [recipesRes, outcomesRes, ingredientsRes] = await Promise.all([
        supabase.from('recipes').select('id', { count: 'exact', head: true }),
        supabase.from('recipe_outcomes').select('id,outcome', { count: 'exact' }),
        supabase.from('ingredients').select('id', { count: 'exact', head: true })
      ]);

      const successfulOutcomes = outcomesRes.data?.filter(o => o.outcome === 'success').length || 0;

      return {
        totalRecipes: recipesRes.count || 0,
        totalOutcomes: outcomesRes.count || 0,
        successfulOutcomes,
        totalIngredients: ingredientsRes.count || 0,
        mlReady: successfulOutcomes >= 5
      };
    },
    refetchInterval: 5000
  });

  // Fetch recent recipes
  const { data: recentRecipes } = useQuery({
    queryKey: ['recent-recipes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('recipes')
        .select('id, name, product_type, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    }
  });

  const handleImportCSV = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Parse CSV
      Papa.parse(importFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const { data: ingredients } = await supabase.from('ingredients').select('*');
            if (!ingredients) throw new Error('Failed to load ingredients');

            const ingredientMap = new Map(ingredients.map(i => [i.name.toLowerCase(), i]));
            const recipes = new Map<string, Array<{ ingredientId: string; grams: number }>>();

            // Validate and group by recipe
            for (const row of results.data as any[]) {
              try {
                const validated = ImportRowSchema.parse({
                  'Recipe Name': row['Recipe Name'] || row['recipe_name'],
                  'Ingredient': row['Ingredient'] || row['ingredient'] || row['ingredient_name'],
                  'Grams': parseFloat(row['Grams'] || row['grams'] || '0')
                });

                const ingredientName = validated.Ingredient.toLowerCase().trim();
                const ingredient = ingredientMap.get(ingredientName) || 
                  [...ingredientMap.values()].find(i => i.name.toLowerCase().includes(ingredientName));

                if (!ingredient) {
                  console.warn(`Ingredient not found: ${validated.Ingredient}`);
                  continue;
                }

                if (!recipes.has(validated['Recipe Name'])) {
                  recipes.set(validated['Recipe Name'], []);
                }

                recipes.get(validated['Recipe Name'])!.push({
                  ingredientId: ingredient.id,
                  grams: validated.Grams
                });
              } catch (validationError) {
                console.warn('Invalid row:', row, validationError);
              }
            }

            // Import recipes
            let imported = 0;
            const total = recipes.size;

            for (const [name, rows] of recipes.entries()) {
              if (rows.length === 0) continue;

              // Save recipe
              const { data: recipe, error: recipeError } = await supabase
                .from('recipes')
                .insert({
                  name,
                  rows_json: rows,
                  product_type: 'gelato',
                  metrics: {}
                })
                .select()
                .single();

              if (recipeError) throw recipeError;

              // Create successful outcome for ML training
              await supabase.from('recipe_outcomes').insert({
                recipe_id: recipe.id,
                user_id: recipe.user_id,
                outcome: 'success',
                metrics: {}
              });

              imported++;
              setImportProgress((imported / total) * 100);
            }

            toast({
              title: 'Import Complete',
              description: `Successfully imported ${imported} recipes with outcomes for ML training`
            });

            setImportFile(null);
          } catch (error: any) {
            console.error('Import error:', error);
            toast({
              title: 'Import Failed',
              description: error.message,
              variant: 'destructive'
            });
          } finally {
            setIsImporting(false);
          }
        },
        error: (error) => {
          console.error('Parse error:', error);
          toast({
            title: 'File Parse Error',
            description: 'Invalid CSV format',
            variant: 'destructive'
          });
          setIsImporting(false);
        }
      });
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
      setIsImporting(false);
    }
  };

  const handleTrainModel = async () => {
    if (!stats?.mlReady) {
      toast({
        title: 'Insufficient Data',
        description: `Need at least 5 successful recipes. Currently have ${stats?.successfulOutcomes || 0}`,
        variant: 'destructive'
      });
      return;
    }

    setIsTraining(true);
    try {
      await mlService.trainModel();
      toast({
        title: 'Training Complete',
        description: 'ML model successfully trained on your recipes'
      });
    } catch (error: any) {
      console.error('Training failed:', error);
      toast({
        title: 'Training Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsTraining(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await mlService.exportTrainingData();
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast({ title: 'Export Complete', description: `Exported ${data.length} recipes` });
    } catch (error: any) {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleClearOrphans = async () => {
    try {
      const { error } = await supabase
        .from('recipe_outcomes')
        .delete()
        .is('recipe_id', null);

      if (error) throw error;

      toast({
        title: 'Database Cleaned',
        description: 'Removed orphaned recipe outcomes'
      });
    } catch (error: any) {
      toast({
        title: 'Cleanup Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DatabaseIcon className="h-8 w-8" />
            Database Manager
          </h1>
          <p className="text-muted-foreground">
            Manage recipes, training data, and ML models
          </p>
        </div>
      </div>

      {/* Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Recipes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRecipes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalIngredients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Training Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successfulOutcomes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.mlReady ? '✅ ML Ready' : `Need ${5 - (stats?.successfulOutcomes || 0)} more`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">ML Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={stats?.mlReady ? 'default' : 'secondary'}>
              {stats?.mlReady ? 'Trainable' : 'Insufficient Data'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="training">
            <Brain className="h-4 w-4 mr-2" />
            ML Training
          </TabsTrigger>
          <TabsTrigger value="recipes">
            <DatabaseIcon className="h-4 w-4 mr-2" />
            Recipes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Recipes from CSV</CardTitle>
              <CardDescription>
                Upload a CSV file with columns: Recipe Name, Ingredient, Grams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csv-upload">Select CSV File</Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  disabled={isImporting}
                />
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing recipes...
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleImportCSV} disabled={!importFile || isImporting}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Recipes
                </Button>
                <Button variant="outline" onClick={handleClearOrphans}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Orphans
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ML Model Training</CardTitle>
              <CardDescription>
                Train the ML model on successful recipes. Requires at least 5 successful outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Training Data Available</span>
                  <Badge variant={stats?.mlReady ? 'default' : 'secondary'}>
                    {stats?.successfulOutcomes || 0} recipes
                  </Badge>
                </div>
                <Progress value={Math.min(100, ((stats?.successfulOutcomes || 0) / 5) * 100)} />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleTrainModel} 
                  disabled={!stats?.mlReady || isTraining}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {isTraining ? 'Training...' : 'Train Model'}
                </Button>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Training Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Recipes</CardTitle>
              <CardDescription>Last 10 recipes added to the database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentRecipes && recentRecipes.length > 0 ? (
                  recentRecipes.map((recipe) => (
                    <div key={recipe.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{recipe.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {recipe.product_type} • {new Date(recipe.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No recipes yet. Import some data to get started!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
