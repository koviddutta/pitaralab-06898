import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecipeHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string | null;
  onRestoreVersion?: (version: any) => void;
  onCompareVersions?: (versions: any[]) => void;
}

export function RecipeHistoryDrawer({
  open,
  onOpenChange,
}: RecipeHistoryDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Recipe History</SheetTitle>
        </SheetHeader>
        
        <Card className="mt-4 p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Recipe versioning is being updated to work with the new database structure. 
              This feature will be available soon.
            </AlertDescription>
          </Alert>
        </Card>
      </SheetContent>
    </Sheet>
  );
}
