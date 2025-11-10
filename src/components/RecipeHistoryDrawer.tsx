import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Clock, RotateCcw, GitCompare, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getRecipeVersions, RecipeVersion, compareVersions } from "@/services/recipeVersionService";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface RecipeHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string | null;
  onRestoreVersion?: (version: RecipeVersion) => void;
}

export function RecipeHistoryDrawer({
  open,
  onOpenChange,
  recipeId,
  onRestoreVersion,
}: RecipeHistoryDrawerProps) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<RecipeVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareWith, setCompareWith] = useState<RecipeVersion | null>(null);

  useEffect(() => {
    if (open && recipeId) {
      loadVersions();
    }
  }, [open, recipeId]);

  const loadVersions = async () => {
    if (!recipeId) return;
    
    setLoading(true);
    const result = await getRecipeVersions(recipeId);
    
    if (result.success && result.versions) {
      setVersions(result.versions);
      if (result.versions.length > 0) {
        setSelectedVersion(result.versions[0]);
      }
    } else {
      toast({
        title: "Error loading history",
        description: result.error || "Failed to load version history",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleRestore = (version: RecipeVersion) => {
    if (onRestoreVersion) {
      onRestoreVersion(version);
      toast({
        title: "Version Restored",
        description: `Restored to version ${version.version_number} from ${formatDistanceToNow(new Date(version.created_at))} ago`
      });
      onOpenChange(false);
    }
  };

  const handleCompare = () => {
    if (selectedVersion && compareWith) {
      const diff = compareVersions(compareWith, selectedVersion);
      // Show comparison in a modal or alert
      toast({
        title: "Version Comparison",
        description: `${diff.ingredientsChanged.added.length} added, ${diff.ingredientsChanged.removed.length} removed, ${diff.ingredientsChanged.modified.length} modified`
      });
    }
  };

  if (!recipeId) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Recipe History</SheetTitle>
          </SheetHeader>
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please save the recipe first to enable version history.
            </AlertDescription>
          </Alert>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recipe Version History
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : versions.length === 0 ? (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No version history available yet. Versions are automatically saved when you update the recipe.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex-1 mt-4 space-y-4 overflow-hidden flex flex-col">
            {/* Compare Mode Toggle */}
            <div className="flex items-center justify-between">
              <Badge variant={compareMode ? "default" : "outline"}>
                {versions.length} version{versions.length !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCompareMode(!compareMode);
                  setCompareWith(null);
                }}
              >
                <GitCompare className="h-4 w-4 mr-2" />
                {compareMode ? 'Exit Compare' : 'Compare Versions'}
              </Button>
            </div>

            {/* Version List */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                {versions.map((version, index) => {
                  const isSelected = selectedVersion?.id === version.id;
                  const isCompareTarget = compareWith?.id === version.id;
                  const isLatest = index === 0;

                  return (
                    <Card 
                      key={version.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'border-primary shadow-md' : ''
                      } ${isCompareTarget ? 'border-accent' : ''}`}
                      onClick={() => {
                        if (compareMode && selectedVersion && selectedVersion.id !== version.id) {
                          setCompareWith(version);
                        } else {
                          setSelectedVersion(version);
                          setCompareWith(null);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                Version {version.version_number}
                              </span>
                              {isLatest && (
                                <Badge variant="default" className="text-xs">Latest</Badge>
                              )}
                              {isCompareTarget && (
                                <Badge variant="secondary" className="text-xs">Compare With</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {version.recipe_name} · {version.product_type}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                            </div>
                            {version.change_description && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                "{version.change_description}"
                              </p>
                            )}
                            <div className="mt-2 text-xs text-muted-foreground">
                              {version.ingredients_json.length} ingredient{version.ingredients_json.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(version);
                            }}
                            disabled={isLatest}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Comparison Results */}
            {compareMode && selectedVersion && compareWith && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Comparison</h4>
                  {(() => {
                    const diff = compareVersions(compareWith, selectedVersion);
                    return (
                      <div className="text-sm space-y-1">
                        {diff.nameChanged && (
                          <p className="text-muted-foreground">
                            Name: {compareWith.recipe_name} → {selectedVersion.recipe_name}
                          </p>
                        )}
                        {diff.productTypeChanged && (
                          <p className="text-muted-foreground">
                            Type: {compareWith.product_type} → {selectedVersion.product_type}
                          </p>
                        )}
                        {diff.ingredientsChanged.added.length > 0 && (
                          <p className="text-green-600">
                            + Added: {diff.ingredientsChanged.added.map(i => i.ingredient).join(', ')}
                          </p>
                        )}
                        {diff.ingredientsChanged.removed.length > 0 && (
                          <p className="text-red-600">
                            - Removed: {diff.ingredientsChanged.removed.map(i => i.ingredient).join(', ')}
                          </p>
                        )}
                        {diff.ingredientsChanged.modified.length > 0 && (
                          <p className="text-amber-600">
                            ≈ Modified: {diff.ingredientsChanged.modified.map(i => i.ingredient).join(', ')}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
