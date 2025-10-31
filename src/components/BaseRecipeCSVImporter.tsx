import { useState } from 'react';
import { Upload, Check, Loader2, Package } from 'lucide-react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { IngredientService } from '@/services/ingredientService';

type ParsedIngredient = {
  name: string;
  quantity_g: number;
};

type ParsedBaseRecipe = {
  name: string;
  description: string;
  product_type: string;
  ingredients: ParsedIngredient[];
};

export function BaseRecipeCSVImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedRecipes, setParsedRecipes] = useState<ParsedBaseRecipe[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const recipes = processCSV(results.data as any[]);
        setParsedRecipes(recipes);
        setStep('preview');
      },
      error: (error) => {
        console.error('Parse error:', error);
        toast.error('Failed to parse CSV file');
      }
    });
  };

  const processCSV = (data: any[]): ParsedBaseRecipe[] => {
    const recipesMap = new Map<string, ParsedBaseRecipe>();

    data.forEach((row) => {
      const recipeName = row['Recipe Name'] || row['recipe_name'] || 'Untitled Recipe';
      const ingredientName = row['Ingredient'] || row['ingredient'];
      const quantity = parseFloat(row['Quantity (g)'] || row['quantity_g'] || '0');
      const description = row['Description'] || row['description'] || '';
      const productType = (row['Product Type'] || row['product_type'] || 'ice_cream').toLowerCase();

      if (!ingredientName || quantity <= 0) return;

      if (!recipesMap.has(recipeName)) {
        recipesMap.set(recipeName, {
          name: recipeName,
          description,
          product_type: productType,
          ingredients: []
        });
      }

      recipesMap.get(recipeName)!.ingredients.push({
        name: ingredientName,
        quantity_g: quantity
      });
    });

    return Array.from(recipesMap.values());
  };

  const handleImport = async () => {
    setIsImporting(true);
    setStep('importing');
    setImportProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const ingredients = await IngredientService.getIngredients();
      const total = parsedRecipes.length;

      for (let i = 0; i < parsedRecipes.length; i++) {
        const recipe = parsedRecipes[i];

        // Map ingredients to database IDs
        const ingredientsJson = recipe.ingredients.map(ing => {
          const matched = ingredients.find(
            dbIng => dbIng.name.toLowerCase() === ing.name.toLowerCase()
          );

          return {
            id: matched?.id || null,
            name: ing.name,
            quantity_g: ing.quantity_g,
            sugars_pct: matched?.sugars_pct || 0,
            fat_pct: matched?.fat_pct || 0,
            msnf_pct: matched?.msnf_pct || 0,
            other_solids_pct: matched?.other_solids_pct || 0,
            water_pct: matched?.water_pct || 0
          };
        });

        // Create base recipe
        const { error } = await supabase
          .from('base_recipes')
          .insert({
            name: recipe.name,
            description: recipe.description,
            product_type: recipe.product_type,
            ingredients_json: ingredientsJson,
            user_id: user.id
          });

        if (error) throw error;

        setImportProgress(((i + 1) / total) * 100);
      }

      setStep('complete');
      toast.success(`Successfully imported ${parsedRecipes.length} base recipes!`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Base Recipe CSV Importer
        </CardTitle>
        <CardDescription>
          Import base recipes from CSV. Format: Recipe Name, Ingredient, Quantity (g), Description, Product Type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="base-csv-upload">Upload CSV File</Label>
              <Input
                id="base-csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Found {parsedRecipes.length} base recipe(s)
            </div>

            <div className="max-h-96 overflow-y-auto space-y-4">
              {parsedRecipes.map((recipe, idx) => (
                <Card key={idx} className="border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{recipe.name}</CardTitle>
                    <CardDescription>
                      {recipe.description} - {recipe.product_type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recipe.ingredients.map((ing, ingIdx) => (
                      <div key={ingIdx} className="flex items-center justify-between text-sm">
                        <span>{ing.name}</span>
                        <Badge variant="outline">{ing.quantity_g.toFixed(1)}g</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => { setStep('upload'); setParsedRecipes([]); setFile(null); }} 
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isImporting} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Import {parsedRecipes.length} Base Recipe(s)
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Importing base recipes...</p>
              <Progress value={importProgress} className="w-full" />
              <p className="text-xs text-muted-foreground">{importProgress.toFixed(0)}%</p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Check className="h-12 w-12 text-green-600" />
              <div>
                <h3 className="font-semibold mb-1">Import Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Base recipes have been successfully imported
                </p>
              </div>
              <Button onClick={() => { setStep('upload'); setParsedRecipes([]); setFile(null); }}>
                Import More Base Recipes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
