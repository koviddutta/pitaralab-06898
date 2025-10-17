import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Calculator, Plus, Minus, Save, Download, Trash2, Sparkles, TrendingUp, Bookmark, CheckCircle2, AlertTriangle, XCircle, ChefHat, Activity, Check, History, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { calcMetricsV2 } from '@/lib/calc.v2';
import { optimizeRecipe } from '@/lib/optimize';
import { showApiErrorToast } from '@/lib/ui/errors';
import { IngredientData } from '@/types/ingredients';
import { getAllIngredients } from '@/services/ingredientService';
import { saveRecipe as saveRecipeToDb, type RecipeRow as RecipeDBRow, RecipeService } from '@/services/recipeService';
import { databaseService } from '@/services/databaseService';
import { getSupabase } from '@/integrations/supabase/safeClient';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import { logEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { ModeSelector } from './ModeSelector';
import { MetricsDisplayV2 } from './MetricsDisplayV2';
import { EnhancedWarningsPanel } from './EnhancedWarningsPanel';
import { CompositionBar } from './CompositionBar';
import { AISuggestionDialog } from './AISuggestionDialog';
import { OptimizeDialog } from './OptimizeDialog';
import { WarningTooltip } from './WarningTooltip';
import { RecipeBrowserDrawer } from './RecipeBrowserDrawer';
import { RecipeCompareDialog } from './RecipeCompareDialog';
import { RecipeHistoryDrawer } from './RecipeHistoryDrawer';
import { ProductionToggle } from './ProductionToggle';
import { MobileIngredientRow } from './MobileIngredientRow';
import { MobileActionBar } from './MobileActionBar';
import { CollapsibleSection } from './CollapsibleSection';
import { AIInsightsPanel } from './AIInsightsPanel';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/use-mobile';
import { SmartIngredientSearch } from './SmartIngredientSearch';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { RecipeTemplates, resolveTemplateIngredients } from './RecipeTemplates';
import { FEATURES } from '@/config/features';
import { AIUsageCounter } from './AIUsageCounter';
import MilkCreamConverter from './MilkCreamConverter';
import SugarSpectrumBalance from './SugarSpectrumBalance';
import DEEffectsPanel from './DEEffectsPanel';

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
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [lastSavedName, setLastSavedName] = useState('');
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
  const [optimizedRows, setOptimizedRows] = useState<RecipeRow[]>([]);
  const [preOptimizeSnapshot, setPreOptimizeSnapshot] = useState<RecipeRow[] | null>(null);
  const [browserDrawerOpen, setBrowserDrawerOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [recipesToCompare, setRecipesToCompare] = useState<RecipeDBRow[]>([]);
  const [versionsToCompare, setVersionsToCompare] = useState<any[]>([]);
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

  // Auto-suggest recipe name based on main ingredient
  const suggestedName = useMemo(() => {
    if (recipeName.trim()) return recipeName;
    
    const mainIngredient = rows[0] ? INGREDIENT_LIBRARY[rows[0].ingredientId] : null;
    if (!mainIngredient) return '';
    
    // Extract key ingredient name (remove common prefixes/suffixes)
    const cleanName = mainIngredient.name
      .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses content
      .replace(/\s*(powder|paste|extract)\s*$/i, '') // Remove common suffixes
      .trim();
    
    return `${cleanName} ${mode === 'gelato' ? 'Gelato' : 'Kulfi'}`;
  }, [rows, INGREDIENT_LIBRARY, mode, recipeName]);

  // Fetch recipe versions when recipe is loaded
  const { data: versions = [], refetch: refetchVersions } = useQuery({
    queryKey: ['recipe-versions', recipeId],
    queryFn: () => recipeId ? RecipeService.getRecipeVersions(recipeId) : Promise.resolve([]),
    enabled: !!recipeId,
  });

  // Check if recipe exists (for version tracking)
  const existingRecipe = useMemo(() => {
    if (!recipeName.trim()) return null;
    return myRecipes.find(r => r.name.toLowerCase() === recipeName.trim().toLowerCase());
  }, [recipeName, myRecipes]);

  const saveRecipe = async () => {
    const finalName = recipeName.trim() || suggestedName;
    
    if (!finalName) {
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
      // Use RecipeService which handles versioning
      const result = recipeId 
        ? await RecipeService.updateRecipe(recipeId, {
            name: finalName,
            rows: rows.map(r => ({ ingredientId: r.ingredientId, grams: r.grams })),
            metrics,
          })
        : await RecipeService.saveRecipe({
            name: finalName,
            rows: rows.map(r => ({ ingredientId: r.ingredientId, grams: r.grams })),
            metrics,
            product_type: mode,
          });

      // Update state with new version info
      setRecipeId(result.recipeId);
      setCurrentVersion(result.versionNumber);

      // Clear draft after successful save
      databaseService.clearDraftRecipe();

      // Refetch versions
      if (result.recipeId) {
        await refetchVersions();
      }

      // Show success animation
      setLastSavedName(finalName);
      setShowSaveSuccess(true);
      setSavePopoverOpen(false);
      
      toast({
        title: "Recipe Saved",
        description: `Saved as version ${result.versionNumber}`,
      });
      
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 3000);
      
      // Don't clear the recipe after saving - keep it for further edits
    } catch (error) {
      console.error('Error saving recipe:', error);
      showApiErrorToast(error, "Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadRecipe = (recipe: RecipeDBRow) => {
    setRecipeName(recipe.name);
    setRecipeId(recipe.id || null);
    setMode(recipe.product_type as 'gelato' | 'kulfi');
    setRows(Array.isArray(recipe.rows_json) ? recipe.rows_json : []);
    toast({ title: "Recipe Loaded", description: `${recipe.name} loaded successfully` });
  };

  const handleRestoreVersion = async (version: any) => {
    setRows(Array.isArray(version.rows_json) ? version.rows_json : []);
    setCurrentVersion(version.version_number);
    setVersionsOpen(false);
    toast({ 
      title: "Version Restored", 
      description: `Restored to version ${version.version_number}` 
    });
  };

  const handleDuplicateRecipe = (recipe: RecipeDBRow) => {
    setRecipeName(`${recipe.name} (Copy)`);
    setMode(recipe.product_type as 'gelato' | 'kulfi');
    setRows(Array.isArray(recipe.rows_json) ? recipe.rows_json : []);
    toast({ title: "Recipe Duplicated", description: "Edit and save to create a new version" });
  };

  const handleCompareRecipes = (recipes: RecipeDBRow[]) => {
    setRecipesToCompare(recipes);
    setVersionsToCompare([]); // Clear version comparison
    setCompareDialogOpen(true);
    setBrowserDrawerOpen(false);
  };

  const handleCompareVersions = (versions: any[]) => {
    setVersionsToCompare(versions);
    setRecipesToCompare([]); // Clear recipe comparison
    setCompareDialogOpen(true);
    setHistoryDrawerOpen(false);
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

    logEvent(ANALYTICS_EVENTS.AI_SUGGEST_OPEN, { 
      ingredient_count: rows.length,
      mode 
    });

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
        // Treat data.error as an error response with status code hints
        const errorObj = { 
          message: data.error,
          status: data.error.includes('Rate limit') ? 429 : 
                  data.error.includes('credits') || data.error.includes('Payment') ? 402 : 500
        };
        showApiErrorToast(errorObj, "AI Suggestion Failed");
        setAiSuggestionsOpen(false);
        return;
      }

      setAiSuggestions(data.suggestions || []);
      
      if (!data.suggestions || data.suggestions.length === 0) {
        toast({
          title: "No Suggestions",
          description: "AI couldn't generate suggestions for this recipe. Try adding more ingredients.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      showApiErrorToast(error, "AI Suggestion Failed");
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
      logEvent(ANALYTICS_EVENTS.AI_SUGGEST_ACCEPT, {
        ingredient: suggestion.ingredient,
        grams: suggestion.grams
      });
      
      toast({
        title: "Ingredient Added",
        description: `Added ${matchingIng.name} (${suggestion.grams}g)`
      });
    } else {
      logEvent(ANALYTICS_EVENTS.AI_SUGGEST_DISMISS, {
        ingredient: suggestion.ingredient,
        reason: 'not_found'
      });
      
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

    logEvent(ANALYTICS_EVENTS.OPTIMIZE_OPEN, {
      ingredient_count: rows.length,
      mode
    });

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
    logEvent(ANALYTICS_EVENTS.OPTIMIZE_APPLY, {
      original_count: rows.length,
      optimized_count: optimizedRows.length
    });
    
    setRows(optimizedRows);
    toast({
      title: "Recipe Optimized",
      description: "Applied optimization to your recipe. Use Undo to revert if needed."
    });
  };

  const undoOptimization = () => {
    if (preOptimizeSnapshot) {
      setRows([...preOptimizeSnapshot]);
      setPreOptimizeSnapshot(null);
      toast({
        title: "Optimization Reverted",
        description: "Recipe restored to pre-optimization state"
      });
    }
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

  // Don't show loading state on initial load to prevent flicker
  if (isLoadingIngredients && !ingredientsError && ingredientsArray.length === 0) {
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
          {/* Recipe Name with Version Badge */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Recipe name..."
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              onBlur={async () => {
                if (recipeName.trim() && recipeId && metrics) {
                  await saveRecipe();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && recipeName.trim() && metrics) {
                  saveRecipe();
                }
              }}
              className="flex-1"
            />
            {recipeId && (
              <Badge variant="secondary" className="whitespace-nowrap">
                v{currentVersion}
              </Badge>
            )}
            {recipeId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setHistoryDrawerOpen(true)}
                title="View version history"
              >
                <History className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex gap-2 items-center">
            {/* Toolbar Actions */}
            <div className={`flex gap-2 ${isProductionMode || isMobile ? 'hidden' : ''}`}>
              {/* Save Button with Popover */}
              <Popover open={savePopoverOpen} onOpenChange={setSavePopoverOpen}>
                <Button 
                  onClick={() => {
                    if (!recipeName.trim()) {
                      setSavePopoverOpen(true);
                    } else {
                      saveRecipe();
                    }
                  }}
                  disabled={isSaving || !metrics}
                  variant={showSaveSuccess ? "default" : "outline"}
                >
                  {showSaveSuccess ? (
                    <>
                      <Check className="h-4 w-4 mr-2 animate-scale-in" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </>
                  )}
                </Button>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">Save Recipe</h4>
                      <p className="text-xs text-muted-foreground">
                        Enter a name for your recipe
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipe-name" className="text-xs">Recipe Name</Label>
                      <Input
                        id="recipe-name"
                        placeholder={suggestedName}
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isSaving) {
                            saveRecipe();
                          }
                        }}
                        autoFocus
                      />
                      {!recipeName && suggestedName && (
                        <p className="text-xs text-muted-foreground">
                          💡 Suggested: {suggestedName}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={saveRecipe}
                        disabled={isSaving || !metrics}
                        size="sm"
                        className="flex-1"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button 
                        onClick={() => setSavePopoverOpen(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Success Toast */}
              {showSaveSuccess && (
                <div className="absolute top-16 left-4 z-50 animate-fade-in">
                  <Card className="border-green-500 bg-green-50">
                    <CardContent className="p-3 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        Saved as {lastSavedName}
                      </span>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* My Recipes - Prominent in toolbar */}
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
                  
                  {preOptimizeSnapshot && (
                    <Button 
                      onClick={undoOptimization} 
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Undo
                    </Button>
                  )}
                  
                  {/* AI Usage Counter */}
                  <AIUsageCounter compact />
                </>
              )}
            </div>

            {/* Recipe name display when saved */}
            {recipeName && (
              <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{recipeName}</span>
                {existingRecipe && (
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                    v{(existingRecipe as any).version_number || 1}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mode Selector */}
      <ModeSelector mode={mode} onChange={setMode} />

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-3'} gap-6 ${isMobile ? 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))]' : ''}`}>
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
                  <PopoverContent className="w-[450px] p-0 z-50 bg-background" align="start">
                    <SmartIngredientSearch
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
                      <EnhancedWarningsPanel 
                        warnings={metrics.warnings} 
                        onRequestAIHelp={handleAISuggest}
                        mode={mode}
                        metrics={metrics}
                      />
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
                      <EnhancedWarningsPanel 
                        warnings={metrics.warnings}
                        onRequestAIHelp={handleAISuggest}
                        mode={mode}
                        metrics={metrics}
                      />
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

      {/* AI Insights Panel */}
      {!isProductionMode && metrics && (
        <AIInsightsPanel recipe={rows} />
      )}

      {/* Enhanced Tools */}
      {!isProductionMode && metrics && (
        <>
          <CollapsibleSection 
            title="Milk & Cream Converter" 
            defaultOpen={false}
            icon={<Calculator className="h-5 w-5" />}
          >
            <MilkCreamConverter />
          </CollapsibleSection>

          <CollapsibleSection 
            title="Sugar Spectrum Optimizer" 
            defaultOpen={false}
            icon={<TrendingUp className="h-5 w-5" />}
          >
            <SugarSpectrumBalance
              totalSugarGrams={metrics.totalSugars_pct * metrics.total_g / 100}
              onApply={(blend) => {
                // Find and replace sugar ingredients
                const nonSugarRows = rows.filter(r => {
                  const ing = INGREDIENT_LIBRARY[r.ingredientId];
                  return ing?.category !== 'sugar';
                });
                
                const sucroseId = Object.values(INGREDIENT_LIBRARY).find(i => i.name.toLowerCase().includes('sucrose'))?.id;
                const dextroseId = Object.values(INGREDIENT_LIBRARY).find(i => i.name.toLowerCase().includes('dextrose'))?.id;
                const glucoseId = Object.values(INGREDIENT_LIBRARY).find(i => i.name.toLowerCase().includes('glucose'))?.id;
                
                const newRows = [...nonSugarRows];
                if (sucroseId && blend.sucrose_g > 0) newRows.push({ ingredientId: sucroseId, grams: blend.sucrose_g });
                if (dextroseId && blend.dextrose_g > 0) newRows.push({ ingredientId: dextroseId, grams: blend.dextrose_g });
                if (glucoseId && blend.glucose_g > 0) newRows.push({ ingredientId: glucoseId, grams: blend.glucose_g });
                
                setRows(newRows);
                toast({ title: 'Sugar blend applied', description: 'Recipe updated with optimized sugar spectrum' });
              }}
            />
          </CollapsibleSection>

          <CollapsibleSection 
            title="DE Effects Calculator" 
            defaultOpen={false}
            icon={<Activity className="h-5 w-5" />}
          >
            <DEEffectsPanel />
          </CollapsibleSection>
        </>
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
          <PopoverContent className="w-[90vw] p-0 mx-4 z-50 bg-background" align="center">
            <SmartIngredientSearch
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
        versions={versionsToCompare}
      />

      <RecipeHistoryDrawer
        open={historyDrawerOpen}
        onOpenChange={setHistoryDrawerOpen}
        recipeId={recipeId}
        onRestoreVersion={(version) => {
          handleRestoreVersion(version);
        }}
        onCompareVersions={handleCompareVersions}
      />
    </div>
  );
};

export default RecipeCalculatorV2;
