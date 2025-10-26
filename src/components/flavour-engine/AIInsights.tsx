import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function AIInsights() {
  return (
    <Card className="p-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          AI Insights are being updated to work with the new database structure.
          This feature will be available soon.
        </AlertDescription>
      </Alert>
    </Card>
  );
}
