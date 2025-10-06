import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info, Wrench, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WarningTooltip } from "./WarningTooltip";

interface EnhancedWarningsPanelProps {
  warnings: string[];
}

export const EnhancedWarningsPanel = ({ warnings }: EnhancedWarningsPanelProps) => {
  if (!warnings || warnings.length === 0) {
    return (
      <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Info className="h-5 w-5" />
            <span className="font-medium">All parameters within optimal ranges! ✓</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const critical = warnings.filter(w => w.includes('⚠️'));
  const troubleshooting = warnings.filter(w => w.includes('🔧'));
  const info = warnings.filter(w => !w.includes('⚠️') && !w.includes('🔧'));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Warnings & Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {critical.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                {critical.map((w, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="flex-1">{w.replace('⚠️', '').trim()}</span>
                    <WarningTooltip warning={w} />
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {troubleshooting.length > 0 && (
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
            <Wrench className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Troubleshooting Suggestions</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <ul className="list-disc pl-4 space-y-1 mt-2">
                {troubleshooting.map((w, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="flex-1">{w.replace('🔧', '').trim()}</span>
                    <WarningTooltip warning={w} />
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {info.length > 0 && (
          <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900 dark:text-yellow-100">Information</AlertTitle>
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <ul className="list-disc pl-4 space-y-1 mt-2">
                {info.map((w, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="flex-1">{w}</span>
                    <WarningTooltip warning={w} />
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
