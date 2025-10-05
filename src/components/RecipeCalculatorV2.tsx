import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Plus, Minus, Save, Download, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { calcMetricsV2 } from '@/lib/calc.v2';
import { IngredientData } from '@/types/ingredients';
import { ModeSelector } from './ModeSelector';
import { MetricsDisplayV2 } from './MetricsDisplayV2';
import { EnhancedWarningsPanel } from './EnhancedWarningsPanel';
import { CompositionBar } from './CompositionBar';

// Sample ingredient library (in production, this would come from the database)
const INGREDIENT_LIBRARY: Record<string, IngredientData> = {
  'milk_3pct': {
    id: 'milk_3pct',
    name: 'Milk 3% Fat',
    category: 'dairy',
    water_pct: 88.5,
    fat_pct: 3,
    msnf_pct: 8.5,
    sugars_pct: 0,
    other_solids_pct: 0
  },
  'cream_35pct': {
    id: 'cream_35pct',
    name: 'Heavy Cream 35%',
    category: 'dairy',
    water_pct: 58,
    fat_pct: 35,
    msnf_pct: 5.5,
    sugars_pct: 0,
    other_solids_pct: 1.5
  },
  'smp': {
    id: 'smp',
    name: 'Skim Milk Powder',
    category: 'dairy',
    water_pct: 3.5,
    fat_pct: 1,
    msnf_pct: 93,
    sugars_pct: 0,
    other_solids_pct: 2.5
  },
  'sucrose': {
    id: 'sucrose',
    name: 'Sucrose (White Sugar)',
    category: 'sugar',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 100,
    other_solids_pct: 0
  },
  'dextrose': {
    id: 'dextrose',
    name: 'Dextrose',
    category: 'sugar',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 100,
    other_solids_pct: 0
  },
  'glucose_de60': {
    id: 'glucose_de60',
    name: 'Glucose Syrup DE60',
    category: 'sugar',
    water_pct: 20,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 80,
    other_solids_pct: 0
  },
  'stabilizer': {
    id: 'stabilizer',
    name: 'Stabilizer',
    category: 'other',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 0,
    other_solids_pct: 100
  },
  'emulsifier': {
    id: 'emulsifier',
    name: 'Emulsifier',
    category: 'other',
    water_pct: 0,
    fat_pct: 0,
    msnf_pct: 0,
    sugars_pct: 0,
    other_solids_pct: 100
  }
};

interface RecipeRow {
  ingredientId: string;
  grams: number;
}

const RecipeCalculatorV2 = () => {
  const [mode, setMode] = useState<'gelato' | 'kulfi'>('gelato');
  const [recipeName, setRecipeName] = useState('');
  const [rows, setRows] = useState<RecipeRow[]>([
    { ingredientId: 'milk_3pct', grams: 600 },
    { ingredientId: 'cream_35pct', grams: 200 },
    { ingredientId: 'smp', grams: 40 },
    { ingredientId: 'sucrose', grams: 140 },
    { ingredientId: 'dextrose', grams: 20 },
    { ingredientId: 'stabilizer', grams: 3 }
  ]);
  
  const { toast } = useToast();

  // Calculate metrics using v2.1 engine
  const metrics = useMemo(() => {
    const ingredientRows = rows.map(row => ({
      ing: INGREDIENT_LIBRARY[row.ingredientId],
      grams: row.grams
    })).filter(r => r.ing); // Filter out any missing ingredients
    
    if (ingredientRows.length === 0) {
      return null;
    }
    
    return calcMetricsV2(ingredientRows, { mode });
  }, [rows, mode]);

  const updateRow = (index: number, field: 'ingredientId' | 'grams', value: string | number) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], [field]: value };
      return newRows;
    });
  };

  const addRow = () => {
    setRows(prev => [...prev, { ingredientId: 'milk_3pct', grams: 100 }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "Recipe must have at least one ingredient",
        variant: "destructive"
      });
      return;
    }
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const adjustGrams = (index: number, delta: number) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[index].grams = Math.max(0, newRows[index].grams + delta);
      return newRows;
    });
  };

  const saveRecipe = () => {
    if (!recipeName.trim()) {
      toast({
        title: "Recipe Name Required",
        description: "Please enter a name for your recipe",
        variant: "destructive"
      });
      return;
    }

    // Save to localStorage for now (in production, save to Supabase)
    const savedRecipes = JSON.parse(localStorage.getItem('recipes') || '[]');
    savedRecipes.push({
      name: recipeName,
      mode,
      rows,
      metrics,
      savedAt: new Date().toISOString()
    });
    localStorage.setItem('recipes', JSON.stringify(savedRecipes));

    toast({
      title: "Recipe Saved",
      description: `${recipeName} has been saved successfully`
    });
    
    setRecipeName('');
  };

  const exportToCsv = () => {
    if (!metrics) return;
    
    const csvContent = [
      ['MeethaPitara Recipe - v2.1'],
      ['Recipe Name:', recipeName || 'Untitled'],
      ['Mode:', mode],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['INGREDIENTS'],
      ['Name', 'Amount (g)', 'Percentage'],
      ...rows.map(row => {
        const ing = INGREDIENT_LIBRARY[row.ingredientId];
        return [
          ing?.name || row.ingredientId,
          row.grams,
          ((row.grams / metrics.total_g) * 100).toFixed(2) + '%'
        ];
      }),
      [''],
      ['COMPOSITION METRICS'],
      ['Metric', 'Value', 'Unit', 'Target'],
      ['Total Mass', metrics.total_g.toFixed(2), 'g', ''],
      ['Fat', metrics.fat_pct.toFixed(2), '%', mode === 'gelato' ? '6-9' : '10-12'],
      ['MSNF', metrics.msnf_pct.toFixed(2), '%', mode === 'gelato' ? '10-12' : '18-25'],
      ['Protein', metrics.protein_pct.toFixed(2), '%', mode === 'kulfi' ? '6-9' : ''],
      ['Lactose', metrics.lactose_pct.toFixed(2), '%', '<11'],
      ['Total Sugars (incl. lactose)', metrics.totalSugars_pct.toFixed(2), '%', '16-22'],
      ['Non-Lactose Sugars', metrics.nonLactoseSugars_pct.toFixed(2), '%', ''],
      ['Water', metrics.water_pct.toFixed(2), '%', mode === 'gelato' ? '55-64' : ''],
      ['Total Solids', metrics.ts_pct.toFixed(2), '%', mode === 'gelato' ? '36-45' : '38-42'],
      [''],
      ['FREEZING POINT ANALYSIS'],
      ['FPDT (Total)', metrics.fpdt.toFixed(2), '°C', mode === 'gelato' ? '2.5-3.5' : '2.0-2.5'],
      ['FPDSE (from sugars)', metrics.fpdse.toFixed(2), '°C', ''],
      ['FPDSA (from salts)', metrics.fpdsa.toFixed(2), '°C', ''],
      ['SE (Sucrose Equivalents)', metrics.se_g.toFixed(2), 'g', ''],
      ['POD Index', metrics.pod_index.toFixed(2), '', '100-120'],
      [''],
      ['WARNINGS'],
      ...metrics.warnings.map(w => [w])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipeName || 'recipe'}_${mode}_v2.1.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Recipe Exported",
      description: "Recipe exported successfully with v2.1 metrics"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Recipe Calculator (v2.1 Science)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Recipe Name</Label>
              <Input
                placeholder="Enter recipe name..."
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button onClick={saveRecipe} disabled={!recipeName.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={exportToCsv} variant="outline" disabled={!metrics}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mode Selector */}
      <ModeSelector mode={mode} onChange={setMode} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ingredients Column */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row, index) => (
              <div key={index} className="space-y-2 pb-3 border-b last:border-0">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Ingredient {index + 1}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(index)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <Select
                  value={row.ingredientId}
                  onValueChange={(value) => updateRow(index, 'ingredientId', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(INGREDIENT_LIBRARY).map(ing => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustGrams(index, -10)}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={row.grams}
                    onChange={(e) => updateRow(index, 'grams', parseFloat(e.target.value) || 0)}
                    className="flex-1 text-center"
                    min="0"
                    step="1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustGrams(index, 10)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm text-muted-foreground">g</span>
                </div>
                
                {metrics && (
                  <div className="text-xs text-muted-foreground">
                    {((row.grams / metrics.total_g) * 100).toFixed(1)}% of total
                  </div>
                )}
              </div>
            ))}

            <Button onClick={addRow} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Ingredient
            </Button>
          </CardContent>
        </Card>

        {/* Composition & Warnings Column */}
        <div className="lg:col-span-2 space-y-6">
          {metrics ? (
            <>
              <CompositionBar metrics={metrics} />
              <MetricsDisplayV2 metrics={metrics} mode={mode} />
              <EnhancedWarningsPanel warnings={metrics.warnings} />
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Add ingredients to see metrics
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeCalculatorV2;
