import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Save, Trash2, Calculator, Loader2, Search, Zap, BookOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SmartIngredientSearch } from '@/components/SmartIngredientSearch';
import { RecipeTemplates, resolveTemplateIngredients } from '@/components/RecipeTemplates';
import { AddIngredientDialog } from '@/components/AddIngredientDialog';
import { useIngredients } from '@/contexts/IngredientsContext';
import type { IngredientData } from '@/lib/ingredientLibrary';
import { calcMetricsV2, MetricsV2 } from '@/lib/calc.v2';
import { optimizeRecipe } from '@/lib/optimize';
import type { Row, OptimizeTarget } from '@/lib/optimize';

interface IngredientRow {
  id?: string;
  ingredientData?: IngredientData; // Store full ingredient data
  ingredient: string;
  quantity_g: number;
  sugars_g: number;
  fat_g: number;
  msnf_g: number;
  other_solids_g: number;
  total_solids_g: number;
}

interface RecipeCalculatorV2Props {
  onRecipeChange?: (recipe: any[], metrics: MetricsV2 | null, productType: string) => void;
}

export default function RecipeCalculatorV2({ onRecipeChange }: RecipeCalculatorV2Props) {
  const { toast } = useToast();
  const [recipeName, setRecipeName] = useState('');
  const [productType, setProductType] = useState('ice_cream');
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [metrics, setMetrics] = useState<MetricsV2 | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchOpen, setSearchOpen] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Use global ingredients context
  const { ingredients: availableIngredients, isLoading: loadingIngredients } = useIngredients();

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

  // Notify parent component when recipe changes
  useEffect(() => {
    if (onRecipeChange) {
      const recipeData = rows.map(row => ({
        ingredient: row.ingredient,
        quantity: row.quantity_g,
        ingredientData: row.ingredientData
      }));
      onRecipeChange(recipeData, metrics, productType);
    }
  }, [rows, metrics, productType, onRecipeChange]);

  const addRow = () => {
    setRows([...rows, {
      ingredient: '',
      quantity_g: 0,
      sugars_g: 0,
      fat_g: 0,
      msnf_g: 0,
      other_solids_g: 0,
      total_solids_g: 0
    }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const loadTemplate = (template: any) => {
    // Resolve template ingredients to actual ingredient data
    const resolvedIngredients = resolveTemplateIngredients(template, availableIngredients);
    
    if (resolvedIngredients.length === 0) {
      toast({
        title: 'Template Error',
        description: 'Could not find matching ingredients in database',
        variant: 'destructive'
      });
      return;
    }

    // Find ingredient data for each resolved ingredient
    const newRows: IngredientRow[] = resolvedIngredients
      .map(({ ingredientId, grams }) => {
        const ingredientData = availableIngredients.find(ing => ing.id === ingredientId);
        if (!ingredientData) return null;

        const qty = grams;
        return {
          ingredientData,
          ingredient: ingredientData.name,
          quantity_g: qty,
          sugars_g: (ingredientData.sugars_pct / 100) * qty,
          fat_g: (ingredientData.fat_pct / 100) * qty,
          msnf_g: (ingredientData.msnf_pct / 100) * qty,
          other_solids_g: (ingredientData.other_solids_pct / 100) * qty,
          total_solids_g: ((ingredientData.sugars_pct + ingredientData.fat_pct + ingredientData.msnf_pct + ingredientData.other_solids_pct) / 100) * qty
        };
      })
      .filter((row) => row !== null) as IngredientRow[];

    setRows(newRows);
    setRecipeName(template.name);
    setProductType(template.mode === 'kulfi' ? 'kulfi' : 'gelato');
    setShowTemplates(false);

    // Auto-calculate metrics
    setTimeout(() => calculateMetrics(), 100);

    toast({
      title: 'Template Loaded',
      description: `${template.name} loaded with ${newRows.length} ingredients`
    });
  };

  const handleStartFromScratch = () => {
    setShowTemplates(false);
  };

  const updateRow = (index: number, field: keyof IngredientRow, value: string | number) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    
    // Auto-calculate nutritional values when quantity changes
    if (field === 'quantity_g' && newRows[index].ingredientData) {
      const ing = newRows[index].ingredientData!;
      const qty = Number(value);
      newRows[index].sugars_g = ((ing.sugars_pct ?? 0) / 100) * qty;
      newRows[index].fat_g = ((ing.fat_pct ?? 0) / 100) * qty;
      newRows[index].msnf_g = ((ing.msnf_pct ?? 0) / 100) * qty;
      newRows[index].other_solids_g = ((ing.other_solids_pct ?? 0) / 100) * qty;
      newRows[index].total_solids_g = newRows[index].sugars_g + newRows[index].fat_g + newRows[index].msnf_g + newRows[index].other_solids_g;
    }
    
    setRows(newRows);
  };

  const handleIngredientSelect = (index: number, ingredient: IngredientData) => {
    const newRows = [...rows];
    newRows[index].ingredient = ingredient.name;
    newRows[index].ingredientData = ingredient;
    
    // Auto-calculate based on current quantity
    const qty = newRows[index].quantity_g || 0;
    newRows[index].sugars_g = ((ingredient.sugars_pct ?? 0) / 100) * qty;
    newRows[index].fat_g = ((ingredient.fat_pct ?? 0) / 100) * qty;
    newRows[index].msnf_g = ((ingredient.msnf_pct ?? 0) / 100) * qty;
    newRows[index].other_solids_g = ((ingredient.other_solids_pct ?? 0) / 100) * qty;
    newRows[index].total_solids_g = newRows[index].sugars_g + newRows[index].fat_g + newRows[index].msnf_g + newRows[index].other_solids_g;
    
    setRows(newRows);
    setSearchOpen(null);
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

    // Convert rows to format expected by calc.v2
    const calcRows = rows
      .filter(r => r.ingredientData && r.quantity_g > 0)
      .map(r => ({
        ing: r.ingredientData!,
        grams: r.quantity_g
      }));

    if (calcRows.length === 0) {
      toast({
        title: 'Invalid ingredients',
        description: 'Please select ingredients from the database',
        variant: 'destructive'
      });
      return;
    }

    // Use the comprehensive v2.1 science engine
    // Map product types to calculation modes
    const mode = (productType === 'gelato' || productType === 'ice_cream') ? 'gelato' : 'kulfi';
    const calculated = calcMetricsV2(calcRows, { mode });

    setMetrics(calculated);
    
    // Show warnings if any
    if (calculated.warnings.length > 0) {
      toast({
        title: 'Recipe Calculated',
        description: `${calculated.warnings.length} warnings detected`,
      });
    } else {
      toast({
        title: 'Recipe Balanced ✅',
        description: 'All parameters within target ranges'
      });
    }
  };

  const balanceRecipe = () => {
    if (rows.length === 0) {
      toast({
        title: 'No ingredients',
        description: 'Add ingredients before balancing',
        variant: 'destructive'
      });
      return;
    }

    setIsOptimizing(true);

    try {
      // Define target ranges based on product type using v2.1 science
      // Both gelato and ice_cream use gelato mode parameters
      const targets: OptimizeTarget = (productType === 'gelato' || productType === 'ice_cream')
        ? {
            fat_pct: 7.5,           // Target 7.5% fat (6-9%)
            msnf_pct: 11,           // Target 11% MSNF (10-12%)
            totalSugars_pct: 19,    // Target 19% total sugars (16-22%)
            ts_pct: 40,             // Target 40% total solids (36-45%)
            fpdt: 3.0               // Target 3.0°C FPDT (2.5-3.5°C)
          }
        : {
            fat_pct: 11,            // Target 11% fat (10-12%)
            msnf_pct: 21.5,         // Target 21.5% MSNF (18-25%)
            totalSugars_pct: 18,    // Target 18% sugars
            ts_pct: 40,             // Target 40% total solids (38-42%)
            fpdt: 2.25              // Target 2.25°C FPDT (2.0-2.5°C)
          };

      // Convert rows to optimization format
      const optRows: Row[] = rows
        .filter(r => r.ingredientData && r.quantity_g > 0)
        .map(r => ({
          ing: r.ingredientData!,
          grams: r.quantity_g,
          min: 0,
          max: 1000
        }));

      // Run optimization
      const optimized = optimizeRecipe(optRows, targets, 500, 0.5);

      // Update rows with optimized quantities
      const newRows = rows.map((row, i) => {
        if (i < optimized.length) {
          const opt = optimized[i];
          const ing = row.ingredientData!;
          const qty = opt.grams;
          return {
            ...row,
            quantity_g: qty,
            sugars_g: (ing.sugars_pct / 100) * qty,
            fat_g: (ing.fat_pct / 100) * qty,
            msnf_g: (ing.msnf_pct / 100) * qty,
            other_solids_g: (ing.other_solids_pct / 100) * qty,
            total_solids_g: ((ing.sugars_pct + ing.fat_pct + ing.msnf_pct + ing.other_solids_pct) / 100) * qty
          };
        }
        return row;
      });

      setRows(newRows);
      
      // Recalculate with new quantities
      setTimeout(() => calculateMetrics(), 100);

      toast({
        title: 'Recipe Balanced',
        description: 'Quantities optimized to meet science parameters'
      });
    } catch (error: any) {
      toast({
        title: 'Optimization failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsOptimizing(false);
    }
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

    if (rows.length === 0 || rows.filter(r => r.quantity_g > 0).length === 0) {
      toast({
        title: 'No ingredients',
        description: 'Add at least one ingredient with quantity before saving',
        variant: 'destructive'
      });
      return;
    }

    // Validate minimum ingredients
    const validRows = rows.filter(r => r.ingredientData && r.quantity_g > 0);
    if (validRows.length < 3) {
      toast({
        title: 'Not enough ingredients',
        description: 'Add at least 3 ingredients to create a balanced recipe',
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
            sugars_g: r.sugars_g,
            fat_g: r.fat_g,
            msnf_g: r.msnf_g,
            other_solids_g: r.other_solids_g,
            total_solids_g: r.total_solids_g
          }))
        );

      if (rowsError) throw rowsError;

      // Insert calculated metrics
      if (metrics) {
        const { error: metricsError } = await supabase
          .from('calculated_metrics')
          .insert({
            recipe_id: recipeId,
            total_quantity_g: metrics.total_g,
            total_sugars_g: metrics.totalSugars_g,
            total_fat_g: metrics.fat_g,
            total_msnf_g: metrics.msnf_g,
            total_other_solids_g: metrics.other_g,
            total_solids_g: metrics.ts_g,
            sugars_pct: metrics.totalSugars_pct,
            fat_pct: metrics.fat_pct,
            msnf_pct: metrics.msnf_pct,
            other_solids_pct: metrics.other_pct,
            total_solids_pct: metrics.ts_pct,
            sp: 0, // Legacy field
            pac: 0, // Legacy field
            fpdt: metrics.fpdt,
            pod_index: metrics.pod_index
          } as any);

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
          <CardTitle className="flex items-center gap-2">
            Recipe Details
            <Badge variant="outline" className="ml-auto">
              {productType === 'ice_cream' ? '🍦 Ice Cream' : productType === 'gelato' ? '🍨 Gelato' : productType === 'sorbet' ? '🍧 Sorbet' : '🧪 Paste'}
            </Badge>
          </CardTitle>
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
                <SelectContent className="bg-popover z-[100]">
                  <SelectItem value="ice_cream">🍦 Ice Cream</SelectItem>
                  <SelectItem value="gelato">🍨 Gelato</SelectItem>
                  <SelectItem value="sorbet">🍧 Sorbet</SelectItem>
                  <SelectItem value="paste">🧪 Paste</SelectItem>
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
            {rows.length === 0 && !showTemplates && (
              <div className="text-center py-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowTemplates(true)}
                  className="gap-2"
                >
                  <BookOpen className="h-5 w-5" />
                  Browse Recipe Templates
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Or add ingredients manually below
                </p>
              </div>
            )}

            {showTemplates && (
              <div className="mb-6">
                <RecipeTemplates
                  onSelectTemplate={loadTemplate}
                  onStartFromScratch={handleStartFromScratch}
                  availableIngredients={availableIngredients}
                />
              </div>
            )}

            {!showTemplates && (
              <>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Qty (g)</TableHead>
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
                      <Popover open={searchOpen === index} onOpenChange={(open) => setSearchOpen(open ? index : null)}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {row.ingredient || (
                              <>
                                <Search className="mr-2 h-4 w-4" />
                                Search ingredient...
                              </>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0 z-[100] bg-popover" align="start">
                          {loadingIngredients ? (
                            <div className="p-4 text-center">
                              <p className="text-sm text-muted-foreground">Loading ingredients...</p>
                            </div>
                          ) : availableIngredients.length === 0 ? (
                            <div className="p-4 text-center space-y-3">
                              <p className="text-sm text-destructive">No ingredients found</p>
                              <AddIngredientDialog 
                                onIngredientAdded={(ing) => {
                                  handleIngredientSelect(index, ing);
                                  setSearchOpen(null);
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <SmartIngredientSearch
                                ingredients={availableIngredients}
                                onSelect={(ing) => handleIngredientSelect(index, ing)}
                                open={searchOpen === index}
                                onOpenChange={(open) => setSearchOpen(open ? index : null)}
                              />
                              <div className="border-t p-2 bg-muted/50">
                                <AddIngredientDialog 
                                  onIngredientAdded={(ing) => {
                                    handleIngredientSelect(index, ing);
                                    setSearchOpen(null);
                                  }}
                                  trigger={
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="w-full justify-start text-sm"
                                      onClick={() => setSearchOpen(null)}
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Can't find it? Add new ingredient
                                    </Button>
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
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
                        value={row.sugars_g.toFixed(1)}
                        onChange={(e) => updateRow(index, 'sugars_g', parseFloat(e.target.value) || 0)}
                        className="bg-muted/50"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.fat_g.toFixed(1)}
                        onChange={(e) => updateRow(index, 'fat_g', parseFloat(e.target.value) || 0)}
                        className="bg-muted/50"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.msnf_g.toFixed(1)}
                        onChange={(e) => updateRow(index, 'msnf_g', parseFloat(e.target.value) || 0)}
                        className="bg-muted/50"
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
            
            <div className="flex gap-2 flex-wrap">
              <Button onClick={addRow} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Ingredient
              </Button>
              <Button onClick={calculateMetrics} variant="default" size="sm">
                <Calculator className="mr-2 h-4 w-4" />
                Calculate
              </Button>
              <Button 
                onClick={balanceRecipe} 
                disabled={isOptimizing || rows.length === 0}
                variant="secondary"
                size="sm"
              >
                {isOptimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Balance Recipe
              </Button>
              <Button onClick={saveRecipe} disabled={isSaving || !isAuthenticated} size="sm">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
              <Button onClick={clearRecipe} variant="ghost" size="sm">
                Clear
              </Button>
              {rows.length === 0 && (
                <Button onClick={() => setShowTemplates(true)} variant="outline" size="sm">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse Templates
                </Button>
              )}
            </div>
            </>
            )}
          </div>
        </CardContent>
      </Card>

      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Calculated Metrics (Science v2.1)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Batch</p>
                <p className="text-2xl font-bold">{metrics.total_g.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sugars</p>
                <Badge variant={metrics.totalSugars_pct >= 16 && metrics.totalSugars_pct <= 22 ? 'default' : 'destructive'}>
                  {metrics.totalSugars_pct.toFixed(1)}%
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fat</p>
                <Badge variant={metrics.fat_pct >= 6 && metrics.fat_pct <= 12 ? 'default' : 'destructive'}>
                  {metrics.fat_pct.toFixed(1)}%
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MSNF</p>
                <Badge variant={metrics.msnf_pct >= 10 && metrics.msnf_pct <= 25 ? 'default' : 'destructive'}>
                  {metrics.msnf_pct.toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Protein</p>
                <Badge variant="outline">{metrics.protein_pct.toFixed(1)}%</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lactose</p>
                <Badge variant="outline">{metrics.lactose_pct.toFixed(1)}%</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Solids</p>
                <Badge variant={metrics.ts_pct >= 36 && metrics.ts_pct <= 45 ? 'default' : 'destructive'}>
                  {metrics.ts_pct.toFixed(1)}%
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Water</p>
                <Badge variant="outline">{metrics.water_pct.toFixed(1)}%</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">FPDT (Freezing Point)</p>
                <Badge variant={metrics.fpdt >= 2.5 && metrics.fpdt <= 3.5 ? 'default' : 'destructive'}>
                  {metrics.fpdt.toFixed(2)}°C
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">POD Index (Sweetness)</p>
                <Badge variant="outline">{metrics.pod_index.toFixed(0)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SE (Sucrose Equiv)</p>
                <Badge variant="outline">{metrics.se_g.toFixed(1)}g</Badge>
              </div>
            </div>

            {metrics.warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-destructive">⚠️ Warnings & Recommendations:</p>
                {metrics.warnings.map((warning, i) => (
                  <Alert key={i} variant={warning.includes('⚠️') ? 'destructive' : 'default'}>
                    <AlertDescription className="text-xs">{warning}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {metrics.warnings.length === 0 && (
              <Alert>
                <AlertDescription className="text-sm font-medium text-green-700">
                  ✅ All parameters within target ranges! Recipe is balanced.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
