import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyRecipes, RecipeRow } from "@/services/recipeService";
import {
  saveProductionPlan,
  calculateAggregatedProcurement,
  RecipeAllocation,
} from "@/services/productionService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download, Share2, Copy, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function ProductionPlanner() {
  const [totalLiters, setTotalLiters] = useState(35);
  const [skuSize, setSkuSize] = useState(100);
  const [wasteFactor, setWasteFactor] = useState(5);
  const [allocations, setAllocations] = useState<
    Array<{ recipe: RecipeRow; ratio: number; included: boolean }>
  >([]);
  const [procurementList, setProcurementList] = useState<
    Array<{
      ingredient: string;
      total_kg: number;
      cost_per_kg: number;
      total_cost: number;
    }>
  >([]);
  const [totalCost, setTotalCost] = useState(0);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: getMyRecipes,
  });

  useEffect(() => {
    if (recipes.length > 0 && allocations.length === 0) {
      setAllocations(
        recipes.map((recipe) => ({
          recipe,
          ratio: 0,
          included: false,
        }))
      );
    }
  }, [recipes]);

  const normalizeRatios = () => {
    const includedAllocations = allocations.filter((a) => a.included);
    const totalRatio = includedAllocations.reduce((sum, a) => sum + a.ratio, 0);

    if (totalRatio === 0) return;

    setAllocations(
      allocations.map((a) => ({
        ...a,
        ratio: a.included ? (a.ratio / totalRatio) * 100 : 0,
      }))
    );
  };

  const calculateProduction = () => {
    const includedAllocations = allocations.filter((a) => a.included);

    if (includedAllocations.length === 0) {
      toast.error("Please select at least one recipe");
      return;
    }

    normalizeRatios();

    const recipeAllocations: RecipeAllocation[] = includedAllocations.map((a) => {
      const productionLiters = (totalLiters * a.ratio) / 100;
      const units = Math.ceil((productionLiters * 1000) / skuSize);

      // Calculate ingredient cost from recipe
      let ingredientCost = 0;
      if (a.recipe.rows_json && Array.isArray(a.recipe.rows_json)) {
        ingredientCost = a.recipe.rows_json.reduce((sum: number, row: any) => {
          const grams = row.grams || 0;
          const costPerKg = row.cost_per_kg || 0;
          return sum + (grams / 1000) * costPerKg * productionLiters;
        }, 0);
      }

      return {
        recipe: a.recipe,
        ratio: a.ratio,
        production_liters: productionLiters,
        units,
        ingredient_cost: ingredientCost,
      };
    });

    const procurement = calculateAggregatedProcurement(
      recipeAllocations,
      wasteFactor
    );

    setProcurementList(procurement);
    setTotalCost(procurement.reduce((sum, item) => sum + item.total_cost, 0));

    toast.success("Production plan calculated!");
  };

  const exportToCSV = () => {
    const headers = ["Ingredient", "Total Needed (kg)", "Cost per kg", "Total Cost"];
    const rows = procurementList.map((item) => [
      item.ingredient,
      item.total_kg.toString(),
      `₹${item.cost_per_kg}`,
      `₹${item.total_cost.toFixed(2)}`,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `procurement-list-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("CSV exported!");
  };

  const copyToClipboard = () => {
    const text = procurementList
      .map((item) => `${item.ingredient}: ${item.total_kg}kg @ ₹${item.cost_per_kg}/kg = ₹${item.total_cost.toFixed(2)}`)
      .join("\n");

    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `🍦 Production Procurement List\n\n${procurementList
        .map((item) => `${item.ingredient}: ${item.total_kg}kg (₹${item.total_cost.toFixed(2)})`)
        .join("\n")}\n\nTotal: ₹${totalCost.toFixed(2)}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (isLoading) {
    return <div className="p-6">Loading recipes...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Production Planning</h1>
      </div>

      {/* Section 1: Production Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Production Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Total Production Volume (Liters)</Label>
              <Input
                type="number"
                value={totalLiters}
                onChange={(e) => setTotalLiters(Number(e.target.value))}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>SKU Size</Label>
              <Select
                value={skuSize.toString()}
                onValueChange={(v) => setSkuSize(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100ml</SelectItem>
                  <SelectItem value="500">500ml</SelectItem>
                  <SelectItem value="1000">1L</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Waste Factor (%)</Label>
              <Input
                type="number"
                value={wasteFactor}
                onChange={(e) => setWasteFactor(Number(e.target.value))}
                min={0}
                max={15}
              />
            </div>
          </div>

          <Button onClick={calculateProduction} className="w-full">
            Calculate Production
          </Button>
        </CardContent>
      </Card>

      {/* Section 2: Flavor Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Flavor Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Include</TableHead>
                  <TableHead>Recipe Name</TableHead>
                  <TableHead>Ratio (%)</TableHead>
                  <TableHead>Production (L)</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((allocation, index) => {
                  const productionLiters = (totalLiters * allocation.ratio) / 100;
                  const units = Math.ceil((productionLiters * 1000) / skuSize);

                  return (
                    <TableRow key={allocation.recipe.id}>
                      <TableCell>
                        <Checkbox
                          checked={allocation.included}
                          onCheckedChange={(checked) => {
                            const newAllocations = [...allocations];
                            newAllocations[index].included = !!checked;
                            if (!checked) newAllocations[index].ratio = 0;
                            setAllocations(newAllocations);
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {allocation.recipe.name}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={allocation.ratio}
                          onChange={(e) => {
                            const newAllocations = [...allocations];
                            newAllocations[index].ratio = Number(e.target.value);
                            setAllocations(newAllocations);
                          }}
                          disabled={!allocation.included}
                          min={0}
                          max={100}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>{productionLiters.toFixed(1)}</TableCell>
                      <TableCell>{units}</TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Procurement List */}
      {procurementList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aggregated Procurement List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Total Needed (kg)</TableHead>
                    <TableHead>Cost per kg</TableHead>
                    <TableHead>Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procurementList.map((item) => (
                    <TableRow key={item.ingredient}>
                      <TableCell className="font-medium">{item.ingredient}</TableCell>
                      <TableCell>{item.total_kg}</TableCell>
                      <TableCell>₹{item.cost_per_kg}</TableCell>
                      <TableCell className="font-bold">
                        ₹{item.total_cost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Cost:</span>
              <span className="text-2xl font-bold text-primary">
                ₹{totalCost.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Export Options */}
      {procurementList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={copyToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button variant="outline" onClick={shareWhatsApp}>
                <Share2 className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              <Button variant="outline" disabled>
                <FileText className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
