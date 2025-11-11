import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Download, Edit, Save, Info } from 'lucide-react';
import { calculateRecipeCost, setIngredientCost, getAllIngredientCosts, logCostAnalysis } from '@/services/enhancedCostingService';
import { CostingParams, DEFAULT_COSTING_PARAMS, exportToCSV, downloadCSV, calculatePricingStrategies } from '@/services/costingService';
import { useToast } from '@/hooks/use-toast';

interface CostAnalysisDashboardProps {
  recipe: any[];
  recipeName: string;
}

export function CostAnalysisDashboard({ recipe, recipeName }: CostAnalysisDashboardProps) {
  const { toast } = useToast();
  const [params, setParams] = useState<CostingParams>(DEFAULT_COSTING_PARAMS);
  const [costBreakdown, setCostBreakdown] = useState<any>(null);
  const [pricingStrategies, setPricingStrategies] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [editingCosts, setEditingCosts] = useState(false);
  const [ingredientCosts, setIngredientCosts] = useState<{ [key: string]: number }>({});

  // Load existing ingredient costs
  useEffect(() => {
    loadIngredientCosts();
  }, []);

  const loadIngredientCosts = async () => {
    const { data, error } = await getAllIngredientCosts();
    if (error) {
      console.error('Error loading ingredient costs:', error);
      return;
    }
    
    if (data) {
      const costsMap: { [key: string]: number } = {};
      data.forEach(item => {
        costsMap[item.ingredient_name] = item.cost_per_kg;
      });
      setIngredientCosts(costsMap);
    }
  };

  // Calculate costs when recipe or params change
  useEffect(() => {
    if (recipe.length > 0) {
      calculateCosts();
    }
  }, [recipe, params]);

  const calculateCosts = async () => {
    setIsCalculating(true);
    try {
      const ingredients = recipe.map(ing => ({
        name: ing.ingredient || ing.ingredientData?.name || 'Unknown',
        weight: ing.quantity_g || 0,
      }));

      const breakdown = await calculateRecipeCost(ingredients, params);
      setCostBreakdown(breakdown);

      const strategies = calculatePricingStrategies(breakdown, params.batchSize);
      setPricingStrategies(strategies);
    } catch (error) {
      console.error('Error calculating costs:', error);
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate recipe costs',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveIngredientCost = async (ingredientName: string, cost: number) => {
    const { error } = await setIngredientCost(ingredientName, cost);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save ingredient cost',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Cost Saved',
        description: `Updated cost for ${ingredientName}`,
      });
      loadIngredientCosts();
      calculateCosts();
    }
  };

  const handleExport = () => {
    if (!costBreakdown) return;
    const csv = exportToCSV(costBreakdown, pricingStrategies, params.batchSize);
    downloadCSV(csv, `${recipeName}-cost-analysis.csv`);
    toast({
      title: 'Exported',
      description: 'Cost analysis exported to CSV',
    });
  };

  const handleLogAnalysis = async () => {
    if (!costBreakdown) return;
    const { error } = await logCostAnalysis(recipeName, recipe, costBreakdown, params);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to log cost analysis',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Logged',
        description: 'Cost analysis saved to history',
      });
    }
  };

  if (recipe.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Analysis
          </CardTitle>
          <CardDescription>Real-time recipe costing with your pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No recipe loaded. Go to the Calculator tab and create a recipe, then come back here to analyze costs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Analysis Configuration
          </CardTitle>
          <CardDescription>Adjust parameters for accurate costing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Batch Size (kg)</Label>
              <Input
                type="number"
                value={params.batchSize}
                onChange={(e) => setParams({ ...params, batchSize: parseFloat(e.target.value) || 10 })}
              />
            </div>
            <div>
              <Label>Waste Factor (%)</Label>
              <Input
                type="number"
                value={params.wasteFactor}
                onChange={(e) => setParams({ ...params, wasteFactor: parseFloat(e.target.value) || 5 })}
              />
            </div>
            <div>
              <Label>Labor Cost (₹)</Label>
              <Input
                type="number"
                value={params.laborCostPerBatch}
                onChange={(e) => setParams({ ...params, laborCostPerBatch: parseFloat(e.target.value) || 500 })}
              />
            </div>
            <div>
              <Label>Overhead (%)</Label>
              <Input
                type="number"
                value={params.overheadPercentage}
                onChange={(e) => setParams({ ...params, overheadPercentage: parseFloat(e.target.value) || 15 })}
              />
            </div>
            <div>
              <Label>Packaging (₹/kg)</Label>
              <Input
                type="number"
                value={params.packagingCostPerKg}
                onChange={(e) => setParams({ ...params, packagingCostPerKg: parseFloat(e.target.value) || 50 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredient Costs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Ingredient Costs</CardTitle>
              <CardDescription>Set cost per kg for each ingredient</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingCosts(!editingCosts)}
            >
              {editingCosts ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {editingCosts ? 'Done' : 'Edit Costs'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Weight (g)</TableHead>
                <TableHead>Cost/kg (₹)</TableHead>
                <TableHead className="text-right">Total Cost (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costBreakdown?.ingredients.map((ing: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{ing.name}</TableCell>
                  <TableCell>{ing.weight.toFixed(0)}</TableCell>
                  <TableCell>
                    {editingCosts ? (
                      <Input
                        type="number"
                        className="w-24"
                        value={ing.costPerKg}
                        onChange={(e) => {
                          const newCost = parseFloat(e.target.value) || 0;
                          handleSaveIngredientCost(ing.name, newCost);
                        }}
                      />
                    ) : (
                      <span>{ing.costPerKg.toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {ing.totalCost.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cost Summary */}
      {costBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cost Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ingredient Cost</span>
              <span className="font-medium">₹{costBreakdown.totalIngredientCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Waste ({costBreakdown.wasteFactor}%)</span>
              <span className="font-medium">₹{costBreakdown.wasteAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Labor Cost</span>
              <span className="font-medium">₹{costBreakdown.laborCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overhead</span>
              <span className="font-medium">₹{costBreakdown.overheadCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Packaging</span>
              <span className="font-medium">₹{costBreakdown.packagingCost.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Cost</span>
              <span>₹{costBreakdown.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-primary">
              <span>Cost per kg</span>
              <span className="font-bold">₹{(costBreakdown.totalCost / params.batchSize).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Strategies */}
      {pricingStrategies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Suggested Pricing Strategies</CardTitle>
            <CardDescription>Based on your costs and market standards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {pricingStrategies.map((strategy, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">
                      {strategy.strategy === 'markup' ? `${strategy.value}% Markup` : `${strategy.value}% Margin`}
                    </Badge>
                    <span className="text-2xl font-bold text-primary">
                      ₹{strategy.suggestedPrice.toFixed(2)}/kg
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span>Profit per kg: </span>
                      <span className="font-medium text-foreground">₹{strategy.profit.toFixed(2)}</span>
                    </div>
                    <div>
                      <span>Profit Margin: </span>
                      <span className="font-medium text-foreground">{strategy.profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleExport} className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
        <Button onClick={handleLogAnalysis} variant="outline" className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Save to History
        </Button>
      </div>
    </div>
  );
}