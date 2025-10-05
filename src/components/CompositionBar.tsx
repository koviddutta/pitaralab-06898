import { MetricsV2 } from "@/lib/calc.v2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CompositionBarProps {
  metrics: MetricsV2;
}

export const CompositionBar = ({ metrics }: CompositionBarProps) => {
  const segments = [
    { 
      label: 'Fat', 
      value: metrics.fat_pct, 
      color: 'bg-yellow-400 dark:bg-yellow-600',
      description: 'Contributes richness and smooth mouthfeel'
    },
    { 
      label: 'MSNF', 
      value: metrics.msnf_pct, 
      color: 'bg-blue-400 dark:bg-blue-600',
      description: 'Milk solids: protein + lactose + minerals'
    },
    { 
      label: 'Sugars', 
      value: metrics.totalSugars_pct, 
      color: 'bg-pink-400 dark:bg-pink-600',
      description: 'Total sugars including lactose'
    },
    { 
      label: 'Other', 
      value: metrics.other_pct, 
      color: 'bg-gray-400 dark:bg-gray-600',
      description: 'Stabilizers, emulsifiers, flavors'
    },
    { 
      label: 'Water', 
      value: metrics.water_pct, 
      color: 'bg-cyan-200 dark:bg-cyan-800',
      description: 'Water content (will freeze)'
    },
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Composition Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
          <div className="flex h-12 w-full rounded overflow-hidden border-2 border-gray-200">
            {segments.map((seg, i) => (
              seg.value > 0 && (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        seg.color, 
                        "transition-all hover:opacity-80 cursor-pointer flex items-center justify-center"
                      )}
                      style={{ width: `${seg.value}%` }}
                    >
                      {seg.value > 8 && (
                        <span className="text-xs font-semibold text-white drop-shadow">
                          {seg.value.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <div className="font-semibold">{seg.label}: {seg.value.toFixed(2)}%</div>
                      <div className="text-xs text-muted-foreground">{seg.description}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            ))}
          </div>
        </TooltipProvider>
        
        <div className="flex flex-wrap gap-3 text-xs">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={cn(seg.color, "w-4 h-4 rounded border border-gray-300")} />
              <span className="font-medium">{seg.label}</span>
              <span className="text-muted-foreground">({seg.value.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Solids:</span>
            <span className="font-semibold">{metrics.ts_pct.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Mass:</span>
            <span className="font-semibold">{metrics.total_g.toFixed(0)}g</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
