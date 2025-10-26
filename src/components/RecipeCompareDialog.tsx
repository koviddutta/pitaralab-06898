import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface RecipeCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes?: any[];
  versions?: any[];
}

export function RecipeCompareDialog({
  open,
  onOpenChange,
}: RecipeCompareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Recipes</DialogTitle>
        </DialogHeader>
        
        <Card className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Recipe comparison is being updated to work with the new database structure.
              This feature will be available soon.
            </AlertDescription>
          </Alert>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
