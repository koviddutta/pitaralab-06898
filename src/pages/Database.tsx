import { useState, useEffect } from 'react';
import { Upload, Database as DatabaseIcon, Brain, Download, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mlService } from '@/services/mlService';
import { calcMetrics } from '@/lib/calc';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsCheckingAuth(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch database stats
  const { data: stats, refetch: refetchStats } = useQuery({
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
    refetchInterval: 5000,
    enabled: isAuthenticated
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
    },
    enabled: isAuthenticated
  });

  const handleImportCSV = async () => {
    if (!importFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import',
        variant: 'destructive'
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to import recipes',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      console.log('📂 Starting CSV import...');
      
      // Parse CSV
      Papa.parse(importFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            console.log(`📊 Parsed ${results.data.length} rows from CSV`);
            
            const { data: ingredients } = await supabase.from('ingredients').select('*');
            if (!ingredients) throw new Error('Failed to load ingredients from database');

            console.log(`✅ Loaded ${ingredients.length} ingredients from database`);

            const ingredientMap = new Map(ingredients.map(i => [i.name.toLowerCase(), i]));
            const recipes = new Map<string, Array<{ ingredientId: string; grams: number }>>();

            // Validate and group by recipe
            let validRows = 0;
            let invalidRows = 0;

            for (const row of results.data as any[]) {
              try {
                const validated = ImportRowSchema.parse({
                  'Recipe Name': row['Recipe Name'] || row['recipe_name'] || row['name'],
                  'Ingredient': row['Ingredient'] || row['ingredient'] || row['ingredient_name'],
                  'Grams': parseFloat(row['Grams'] || row['grams'] || row['amount'] || '0')
                });

                const ingredientName = validated.Ingredient.toLowerCase().trim();
                const ingredient = ingredientMap.get(ingredientName) || 
                  [...ingredientMap.values()].find(i => 
                    i.name.toLowerCase().includes(ingredientName) ||
                    ingredientName.includes(i.name.toLowerCase())
                  );

                if (!ingredient) {
                  console.warn(`⚠️ Ingredient not found: "${validated.Ingredient}"`);
                  invalidRows++;
                  continue;
                }

                if (!recipes.has(validated['Recipe Name'])) {
                  recipes.set(validated['Recipe Name'], []);
                }

                recipes.get(validated['Recipe Name'])!.push({
                  ingredientId: ingredient.id,
                  grams: validated.Grams
                });
                
                validRows++;
              } catch (validationError: any) {
                console.warn('❌ Invalid row:', row, validationError.message);
                invalidRows++;
              }
            }

            console.log(`✅ Validated ${validRows} rows, ${invalidRows} invalid rows`);
            console.log(`📦 Grouped into ${recipes.size} recipes`);

            if (recipes.size === 0) {
              throw new Error('No valid recipes found in CSV. Please check the format: Recipe Name, Ingredient, Grams');
            }

            // Import recipes with proper error handling
            let imported = 0;
            let failed = 0;
            const total = recipes.size;
            const errors: string[] = [];

            for (const [name, rows] of recipes.entries()) {
              if (rows.length === 0) continue;

              try {
                console.log(`💾 Importing recipe: ${name} with ${rows.length} ingredients`);

                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');

                // Build full ingredient rows for metrics calculation  
                const fullRows = rows.map(r => {
                  const ing = ingredients.find(i => i.id === r.ingredientId);
                  if (!ing) throw new Error(`Ingredient not found: ${r.ingredientId}`);
                  return { 
                    ing: ing as any, // Type cast database type to IngredientData
                    grams: r.grams 
                  };
                });

                // Calculate proper metrics
                const metrics = calcMetrics(fullRows);
                console.log(`📊 Calculated metrics:`, {
                  sp: metrics.sp.toFixed(1),
                  pac: metrics.pac.toFixed(1),
                  fat_pct: metrics.fat_pct.toFixed(1)
                });

                // Save recipe with explicit user_id and proper metrics
                const { data: recipe, error: recipeError } = await supabase
                  .from('recipes')
                  .insert({
                    name,
                    rows_json: fullRows,
                    product_type: 'ice_cream',
                    metrics: {
                      total_g: metrics.total_g,
                      water_pct: metrics.water_pct,
                      sugars_pct: metrics.sugars_pct,
                      fat_pct: metrics.fat_pct,
                      msnf_pct: metrics.msnf_pct,
                      ts_add_pct: metrics.ts_add_pct,
                      sp: metrics.sp,
                      pac: metrics.pac,
                      fpdt: metrics.fpdt,
                      pod_index: metrics.pod_index
                    },
                    user_id: user.id
                  })
                  .select()
                  .single();

                if (recipeError) {
                  console.error(`❌ Recipe insert error for "${name}":`, recipeError);
                  throw recipeError;
                }

                console.log(`✅ Recipe inserted: ${recipe.id}`);

                // Create successful outcome for ML training with proper metrics
                const { error: outcomeError } = await supabase
                  .from('recipe_outcomes')
                  .insert({
                    recipe_id: recipe.id,
                    user_id: user.id,
                    outcome: 'success',
                    metrics: recipe.metrics,
                    notes: 'Imported from CSV - ML training data'
                  });

                if (outcomeError) {
                  console.error(`❌ Outcome insert error for "${name}":`, outcomeError);
                  // Don't throw here, recipe is already saved
                  errors.push(`Recipe "${name}" imported but outcome failed: ${outcomeError.message}`);
                }

                imported++;
                setImportProgress((imported / total) * 100);
              } catch (error: any) {
                console.error(`❌ Failed to import recipe "${name}":`, error);
                failed++;
                errors.push(`"${name}": ${error.message}`);
              }
            }

            // Refetch stats after import
            await refetchStats();

            if (imported > 0) {
              toast({
                title: 'Import Complete',
                description: `Successfully imported ${imported} recipes${failed > 0 ? `, ${failed} failed` : ''}. Ready for ML training!`
              });
            } else {
              throw new Error('No recipes were successfully imported. Check console for details.');
            }

            if (errors.length > 0) {
              console.error('Import errors:', errors);
            }

            setImportFile(null);
          } catch (error: any) {
            console.error('❌ Import error:', error);
            toast({
              title: 'Import Failed',
              description: error.message || 'Unknown error occurred',
              variant: 'destructive'
            });
          } finally {
            setIsImporting(false);
            setImportProgress(0);
          }
        },
        error: (error) => {
          console.error('❌ CSV Parse error:', error);
          toast({
            title: 'File Parse Error',
            description: 'Invalid CSV format. Expected headers: Recipe Name, Ingredient, Grams',
            variant: 'destructive'
          });
          setIsImporting(false);
          setImportProgress(0);
        }
      });
    } catch (error: any) {
      console.error('❌ Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleTrainModel = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to train the ML model',
        variant: 'destructive'
      });
      return;
    }

    if (!stats?.mlReady) {
      toast({
        title: 'Insufficient Training Data',
        description: `Need at least 5 successful recipes. Currently have ${stats?.successfulOutcomes || 0}`,
        variant: 'destructive'
      });
      return;
    }

    setIsTraining(true);
    try {
      console.log('🧠 Starting ML model training...');
      const weights = await mlService.trainModel();
      
      console.log('✅ Training complete:', weights);
      
      toast({
        title: 'Training Complete',
        description: `ML model successfully trained with ${Math.round(weights.accuracy * 100)}% accuracy on ${stats.successfulOutcomes} recipes`
      });
    } catch (error: any) {
      console.error('❌ Training failed:', error);
      toast({
        title: 'Training Failed',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsTraining(false);
    }
  };

  const handleExportData = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to export data',
        variant: 'destructive'
      });
      return;
    }

    try {
      const data = await mlService.exportTrainingData();
      
      if (data.length === 0) {
        toast({
          title: 'No Data Available',
          description: 'No recipes found to export',
          variant: 'destructive'
        });
        return;
      }

      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ 
        title: 'Export Complete', 
        description: `Exported ${data.length} recipes` 
      });
    } catch (error: any) {
      toast({ 
        title: 'Export Failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  const handleClearOrphans = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to clean database',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('recipe_outcomes')
        .delete()
        .is('recipe_id', null);

      if (error) throw error;

      await refetchStats();

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

  if (isCheckingAuth) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

      {!isAuthenticated && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to manage the database. Please{' '}
            <a href="/auth" className="font-medium underline">
              sign in
            </a>{' '}
            to continue.
          </AlertDescription>
        </Alert>
      )}

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
          <TabsTrigger value="import" disabled={!isAuthenticated}>
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="training" disabled={!isAuthenticated}>
            <Brain className="h-4 w-4 mr-2" />
            ML Training
          </TabsTrigger>
          <TabsTrigger value="recipes" disabled={!isAuthenticated}>
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
                  disabled={isImporting || !isAuthenticated}
                />
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing recipes... {Math.round(importProgress)}%
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleImportCSV} 
                  disabled={!importFile || isImporting || !isAuthenticated}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Recipes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClearOrphans}
                  disabled={!isAuthenticated}
                >
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
                  disabled={!stats?.mlReady || isTraining || !isAuthenticated}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {isTraining ? 'Training...' : 'Train Model'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportData}
                  disabled={!isAuthenticated}
                >
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
