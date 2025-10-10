import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyRecipes, deleteRecipe, type RecipeRow } from "@/services/recipeService";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Copy, Trash2, FileText, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
    return matchesSearch && matchesType;
  });

  const types = Array.from(new Set(recipes.map((r) => r.product_type)));

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
    const { fat, sugars, msnf, water } = recipe.metrics;
    const total = (fat || 0) + (sugars || 0) + (msnf || 0) + (water || 0);
    if (!total) return null;
    
    return (
      <div className="flex h-2 w-full rounded overflow-hidden">
        <div style={{ width: `${((fat || 0) / total) * 100}%` }} className="bg-amber-500" />
        <div style={{ width: `${((sugars || 0) / total) * 100}%` }} className="bg-pink-500" />
        <div style={{ width: `${((msnf || 0) / total) * 100}%` }} className="bg-blue-500" />
        <div style={{ width: `${((water || 0) / total) * 100}%` }} className="bg-cyan-500" />
      </div>
    );
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
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
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
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoad(recipe);
                          onOpenChange(false);
                        }}
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(recipe);
                        }}
                      >
                        <Copy className="h-4 w-4" />
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
