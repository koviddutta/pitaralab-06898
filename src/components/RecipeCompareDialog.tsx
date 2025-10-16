import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { RecipeRow } from "@/services/recipeService";

interface RecipeCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: RecipeRow[];
}

export function RecipeCompareDialog({ open, onOpenChange, recipes }: RecipeCompareDialogProps) {
  if (recipes.length < 2) return null;

  const getIngredients = (recipe: RecipeRow) => {
    if (!Array.isArray(recipe.rows_json)) return [];
    return recipe.rows_json.map((row: any) => ({
      name: row.ingredientName || row.name || "Unknown",
      grams: row.grams || 0,
    }));
  };

  const allIngredientNames = Array.from(
    new Set(recipes.flatMap((r) => getIngredients(r).map((i) => i.name)))
  );

  const getValueForIngredient = (recipe: RecipeRow, ingredientName: string) => {
    const ingredients = getIngredients(recipe);
    return ingredients.find((i) => i.name === ingredientName)?.grams || 0;
  };

  const getDelta = (baseValue: number, compareValue: number) => {
    const diff = compareValue - baseValue;
    if (Math.abs(diff) < 0.01) return null;
    const percentChange = baseValue !== 0 ? ((diff / baseValue) * 100) : 0;
    return { diff, percentChange };
  };

  const getDeltaColor = (delta: { diff: number; percentChange: number } | null, isMetric = false) => {
    if (!delta) return "";
    const threshold = isMetric ? 5 : 2; // Higher threshold for metrics
    if (Math.abs(delta.percentChange) < threshold) return "bg-muted/50";
    return delta.diff > 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";
  };

  const getDeltaIcon = (delta: { diff: number; percentChange: number } | null) => {
    if (!delta || Math.abs(delta.percentChange) < 2) return <Minus className="h-3 w-3 text-muted-foreground" />;
    return delta.diff > 0 
      ? <TrendingUp className="h-3 w-3 text-green-600" /> 
      : <TrendingDown className="h-3 w-3 text-red-600" />;
  };

  const renderCell = (value: number, delta: { diff: number; percentChange: number } | null, isMetric = false, unit = "g") => {
    const colorClass = getDeltaColor(delta, isMetric);
    
    return (
      <div className={`text-center p-2 rounded border ${colorClass} transition-colors`}>
        <div className="font-semibold text-base">{value.toFixed(1)}{unit}</div>
        {delta !== null && Math.abs(delta.percentChange) >= 2 && (
          <div className="mt-1 space-y-0.5">
            <div className="flex items-center justify-center gap-1">
              {getDeltaIcon(delta)}
              <span className={`text-xs font-medium ${
                delta.diff > 0 ? "text-green-700" : delta.diff < 0 ? "text-red-700" : "text-muted-foreground"
              }`}>
                {delta.diff > 0 ? "+" : ""}{delta.diff.toFixed(1)}{unit}
              </span>
            </div>
            <div className={`text-xs ${
              delta.diff > 0 ? "text-green-600" : delta.diff < 0 ? "text-red-600" : "text-muted-foreground"
            }`}>
              ({delta.percentChange > 0 ? "+" : ""}{delta.percentChange.toFixed(1)}%)
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetricRow = (label: string, key: string, unit = "%") => {
    const values = recipes.map((r) => r.metrics?.[key] || 0);
    const baseValue = values[0];
    
    return (
      <tr className="border-b hover:bg-muted/30 transition-colors">
        <td className="py-3 px-4 font-semibold text-sm">{label}</td>
        {values.map((value, idx) => {
          const delta = idx > 0 ? getDelta(baseValue, value) : null;
          return (
            <td key={idx} className="py-3 px-4">
              {renderCell(value, delta, true, unit)}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Recipe Comparison</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="space-y-6 p-1">
            {/* Header with recipe names */}
            <div className="sticky top-0 bg-background z-10 pb-4 border-b">
              <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${recipes.length}, 1fr)` }}>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-muted-foreground">Comparing {recipes.length} recipes</span>
                </div>
                {recipes.map((recipe, idx) => (
                  <div key={idx} className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="font-bold text-base mb-1">{recipe.name}</div>
                    <Badge variant={idx === 0 ? "default" : "outline"} className="mb-1">
                      {idx === 0 ? "Base" : `Compare ${idx}`} • {recipe.profile_version || "v1"}
                    </Badge>
                    <div className="text-xs text-muted-foreground capitalize">
                      {recipe.product_type}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 justify-center text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 bg-green-50 border border-green-200 rounded" />
                <span className="text-muted-foreground">Higher than base</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 bg-red-50 border border-red-200 rounded" />
                <span className="text-muted-foreground">Lower than base</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 bg-muted/50 border rounded" />
                <span className="text-muted-foreground">Similar (±2%)</span>
              </div>
            </div>

            {/* Metrics comparison */}
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                📊 Key Metrics
              </h3>
              <table className="w-full border-collapse">
                <tbody>
                  {renderMetricRow("Fat", "fat_pct", "%")}
                  {renderMetricRow("Sugars", "sugars_pct", "%")}
                  {renderMetricRow("MSNF", "msnf_pct", "%")}
                  {renderMetricRow("Water", "water_pct", "%")}
                  {renderMetricRow("Total Solids", "ts_pct", "%")}
                  {renderMetricRow("FPDT", "fpdt", "°C")}
                  {renderMetricRow("POD Index", "pod_index", "")}
                </tbody>
              </table>
            </div>

            {/* Ingredients comparison */}
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                🥄 Ingredients
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 bg-muted/30">
                    <th className="py-3 px-4 text-left font-semibold">Ingredient</th>
                    {recipes.map((recipe, idx) => (
                      <th key={idx} className="py-3 px-4 text-center font-semibold">
                        {idx === 0 ? "Base" : `Recipe ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allIngredientNames.map((name) => {
                    const values = recipes.map((r) => getValueForIngredient(r, name));
                    const baseValue = values[0];
                    
                    return (
                      <tr key={name} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-sm">{name}</td>
                        {values.map((value, idx) => {
                          const delta = idx > 0 ? getDelta(baseValue, value) : null;
                          return (
                            <td key={idx} className="py-3 px-4">
                              {renderCell(value, delta, false, "g")}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
