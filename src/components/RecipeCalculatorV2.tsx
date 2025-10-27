import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Save, Trash2, Calculator, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface IngredientRow {
  id?: string;
  ingredient: string;
  quantity_g: number;
  water_g: number;
  sugars_g: number;
  fat_g: number;
  msnf_g: number;
  other_solids_g: number;
  total_solids_g: number;
  lactose_g: number;
}

interface CalculatedMetrics {
  total_quantity_g: number;
  total_water_g: number;
  total_sugars_g: number;
  total_fat_g: number;
  total_msnf_g: number;
  total_other_solids_g: number;
  total_solids_g: number;
  total_lactose_g: number;
  water_pct: number;
  sugars_pct: number;
  fat_pct: number;
  msnf_pct: number;
  other_solids_pct: number;
  total_solids_pct: number;
  lactose_pct: number;
  sp: number;
  pac: number;
  fpdt: number;
  pod_index: number;
}

export default function RecipeCalculatorV2() {
  const { toast } = useToast();
  const [recipeName, setRecipeName] = useState('');
  const [productType, setProductType] = useState('ice_cream');
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [metrics, setMetrics] = useState<CalculatedMetrics | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const addRow = () => {
    setRows([...rows, {
      ingredient: '',
      quantity_g: 0,
      water_g: 0,
      sugars_g: 0,
      fat_g: 0,
      msnf_g: 0,
      other_solids_g: 0,
      total_solids_g: 0,
      lactose_g: 0
    }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof IngredientRow, value: string | number) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const calculateMetrics = () => {
    if (rows.length === 0) {
      toast({
        title: 'No ingredients',
        description: 'Add at least one ingredient to calculate metrics',
        variant: 'destructive'
      });
      return;
    }

    const totals = rows.reduce((acc, row) => ({
      quantity: acc.quantity + Number(row.quantity_g),
      water: acc.water + Number(row.water_g),
      sugars: acc.sugars + Number(row.sugars_g),
      fat: acc.fat + Number(row.fat_g),
      msnf: acc.msnf + Number(row.msnf_g),
      other: acc.other + Number(row.other_solids_g),
      solids: acc.solids + Number(row.total_solids_g),
      lactose: acc.lactose + Number(row.lactose_g)
    }), { quantity: 0, water: 0, sugars: 0, fat: 0, msnf: 0, other: 0, solids: 0, lactose: 0 });

    const sp = totals.quantity > 0 ? (totals.sugars / totals.quantity) * 100 : 0;
    const pac = totals.quantity > 0 ? ((totals.sugars * 1.9) / totals.quantity) * 100 : 0;
    const fpdt = totals.quantity > 0 ? (totals.msnf + totals.sugars) / totals.quantity * 100 : 0;
    const pod_index = totals.quantity > 0 ? (totals.fat + totals.other + totals.msnf) / totals.quantity * 100 : 0;

    const calculated: CalculatedMetrics = {
      total_quantity_g: totals.quantity,
      total_water_g: totals.water,
      total_sugars_g: totals.sugars,
      total_fat_g: totals.fat,
      total_msnf_g: totals.msnf,
      total_other_solids_g: totals.other,
      total_solids_g: totals.solids,
      total_lactose_g: totals.lactose,
      water_pct: totals.quantity > 0 ? (totals.water / totals.quantity) * 100 : 0,
      sugars_pct: totals.quantity > 0 ? (totals.sugars / totals.quantity) * 100 : 0,
      fat_pct: totals.quantity > 0 ? (totals.fat / totals.quantity) * 100 : 0,
      msnf_pct: totals.quantity > 0 ? (totals.msnf / totals.quantity) * 100 : 0,
      other_solids_pct: totals.quantity > 0 ? (totals.other / totals.quantity) * 100 : 0,
      total_solids_pct: totals.quantity > 0 ? (totals.solids / totals.quantity) * 100 : 0,
      lactose_pct: totals.quantity > 0 ? (totals.lactose / totals.quantity) * 100 : 0,
      sp,
      pac,
      fpdt,
      pod_index
    };

    setMetrics(calculated);
    
    toast({
      title: 'Metrics Calculated',
      description: 'Recipe metrics have been computed'
    });
  };

  const saveRecipe = async () => {
    if (!recipeName.trim()) {
      toast({
        title: 'Recipe name required',
        description: 'Please enter a recipe name',
        variant: 'destructive'
      });
      return;
    }

    if (rows.length === 0) {
      toast({
        title: 'No ingredients',
        description: 'Add at least one ingredient before saving',
        variant: 'destructive'
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to save recipes',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate metrics if not already done
      if (!metrics) {
        calculateMetrics();
      }

      let recipeId = currentRecipeId;

      if (!recipeId) {
        // Create new recipe
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            recipe_name: recipeName,
            product_type: productType,
            user_id: user.id
          } as any)
          .select()
          .single();

        if (recipeError) throw recipeError;
        recipeId = recipe.id;
        setCurrentRecipeId(recipeId);
      } else {
        // Update existing recipe
        const { error: updateError } = await supabase
          .from('recipes')
          .update({ recipe_name: recipeName, product_type: productType })
          .eq('id', recipeId);

        if (updateError) throw updateError;

        // Delete existing rows
        await supabase.from('recipe_rows').delete().eq('recipe_id', recipeId);
        await supabase.from('calculated_metrics').delete().eq('recipe_id', recipeId);
      }

      // Insert recipe rows
      const { error: rowsError } = await supabase
        .from('recipe_rows')
        .insert(
          rows.map(r => ({
            recipe_id: recipeId,
            ingredient: r.ingredient,
            quantity_g: r.quantity_g,
            water_g: r.water_g,
            sugars_g: r.sugars_g,
            fat_g: r.fat_g,
            msnf_g: r.msnf_g,
            other_solids_g: r.other_solids_g,
            total_solids_g: r.total_solids_g,
            lactose_g: r.lactose_g
          }))
        );

      if (rowsError) throw rowsError;

      // Insert calculated metrics
      if (metrics) {
        const { error: metricsError } = await supabase
          .from('calculated_metrics')
          .insert({
            recipe_id: recipeId,
            ...metrics
          });

        if (metricsError) throw metricsError;
      }

      toast({
        title: 'Recipe saved',
        description: `"${recipeName}" has been saved successfully`
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const clearRecipe = () => {
    setRecipeName('');
    setProductType('ice_cream');
    setRows([]);
    setMetrics(null);
    setCurrentRecipeId(null);
  };

  return (
    <div className="space-y-6">
      {!isAuthenticated && (
        <Alert>
          <AlertDescription>
            Please <a href="/auth" className="font-medium underline">sign in</a> to save recipes
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recipe Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipe-name">Recipe Name</Label>
              <Input
                id="recipe-name"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="Enter recipe name"
              />
            </div>
            <div>
              <Label htmlFor="product-type">Product Type</Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ice_cream">Ice Cream</SelectItem>
                  <SelectItem value="gelato">Gelato</SelectItem>
                  <SelectItem value="sorbet">Sorbet</SelectItem>
                  <SelectItem value="paste">Paste</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Qty (g)</TableHead>
                  <TableHead>Water (g)</TableHead>
                  <TableHead>Sugars (g)</TableHead>
                  <TableHead>Fat (g)</TableHead>
                  <TableHead>MSNF (g)</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={row.ingredient}
                        onChange={(e) => updateRow(index, 'ingredient', e.target.value)}
                        placeholder="Ingredient name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.quantity_g}
                        onChange={(e) => updateRow(index, 'quantity_g', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.water_g}
                        onChange={(e) => updateRow(index, 'water_g', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.sugars_g}
                        onChange={(e) => updateRow(index, 'sugars_g', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.fat_g}
                        onChange={(e) => updateRow(index, 'fat_g', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.msnf_g}
                        onChange={(e) => updateRow(index, 'msnf_g', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeRow(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex gap-2">
              <Button onClick={addRow} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Ingredient
              </Button>
              <Button onClick={calculateMetrics} variant="outline">
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Metrics
              </Button>
              <Button onClick={saveRecipe} disabled={isSaving || !isAuthenticated}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Recipe
              </Button>
              <Button onClick={clearRecipe} variant="ghost">
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Calculated Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">{metrics.total_quantity_g.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sugars %</p>
                <Badge>{metrics.sugars_pct.toFixed(1)}%</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fat %</p>
                <Badge>{metrics.fat_pct.toFixed(1)}%</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MSNF %</p>
                <Badge>{metrics.msnf_pct.toFixed(1)}%</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SP</p>
                <Badge variant="outline">{metrics.sp.toFixed(1)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PAC</p>
                <Badge variant="outline">{metrics.pac.toFixed(1)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">FPDT</p>
                <Badge variant="outline">{metrics.fpdt.toFixed(1)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">POD Index</p>
                <Badge variant="outline">{metrics.pod_index.toFixed(1)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
