import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, TrendingUp } from 'lucide-react';

interface RecipeRow {
  ingredientId: string;
  grams: number;
}

interface OptimizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalRows: RecipeRow[];
  optimizedRows: RecipeRow[];
  onApply: () => void;
  getIngredientName: (id: string) => string;
}

export const OptimizeDialog: React.FC<OptimizeDialogProps> = ({
  open,
  onOpenChange,
  originalRows,
  optimizedRows,
  onApply,
  getIngredientName,
}) => {
  // Find changed ingredients
  const changes = optimizedRows
    .map((optRow, index) => {
      const origRow = originalRows[index];
      if (!origRow || optRow.grams === origRow.grams) return null;
      
      const diff = optRow.grams - origRow.grams;
      const percentChange = ((diff / origRow.grams) * 100).toFixed(1);
      
      return {
        name: getIngredientName(optRow.ingredientId),
        original: origRow.grams,
        optimized: optRow.grams,
        diff,
        percentChange,
      };
    })
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recipe Optimization
          </DialogTitle>
          <DialogDescription>
            Review the suggested changes to improve your recipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Changes Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {changes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No optimization changes needed - recipe is already balanced!</p>
              ) : (
                changes.map((change, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{change.name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{change.original}g</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-semibold text-foreground">{change.optimized}g</span>
                        <span className={change.diff > 0 ? 'text-green-600' : 'text-orange-600'}>
                          ({change.diff > 0 ? '+' : ''}{change.percentChange}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              onApply();
              onOpenChange(false);
            }}
            disabled={changes.length === 0}
          >
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
