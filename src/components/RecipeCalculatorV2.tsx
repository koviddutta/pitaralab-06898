import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Calculator, Plus, Minus, Save, Download, Trash2, Sparkles, TrendingUp, Bookmark, CheckCircle2, AlertTriangle, XCircle, ChefHat, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { calcMetricsV2 } from '@/lib/calc.v2';
import { optimizeRecipe } from '@/lib/optimize';
import { IngredientData } from '@/types/ingredients';
import { getAllIngredients } from '@/services/ingredientService';
import { saveRecipe as saveRecipeToDb, type RecipeRow as RecipeDBRow } from '@/services/recipeService';
import { databaseService } from '@/services/databaseService';
import { getSupabase } from '@/integrations/supabase/safeClient';
import { ModeSelector } from './ModeSelector';
import { MetricsDisplayV2 } from './MetricsDisplayV2';
import { EnhancedWarningsPanel } from './EnhancedWarningsPanel';
import { CompositionBar } from './CompositionBar';
import { AISuggestionDialog } from './AISuggestionDialog';
import { OptimizeDialog } from './OptimizeDialog';
import { WarningTooltip } from './WarningTooltip';
import { RecipeBrowserDrawer } from './RecipeBrowserDrawer';
import { RecipeCompareDialog } from './RecipeCompareDialog';
import { ProductionToggle } from './ProductionToggle';
import { MobileIngredientRow } from './MobileIngredientRow';
import { MobileActionBar } from './MobileActionBar';
import { CollapsibleSection } from './CollapsibleSection';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/use-mobile';
import { IngredientSearch } from './IngredientSearch';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { RecipeTemplates, resolveTemplateIngredients } from './RecipeTemplates';
import { FEATURES } from '@/config/features';

// Lazy load Science panel for better performance
const ScienceMetricsPanel = lazy(() => import('./ScienceMetricsPanel'));

interface RecipeRow {
  ingredientId: string;
  grams: number;
}

const RecipeCalculatorV2 = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<'gelato' | 'kulfi'>('gelato');
  const [recipeName, setRecipeName] = useState('');
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
  const [optimizedRows, setOptimizedRows] = useState<RecipeRow[]>([]);
  const [browserDrawerOpen, setBrowserDrawerOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [recipesToCompare, setRecipesToCompare] = useState<RecipeDBRow[]>([]);
  const [metricsVisible, setMetricsVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Production mode state from query param
  const isProductionMode = searchParams.get('production') === '1';
  
  // Debounced rows for performance
  const debouncedRows = useDebounce(rows, 300);
  
  const toggleProductionMode = (enabled: boolean) => {
    if (enabled) {
      searchParams.set('production', '1');
    } else {
      searchParams.delete('production');
    }
    setSearchParams(searchParams);
  };
  
  // Apply production mode class to body
  useEffect(() => {
    if (isProductionMode) {
      document.body.classList.add('production-mode');
    } else {
      document.body.classList.remove('production-mode');
    }
    return () => {
      document.body.classList.remove('production-mode');
    };
  }, [isProductionMode]);

  // Fetch ingredients from Supabase
  const { data: ingredientsArray = [], isLoading: isLoadingIngredients, error: ingredientsError } = useQuery({
    queryKey: ['ingredients'],
    queryFn: getAllIngredients,
    retry: 1, // Only retry once
    staleTime: 1000 * 60 * 5 // Cache for 5 minutes
  });

  // Fetch recipe count for badge
  const { data: myRecipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { getMyRecipes } = await import('@/services/recipeService');
      return getMyRecipes();
    },
    staleTime: 1000 * 60 * 1 // Cache for 1 minute
  });

  // Convert array to lookup object
  const INGREDIENT_LIBRARY = useMemo(() => {
    return ingredientsArray.reduce((acc, ing) => {
      acc[ing.id] = ing;
      return acc;
    }, {} as Record<string, IngredientData>);
  }, [ingredientsArray]);

  // Load draft from localStorage or show empty state
  useEffect(() => {
    if (isLoadingIngredients || ingredientsArray.length === 0) return;

    const draft = databaseService.loadDraftRecipe();
    if (draft && draft.rows && draft.rows.length > 0) {
      setRows(draft.rows);
      setRecipeName(draft.name || '');
      setMode(draft.mode || 'gelato');
      toast({
        title: "Draft Restored",
        description: "Your previous draft has been restored"
      });
    }
    // Don't set default ingredients - let empty state handle it
  }, [isLoadingIngredients, ingredientsArray, toast]);

  // Autosave draft every 30 seconds
  useEffect(() => {
    if (rows.length === 0) return;
    
    const autosaveInterval = setInterval(() => {
      databaseService.saveDraftRecipe({ name: recipeName, rows, mode });
    }, 30000); // 30 seconds

    return () => clearInterval(autosaveInterval);
  }, [recipeName, rows, mode]);

  // Calculate metrics using v2.1 engine with debounced rows
  const metrics = useMemo(() => {
    const ingredientRows = debouncedRows.map(row => ({
      ing: INGREDIENT_LIBRARY[row.ingredientId],
      grams: row.grams
    })).filter(r => r.ing); // Filter out any missing ingredients
    
    if (ingredientRows.length === 0) {
      return null;
    }
    
    return calcMetricsV2(ingredientRows, { mode });
  }, [debouncedRows, mode, INGREDIENT_LIBRARY]);

  // Calculate sugar breakdown for visualization
  const sugarBreakdown = useMemo(() => {
    const breakdown = {
      sucrose: 0,
      dextrose: 0,
      fructose: 0,
      lactose: metrics?.lactose_g || 0,
      other: 0
    };

    rows.forEach(row => {
      const ing = INGREDIENT_LIBRARY[row.ingredientId];
      if (!ing) return;

      const sugars_g = row.grams * (ing.sugars_pct || 0) / 100;
      if (sugars_g <= 0) return;

      const id = (ing.id || '').toLowerCase();
      const name = (ing.name || '').toLowerCase();

      // Handle fruit with sugar split
      if (ing.category === 'fruit' && ing.sugar_split) {
        const s = ing.sugar_split;
        const norm = (s.glucose ?? 0) + (s.fructose ?? 0) + (s.sucrose ?? 0) || 100;
        breakdown.dextrose += sugars_g * ((s.glucose ?? 0) / norm);
        breakdown.fructose += sugars_g * ((s.fructose ?? 0) / norm);
        breakdown.sucrose += sugars_g * ((s.sucrose ?? 0) / norm);
      } else if (id.includes('dextrose') || name.includes('dextrose') || 
                 (id.includes('glucose') && !id.includes('syrup')) || 
                 (name.includes('glucose') && !name.includes('syrup'))) {
        breakdown.dextrose += sugars_g;
      } else if (id.includes('fructose') || name.includes('fructose')) {
        breakdown.fructose += sugars_g;
      } else if (id.includes('glucose_syrup') || name.includes('glucose syrup')) {
        // For glucose syrup, split based on DE
        const deMatch = (id + name).match(/de\s*(\d+)/i);
        const de = deMatch ? parseInt(deMatch[1]) : 60;
        breakdown.dextrose += sugars_g * (de / 100);
        breakdown.other += sugars_g * (1 - de / 100);
      } else if (id.includes('invert') || name.includes('invert')) {
        breakdown.dextrose += sugars_g * 0.5;
        breakdown.fructose += sugars_g * 0.5;
      } else {
        breakdown.sucrose += sugars_g;
      }
    });

    return breakdown;
  }, [rows, metrics, INGREDIENT_LIBRARY]);

  // Calculate recipe health status
  const recipeStatus = useMemo(() => {
    if (!metrics) return { status: 'none', message: '', icon: null };

    const issues: string[] = [];
    const warnings: string[] = [];

    // Critical checks (FPDT out of range)
    const [fpdtLo, fpdtHi] = mode === 'gelato' ? [2.5, 3.5] : [2.0, 2.5];
    if (metrics.fpdt < fpdtLo || metrics.fpdt > fpdtHi) {
      issues.push(`FPDT ${metrics.fpdt.toFixed(2)}°C is out of target range (${fpdtLo}-${fpdtHi}°C)`);
    }

    // Check total solids
    const [tsMin, tsMax] = mode === 'gelato' ? [36, 45] : [38, 42];
    if (metrics.ts_pct < tsMin || metrics.ts_pct > tsMax) {
      issues.push(`Total solids ${metrics.ts_pct.toFixed(1)}% outside ${tsMin}-${tsMax}%`);
    }

    // Warning checks
    if (metrics.lactose_pct > 11) {
      warnings.push(`Lactose ${metrics.lactose_pct.toFixed(1)}% exceeds 11% (sandiness risk)`);
    }

    if (mode === 'gelato') {
      if (metrics.fat_pct < 6 || metrics.fat_pct > 9) {
        warnings.push(`Fat ${metrics.fat_pct.toFixed(1)}% outside 6-9% gelato range`);
      }
      if (metrics.msnf_pct < 10 || metrics.msnf_pct > 12) {
        warnings.push(`MSNF ${metrics.msnf_pct.toFixed(1)}% outside 10-12% gelato range`);
      }
    } else {
      if (metrics.fat_pct < 10 || metrics.fat_pct > 12) {
        warnings.push(`Fat ${metrics.fat_pct.toFixed(1)}% outside 10-12% kulfi range`);
      }
      if (metrics.msnf_pct < 18 || metrics.msnf_pct > 25) {
        warnings.push(`MSNF ${metrics.msnf_pct.toFixed(1)}% outside 18-25% kulfi range`);
      }
    }

    if (issues.length > 0) {
      return {
        status: 'critical',
        message: issues.join('; '),
        icon: <XCircle className="h-5 w-5 text-destructive" />
      };
    }

    if (warnings.length > 0) {
      return {
        status: 'warning',
        message: warnings.join('; '),
        icon: <AlertTriangle className="h-5 w-5 text-warning" />
      };
    }

    return {
      status: 'success',
      message: 'All parameters in target range',
      icon: <CheckCircle2 className="h-5 w-5 text-success" />
    };
  }, [metrics, mode]);

  const updateRow = (index: number, field: 'ingredientId' | 'grams', value: string | number) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], [field]: value };
      return newRows;
    });
  };

  const addRow = (ingredient?: IngredientData) => {
    const ing = ingredient || ingredientsArray[0];
    if (!ing) return;
    setRows(prev => [...prev, { ingredientId: ing.id, grams: 100 }]);
    setSearchOpen(false);
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

  const saveRecipe = async () => {
    if (!recipeName.trim()) {
      toast({
        title: "Recipe Name Required",
        description: "Please enter a name for your recipe",
        variant: "destructive"
      });
      return;
    }

    if (!metrics) {
      toast({
        title: "No Metrics",
        description: "Add ingredients to calculate metrics before saving",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveRecipeToDb({
        name: recipeName,
        rows_json: rows,
        metrics,
        product_type: mode
      });

      // Clear draft after successful save
      databaseService.clearDraftRecipe();

      toast({
        title: "Recipe Saved",
        description: `${recipeName} saved successfully`,
        duration: 5000
      });
      
      setRecipeName('');
      setRows([]);
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save recipe",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadRecipe = (recipe: RecipeDBRow) => {
    setRecipeName(recipe.name);
    setMode(recipe.product_type as 'gelato' | 'kulfi');
    setRows(Array.isArray(recipe.rows_json) ? recipe.rows_json : []);
    toast({ title: "Recipe Loaded", description: `${recipe.name} loaded successfully` });
  };

  const handleDuplicateRecipe = (recipe: RecipeDBRow) => {
    setRecipeName(`${recipe.name} (Copy)`);
    setMode(recipe.product_type as 'gelato' | 'kulfi');
    setRows(Array.isArray(recipe.rows_json) ? recipe.rows_json : []);
    toast({ title: "Recipe Duplicated", description: "Edit and save to create a new version" });
  };

  const handleCompareRecipes = (recipes: RecipeDBRow[]) => {
    setRecipesToCompare(recipes);
    setCompareDialogOpen(true);
    setBrowserDrawerOpen(false);
  };

  const handleAISuggest = async () => {
    if (rows.length === 0) {
      toast({
        title: "No Recipe",
        description: "Add ingredients first before getting AI suggestions",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingSuggestions(true);
    setAiSuggestionsOpen(true);
    setAiSuggestions([]);

    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.functions.invoke('suggest-ingredient', {
        body: { rows, mode }
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast({
            title: "Rate Limit Exceeded",
            description: "You can make 10 AI suggestions per hour. Please try again later.",
            variant: "destructive"
          });
        } else {
          throw new Error(data.error);
        }
        setAiSuggestionsOpen(false);
        return;
      }

      setAiSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast({
        title: "AI Suggestion Failed",
        description: error instanceof Error ? error.message : "Failed to get suggestions",
        variant: "destructive"
      });
      setAiSuggestionsOpen(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleAddSuggestion = async (suggestion: any) => {
    // Try to find matching ingredient
    const matchingIng = Object.values(INGREDIENT_LIBRARY).find(
      ing => ing.name.toLowerCase().includes(suggestion.ingredient.toLowerCase()) ||
             suggestion.ingredient.toLowerCase().includes(ing.name.toLowerCase())
    );

    if (matchingIng) {
      setRows(prev => [...prev, { ingredientId: matchingIng.id, grams: suggestion.grams }]);
      
      // Log telemetry for accepted suggestion
      try {
        const supabase = await getSupabase();
        await supabase.from('ai_suggestion_events').insert({
          ingredient: suggestion.ingredient,
          reason: suggestion.reason,
          accepted: true
        });
      } catch (error) {
        console.error('Failed to log suggestion telemetry:', error);
        // Non-blocking - don't show error to user
      }
      
      toast({
        title: "Ingredient Added",
        description: `Added ${matchingIng.name} (${suggestion.grams}g)`
      });
    } else {
      toast({
        title: "Ingredient Not Found",
        description: `Could not find "${suggestion.ingredient}" in library. Add it manually.`,
        variant: "destructive"
      });
    }
  };

  const handleOptimize = () => {
    if (!metrics || rows.length === 0) {
      toast({
        title: "Cannot Optimize",
        description: "Add ingredients first",
        variant: "destructive"
      });
      return;
    }

    // Convert to optimize format
    const optimizeRows = rows.map(row => ({
      ing: INGREDIENT_LIBRARY[row.ingredientId],
      grams: row.grams
    }));

    // Set targets based on mode
    const targets = mode === 'gelato' 
      ? { fat_pct: 7.5, msnf_pct: 11, sugars_pct: 19, ts_add_pct: 40 }
      : { fat_pct: 11, msnf_pct: 21.5, sugars_pct: 19, ts_add_pct: 40 };

    const optimized = optimizeRecipe(optimizeRows, targets, 100, 1);
    
    setOptimizedRows(optimized.map(r => ({ ingredientId: r.ing.id, grams: r.grams })));
    setOptimizeDialogOpen(true);
  };

  const applyOptimization = () => {
    setRows(optimizedRows);
    toast({
      title: "Recipe Optimized",
      description: "Applied AI optimization to your recipe"
    });
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

  const handleLoadTemplate = (template: any) => {
    const resolvedRows = resolveTemplateIngredients(template, ingredientsArray);
    setRows(resolvedRows);
    setRecipeName(template.name);
    setMode(template.mode);
    toast({
      title: "Template Loaded",
      description: `${template.name} recipe loaded successfully`
    });
  };

  const handleStartFromScratch = () => {
    const findIngredientByTag = (tag: string) => 
      ingredientsArray.find(ing => ing.tags?.includes(tag));

    setRows([
      { ingredientId: findIngredientByTag('id:milk_3')?.id || ingredientsArray[0]?.id || '', grams: 600 },
      { ingredientId: findIngredientByTag('id:heavy_cream')?.id || ingredientsArray[1]?.id || '', grams: 200 },
      { ingredientId: findIngredientByTag('id:smp')?.id || ingredientsArray[2]?.id || '', grams: 40 },
      { ingredientId: findIngredientByTag('id:sucrose')?.id || ingredientsArray[3]?.id || '', grams: 140 },
      { ingredientId: findIngredientByTag('id:dextrose')?.id || ingredientsArray[4]?.id || '', grams: 20 },
      { ingredientId: findIngredientByTag('id:stabilizer')?.id || ingredientsArray[5]?.id || '', grams: 3 }
    ].filter(row => row.ingredientId));
    setRecipeName('');
  };

  if (isLoadingIngredients && !ingredientsError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ingredients...</p>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no ingredients or if there was an error
  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        {ingredientsError && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Unable to load ingredients from database. Backend features may be temporarily unavailable.
              </p>
            </CardContent>
          </Card>
        )}
        <RecipeTemplates
          onSelectTemplate={handleLoadTemplate}
          onStartFromScratch={handleStartFromScratch}
          availableIngredients={ingredientsArray}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Sticky on mobile */}
      <Card className={isMobile ? 'sticky top-0 z-40 shadow-md' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              <span className={isMobile ? 'text-base' : ''}>Recipe Calculator {!isMobile && '(v2.1 Science)'}</span>
            </div>
            <div className="flex items-center gap-3">
              {FEATURES.PRODUCTION_MODE && !isMobile && (
                <ProductionToggle 
                  isProduction={isProductionMode} 
                  onToggle={toggleProductionMode} 
                />
              )}
              {metrics && recipeStatus.status !== 'none' && !isMobile && (
                <div className="flex items-center gap-2">
                  {recipeStatus.icon}
                  <WarningTooltip warning={recipeStatus.message} />
                </div>
              )}
            </div>
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
                className={isMobile ? 'h-11' : ''}
              />
            </div>
            <div className={`flex flex-wrap gap-2 items-end ${isProductionMode || isMobile ? 'hidden' : ''}`}>
              <Button 
                onClick={saveRecipe} 
                disabled={!recipeName.trim() || isSaving || !metrics}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                onClick={() => setBrowserDrawerOpen(true)} 
                variant="outline"
                className="relative"
              >
                <Bookmark className="h-4 w-4 mr-2" />
                My Recipes
                {myRecipes.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {myRecipes.length}
                  </span>
                )}
              </Button>
              <Button onClick={exportToCsv} variant="outline" disabled={!metrics}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              {FEATURES.AI_SUGGESTIONS && (
                <>
                  <Button 
                    onClick={handleAISuggest} 
                    variant="secondary"
                    disabled={rows.length === 0}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Suggest
                  </Button>
                  <Button 
                    onClick={handleOptimize} 
                    variant="secondary"
                    disabled={!metrics}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Optimize
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mode Selector */}
      <ModeSelector mode={mode} onChange={setMode} />

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-3'} gap-6 ${isMobile ? 'pb-20' : ''}`}>
        {/* Ingredients Column */}
        {isMobile ? (
          <CollapsibleSection title="Ingredients" defaultOpen={true} icon={<ChefHat className="h-5 w-5" />}>
            <div className="space-y-3">
              {rows.map((row, index) => (
                <MobileIngredientRow
                  key={index}
                  index={index}
                  ingredientId={row.ingredientId}
                  grams={row.grams}
                  ingredients={INGREDIENT_LIBRARY}
                  percentage={metrics ? ((row.grams / metrics.total_g) * 100).toFixed(1) : undefined}
                  onUpdate={updateRow}
                  onAdjust={adjustGrams}
                  onRemove={removeRow}
                  isProductionMode={isProductionMode}
                />
              ))}
            </div>
          </CollapsibleSection>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ingredients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows.map((row, index) => {
                const ing = INGREDIENT_LIBRARY[row.ingredientId];
                return (
                  <div key={index} className="space-y-2 pb-3 border-b last:border-0">
                    {isProductionMode ? (
                      // Production Mode: Large, readable format
                      <div className="py-2">
                        <div className="ingredient-name mb-1">{ing?.name || row.ingredientId}</div>
                        <div className="ingredient-qty">{row.grams}g</div>
                        {metrics && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {((row.grams / metrics.total_g) * 100).toFixed(1)}% of batch
                          </div>
                        )}
                      </div>
                    ) : (
                      // Normal Mode: Full editor
                      <>
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
                      </>
                    )}
                  </div>
                );
              })}

              {!isProductionMode && (
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Ingredient
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <IngredientSearch
                      ingredients={ingredientsArray}
                      onSelect={addRow}
                      open={searchOpen}
                      onOpenChange={setSearchOpen}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </CardContent>
          </Card>
        )}

        {/* Composition & Warnings Column */}
        {isMobile ? (
          <CollapsibleSection 
            title="Metrics" 
            defaultOpen={metricsVisible} 
            icon={<Activity className="h-5 w-5" />}
          >
            {metrics ? (
              <div className="space-y-4">
                {isProductionMode ? (
                  // Production Mode: Only key metrics in large format
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="metric-label mb-2">Total Solids</div>
                      <div className="metric-value">{metrics.ts_pct.toFixed(1)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="metric-label mb-2">Fat</div>
                      <div className="metric-value">{metrics.fat_pct.toFixed(1)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="metric-label mb-2">FPDT</div>
                      <div className="metric-value">{metrics.fpdt.toFixed(2)}°C</div>
                    </div>
                  </div>
                ) : (
                  // Normal Mode: Full metrics
                  <>
                    <CompositionBar metrics={metrics} />
                    <MetricsDisplayV2 metrics={metrics} mode={mode} />
                    <div className="warnings-panel">
                      <EnhancedWarningsPanel warnings={metrics.warnings} />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Add ingredients to see metrics
              </div>
            )}
          </CollapsibleSection>
        ) : (
          <div className="lg:col-span-2 space-y-6">
            {metrics ? (
              <>
                {isProductionMode ? (
                  // Production Mode: Only key metrics in large format
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="metric-label mb-2">Total Solids</div>
                          <div className="metric-value">{metrics.ts_pct.toFixed(1)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="metric-label mb-2">Fat</div>
                          <div className="metric-value">{metrics.fat_pct.toFixed(1)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="metric-label mb-2">FPDT</div>
                          <div className="metric-value">{metrics.fpdt.toFixed(2)}°C</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  // Normal Mode: Full metrics
                  <>
                    <CompositionBar metrics={metrics} />
                    <MetricsDisplayV2 metrics={metrics} mode={mode} />
                    <div className="warnings-panel">
                      <EnhancedWarningsPanel warnings={metrics.warnings} />
                    </div>
                  </>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Add ingredients to see metrics
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Science Metrics Visualization - Below ingredient table */}
      {FEATURES.SCIENCE_PANEL && metrics && !isProductionMode && (
        <Suspense fallback={
          <Card className="science-metrics">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading science metrics...</p>
            </CardContent>
          </Card>
        }>
          <Card className="science-metrics">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Science Metrics
                {recipeStatus.status !== 'none' && (
                  <div className="flex items-center gap-2">
                    {recipeStatus.icon}
                    <WarningTooltip warning={recipeStatus.message} />
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScienceMetricsPanel
                podIndex={metrics.pod_index || 0}
                fpdt={metrics.fpdt || 0}
                mode={mode}
                sugars={{
                  sucrose_g: sugarBreakdown.sucrose,
                  dextrose_g: sugarBreakdown.dextrose,
                  fructose_g: sugarBreakdown.fructose,
                  lactose_g: sugarBreakdown.lactose
                }}
                composition={{
                  waterPct: metrics.water_pct,
                  fatPct: metrics.fat_pct,
                  msnfPct: metrics.msnf_pct,
                  sugarsPct: metrics.totalSugars_pct,
                  otherPct: metrics.other_pct
                }}
              />
            </CardContent>
          </Card>
        </Suspense>
      )}

      {/* Mobile Action Bar */}
      {isMobile && !isProductionMode && (
        <MobileActionBar
          onAddIngredient={() => setSearchOpen(true)}
          onViewMetrics={() => setMetricsVisible(true)}
          onSave={saveRecipe}
          canSave={!!recipeName.trim() && !!metrics}
          isSaving={isSaving}
        />
      )}

      {/* Search Popover for Mobile */}
      {isMobile && (
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverContent className="w-[90vw] p-0 mx-4" align="center">
            <IngredientSearch
              ingredients={ingredientsArray}
              onSelect={addRow}
              open={searchOpen}
              onOpenChange={setSearchOpen}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* AI Dialogs */}
      <AISuggestionDialog
        open={aiSuggestionsOpen}
        onOpenChange={setAiSuggestionsOpen}
        suggestions={aiSuggestions}
        onAddSuggestion={handleAddSuggestion}
        isLoading={isLoadingSuggestions}
      />

      <OptimizeDialog
        open={optimizeDialogOpen}
        onOpenChange={setOptimizeDialogOpen}
        originalRows={rows}
        optimizedRows={optimizedRows}
        onApply={applyOptimization}
        getIngredientName={(id) => INGREDIENT_LIBRARY[id]?.name || id}
      />

      <RecipeBrowserDrawer
        open={browserDrawerOpen}
        onOpenChange={setBrowserDrawerOpen}
        onLoad={handleLoadRecipe}
        onDuplicate={handleDuplicateRecipe}
        onCompare={handleCompareRecipes}
      />

      <RecipeCompareDialog
        open={compareDialogOpen}
        onOpenChange={setCompareDialogOpen}
        recipes={recipesToCompare}
      />
    </div>
  );
};

export default RecipeCalculatorV2;
