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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mlService } from '@/services/mlService';
import Papa from 'papaparse';
import { z } from 'zod';

// New validation schema matching the exact format
const ImportRowSchema = z.object({
  'Ingredient': z.string().min(1),
  'Quantity (g)': z.number().positive(),
  'Water (g)': z.number().min(0),
  'Sugars (g)': z.number().min(0),
  'Fat (g)': z.number().min(0),
  'MSNF (g)': z.number().min(0),
  'Other Solids (g)': z.number().min(0),
  'Total Solids (g)': z.number().min(0),
  'Lactose (g)': z.number().min(0)
});

type RecipeData = {
  name: string;
  rows: z.infer<typeof ImportRowSchema>[];
};

export default function Database() {
  const { toast } = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication
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
      const [recipesRes, outcomesRes] = await Promise.all([
        supabase.from('recipes').select('id', { count: 'exact', head: true }),
        supabase.from('recipe_outcomes').select('id,outcome', { count: 'exact' })
      ]);

      const successfulOutcomes = outcomesRes.data?.filter(o => o.outcome === 'success').length || 0;

      return {
        totalRecipes: recipesRes.count || 0,
        totalOutcomes: outcomesRes.count || 0,
        successfulOutcomes,
        mlReady: successfulOutcomes >= 5
      };
    },
    refetchInterval: 5000,
    enabled: isAuthenticated
  });

  // Fetch recent recipes with their rows
  const { data: recentRecipes } = useQuery({
    queryKey: ['recent-recipes'],
    queryFn: async () => {
      const { data: recipes } = await supabase
        .from('recipes')
        .select(`
          id,
          recipe_name,
          product_type,
          created_at,
          recipe_rows (
            ingredient,
            quantity_g,
            water_g,
            sugars_g,
            fat_g,
            msnf_g,
            other_solids_g,
            total_solids_g,
            lactose_g
          ),
          calculated_metrics (
            total_quantity_g,
            sp,
            pac,
            fat_pct,
            sugars_pct
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      return recipes || [];
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
      console.log('📂 Starting CSV import with new format...');

      Papa.parse(importFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            console.log(`📊 Parsed ${results.data.length} rows from CSV`);

            // Group by recipe name (first column should be recipe name)
            const recipesMap = new Map<string, z.infer<typeof ImportRowSchema>[]>();
            let validRows = 0;
            let invalidRows = 0;

            for (const row of results.data as any[]) {
              try {
                // Extract recipe name from first column or 'Recipe Name' column
                const recipeName = row['Recipe Name'] || row['recipe_name'] || row['Recipe'] || 'Unnamed Recipe';

                const validated = ImportRowSchema.parse({
                  'Ingredient': row['Ingredient'] || row['ingredient'],
                  'Quantity (g)': parseFloat(row['Quantity (g)'] || row['quantity_g'] || row['Quantity'] || '0'),
                  'Water (g)': parseFloat(row['Water (g)'] || row['water_g'] || row['Water'] || '0'),
                  'Sugars (g)': parseFloat(row['Sugars (g)'] || row['sugars_g'] || row['Sugars'] || '0'),
                  'Fat (g)': parseFloat(row['Fat (g)'] || row['fat_g'] || row['Fat'] || '0'),
                  'MSNF (g)': parseFloat(row['MSNF (g)'] || row['msnf_g'] || row['MSNF'] || '0'),
                  'Other Solids (g)': parseFloat(row['Other Solids (g)'] || row['other_solids_g'] || row['Other Solids'] || '0'),
                  'Total Solids (g)': parseFloat(row['Total Solids (g)'] || row['total_solids_g'] || row['Total Solids'] || '0'),
                  'Lactose (g)': parseFloat(row['Lactose (g)'] || row['lactose_g'] || row['Lactose'] || '0')
                });

                if (!recipesMap.has(recipeName)) {
                  recipesMap.set(recipeName, []);
                }
                recipesMap.get(recipeName)!.push(validated);
                validRows++;
              } catch (validationError: any) {
                console.warn('❌ Invalid row:', row, validationError.message);
                invalidRows++;
              }
            }

            console.log(`✅ Validated ${validRows} rows into ${recipesMap.size} recipes, ${invalidRows} invalid`);

            if (recipesMap.size === 0) {
              throw new Error('No valid recipes found. Expected format: Recipe Name, Ingredient, Quantity (g), Water (g), Sugars (g), Fat (g), MSNF (g), Other Solids (g), Total Solids (g), Lactose (g)');
            }

            // Import recipes
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            let imported = 0;
            const total = recipesMap.size;

            for (const [recipeName, rows] of recipesMap.entries()) {
              try {
                console.log(`💾 Importing recipe: ${recipeName}`);

                // Create recipe
                const { data: recipe, error: recipeError } = await supabase
                  .from('recipes')
                  .insert({
                    recipe_name: recipeName,
                    product_type: 'ice_cream',
                    user_id: user.id
                  })
                  .select()
                  .single();

                if (recipeError) throw recipeError;

                // Insert all rows
                const { error: rowsError } = await supabase
                  .from('recipe_rows')
                  .insert(
                    rows.map(r => ({
                      recipe_id: recipe.id,
                      ingredient: r['Ingredient'],
                      quantity_g: r['Quantity (g)'],
                      water_g: r['Water (g)'],
                      sugars_g: r['Sugars (g)'],
                      fat_g: r['Fat (g)'],
                      msnf_g: r['MSNF (g)'],
                      other_solids_g: r['Other Solids (g)'],
                      total_solids_g: r['Total Solids (g)'],
                      lactose_g: r['Lactose (g)']
                    }))
                  );

                if (rowsError) throw rowsError;

                // Calculate metrics
                const totals = rows.reduce((acc, r) => ({
                  quantity: acc.quantity + r['Quantity (g)'],
                  water: acc.water + r['Water (g)'],
                  sugars: acc.sugars + r['Sugars (g)'],
                  fat: acc.fat + r['Fat (g)'],
                  msnf: acc.msnf + r['MSNF (g)'],
                  other: acc.other + r['Other Solids (g)'],
                  solids: acc.solids + r['Total Solids (g)'],
                  lactose: acc.lactose + r['Lactose (g)']
                }), { quantity: 0, water: 0, sugars: 0, fat: 0, msnf: 0, other: 0, solids: 0, lactose: 0 });

                const sp = totals.sugars / totals.quantity * 100; // Simplified SP calculation
                const pac = (totals.sugars * 1.9) / totals.quantity * 100; // Simplified PAC

                // Store calculated metrics
                const { error: metricsError } = await supabase
                  .from('calculated_metrics')
                  .insert({
                    recipe_id: recipe.id,
                    total_quantity_g: totals.quantity,
                    total_water_g: totals.water,
                    total_sugars_g: totals.sugars,
                    total_fat_g: totals.fat,
                    total_msnf_g: totals.msnf,
                    total_other_solids_g: totals.other,
                    total_solids_g: totals.solids,
                    total_lactose_g: totals.lactose,
                    water_pct: totals.water / totals.quantity * 100,
                    sugars_pct: totals.sugars / totals.quantity * 100,
                    fat_pct: totals.fat / totals.quantity * 100,
                    msnf_pct: totals.msnf / totals.quantity * 100,
                    other_solids_pct: totals.other / totals.quantity * 100,
                    total_solids_pct: totals.solids / totals.quantity * 100,
                    lactose_pct: totals.lactose / totals.quantity * 100,
                    sp,
                    pac
                  });

                if (metricsError) throw metricsError;

                // Create outcome for ML training
                await supabase.from('recipe_outcomes').insert({
                  recipe_id: recipe.id,
                  user_id: user.id,
                  outcome: 'success',
                  notes: 'Imported from CSV'
                });

                imported++;
                setImportProgress((imported / total) * 100);
              } catch (error: any) {
                console.error(`❌ Failed to import "${recipeName}":`, error);
              }
            }

            await refetchStats();

            toast({
              title: 'Import Complete',
              description: `Successfully imported ${imported} recipes with exact column format`
            });

            setImportFile(null);
          } catch (error: any) {
            console.error('❌ Import error:', error);
            toast({
              title: 'Import Failed',
              description: error.message,
              variant: 'destructive'
            });
          } finally {
            setIsImporting(false);
            setImportProgress(0);
          }
        }
      });
    } catch (error: any) {
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
      const weights = await mlService.trainModel();
      toast({
        title: 'Training Complete',
        description: `Model trained with ${Math.round(weights.accuracy * 100)}% accuracy`
      });
    } catch (error: any) {
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
      const { data: recipes } = await supabase
        .from('recipes')
        .select(`
          recipe_name,
          recipe_rows (
            ingredient,
            quantity_g,
            water_g,
            sugars_g,
            fat_g,
            msnf_g,
            other_solids_g,
            total_solids_g,
            lactose_g
          )
        `);

      if (!recipes || recipes.length === 0) {
        toast({ title: 'No Data', description: 'No recipes to export', variant: 'destructive' });
        return;
      }

      const flatData: any[] = [];
      recipes.forEach(recipe => {
        (recipe.recipe_rows as any[]).forEach(row => {
          flatData.push({
            'Recipe Name': recipe.recipe_name,
            'Ingredient': row.ingredient,
            'Quantity (g)': row.quantity_g,
            'Water (g)': row.water_g,
            'Sugars (g)': row.sugars_g,
            'Fat (g)': row.fat_g,
            'MSNF (g)': row.msnf_g,
            'Other Solids (g)': row.other_solids_g,
            'Total Solids (g)': row.total_solids_g,
            'Lactose (g)': row.lactose_g
          });
        });
      });

      const csv = Papa.unparse(flatData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipes-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();

      toast({ title: 'Export Complete', description: `Exported ${recipes.length} recipes` });
    } catch (error: any) {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
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
            Import, train, and manage recipe data in standardized format
          </p>
        </div>
      </div>

      {!isAuthenticated && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in. Please <a href="/auth" className="font-medium underline">sign in</a>.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <CardTitle className="text-sm font-medium">Training Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successfulOutcomes || 0}</div>
            <Badge variant={stats?.mlReady ? 'default' : 'secondary'} className="mt-2">
              {stats?.mlReady ? 'Ready' : 'Need 5+'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">ML Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={stats?.mlReady ? 'default' : 'outline'}>
              {stats?.mlReady ? 'Trained' : 'Needs Training'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="recipes">View Recipes</TabsTrigger>
          <TabsTrigger value="train">ML Training</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import CSV Data</CardTitle>
              <CardDescription>
                Upload CSV with columns: Recipe Name, Ingredient, Quantity (g), Water (g), Sugars (g), Fat (g), MSNF (g), Other Solids (g), Total Solids (g), Lactose (g)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  disabled={!isAuthenticated || isImporting}
                />
              </div>
              {isImporting && (
                <div className="space-y-2">
                  <Progress value={importProgress} />
                  <p className="text-sm text-muted-foreground">Importing... {Math.round(importProgress)}%</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleImportCSV} disabled={!importFile || isImporting}>
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Import CSV
                </Button>
                <Button variant="outline" onClick={handleExportData} disabled={!isAuthenticated}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Recipes</CardTitle>
              <CardDescription>Last 10 imported recipes</CardDescription>
            </CardHeader>
            <CardContent>
              {recentRecipes && recentRecipes.length > 0 ? (
                <div className="space-y-4">
                  {recentRecipes.map((recipe: any) => (
                    <Card key={recipe.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{recipe.recipe_name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ingredient</TableHead>
                              <TableHead>Quantity (g)</TableHead>
                              <TableHead>Water (g)</TableHead>
                              <TableHead>Sugars (g)</TableHead>
                              <TableHead>Fat (g)</TableHead>
                              <TableHead>MSNF (g)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(recipe.recipe_rows as any[])?.map((row: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell>{row.ingredient}</TableCell>
                                <TableCell>{row.quantity_g}</TableCell>
                                <TableCell>{row.water_g}</TableCell>
                                <TableCell>{row.sugars_g}</TableCell>
                                <TableCell>{row.fat_g}</TableCell>
                                <TableCell>{row.msnf_g}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {recipe.calculated_metrics && (
                          <div className="mt-4 flex gap-4">
                            <Badge>SP: {recipe.calculated_metrics[0]?.sp?.toFixed(1)}</Badge>
                            <Badge>PAC: {recipe.calculated_metrics[0]?.pac?.toFixed(1)}</Badge>
                            <Badge>Fat: {recipe.calculated_metrics[0]?.fat_pct?.toFixed(1)}%</Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No recipes imported yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="train">
          <Card>
            <CardHeader>
              <CardTitle>ML Model Training</CardTitle>
              <CardDescription>Train the AI model on imported recipe data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleTrainModel} disabled={!stats?.mlReady || isTraining}>
                {isTraining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                Train Model
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
