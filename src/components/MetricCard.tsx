import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: React.ReactNode;
  sublabel?: string;
  value: number;
  unit?: string;
  target?: string;
  warning?: boolean;
  status?: 'success' | 'warning' | 'error';
  tooltip?: string;
}

export const MetricCard = ({
  label,
  sublabel,
  value,
  unit = '',
  target,
  warning,
  status,
  tooltip
}: MetricCardProps) => {
  return (
    <Card className={cn(
      "transition-all hover:shadow-lg",
      warning && "border-orange-500 bg-orange-50 dark:bg-orange-950/20",
      status === 'error' && "border-red-500 bg-red-50 dark:bg-red-950/20",
      status === 'success' && "border-green-500 bg-green-50 dark:bg-green-950/20",
      status === 'warning' && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="flex items-center gap-1">
            {warning && <AlertTriangle className="h-4 w-4 text-orange-500" />}
            {status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {status === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        {sublabel && (
          <span className="text-xs text-muted-foreground block mb-1">{sublabel}</span>
        )}
        <div className="text-2xl font-bold">
          {value.toFixed(2)}{unit}
        </div>
        {target && (
          <Badge variant="outline" className="mt-2 text-xs">
            Target: {target}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
