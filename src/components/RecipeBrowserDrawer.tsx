import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyRecipes, deleteRecipe, type RecipeRow } from "@/services/recipeService";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Copy, Trash2, FileText, PlayCircle, Download, Star, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, isAfter } from "date-fns";
import jsPDF from "jspdf";

interface RecipeBrowserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (recipe: RecipeRow) => void;
  onDuplicate: (recipe: RecipeRow) => void;
  onCompare: (recipes: RecipeRow[]) => void;
}

export function RecipeBrowserDrawer({ 
  open, 
  onOpenChange, 
  onLoad, 
  onDuplicate,
  onCompare 
}: RecipeBrowserDrawerProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | '3months'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: getMyRecipes,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast({ title: "Recipe deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const filtered = recipes.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !filterType || r.product_type === filterType;
    
    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all' && r.created_at) {
      const recipeDate = new Date(r.created_at);
      const cutoffDate = dateFilter === 'week' ? subDays(new Date(), 7)
        : dateFilter === 'month' ? subDays(new Date(), 30)
        : subDays(new Date(), 90);
      matchesDate = isAfter(recipeDate, cutoffDate);
    }
    
    // Favorites filter
    const matchesFavorites = !showFavoritesOnly || (r.id && favorites.has(r.id));
    
    return matchesSearch && matchesType && matchesDate && matchesFavorites;
  });

  const types = Array.from(new Set(recipes.map((r) => r.product_type)));

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  const toggleCompareSelection = (id: string) => {
    const newSet = new Set(selectedForCompare);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else if (newSet.size < 3) {
      newSet.add(id);
    } else {
      toast({ title: "Maximum 3 recipes for comparison" });
      return;
    }
    setSelectedForCompare(newSet);
  };

  const handleCompare = () => {
    const selected = recipes.filter((r) => r.id && selectedForCompare.has(r.id));
    if (selected.length < 2) {
      toast({ title: "Select at least 2 recipes to compare" });
      return;
    }
    onCompare(selected);
  };

  const getCompositionStrip = (recipe: RecipeRow) => {
    if (!recipe.metrics) return null;
    const m = recipe.metrics;
    const fat = m.fat_pct || 0;
    const sugars = m.sugars_pct || 0;
    const msnf = m.msnf_pct || 0;
    const other = m.other_solids_pct || 0;
    const water = m.water_pct || 0;
    const total = fat + sugars + msnf + other + water;
    
    if (!total) return null;
    
    return (
      <div className="space-y-1">
        <div className="flex h-3 w-full rounded overflow-hidden shadow-sm">
          <div 
            style={{ width: `${(fat / total) * 100}%` }} 
            className="bg-amber-500"
            title={`Fat: ${fat.toFixed(1)}%`}
          />
          <div 
            style={{ width: `${(sugars / total) * 100}%` }} 
            className="bg-pink-500"
            title={`Sugars: ${sugars.toFixed(1)}%`}
          />
          <div 
            style={{ width: `${(msnf / total) * 100}%` }} 
            className="bg-blue-500"
            title={`MSNF: ${msnf.toFixed(1)}%`}
          />
          <div 
            style={{ width: `${(water / total) * 100}%` }} 
            className="bg-cyan-400"
            title={`Water: ${water.toFixed(1)}%`}
          />
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            Fat {fat.toFixed(0)}%
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-pink-500" />
            Sugar {sugars.toFixed(0)}%
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            MSNF {msnf.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  const exportRecipeToPDF = (recipe: RecipeRow) => {
    const doc = new jsPDF();
    const m = recipe.metrics;
    
    // Title
    doc.setFontSize(20);
    doc.text(recipe.name, 20, 20);
    
    // Metadata
    doc.setFontSize(10);
    doc.text(`Product Type: ${recipe.product_type}`, 20, 30);
    doc.text(`Created: ${recipe.created_at ? format(new Date(recipe.created_at), 'MMM d, yyyy') : 'N/A'}`, 20, 35);
    doc.text(`Profile Version: ${recipe.profile_version || 'v1'}`, 20, 40);
    
    // Ingredients section
    doc.setFontSize(14);
    doc.text('Ingredients', 20, 50);
    doc.setFontSize(10);
    
    let yPos = 58;
    if (Array.isArray(recipe.rows_json)) {
      recipe.rows_json.forEach((row: any, idx: number) => {
        doc.text(`${idx + 1}. ${row.ingredientId || 'Unknown'}: ${row.grams}g`, 25, yPos);
        yPos += 6;
      });
    }
    
    // Metrics section
    yPos += 10;
    doc.setFontSize(14);
    doc.text('Metrics', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    
    if (m) {
      const metrics = [
        `Fat: ${m.fat_pct?.toFixed(1)}%`,
        `MSNF: ${m.msnf_pct?.toFixed(1)}%`,
        `Sugars: ${m.sugars_pct?.toFixed(1)}%`,
        `Water: ${m.water_pct?.toFixed(1)}%`,
        `Total Solids: ${m.ts_pct?.toFixed(1)}%`,
        `FPDT: ${m.fpdt?.toFixed(2)}°C`,
        `POD Index: ${m.pod_index?.toFixed(0)}`
      ];
      
      metrics.forEach(metric => {
        doc.text(metric, 25, yPos);
        yPos += 6;
      });
    }
    
    // Save PDF
    doc.save(`${recipe.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: `${recipe.name} exported successfully`
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>My Recipes</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Chips */}
          <div className="space-y-3">
            {/* Product Type Filters */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Product Type</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filterType === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(null)}
                >
                  All
                </Button>
                {types.map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Date Range
              </label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={dateFilter === 'all' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter('all')}
                >
                  All Time
                </Button>
                <Button
                  variant={dateFilter === 'week' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter('week')}
                >
                  Last Week
                </Button>
                <Button
                  variant={dateFilter === 'month' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter('month')}
                >
                  Last Month
                </Button>
                <Button
                  variant={dateFilter === '3months' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter('3months')}
                >
                  Last 3 Months
                </Button>
              </div>
            </div>

            {/* Favorites Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Star className="h-3 w-3" />
                Favorites
              </label>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <Star className={`h-3 w-3 mr-1 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                {showFavoritesOnly ? 'Showing Favorites' : 'Show All'}
              </Button>
            </div>
          </div>

          {selectedForCompare.size > 0 && (
            <div className="flex gap-2">
              <Badge variant="secondary">{selectedForCompare.size} selected</Badge>
              <Button size="sm" onClick={handleCompare}>
                Compare
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedForCompare(new Set())}
              >
                Clear
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No recipes found</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((recipe) => (
                <Card
                  key={recipe.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    recipe.id && selectedForCompare.has(recipe.id)
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                  onClick={() => recipe.id && toggleCompareSelection(recipe.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{recipe.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {recipe.profile_version || "v1"}
                        </Badge>
                        {recipe.id && favorites.has(recipe.id) && (
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <span className="capitalize">{recipe.product_type}</span>
                        <span>•</span>
                        <span>
                          {recipe.created_at
                            ? format(new Date(recipe.created_at), "MMM d, yyyy")
                            : ""}
                        </span>
                      </div>
                      {getCompositionStrip(recipe)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => recipe.id && toggleFavorite(recipe.id, e)}
                        className="h-8 w-8"
                      >
                        <Star className={`h-4 w-4 ${recipe.id && favorites.has(recipe.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoad(recipe);
                          onOpenChange(false);
                        }}
                        className="h-8 w-8"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(recipe);
                          onOpenChange(false);
                        }}
                        className="h-8 w-8"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportRecipeToPDF(recipe);
                        }}
                        className="h-8 w-8"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (recipe.id && confirm("Delete this recipe?")) {
                            deleteMutation.mutate(recipe.id);
                          }
                        }}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
