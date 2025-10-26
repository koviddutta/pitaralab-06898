import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecipeBrowserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad?: (recipe: any) => void;
  onCompare?: (recipes: any[]) => void;
  onDuplicate?: (recipe: any) => void;
}

export function RecipeBrowserDrawer({
  open,
  onOpenChange,
}: RecipeBrowserDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Recipe Browser</SheetTitle>
        </SheetHeader>
        
        <Card className="mt-4 p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Recipe browser is being updated to work with the new database structure.
              This feature will be available soon.
            </AlertDescription>
          </Alert>
        </Card>
      </SheetContent>
    </Sheet>
  );
}
