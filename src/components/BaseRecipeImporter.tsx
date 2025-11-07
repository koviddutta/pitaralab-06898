import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/integrations/supabase/safeClient';

export function BaseRecipeImporter() {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState('');
  const { toast } = useToast();

  const baseRecipes = [
    {
      name: 'White base',
      description: 'Standard white ice cream base',
      product_type: 'ice_cream',
      ingredients: [
        { name: 'Milk 3% fat', quantity_g: 589 },
        { name: 'Cream 25% fat', quantity_g: 165 },
        { name: 'Sucrose', quantity_g: 118 },
        { name: 'Dextrose', quantity_g: 18 },
        { name: 'Glucose Syrup DE60', quantity_g: 42 },
        { name: 'Skim Milk Powder', quantity_g: 44 },
        { name: 'Stabilizer Blend', quantity_g: 6 },
        { name: 'Sweetened Condensed Milk', quantity_g: 18 }
      ]
    },
    {
      name: 'Chocolate base',
      description: 'Rich chocolate ice cream base',
      product_type: 'ice_cream',
      ingredients: [
        { name: 'Milk 3% fat', quantity_g: 540 },
        { name: 'Cream 25% fat', quantity_g: 120 },
        { name: 'Sucrose', quantity_g: 119 },
        { name: 'Dextrose', quantity_g: 18 },
        { name: 'Glucose Syrup DE60', quantity_g: 40 },
        { name: 'Skim Milk Powder', quantity_g: 18 },
        { name: 'Stabilizer Blend', quantity_g: 5 },
        { name: 'Sweetened Condensed Milk', quantity_g: 20 },
        { name: 'Callebaut Dark Chocolate 70-30-38', quantity_g: 70 },
        { name: 'Cocoa Powder (Dutch)', quantity_g: 50 }
      ]
    },
    {
      name: 'Kulfi base',
      description: 'Traditional kulfi base with evaporated milk',
      product_type: 'kulfi',
      ingredients: [
        { name: 'Amul Buffalo Milk', quantity_g: 700 },
        { name: 'Mawa (Khoya)', quantity_g: 125 },
        { name: 'Sucrose', quantity_g: 126 },
        { name: 'Dextrose', quantity_g: 19.5 },
        { name: 'Glucose Syrup DE60', quantity_g: 45 },
        { name: 'Cardamom Powder', quantity_g: 0 },
        { name: 'Stabilizer Blend', quantity_g: 2.5 }
      ]
    },
    {
      name: 'Sorbet Base',
      description: 'Standard sorbet base',
      product_type: 'sorbet',
      ingredients: [
        { name: 'Water', quantity_g: 800 },
        { name: 'Sucrose', quantity_g: 250 },
        { name: 'Dextrose', quantity_g: 70 },
        { name: 'Stabilizer Blend', quantity_g: 40 }
      ]
    }
  ];

  const completeRecipes = [
    {
      name: 'Gulab Jamun gelato',
      product_type: 'ice_cream',
      ingredients: [
        { name: 'White base', quantity_g: 500 },
        { name: 'Gulab Jamun', quantity_g: 20 },
        { name: 'Gulab Jamun Paste', quantity_g: 130 },
        { name: 'Cream 25% fat', quantity_g: 50 },
        { name: 'Kulfi base', quantity_g: 300 }
      ]
    },
    {
      name: 'Jalebi Joy gelato',
      product_type: 'ice_cream',
      ingredients: [
        { name: 'White base', quantity_g: 450 },
        { name: 'Kulfi base', quantity_g: 300 },
        { name: 'Rabdi (Amul)', quantity_g: 90 },
        { name: 'Jalebi', quantity_g: 15 },
        { name: 'Jalebi paste', quantity_g: 95 },
        { name: 'Cream 25% fat', quantity_g: 50 }
      ]
    },
    {
      name: 'Kulfi Oreo gelato',
      product_type: 'kulfi',
      ingredients: [
        { name: 'Kulfi base', quantity_g: 925 },
        { name: 'Cookies Paste', quantity_g: 55 },
        { name: 'Cookies Variegated', quantity_g: 20 }
      ]
    },
    {
      name: 'Belgian chocolate gelato',
      product_type: 'ice_cream',
      ingredients: [
        { name: 'Milk 3% fat', quantity_g: 540 },
        { name: 'Cream 25% fat', quantity_g: 120 },
        { name: 'Sucrose', quantity_g: 119 },
        { name: 'Dextrose', quantity_g: 18 },
        { name: 'Glucose Syrup DE60', quantity_g: 40 },
        { name: 'Skim Milk Powder', quantity_g: 18 },
        { name: 'Stabilizer Blend', quantity_g: 5 },
        { name: 'Sweetened Condensed Milk', quantity_g: 20 },
        { name: 'Callebaut Dark Chocolate 70-30-38', quantity_g: 70 },
        { name: 'Cocoa Powder (Dutch)', quantity_g: 50 }
      ]
    }
  ];

  const handleImport = async () => {
    setImporting(true);
    const supabase = await getSupabase();
    let imported = 0;

    try {
      // Import base recipes
      setStatus('Importing base recipes...');
      for (const recipe of baseRecipes) {
        const { error } = await supabase
          .from('base_recipes')
          .insert({
            name: recipe.name,
            description: recipe.description,
            product_type: recipe.product_type,
            ingredients_json: recipe.ingredients
          });

        if (error) {
          console.error(`Error importing ${recipe.name}:`, error);
        } else {
          imported++;
        }
      }

      // Import complete recipes
      setStatus('Importing complete recipes...');
      for (const recipe of completeRecipes) {
        const { data: recipeData, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            recipe_name: recipe.name,
            product_type: recipe.product_type
          } as any)
          .select()
          .single();

        if (recipeError) {
          console.error(`Error importing recipe ${recipe.name}:`, recipeError);
          continue;
        }

        // Insert recipe rows
        for (const ing of recipe.ingredients) {
          const { error: rowError } = await supabase
            .from('recipe_rows')
            .insert({
              recipe_id: recipeData.id,
              ingredient: ing.name,
              quantity_g: ing.quantity_g,
              sugars_g: 0,
              fat_g: 0,
              msnf_g: 0,
              other_solids_g: 0,
              total_solids_g: 0
            });

          if (rowError) {
            console.error(`Error importing ingredient ${ing.name}:`, rowError);
          }
        }
        imported++;
      }

      setStatus('');
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${imported} recipes (${baseRecipes.length} base + ${completeRecipes.length} complete recipes)`
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Error',
        description: 'Failed to import recipes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Import Base & Complete Recipes</h3>
      <p className="text-sm text-muted-foreground mb-4">
        This will import 4 base recipes and 4 complete recipes from your CSV files.
      </p>
      <Button onClick={handleImport} disabled={importing}>
        {importing ? status || 'Importing...' : 'Import Recipes'}
      </Button>
    </Card>
  );
}
