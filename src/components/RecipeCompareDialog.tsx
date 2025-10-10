import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
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
    return diff;
  };

  const renderCell = (value: number, delta: number | null) => {
    return (
      <div className="text-center">
        <div className="font-medium">{value.toFixed(1)}g</div>
        {delta !== null && (
          <div
            className={`text-xs ${
              delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : ""
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}
          </div>
        )}
      </div>
    );
  };

  const renderMetricRow = (label: string, key: string) => {
    const values = recipes.map((r) => r.metrics?.[key] || 0);
    const baseValue = values[0];
    
    return (
      <tr className="border-b">
        <td className="py-2 px-4 font-medium">{label}</td>
        {values.map((value, idx) => {
          const delta = idx > 0 ? getDelta(baseValue, value) : null;
          return (
            <td key={idx} className="py-2 px-4">
              {renderCell(value, delta)}
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
          <div className="space-y-6">
            {/* Header with recipe names */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${recipes.length}, 1fr)` }}>
              <div />
              {recipes.map((recipe, idx) => (
                <div key={idx} className="text-center">
                  <div className="font-semibold mb-1">{recipe.name}</div>
                  <Badge variant="outline">{recipe.profile_version || "v1"}</Badge>
                  <div className="text-xs text-muted-foreground mt-1 capitalize">
                    {recipe.product_type}
                  </div>
                </div>
              ))}
            </div>

            {/* Metrics comparison */}
            <div>
              <h3 className="font-semibold mb-2">Metrics</h3>
              <table className="w-full">
                <tbody>
                  {renderMetricRow("Fat %", "fat")}
                  {renderMetricRow("Sugars %", "sugars")}
                  {renderMetricRow("MSNF %", "msnf")}
                  {renderMetricRow("Water %", "water")}
                  {renderMetricRow("POD", "pod")}
                  {renderMetricRow("PAC", "pac")}
                  {renderMetricRow("FP °C", "fp")}
                </tbody>
              </table>
            </div>

            {/* Ingredients comparison */}
            <div>
              <h3 className="font-semibold mb-2">Ingredients</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-4 text-left">Ingredient</th>
                    {recipes.map((recipe, idx) => (
                      <th key={idx} className="py-2 px-4 text-center">
                        Recipe {idx + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allIngredientNames.map((name) => {
                    const values = recipes.map((r) => getValueForIngredient(r, name));
                    const baseValue = values[0];
                    
                    return (
                      <tr key={name} className="border-b">
                        <td className="py-2 px-4">{name}</td>
                        {values.map((value, idx) => {
                          const delta = idx > 0 ? getDelta(baseValue, value) : null;
                          return (
                            <td key={idx} className="py-2 px-4">
                              {renderCell(value, delta)}
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
