import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Save, Trash2, Calculator, Loader2, Search, Zap, BookOpen, Bug, History, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SmartIngredientSearch } from '@/components/SmartIngredientSearch';
import { RecipeTemplates, resolveTemplateIngredients } from '@/components/RecipeTemplates';
import { AddIngredientDialog } from '@/components/AddIngredientDialog';
import { useIngredients } from '@/contexts/IngredientsContext';
import type { IngredientData } from '@/lib/ingredientLibrary';
import { calcMetricsV2, MetricsV2 } from '@/lib/calc.v2';
import { OptimizeTarget, Row } from '@/lib/optimize';
import { balancingEngine } from '@/lib/optimize.engine';
import { RecipeBalancerV2, ScienceValidation, PRODUCT_CONSTRAINTS } from '@/lib/optimize.balancer.v2';
import { diagnoseBalancingFailure } from '@/lib/ingredientMapper';
import { diagnoseFeasibility, Feasibility, applyAutoFix } from '@/lib/diagnostics';
import { checkDbHealth } from '@/lib/ingredientMap';
import { ScienceValidationPanel } from '@/components/ScienceValidationPanel';
import type { Mode } from '@/types/mode';
import { resolveMode } from '@/lib/mode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import PairingsDrawer from '@/components/PairingsDrawer';
import TemperaturePanel from '@/components/TemperaturePanel';
import ReverseEngineer from '@/components/ReverseEngineer';
import IngredientAnalyzer from '@/components/flavour-engine/IngredientAnalyzer';
import SugarBlendOptimizer from '@/components/flavour-engine/SugarBlendOptimizer';
import AIOptimization from '@/components/flavour-engine/AIOptimization';
import { advancedOptimize, OptimizerConfig } from '@/lib/optimize.advanced';
import { RecipeHistoryDrawer } from '@/components/RecipeHistoryDrawer';
import { saveRecipeVersion, RecipeVersion } from '@/services/recipeVersionService';
import { Wrench } from 'lucide-react';
import { DatabaseHealthIndicator } from '@/components/DatabaseHealthIndicator';
import { BalancingDebugPanel } from '@/components/BalancingDebugPanel';

/**
 * Map mode to product constraints key
 * PHASE 1: Fixed to detect fruit gelato vs white gelato
 */
function productKey(mode: Mode, rows: IngredientRow[]): string {
  if (mode === 'sorbet') return 'sorbet';
  if (mode === 'ice_cream') return 'ice_cream';
  if (mode === 'kulfi') return 'kulfi';
  
  // Detect fruit gelato vs white gelato
  if (mode === 'gelato') {
    const hasFruit = rows.some(r => r.ingredientData?.category === 'fruit');
    return hasFruit ? 'gelato_fruit' : 'gelato_white';
  }
  
  return 'gelato_white';
}

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
  const [scienceValidation, setScienceValidation] = useState<ScienceValidation[] | undefined>(undefined);
  const [qualityScore, setQualityScore] = useState<{ score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; color: 'success' | 'warning' | 'destructive' } | undefined>(undefined);
  const [showTemplates, setShowTemplates] = useState(false);
  const [addIngredientIndex, setAddIngredientIndex] = useState<number | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [balancingDiagnostics, setBalancingDiagnostics] = useState<any>(null);
  const [selectedIngredientForPairing, setSelectedIngredientForPairing] = useState<IngredientData | null>(null);
  const [showAdvancedToolsTutorial, setShowAdvancedToolsTutorial] = useState(() => {
    return !localStorage.getItem('advanced-tools-tutorial-seen');
  });
  const isMobile = useIsMobile();
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [lastBalanceStrategy, setLastBalanceStrategy] = useState<'LP' | 'Heuristic' | 'Auto-Fix' | undefined>(undefined);
  
  // Use global ingredients context
  const { ingredients: availableIngredients, isLoading: loadingIngredients } = useIngredients();

  // Helper to get constraints for current product type
  const getConstraints = () => {
    const mode = resolveMode(productType);
    const key = productKey(mode, rows);
    return PRODUCT_CONSTRAINTS[key] || PRODUCT_CONSTRAINTS.gelato_white;
  };

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

  // Show Advanced Tools tutorial for first-time users
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('advanced-tools-tutorial-seen');
    if (!hasSeenTutorial && rows.length > 0) {
      // Delay showing tutorial slightly so user sees the section render first
      const timer = setTimeout(() => {
        setShowAdvancedToolsTutorial(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [rows.length]);

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

    // Use the comprehensive v2.1 science engine with central mode resolver
    const mode = resolveMode(productType);
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

    console.log('🔧 Starting balancing process...', {
      rowCount: rows.length,
      productType,
      availableIngredientsCount: availableIngredients.length
    });

    setIsOptimizing(true);

    try {
      // Define target ranges based on product type using central resolver
      const mode = resolveMode(productType);
      
      const targets: OptimizeTarget = mode === 'gelato'
        ? {
            fat_pct: 7.5,           // Target 7.5% fat (6-10% range)
            msnf_pct: 10.5,         // Target 10.5% MSNF (9-12% range)
            totalSugars_pct: 19,    // Target 19% total sugars (18-22% range)
            ts_pct: 40.5,           // Target 40.5% total solids (37-46% range)
            fpdt: 3.0               // Target 3.0°C FPDT (2.5-3.5°C range)
          }
        : mode === 'ice_cream'
        ? {
            fat_pct: 13,            // Target 13% fat (10-16% range)
            msnf_pct: 11,           // Target 11% MSNF (9-14% range)
            totalSugars_pct: 17,    // Target 17% total sugars (14-20% range)
            ts_pct: 39,             // Target 39% total solids (36-42% range)
            fpdt: 2.7               // Target 2.7°C FPDT (2.2-3.2°C range)
          }
        : mode === 'sorbet'
        ? {
            fat_pct: 0.5,           // Target 0.5% fat (0-1% range)
            msnf_pct: 0.5,          // Target 0.5% MSNF (0-1% range)
            totalSugars_pct: 28.5,  // Target 28.5% sugars (26-31% range)
            ts_pct: 37,             // Target 37% total solids (32-42% range)
            fpdt: -3.0              // Target -3.0°C FPDT (negative for sorbet)
          }
        : {
            fat_pct: 11,            // Target 11% fat (10-12% range)
            msnf_pct: 21.5,         // Target 21.5% MSNF (18-25% range)
            totalSugars_pct: 18,    // Target 18% sugars (17-20% range)
            ts_pct: 40,             // Target 40% total solids (38-42% range)
            fpdt: 2.25              // Target 2.25°C FPDT (2.0-2.5°C range)
          };

      console.log('🎯 Balancing targets:', targets);

      // Diagnose BEFORE attempting balance
      const optRows: Row[] = rows
        .filter(r => r.ingredientData && r.quantity_g > 0)
        .map(r => ({
          ing: r.ingredientData!,
          grams: r.quantity_g,
          min: 0,
          max: 1000
        }));

      // Store diagnostics for debugging
      const diagnosis = diagnoseBalancingFailure(optRows, availableIngredients, targets);
      setBalancingDiagnostics({
        targets,
        diagnosis,
        productType,
        mode,
        ingredientCount: optRows.length,
        hasWater: diagnosis.hasWater,
        hasFatSource: diagnosis.hasFatSource,
        hasMSNFSource: diagnosis.hasMSNFSource,
        missingIngredients: diagnosis.missingIngredients,
        suggestions: diagnosis.suggestions
      });

      // ============ GENTLE PREPASS (Auto-Fix BEFORE Feasibility) ============
      // Run auto-fix FIRST to add missing levers before feasibility check
      const prepassFeasibility: Feasibility = diagnoseFeasibility(optRows, availableIngredients, targets, mode);
      
      if (!prepassFeasibility.feasible && prepassFeasibility.missingCanonicals && prepassFeasibility.missingCanonicals.length > 0) {
        console.log('🛠️ Running gentle prepass auto-fix...');
        const prepassAutoFix = applyAutoFix(optRows, availableIngredients, mode, prepassFeasibility);
        
        if (prepassAutoFix.applied) {
          console.log('✅ Prepass auto-fix applied:', prepassAutoFix.addedIngredients);
          
          // Add prepass ingredients to optRows
          prepassAutoFix.addedIngredients.forEach(added => {
            const ing = availableIngredients.find(i => i.name === added.name);
            if (ing) {
              optRows.push({ ing, grams: added.grams, min: 0, max: 1000 });
              
              // Also add to UI rows for display
              const newRow: IngredientRow = {
                ingredientData: ing,
                ingredient: ing.name,
                quantity_g: added.grams,
                sugars_g: ((ing.sugars_pct ?? 0) / 100) * added.grams,
                fat_g: ((ing.fat_pct ?? 0) / 100) * added.grams,
                msnf_g: ((ing.msnf_pct ?? 0) / 100) * added.grams,
                other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * added.grams,
                total_solids_g: 0
              };
              newRow.total_solids_g = newRow.sugars_g + newRow.fat_g + newRow.msnf_g + newRow.other_solids_g;
              rows.push(newRow);
            }
          });
          
          toast({
            title: '🛠️ Gentle Prepass Applied',
            description: (
              <ul className="text-xs space-y-1">
                {prepassAutoFix.addedIngredients.map((a, i) => (
                  <li key={i}>+ {a.grams.toFixed(1)}g {a.name} ({a.reason})</li>
                ))}
              </ul>
            ),
            duration: 3000
          });
        }
      }

      // ============ HARD FEASIBILITY GATE ============
      // Pre-flight check - must pass before attempting LP/heuristics
      const feasibility: Feasibility = diagnoseFeasibility(optRows, availableIngredients, targets, mode);

      if (!feasibility.feasible) {
        console.log('❌ Feasibility check FAILED:', feasibility.reason);
        
        // Try auto-fix before giving up
        const autoFix = applyAutoFix(optRows, availableIngredients, mode, feasibility);
        
        if (autoFix.applied) {
          console.log('🛠️ Auto-fix applied:', autoFix.addedIngredients);
          
          // Add auto-fixed ingredients to optRows
          autoFix.addedIngredients.forEach(added => {
            const ing = availableIngredients.find(i => i.name === added.name);
            if (ing) {
              optRows.push({ ing, grams: added.grams, min: 0, max: 1000 });
              
              // Also add to UI rows for display
              const newRow: IngredientRow = {
                ingredientData: ing,
                ingredient: ing.name,
                quantity_g: added.grams,
                sugars_g: ((ing.sugars_pct ?? 0) / 100) * added.grams,
                fat_g: ((ing.fat_pct ?? 0) / 100) * added.grams,
                msnf_g: ((ing.msnf_pct ?? 0) / 100) * added.grams,
                other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * added.grams,
                total_solids_g: 0
              };
              newRow.total_solids_g = newRow.sugars_g + newRow.fat_g + newRow.msnf_g + newRow.other_solids_g;
              rows.push(newRow);
            }
          });
          
          toast({
            title: autoFix.message,
            description: (
              <ul className="text-xs space-y-1">
                {autoFix.addedIngredients.map((a, i) => (
                  <li key={i}>+ {a.grams.toFixed(1)}g {a.name} ({a.reason})</li>
                ))}
              </ul>
            ),
            duration: 5000
          });
          
          // Continue to balancing with fixed recipe...
          console.log('✅ Proceeding with auto-fixed recipe');
        } else {
          // Only stop if auto-fix couldn't help
          console.log('❌ Auto-fix could not help');
          setIsOptimizing(false);
          
          toast({
            title: "⚠️ Cannot balance this recipe",
            description: (
              <div className="text-sm space-y-2">
                {feasibility.reason && (
                  <div className="text-xs font-medium text-destructive">
                    {feasibility.reason}
                  </div>
                )}
                <div className="text-xs font-semibold mb-1">💡 To fix this:</div>
                <ul className="text-xs space-y-1">
                  {feasibility.suggestions.slice(0, 4).map((s, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-primary">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ),
            variant: "destructive",
            duration: 8000
          });
          
          return; // HARD STOP - do not proceed
        }
      }

      console.log('✅ Feasibility check passed');

      console.log('📊 Recipe ingredients:', optRows.map(r => ({
        name: r.ing.name,
        grams: r.grams,
        fat_pct: r.ing.fat_pct,
        msnf_pct: r.ing.msnf_pct
      })));

      if (optRows.length === 0) {
        toast({
          title: 'Invalid ingredients',
          description: 'Please select valid ingredients from the database',
          variant: 'destructive'
        });
        setIsOptimizing(false);
        return;
      }

      // Use the new V2 balancing engine with multi-role classification and substitution rules
      console.log('⚙️ Calling RecipeBalancerV2.balance...');
      const result = RecipeBalancerV2.balance(optRows, targets, availableIngredients, {
        maxIterations: 50,
        tolerance: 0.15,
        enableFeasibilityCheck: true,
        useLPSolver: true,
        productType: productType,
        enableScienceValidation: true
      });

      console.log('✅ Balancing result:', {
        success: result.success,
        strategy: result.strategy,
        iterations: result.iterations,
        message: result.message
      });

      // Store validation results
      setScienceValidation(result.scienceValidation);
      setQualityScore(result.qualityScore);

      // Update rows with optimized quantities
      const newRows = rows.map((row, i) => {
        if (i < result.rows.length) {
          const opt = result.rows[i];
          const ing = row.ingredientData!;
          const qty = opt.grams;
          return {
            ...row,
            quantity_g: qty,
            sugars_g: ((ing.sugars_pct ?? 0) / 100) * qty,
            fat_g: ((ing.fat_pct ?? 0) / 100) * qty,
            msnf_g: ((ing.msnf_pct ?? 0) / 100) * qty,
            other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * qty,
            total_solids_g: (((ing.sugars_pct ?? 0) + (ing.fat_pct ?? 0) + (ing.msnf_pct ?? 0) + (ing.other_solids_pct ?? 0)) / 100) * qty
          };
        }
        return row;
      });

      setRows(newRows);
      
      // ============ POST-BALANCE AUTO-RECALC ============
      // Immediately recalculate metrics with new balanced amounts
      if (result.success) {
        const recalcRows = result.rows
          .filter(r => r.ing && r.grams > 0)
          .map(r => ({ ing: r.ing, grams: r.grams }));

        const recalcMode = resolveMode(productType);
        const recalculatedMetrics = calcMetricsV2(recalcRows, { mode: recalcMode });

        setMetrics(recalculatedMetrics);
        console.log('🔄 Metrics auto-recalculated post-balance:', recalculatedMetrics);

        // PHASE 2: Scroll metrics into view with highlight animation
        setTimeout(() => {
          const metricsCard = document.querySelector('[data-metrics-card]') as HTMLElement;
          if (metricsCard) {
            metricsCard.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest' 
            });
            
            // Add brief highlight animation
            metricsCard.style.outline = '3px solid hsl(var(--primary))';
            metricsCard.style.outlineOffset = '4px';
            metricsCard.style.transition = 'outline 0.3s ease';
            setTimeout(() => {
              metricsCard.style.outline = 'none';
            }, 2000);
          }
        }, 100);
        
        // Store strategy for debug panel
        setLastBalanceStrategy(result.strategy as 'LP' | 'Heuristic');
      }
      
      // Show detailed results
      setTimeout(() => {
        if (!result.success) {
          calculateMetrics(); // Only recalc if balance failed
        }
        
        if (result.success) {
          const successMsg = mode === 'sorbet' 
            ? '✅ Sorbet Balanced (no dairy)'
            : `✅ ${mode === 'ice_cream' ? 'Ice Cream' : mode === 'gelato' ? 'Gelato' : 'Kulfi'} Balanced`;
          
          toast({
            title: `${successMsg} (${result.strategy})`,
            description: (
              <div className="space-y-1 text-sm">
                <div className="text-xs">{result.message}</div>
                {result.adjustmentsSummary.slice(0, 3).map((adj, i) => (
                  <div key={i} className="text-xs opacity-80">{adj}</div>
                ))}
                {result.adjustmentsSummary.length > 3 && (
                  <div className="text-xs opacity-60">+ {result.adjustmentsSummary.length - 3} more adjustments</div>
                )}
                <div className="text-xs opacity-70 mt-1">
                  Iterations: {result.iterations}
                </div>
              </div>
            )
          });
      } else {
          const feasibility = result.feasibilityReport;
          const suggestions = result.adjustmentsSummary || [];
          
          toast({
            title: `⚠️ ${result.message}`,
            description: (
              <div className="space-y-2 text-sm">
                {feasibility?.reason && (
                  <div className="text-xs font-medium text-destructive">{feasibility.reason}</div>
                )}
                
                {suggestions.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold mb-1">💡 To fix this:</div>
                    <ul className="text-xs space-y-1">
                      {suggestions.slice(0, 4).map((sug, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-primary">•</span>
                          <span>{sug}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {feasibility?.suggestions && feasibility.suggestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="text-xs font-medium opacity-80">Alternative suggestions:</div>
                    <ul className="text-xs list-disc list-inside mt-1 opacity-70">
                      {feasibility.suggestions.slice(0, 2).map((sug, i) => (
                        <li key={i}>{sug}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ),
            variant: 'destructive',
            duration: 8000
          });
        }
      }, 100);
    } catch (error: any) {
      console.error('❌ Balancing error:', error);
      console.error('Error stack:', error?.stack);
      toast({
        title: 'Optimization failed',
        description: error.message || 'An unknown error occurred. Check console for details.',
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

      // Save version history after successful save
      if (recipeId) {
        const ingredientsJson = rows.map(r => ({
          ingredient: r.ingredient,
          quantity_g: r.quantity_g,
          sugars_g: r.sugars_g,
          fat_g: r.fat_g,
          msnf_g: r.msnf_g,
          other_solids_g: r.other_solids_g,
          total_solids_g: r.total_solids_g
        }));

        await saveRecipeVersion(
          recipeId,
          recipeName,
          productType,
          ingredientsJson,
          metrics,
          'Manual save'
        );
      }
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

  /**
   * Apply 70/10/20 sugar preset (optimal blend)
   * 70% Sucrose, 10% Dextrose, 20% Glucose Syrup
   */
  const applySugarPreset = () => {
    // Find sugar ingredients
    const sucrose = availableIngredients.find(i => 
      i.name.toLowerCase().includes('sucrose') && (i.sugars_pct || 0) >= 95
    );
    const dextrose = availableIngredients.find(i => 
      i.name.toLowerCase().includes('dextrose') && (i.sugars_pct || 0) >= 95
    );
    const glucoseSyrup = availableIngredients.find(i => 
      (i.name.toLowerCase().includes('glucose') || i.name.toLowerCase().includes('syrup')) && 
      (i.sugars_pct || 0) >= 70
    );

    if (!sucrose || !dextrose || !glucoseSyrup) {
      toast({
        title: 'Missing Sugar Ingredients',
        description: 'Need Sucrose, Dextrose, and Glucose Syrup in database',
        variant: 'destructive'
      });
      return;
    }

    // Calculate current total sugars
    const currentTotalSugars = rows.reduce((sum, r) => sum + r.sugars_g, 0);
    const targetSugars = currentTotalSugars > 0 ? currentTotalSugars : 180; // Default 180g if none

    // Calculate preset amounts (70/10/20)
    const sucroseAmount = targetSugars * 0.70;
    const dextroseAmount = targetSugars * 0.10;
    const glucoseAmount = targetSugars * 0.20;

    // Remove existing sugar rows
    const nonSugarRows = rows.filter(r => 
      !r.ingredientData || (r.ingredientData.sugars_pct || 0) < 90
    );

    // Add preset sugars
    const newRows: IngredientRow[] = [
      ...nonSugarRows,
      {
        ingredientData: sucrose,
        ingredient: sucrose.name,
        quantity_g: sucroseAmount,
        sugars_g: sucroseAmount * (sucrose.sugars_pct || 100) / 100,
        fat_g: 0,
        msnf_g: 0,
        other_solids_g: 0,
        total_solids_g: sucroseAmount * (sucrose.sugars_pct || 100) / 100
      },
      {
        ingredientData: dextrose,
        ingredient: dextrose.name,
        quantity_g: dextroseAmount,
        sugars_g: dextroseAmount * (dextrose.sugars_pct || 100) / 100,
        fat_g: 0,
        msnf_g: 0,
        other_solids_g: 0,
        total_solids_g: dextroseAmount * (dextrose.sugars_pct || 100) / 100
      },
      {
        ingredientData: glucoseSyrup,
        ingredient: glucoseSyrup.name,
        quantity_g: glucoseAmount,
        sugars_g: glucoseAmount * (glucoseSyrup.sugars_pct || 75) / 100,
        fat_g: 0,
        msnf_g: 0,
        other_solids_g: 0,
        total_solids_g: glucoseAmount * (glucoseSyrup.sugars_pct || 75) / 100
      }
    ];

    setRows(newRows);
    
    toast({
      title: '✅ Sugar Preset Applied',
      description: `70% Sucrose (${sucroseAmount.toFixed(0)}g), 10% Dextrose (${dextroseAmount.toFixed(0)}g), 20% Glucose (${glucoseAmount.toFixed(0)}g)`,
      duration: 4000
    });

    // Auto-recalculate
    setTimeout(() => calculateMetrics(), 100);
  };

  const handleRestoreVersion = (version: RecipeVersion) => {
    try {
      // Restore recipe data from version
      setRecipeName(version.recipe_name);
      setProductType(version.product_type);
      
      // Restore ingredients
      const restoredRows = Array.isArray(version.ingredients_json) 
        ? version.ingredients_json.map((ing: any) => {
            const ingredientData = availableIngredients.find(i => i.name === ing.ingredient);
            return {
              ingredientData,
              ingredient: ing.ingredient,
              quantity_g: ing.quantity_g || 0,
              sugars_g: ing.sugars_g || 0,
              fat_g: ing.fat_g || 0,
              msnf_g: ing.msnf_g || 0,
              other_solids_g: ing.other_solids_g || 0,
              total_solids_g: ing.total_solids_g || 0
            };
          })
        : [];
      
      setRows(restoredRows);
      
      // Recalculate metrics
      setTimeout(() => calculateMetrics(), 100);
      
      toast({
        title: "Version Restored",
        description: `Recipe restored to version ${version.version_number}`,
      });
    } catch (e: any) {
      toast({
        title: "Restore Failed",
        description: e.message || "Failed to restore version",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <AddIngredientDialog 
        open={addIngredientIndex !== null}
        onOpenChange={(open) => {
          if (!open) setAddIngredientIndex(null);
        }}
        onIngredientAdded={(ing) => {
          if (addIngredientIndex !== null) {
            handleIngredientSelect(addIngredientIndex, ing);
          }
          setAddIngredientIndex(null);
        }}
      />
      
      <RecipeHistoryDrawer
        open={showHistoryDrawer}
        onOpenChange={setShowHistoryDrawer}
        recipeId={currentRecipeId}
        onRestoreVersion={handleRestoreVersion}
      />
      
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
                <SelectContent>
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
                  <TableHead>Other (g)</TableHead>
                  <TableHead>T.Solids (g)</TableHead>
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
                        <PopoverContent className="w-full max-w-[400px] p-0 bg-popover border shadow-lg" align="start" sideOffset={8}>
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
                                <Button 
                                  type="button"
                                  variant="ghost" 
                                  size="sm" 
                                  className="w-full justify-start text-sm"
                                  onClick={() => {
                                    setSearchOpen(null);
                                    setAddIngredientIndex(index);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Can't find it? Add new ingredient
                                </Button>
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
                      <Input
                        type="number"
                        value={row.other_solids_g.toFixed(1)}
                        onChange={(e) => updateRow(index, 'other_solids_g', parseFloat(e.target.value) || 0)}
                        className="bg-muted/50"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.total_solids_g.toFixed(1)}
                        onChange={(e) => updateRow(index, 'total_solids_g', parseFloat(e.target.value) || 0)}
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={applySugarPreset}
                    disabled={rows.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    70/10/20 Preset
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apply optimal sugar blend: 70% Sucrose, 10% Dextrose, 20% Glucose Syrup</p>
                </TooltipContent>
              </Tooltip>
              <Button onClick={saveRecipe} disabled={isSaving || !isAuthenticated} size="sm">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
              <Button 
                onClick={() => setShowHistoryDrawer(true)} 
                disabled={!currentRecipeId || !isAuthenticated}
                variant="outline" 
                size="sm"
              >
                <History className="mr-2 h-4 w-4" />
                History
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
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
              >
                <Bug className="mr-2 h-4 w-4" />
                {showDebugPanel ? 'Hide' : 'Show'} Debug
              </Button>
            </div>
            </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Debug Panel */}
      {showDebugPanel && balancingDiagnostics && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="text-sm">🐛 Balancing Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <span className="font-semibold">Product Type:</span> {balancingDiagnostics.productType}
            </div>
            <div>
              <span className="font-semibold">Mode:</span> {balancingDiagnostics.mode}
            </div>
            <div>
              <span className="font-semibold">Ingredient Count:</span> {balancingDiagnostics.ingredientCount}
            </div>
            
            <Separator />
            
            <div className="space-y-1">
              <div className="font-semibold">Ingredient Availability:</div>
              <div className={balancingDiagnostics.hasWater ? 'text-green-600' : 'text-red-600'}>
                {balancingDiagnostics.hasWater ? '✓' : '✗'} Water/Diluent (Recipe or DB has 80%+ water)
              </div>
              <div className={balancingDiagnostics.hasFatSource ? 'text-green-600' : 'text-red-600'}>
                {balancingDiagnostics.hasFatSource ? '✓' : '✗'} Fat Source (Recipe has 2%+ fat or DB has cream/butter)
              </div>
              <div className={balancingDiagnostics.hasMSNFSource ? 'text-green-600' : 'text-red-600'}>
                {balancingDiagnostics.hasMSNFSource ? '✓' : '✗'} MSNF Source (Recipe has 5%+ MSNF or DB has SMP)
              </div>
            </div>
            
            {balancingDiagnostics.missingIngredients.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1">
                  <div className="font-semibold text-destructive">
                    Missing from Database:
                  </div>
                  <ul className="list-disc list-inside">
                    {balancingDiagnostics.missingIngredients.map((ing: string, i: number) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            
            {balancingDiagnostics.suggestions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1">
                  <div className="font-semibold">Suggestions:</div>
                  <ul className="list-disc list-inside">
                    {balancingDiagnostics.suggestions.map((sug: string, i: number) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            
            <Separator />
            
            <div className="space-y-1">
              <div className="font-semibold">Targets:</div>
              <div>Fat: {balancingDiagnostics.targets.fat_pct?.toFixed(1)}%</div>
              <div>MSNF: {balancingDiagnostics.targets.msnf_pct?.toFixed(1)}%</div>
              <div>Total Sugars: {balancingDiagnostics.targets.totalSugars_pct?.toFixed(1)}%</div>
              <div>FPDT: {balancingDiagnostics.targets.fpdt?.toFixed(2)}°C</div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="font-semibold">Database Health:</div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const health = checkDbHealth(availableIngredients);
                  setBalancingDiagnostics({
                    ...balancingDiagnostics,
                    dbHealth: health
                  });
                  
                  if (health.healthy) {
                    toast({
                      title: "✅ Database Healthy",
                      description: "All essential ingredients available for balancing",
                      duration: 3000
                    });
                  } else {
                    toast({
                      title: "⚠️ Database Missing Ingredients",
                      description: (
                        <div className="text-xs space-y-1">
                          <div className="font-medium">Missing:</div>
                          <ul className="list-disc list-inside">
                            {health.missing.map((m, i) => <li key={i}>{m}</li>)}
                          </ul>
                        </div>
                      ),
                      variant: "destructive",
                      duration: 6000
                    });
                  }
                }}
              >
                Run DB Health Check
              </Button>
              
              {balancingDiagnostics.dbHealth && (
                <div className="text-xs space-y-1 mt-2">
                  <div className={balancingDiagnostics.dbHealth.hasWater ? 'text-green-600' : 'text-red-600'}>
                    {balancingDiagnostics.dbHealth.hasWater ? '✓' : '✗'} Water (95%+ water)
                  </div>
                  <div className={balancingDiagnostics.dbHealth.hasCream35OrButter ? 'text-green-600' : 'text-red-600'}>
                    {balancingDiagnostics.dbHealth.hasCream35OrButter ? '✓' : '✗'} Heavy Cream 35%+ or Butter
                  </div>
                  <div className={balancingDiagnostics.dbHealth.hasSMP ? 'text-green-600' : 'text-red-600'}>
                    {balancingDiagnostics.dbHealth.hasSMP ? '✓' : '✗'} Skim Milk Powder (85%+ MSNF)
                  </div>
                </div>
              )}
            </div>

            <Separator />
            
            {/* SE/AFP Audit Panel */}
            {metrics && rows.length > 0 && (
              <div className="space-y-2">
                <div className="font-semibold">🔬 SE/AFP Audit (Sugar Analysis):</div>
                <div className="text-xs space-y-1 bg-muted/30 p-2 rounded">
                  {(() => {
                    // Calculate per-sugar SE and AFP breakdown
                    const sugarBreakdown: Array<{
                      name: string;
                      grams: number;
                      spCoeff: number;
                      pacCoeff: number;
                      seContribution: number;
                      afpContribution: number;
                    }> = [];
                    
                    let totalSE = 0;
                    let totalAFP = 0;
                    
                    rows.forEach(row => {
                      if (!row.ingredientData) return;
                      
                      const ing = row.ingredientData;
                      const sugars_g = (ing.sugars_pct / 100) * row.quantity_g;
                      
                      if (sugars_g > 0.1) {
                        const spCoeff = ing.sp_coeff || 1.0;
                        const pacCoeff = ing.pac_coeff || 1.9;
                        
                        // SE = sugars_g * sp_coeff (sucrose equivalents for sweetness)
                        const seContribution = sugars_g * spCoeff;
                        
                        // AFP = sugars_g * pac_coeff (anti-freezing power)
                        const afpContribution = sugars_g * pacCoeff;
                        
                        totalSE += seContribution;
                        totalAFP += afpContribution;
                        
                        sugarBreakdown.push({
                          name: ing.name,
                          grams: sugars_g,
                          spCoeff,
                          pacCoeff,
                          seContribution,
                          afpContribution
                        });
                      }
                    });
                    
                    return (
                      <>
                        <div className="font-semibold mb-1">Sugar Ingredients:</div>
                        {sugarBreakdown.length === 0 && (
                          <div className="text-muted-foreground">No sugar ingredients detected</div>
                        )}
                        {sugarBreakdown.map((sugar, i) => (
                          <div key={i} className="ml-2 space-y-0.5 mb-2 pb-2 border-b border-border/50 last:border-0">
                            <div className="font-medium text-primary">{sugar.name}</div>
                            <div className="ml-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                              <div>Amount:</div>
                              <div className="font-mono">{sugar.grams.toFixed(1)}g</div>
                              
                              <div>SP Coeff:</div>
                              <div className="font-mono">{sugar.spCoeff.toFixed(2)}</div>
                              
                              <div>PAC Coeff:</div>
                              <div className="font-mono">{sugar.pacCoeff.toFixed(2)}</div>
                              
                              <div className="text-blue-600">SE:</div>
                              <div className="font-mono text-blue-600">
                                {sugar.seContribution.toFixed(1)}g ({totalSE > 0 ? ((sugar.seContribution / totalSE) * 100).toFixed(0) : 0}%)
                              </div>
                              
                              <div className="text-purple-600">AFP:</div>
                              <div className="font-mono text-purple-600">
                                {sugar.afpContribution.toFixed(1)} ({totalAFP > 0 ? ((sugar.afpContribution / totalAFP) * 100).toFixed(0) : 0}%)
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <Separator className="my-2" />
                        
                        <div className="font-semibold bg-primary/10 p-2 rounded space-y-1">
                          <div className="flex justify-between">
                            <span>Total SE (Sucrose Equiv):</span>
                            <span className="font-mono text-blue-600">{totalSE.toFixed(1)}g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total AFP (Anti-Freeze):</span>
                            <span className="font-mono text-purple-600">{totalAFP.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Calculated SE (v2.1):</span>
                            <span className="font-mono text-green-600">{metrics.se_g.toFixed(1)}g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>POD Index:</span>
                            <span className="font-mono">{metrics.pod_index.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        <div className="text-[10px] text-muted-foreground mt-2 space-y-0.5">
                          <div>💡 SE = Sweetness Power × Sugar Weight</div>
                          <div>💡 AFP = PAC Coefficient × Sugar Weight</div>
                          <div>💡 POD = Protein/Other/Dairy balance index</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PHASE 1: DB Health Check - Before metrics */}
      {rows.length > 0 && (
        <div className="mt-4">
          <DatabaseHealthIndicator 
            availableIngredients={availableIngredients}
            compact={true}
          />
        </div>
      )}

      {metrics && (
        <Card data-metrics-card>
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
                <Badge variant="outline">{metrics.totalSugars_pct.toFixed(1)}%</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fat</p>
                <Badge variant={
                  metrics.fat_pct >= getConstraints().fat.optimal[0] && 
                  metrics.fat_pct <= getConstraints().fat.optimal[1] 
                    ? 'default' 
                    : metrics.fat_pct >= getConstraints().fat.acceptable[0] && 
                      metrics.fat_pct <= getConstraints().fat.acceptable[1]
                    ? 'secondary'
                    : 'destructive'
                }>
                  {metrics.fat_pct.toFixed(1)}%
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MSNF</p>
                <Badge variant={
                  metrics.msnf_pct >= getConstraints().msnf.optimal[0] && 
                  metrics.msnf_pct <= getConstraints().msnf.optimal[1]
                    ? 'default'
                    : metrics.msnf_pct >= getConstraints().msnf.acceptable[0] && 
                      metrics.msnf_pct <= getConstraints().msnf.acceptable[1]
                    ? 'secondary'
                    : 'destructive'
                }>
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
                <div className="flex items-center gap-2">
                  <Badge variant={
                    metrics.ts_pct >= getConstraints().totalSolids.optimal[0] && 
                    metrics.ts_pct <= getConstraints().totalSolids.optimal[1]
                      ? 'default'
                      : metrics.ts_pct >= getConstraints().totalSolids.acceptable[0] && 
                        metrics.ts_pct <= getConstraints().totalSolids.acceptable[1]
                      ? 'secondary'
                      : 'destructive'
                  }>
                    {metrics.ts_pct.toFixed(1)}%
                  </Badge>
                  {metrics.overrunPrediction && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs">
                            ~{metrics.overrunPrediction.estimatedPct.toFixed(0)}% overrun
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-1 text-xs">
                            <div className="font-semibold">{metrics.overrunPrediction.category}</div>
                            <div>Expected: {metrics.overrunPrediction.range[0]}-{metrics.overrunPrediction.range[1]}%</div>
                            <div className="text-muted-foreground">{metrics.overrunPrediction.notes[0]}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Water</p>
                <Badge variant="outline">{metrics.water_pct.toFixed(1)}%</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">FPDT (Freezing Point)</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant={
                        metrics.fpdt >= getConstraints().fpdt.optimal[0] && 
                        metrics.fpdt <= getConstraints().fpdt.optimal[1]
                          ? 'default'
                          : metrics.fpdt >= getConstraints().fpdt.acceptable[0] && 
                            metrics.fpdt <= getConstraints().fpdt.acceptable[1]
                          ? 'secondary'
                          : 'destructive'
                      }>
                        {metrics.fpdt.toFixed(2)}°C
                      </Badge>
                    </TooltipTrigger>
                    {metrics.servingTemp && (
                      <TooltipContent className="max-w-sm">
                        <div className="space-y-2 text-xs">
                          <div className="font-semibold">🌡️ Serving Temperature Guide</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-muted-foreground">Draw Temp:</div>
                              <div className="font-medium">{metrics.servingTemp.drawTempC}°C</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Serve Temp:</div>
                              <div className="font-medium">{metrics.servingTemp.serveTempC}°C</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Hardening:</div>
                            <div>{metrics.servingTemp.hardeningTimeHours}h in blast freezer</div>
                          </div>
                          <div className="text-muted-foreground">{metrics.servingTemp.notes[0]}</div>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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

      {scienceValidation && scienceValidation.length > 0 && (
        <ScienceValidationPanel 
          validations={scienceValidation} 
          qualityScore={qualityScore}
        />
      )}

      {/* PHASE 2: Debug Panel - Below metrics */}
      {balancingDiagnostics && (
        <BalancingDebugPanel 
          diagnostics={balancingDiagnostics}
          lastStrategy={lastBalanceStrategy}
        />
      )}

      {/* Advanced Tools Section */}
      {rows.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="gradient-card border-b border-border/50 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Wrench className="h-5 w-5 text-primary" />
                Advanced Tools
                {showAdvancedToolsTutorial && (
                  <Badge 
                    variant="default" 
                    className="ml-2 animate-pulse bg-primary/90 hover:bg-primary"
                  >
                    NEW
                  </Badge>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-semibold">🤖 AI Engine Features</h4>
                      <p className="text-sm text-muted-foreground">
                        All AI Engine features are now here! Use these tools to:
                      </p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>Find flavor pairings</li>
                        <li>Optimize sugar blends</li>
                        <li>Analyze ingredients</li>
                        <li>Tune temperature profiles</li>
                        <li>Reverse engineer recipes</li>
                        <li>AI-powered optimization</li>
                      </ul>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardTitle>
              {showAdvancedToolsTutorial && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAdvancedToolsTutorial(false);
                    localStorage.setItem('advanced-tools-tutorial-seen', 'true');
                  }}
                  className="text-xs"
                >
                  Got it ✓
                </Button>
              )}
            </div>
            {showAdvancedToolsTutorial && (
              <Alert className="mt-3 bg-primary/5 border-primary/20">
                <AlertDescription className="text-sm">
                  <strong>🎉 AI Engine features are now here!</strong>
                  <br />
                  All the powerful tools from the AI Engine tab (Flavor Pairings, Temperature Tuning, Reverse Engineer, and more) 
                  have been consolidated into these Advanced Tools for easier access.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="p-6" id="advanced-tools">
            {isMobile ? (
              // Mobile: Accordion-style with grouping
              <Accordion type="single" collapsible defaultValue="optimization" className="w-full">
                <AccordionItem value="optimization">
                  <AccordionTrigger className="text-base font-semibold">
                    🎯 Optimization Tools
                  </AccordionTrigger>
                  <AccordionContent>
                    <Tabs defaultValue="pairings" className="w-full">
                      <TabsList className="w-full h-auto flex flex-wrap gap-1 p-2 bg-background/80 backdrop-blur-sm">
                        <TabsTrigger value="pairings" className="flex-1 min-w-[140px] text-xs whitespace-nowrap">
                          🍫 Pairings
                        </TabsTrigger>
                        <TabsTrigger value="sugar-blend" className="flex-1 min-w-[140px] text-xs whitespace-nowrap">
                          🍬 Sugar Blend
                        </TabsTrigger>
                        <TabsTrigger value="ai-optimize" className="flex-1 min-w-[140px] text-xs whitespace-nowrap">
                          🤖 AI Optimize
                          <Badge variant="secondary" className="ml-1 text-[10px]">Popular</Badge>
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="pairings" className="mt-4">
                        <PairingsDrawer
                          selectedIngredient={selectedIngredientForPairing}
                          availableIngredients={availableIngredients}
                          currentMetrics={metrics}
                          onAddIngredient={(ing, percentage) => {
                            const totalMass = rows.reduce((sum, r) => sum + r.quantity_g, 0) || 1000;
                            const gramsToAdd = (percentage / 100) * totalMass;
                            
                            const existingRow = rows.find(r => r.ingredient === ing.name);
                            if (existingRow) {
                              setRows(rows.map(r => 
                                r.ingredient === ing.name 
                                  ? { ...r, quantity_g: r.quantity_g + gramsToAdd }
                                  : r
                              ));
                            } else {
                              const newRow: IngredientRow = {
                                ingredientData: ing,
                                ingredient: ing.name,
                                quantity_g: gramsToAdd,
                                sugars_g: ((ing.sugars_pct ?? 0) / 100) * gramsToAdd,
                                fat_g: ((ing.fat_pct ?? 0) / 100) * gramsToAdd,
                                msnf_g: ((ing.msnf_pct ?? 0) / 100) * gramsToAdd,
                                other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * gramsToAdd,
                                total_solids_g: 0
                              };
                              newRow.total_solids_g = newRow.sugars_g + newRow.fat_g + newRow.msnf_g + newRow.other_solids_g;
                              setRows([...rows, newRow]);
                            }
                            
                            toast({
                              title: "Pairing Added",
                              description: `${ing.name} added at ${percentage}% (${gramsToAdd.toFixed(0)}g)`
                            });
                          }}
                        />
                        <div className="mt-4">
                          <Label className="text-sm font-semibold mb-2 block">Select ingredient to analyze pairings:</Label>
                          <Select 
                            value={selectedIngredientForPairing?.id || ''} 
                            onValueChange={(id) => {
                              const ing = availableIngredients.find(i => i.id === id);
                              setSelectedIngredientForPairing(ing || null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an ingredient..." />
                            </SelectTrigger>
                            <SelectContent>
                              {rows.map((row) => row.ingredientData && (
                                <SelectItem key={row.ingredientData.id} value={row.ingredientData.id}>
                                  {row.ingredientData.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>

                      <TabsContent value="sugar-blend" className="mt-4">
                        <SugarBlendOptimizer
                          productType={productType as 'gelato' | 'ice-cream' | 'sorbet'}
                          totalSugarAmount={rows
                            .filter(r => r.ingredientData?.category === 'sugar')
                            .reduce((sum, r) => sum + r.quantity_g, 0)}
                          onOptimizedBlend={(blend) => {
                            const nonSugarRows = rows.filter(r => r.ingredientData?.category !== 'sugar');
                            const newSugarRows = Object.entries(blend).map(([name, grams]) => {
                              const ing = availableIngredients.find(i => i.name === name);
                              if (!ing) return null;
                              return {
                                ingredientData: ing,
                                ingredient: ing.name,
                                quantity_g: grams,
                                sugars_g: ((ing.sugars_pct ?? 0) / 100) * grams,
                                fat_g: ((ing.fat_pct ?? 0) / 100) * grams,
                                msnf_g: ((ing.msnf_pct ?? 0) / 100) * grams,
                                other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * grams,
                                total_solids_g: 0
                              } as IngredientRow;
                            }).filter((r): r is IngredientRow => r !== null);
                            
                            newSugarRows.forEach(r => {
                              r.total_solids_g = r.sugars_g + r.fat_g + r.msnf_g + r.other_solids_g;
                            });
                            
                            setRows([...nonSugarRows, ...newSugarRows]);
                            toast({
                              title: "Sugar Blend Applied",
                              description: "Recipe updated with optimized sugar blend"
                            });
                          }}
                        />
                      </TabsContent>

                      <TabsContent value="ai-optimize" className="mt-4">
                        {metrics && (
                          <AIOptimization
                            allTargetsMet={metrics.warnings.length === 0}
                            suggestions={[]}
                            isOptimizing={isOptimizing}
                            currentRows={rows
                              .filter(r => r.ingredientData)
                              .map(r => ({
                                ing: r.ingredientData!,
                                grams: r.quantity_g,
                                min: r.quantity_g * 0.5,
                                max: r.quantity_g * 1.5
                              }))}
                            targets={(() => {
                              const mode = resolveMode(productType);
                              const constraints = PRODUCT_CONSTRAINTS[productKey(mode, rows)];
                              return {
                                fat_pct: (constraints.fat.optimal[0] + constraints.fat.optimal[1]) / 2,
                                msnf_pct: (constraints.msnf.optimal[0] + constraints.msnf.optimal[1]) / 2,
                                ts_pct: (constraints.totalSolids.optimal[0] + constraints.totalSolids.optimal[1]) / 2
                              };
                            })()}
                            onApplyResult={(optimizedRows: Row[]) => {
                              const newRows = optimizedRows.map(opt => {
                                const ing = opt.ing;
                                return {
                                  ingredientData: ing,
                                  ingredient: ing.name,
                                  quantity_g: opt.grams,
                                  sugars_g: ((ing.sugars_pct ?? 0) / 100) * opt.grams,
                                  fat_g: ((ing.fat_pct ?? 0) / 100) * opt.grams,
                                  msnf_g: ((ing.msnf_pct ?? 0) / 100) * opt.grams,
                                  other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * opt.grams,
                                  total_solids_g: 0
                                } as IngredientRow;
                              });

                              newRows.forEach(r => {
                                r.total_solids_g = r.sugars_g + r.fat_g + r.msnf_g + r.other_solids_g;
                              });

                              setRows(newRows);
                              toast({
                                title: "AI Optimization Applied",
                                description: "Recipe optimized using AI"
                              });
                            }}
                            onAutoOptimize={async (algorithm: OptimizerConfig['algorithm']) => {
                              setIsOptimizing(true);
                              try {
                                const rowsForOptimize: Row[] = rows
                                  .filter(r => r.ingredientData)
                                  .map(r => ({
                                    ing: r.ingredientData!,
                                    grams: r.quantity_g,
                                    min: r.quantity_g * 0.5,
                                    max: r.quantity_g * 1.5
                                  }));

                                const mode = resolveMode(productType);
                                const constraints = PRODUCT_CONSTRAINTS[productKey(mode, rows)];
                                
                                const targets = {
                                  fat_pct: (constraints.fat.optimal[0] + constraints.fat.optimal[1]) / 2,
                                  msnf_pct: (constraints.msnf.optimal[0] + constraints.msnf.optimal[1]) / 2,
                                  ts_pct: (constraints.totalSolids.optimal[0] + constraints.totalSolids.optimal[1]) / 2
                                };

                                const optimized = advancedOptimize(rowsForOptimize, targets, {
                                  algorithm,
                                  maxIterations: algorithm === 'hybrid' ? 150 : 200,
                                  populationSize: 40
                                });

                                const newRows = optimized.map(opt => {
                                  const ing = opt.ing;
                                  return {
                                    ingredientData: ing,
                                    ingredient: ing.name,
                                    quantity_g: opt.grams,
                                    sugars_g: ((ing.sugars_pct ?? 0) / 100) * opt.grams,
                                    fat_g: ((ing.fat_pct ?? 0) / 100) * opt.grams,
                                    msnf_g: ((ing.msnf_pct ?? 0) / 100) * opt.grams,
                                    other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * opt.grams,
                                    total_solids_g: 0
                                  } as IngredientRow;
                                });

                                newRows.forEach(r => {
                                  r.total_solids_g = r.sugars_g + r.fat_g + r.msnf_g + r.other_solids_g;
                                });

                                setRows(newRows);
                                toast({
                                  title: "AI Optimization Complete",
                                  description: `Recipe optimized using ${algorithm} algorithm`
                                });
                              } catch (error) {
                                console.error('AI optimization error:', error);
                                toast({
                                  title: "Optimization Failed",
                                  description: error instanceof Error ? error.message : "Failed to optimize recipe",
                                  variant: "destructive"
                                });
                              } finally {
                                setIsOptimizing(false);
                              }
                            }}
                          />
                        )}
                      </TabsContent>
                    </Tabs>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="analysis">
                  <AccordionTrigger className="text-base font-semibold">
                    🔬 Analysis Tools
                  </AccordionTrigger>
                  <AccordionContent>
                    <Tabs defaultValue="analyzer" className="w-full">
                      <TabsList className="w-full h-auto flex flex-wrap gap-1 p-2 bg-background/80 backdrop-blur-sm">
                        <TabsTrigger value="analyzer" className="flex-1 min-w-[140px] text-xs whitespace-nowrap">
                          🔬 Analyzer
                        </TabsTrigger>
                        <TabsTrigger value="temperature" className="flex-1 min-w-[140px] text-xs whitespace-nowrap">
                          🌡️ Temperature
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="analyzer" className="mt-4">
                        <IngredientAnalyzer currentRecipe={rows} />
                      </TabsContent>

                      <TabsContent value="temperature" className="mt-4">
                        {metrics && (
                          <TemperaturePanel
                            metrics={metrics}
                            recipe={rows.map(r => ({
                              ing: r.ingredientData || {
                                id: r.ingredient.toLowerCase().replace(/\s+/g, '_'),
                                name: r.ingredient,
                                category: 'other' as const,
                                water_pct: 0,
                                fat_pct: 0
                              },
                              grams: r.quantity_g
                            }))}
                            onApplyTuning={(tunedRecipe) => {
                              const newRows = tunedRecipe
                                .filter(item => item.grams > 0)
                                .map(item => {
                                  const ing = item.ing;
                                  return {
                                    ingredientData: ing,
                                    ingredient: ing.name,
                                    quantity_g: item.grams,
                                    sugars_g: ((ing.sugars_pct ?? 0) / 100) * item.grams,
                                    fat_g: ((ing.fat_pct ?? 0) / 100) * item.grams,
                                    msnf_g: ((ing.msnf_pct ?? 0) / 100) * item.grams,
                                    other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * item.grams,
                                    total_solids_g: 0
                                  } as IngredientRow;
                                });
                              newRows.forEach(r => {
                                r.total_solids_g = r.sugars_g + r.fat_g + r.msnf_g + r.other_solids_g;
                              });
                              setRows(newRows);
                              toast({
                                title: "Temperature Tuning Applied",
                                description: "Recipe optimized for target temperature"
                              });
                            }}
                          />
                        )}
                      </TabsContent>
                    </Tabs>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="utilities">
                  <AccordionTrigger className="text-base font-semibold">
                    🛠️ Utilities
                  </AccordionTrigger>
                  <AccordionContent>
                    <Tabs defaultValue="reverse" className="w-full">
                      <TabsList className="w-full h-auto flex flex-wrap gap-1 p-2 bg-background/80 backdrop-blur-sm">
                        <TabsTrigger value="reverse" className="flex-1 min-w-[140px] text-xs whitespace-nowrap">
                          🔄 Reverse Engineer
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="reverse" className="mt-4">
                        <ReverseEngineer />
                      </TabsContent>
                    </Tabs>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              // Desktop: Single tab row with all tools
              <Tabs defaultValue="pairings" className="w-full">
                <TabsList className="w-full h-auto flex flex-wrap lg:grid lg:grid-cols-6 gap-1 lg:gap-2 p-2 bg-background/80 backdrop-blur-sm">
                  <TabsTrigger value="pairings" className="flex-1 min-w-[100px] text-xs lg:text-sm whitespace-nowrap">
                    🍫 Pairings
                  </TabsTrigger>
                  <TabsTrigger value="temperature" className="flex-1 min-w-[100px] text-xs lg:text-sm whitespace-nowrap">
                    🌡️ Temperature
                  </TabsTrigger>
                  <TabsTrigger value="reverse" className="flex-1 min-w-[100px] text-xs lg:text-sm whitespace-nowrap">
                    🔄 Reverse
                  </TabsTrigger>
                  <TabsTrigger value="analyzer" className="flex-1 min-w-[100px] text-xs lg:text-sm whitespace-nowrap">
                    🔬 Analyzer
                  </TabsTrigger>
                  <TabsTrigger value="sugar-blend" className="flex-1 min-w-[100px] text-xs lg:text-sm whitespace-nowrap">
                    🍬 Sugar Blend
                  </TabsTrigger>
                  <TabsTrigger value="ai-optimize" className="flex-1 min-w-[100px] text-xs lg:text-sm whitespace-nowrap">
                    🤖 AI Optimize
                    <Badge variant="secondary" className="ml-1 text-[10px]">Popular</Badge>
                  </TabsTrigger>
                </TabsList>

              <TabsContent value="pairings" className="mt-4">
                <PairingsDrawer
                  selectedIngredient={selectedIngredientForPairing}
                  availableIngredients={availableIngredients}
                  currentMetrics={metrics}
                  onAddIngredient={(ing, percentage) => {
                    const totalMass = rows.reduce((sum, r) => sum + r.quantity_g, 0) || 1000;
                    const gramsToAdd = (percentage / 100) * totalMass;
                    
                    const existingRow = rows.find(r => r.ingredient === ing.name);
                    if (existingRow) {
                      setRows(rows.map(r => 
                        r.ingredient === ing.name 
                          ? { ...r, quantity_g: r.quantity_g + gramsToAdd }
                          : r
                      ));
                    } else {
                      const newRow: IngredientRow = {
                        ingredientData: ing,
                        ingredient: ing.name,
                        quantity_g: gramsToAdd,
                        sugars_g: ((ing.sugars_pct ?? 0) / 100) * gramsToAdd,
                        fat_g: ((ing.fat_pct ?? 0) / 100) * gramsToAdd,
                        msnf_g: ((ing.msnf_pct ?? 0) / 100) * gramsToAdd,
                        other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * gramsToAdd,
                        total_solids_g: 0
                      };
                      newRow.total_solids_g = newRow.sugars_g + newRow.fat_g + newRow.msnf_g + newRow.other_solids_g;
                      setRows([...rows, newRow]);
                    }
                    
                    toast({
                      title: "Pairing Added",
                      description: `${ing.name} added at ${percentage}% (${gramsToAdd.toFixed(0)}g)`
                    });
                  }}
                />
                <div className="mt-4">
                  <Label className="text-sm font-semibold mb-2 block">Select ingredient to analyze pairings:</Label>
                  <Select 
                    value={selectedIngredientForPairing?.id || ''} 
                    onValueChange={(id) => {
                      const ing = availableIngredients.find(i => i.id === id);
                      setSelectedIngredientForPairing(ing || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an ingredient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rows.map((row) => row.ingredientData && (
                        <SelectItem key={row.ingredientData.id} value={row.ingredientData.id}>
                          {row.ingredientData.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="temperature" className="mt-4">
                {metrics && (
                  <TemperaturePanel
                    metrics={metrics}
                    recipe={rows.map(r => ({
                      ing: r.ingredientData || {
                        id: r.ingredient.toLowerCase().replace(/\s+/g, '_'),
                        name: r.ingredient,
                        category: 'other' as const,
                        water_pct: 0,
                        fat_pct: 0
                      },
                      grams: r.quantity_g
                    }))}
                    onApplyTuning={(tunedRecipe) => {
                      const newRows = tunedRecipe
                        .filter(item => item.grams > 0)
                        .map(item => {
                          const ing = item.ing;
                          return {
                            ingredientData: ing,
                            ingredient: ing.name,
                            quantity_g: item.grams,
                            sugars_g: ((ing.sugars_pct ?? 0) / 100) * item.grams,
                            fat_g: ((ing.fat_pct ?? 0) / 100) * item.grams,
                            msnf_g: ((ing.msnf_pct ?? 0) / 100) * item.grams,
                            other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * item.grams,
                            total_solids_g: 0
                          } as IngredientRow;
                        });
                      newRows.forEach(r => {
                        r.total_solids_g = r.sugars_g + r.fat_g + r.msnf_g + r.other_solids_g;
                      });
                      setRows(newRows);
                      toast({
                        title: "Temperature Tuning Applied",
                        description: "Recipe optimized for target temperature"
                      });
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="reverse" className="mt-4">
                <ReverseEngineer />
              </TabsContent>

              <TabsContent value="analyzer" className="mt-4">
                <IngredientAnalyzer currentRecipe={rows} />
              </TabsContent>

              <TabsContent value="sugar-blend" className="mt-4">
                <SugarBlendOptimizer
                  productType={productType as 'gelato' | 'ice-cream' | 'sorbet'}
                  totalSugarAmount={rows
                    .filter(r => r.ingredientData?.category === 'sugar')
                    .reduce((sum, r) => sum + r.quantity_g, 0)}
                  onOptimizedBlend={(blend) => {
                    // Remove existing sugar ingredients
                    const nonSugarRows = rows.filter(r => r.ingredientData?.category !== 'sugar');
                    
                    // Add new sugar blend
                    const blendRows = Object.entries(blend).map(([name, grams]) => {
                      const ing = availableIngredients.find(i => i.name === name);
                      if (!ing) return null;
                      
                      const newRow: IngredientRow = {
                        ingredientData: ing,
                        ingredient: ing.name,
                        quantity_g: grams,
                        sugars_g: ((ing.sugars_pct ?? 0) / 100) * grams,
                        fat_g: ((ing.fat_pct ?? 0) / 100) * grams,
                        msnf_g: ((ing.msnf_pct ?? 0) / 100) * grams,
                        other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * grams,
                        total_solids_g: 0
                      };
                      newRow.total_solids_g = newRow.sugars_g + newRow.fat_g + newRow.msnf_g + newRow.other_solids_g;
                      return newRow;
                    }).filter(Boolean) as IngredientRow[];
                    
                    setRows([...nonSugarRows, ...blendRows]);
                    toast({
                      title: "Sugar Blend Applied",
                      description: "Recipe updated with optimized sugar blend"
                    });
                  }}
                />
              </TabsContent>

              <TabsContent value="ai-optimize" className="mt-4">
                {metrics && (
                  <AIOptimization
                    allTargetsMet={metrics.warnings.length === 0}
                    suggestions={[]}
                    isOptimizing={isOptimizing}
                    currentRows={rows
                      .filter(r => r.ingredientData)
                      .map(r => ({
                        ing: r.ingredientData!,
                        grams: r.quantity_g,
                        min: r.quantity_g * 0.5,
                        max: r.quantity_g * 1.5
                      }))}
                    targets={(() => {
                      const mode = resolveMode(productType);
                      const constraints = PRODUCT_CONSTRAINTS[productKey(mode, rows)];
                      return {
                        fat_pct: (constraints.fat.optimal[0] + constraints.fat.optimal[1]) / 2,
                        msnf_pct: (constraints.msnf.optimal[0] + constraints.msnf.optimal[1]) / 2,
                        ts_pct: (constraints.totalSolids.optimal[0] + constraints.totalSolids.optimal[1]) / 2
                      };
                    })()}
                    onApplyResult={(optimizedRows: Row[]) => {
                      // Convert optimized Row[] back to IngredientRow format
                      const newRows = optimizedRows.map(opt => {
                        const ing = opt.ing;
                        return {
                          ingredientData: ing,
                          ingredient: ing.name,
                          quantity_g: opt.grams,
                          sugars_g: ((ing.sugars_pct ?? 0) / 100) * opt.grams,
                          fat_g: ((ing.fat_pct ?? 0) / 100) * opt.grams,
                          msnf_g: ((ing.msnf_pct ?? 0) / 100) * opt.grams,
                          other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * opt.grams,
                          total_solids_g: 0
                        } as IngredientRow;
                      });

                      newRows.forEach(r => {
                        r.total_solids_g = r.sugars_g + r.fat_g + r.msnf_g + r.other_solids_g;
                      });

                      setRows(newRows);
                    }}
                    onAutoOptimize={async (algorithm: OptimizerConfig['algorithm']) => {
                      setIsOptimizing(true);
                      try {
                        // Convert to Row format for optimization
                        const rowsForOptimize: Row[] = rows
                          .filter(r => r.ingredientData)
                          .map(r => ({
                            ing: r.ingredientData!,
                            grams: r.quantity_g,
                            min: r.quantity_g * 0.5,
                            max: r.quantity_g * 1.5
                          }));

                        const mode = resolveMode(productType);
                        const constraints = PRODUCT_CONSTRAINTS[productKey(mode, rows)];
                        
                        const targets = {
                          fat_pct: (constraints.fat.optimal[0] + constraints.fat.optimal[1]) / 2,
                          msnf_pct: (constraints.msnf.optimal[0] + constraints.msnf.optimal[1]) / 2,
                          ts_pct: (constraints.totalSolids.optimal[0] + constraints.totalSolids.optimal[1]) / 2
                        };

                        const optimized = advancedOptimize(rowsForOptimize, targets, {
                          algorithm,
                          maxIterations: algorithm === 'hybrid' ? 150 : 200,
                          populationSize: 40
                        });

                        // Convert back to IngredientRow format
                        const newRows = optimized.map(opt => {
                          const ing = opt.ing;
                          return {
                            ingredientData: ing,
                            ingredient: ing.name,
                            quantity_g: opt.grams,
                            sugars_g: ((ing.sugars_pct ?? 0) / 100) * opt.grams,
                            fat_g: ((ing.fat_pct ?? 0) / 100) * opt.grams,
                            msnf_g: ((ing.msnf_pct ?? 0) / 100) * opt.grams,
                            other_solids_g: ((ing.other_solids_pct ?? 0) / 100) * opt.grams,
                            total_solids_g: 0
                          } as IngredientRow;
                        });

                        newRows.forEach(r => {
                          r.total_solids_g = r.sugars_g + r.fat_g + r.msnf_g + r.other_solids_g;
                        });

                        setRows(newRows);
                        toast({
                          title: "AI Optimization Complete",
                          description: `Recipe optimized using ${algorithm} algorithm`
                        });
                      } catch (error) {
                        console.error('AI optimization error:', error);
                        toast({
                          title: "Optimization Failed",
                          description: error instanceof Error ? error.message : "Failed to optimize recipe",
                          variant: "destructive"
                        });
                      } finally {
                        setIsOptimizing(false);
                      }
                    }}
                  />
                )}
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>
      )}
      {/* Mobile Quick Access Button */}
      {isMobile && rows.length > 0 && (
        <Button
          className="fixed bottom-4 right-4 rounded-full shadow-lg z-50 h-14 w-14"
          size="icon"
          onClick={() => {
            document.getElementById('advanced-tools')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Wrench className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
