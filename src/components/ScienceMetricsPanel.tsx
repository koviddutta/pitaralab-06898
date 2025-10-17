import { Card } from "@/components/ui/card";
import { ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useState, useEffect } from "react";
import { fetchThermoMetrics, type ThermoMetricsResult } from "@/services/metricsService";
import { Loader2 } from "lucide-react";

export default function ScienceMetricsPanel({
  podIndex, fpdt, mode,
  sugars: { sucrose_g, dextrose_g, fructose_g, lactose_g },
  composition: { waterPct, fatPct, msnfPct, sugarsPct, otherPct },
  rows = [],
  serveTempC = -12
}: {
  podIndex: number; fpdt: number; mode:"gelato"|"kulfi";
  sugars:{sucrose_g:number; dextrose_g:number; fructose_g:number; lactose_g:number};
  composition:{waterPct:number; fatPct:number; msnfPct:number; sugarsPct:number; otherPct:number};
  rows?: Array<{ ing_id: string; grams: number }>;
  serveTempC?: number;
}) {
  const [thermoMetrics, setThermoMetrics] = useState<ThermoMetricsResult | null>(null);
  const [isLoadingThermo, setIsLoadingThermo] = useState(false);

  useEffect(() => {
    if (rows.length === 0) return;
    
    const loadThermoMetrics = async () => {
      try {
        setIsLoadingThermo(true);
        const result = await fetchThermoMetrics({ rows, mode, serveTempC });
        setThermoMetrics(result);
      } catch (error) {
        console.error('Failed to fetch thermo metrics:', error);
      } finally {
        setIsLoadingThermo(false);
      }
    };

    loadThermoMetrics();
  }, [rows, mode, serveTempC]);
  const podVal = Math.max(0, Math.min(160, Math.round(podIndex)));
  const [lo, hi] = mode==="gelato"? [2.5,3.5] : [2.0,2.5];
  const sugarData = [
    { name:"Sucrose", value:sucrose_g }, { name:"Dextrose", value:dextrose_g },
    { name:"Fructose", value:fructose_g }, { name:"Lactose", value:lactose_g }
  ];
  const compData = [{ name:"Mix", Water:waterPct, Fat:fatPct, MSNF:msnfPct, Sugars:sugarsPct, Other:otherPct }];

  const TargetBar = ({ label, value, min, max }:{label:string; value:number; min:number; max:number}) => {
    const ok = value >= min && value <= max;
    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span>{label}</span><span>{value.toFixed(1)}% (target {min}–{max}%)</span>
        </div>
        <div className="h-2 bg-muted rounded overflow-hidden">
          <div className={`h-2 ${ok?'bg-success':'bg-warning'}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="p-3">
        <div className="text-sm mb-1">POD Index (per 100 g sugars)</div>
        <ResponsiveContainer width="100%" height={140}>
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name:'POD', value: podVal }]}>
            <RadialBar dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="text-xs text-muted-foreground">Ideal ~80–120. Sucrose=100.</div>
      </Card>

      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Freezing Point Depression</div>
        {isLoadingThermo ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : thermoMetrics ? (
          <>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-muted-foreground">Base FPDT</div>
                <div className="text-lg font-semibold">{thermoMetrics.base.FPDT.toFixed(2)} °C</div>
              </div>
              {thermoMetrics.adjusted.hardeningEffect > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground">Adjusted FPDT (with hardening)</div>
                  <div className="text-lg font-semibold text-primary">{thermoMetrics.adjusted.FPDT.toFixed(2)} °C</div>
                </div>
              )}
            </div>
            <div className="h-3 rounded bg-muted mt-2 relative">
              <div className={`absolute top-0 h-3 ${thermoMetrics.base.FPDT>=lo && thermoMetrics.base.FPDT<=hi ? 'bg-success' : 'bg-warning'}`} 
                   style={{ width: `${Math.max(0, Math.min(100, ((thermoMetrics.base.FPDT-1.0)/3.5)*100))}%` }} />
            </div>
            <div className="text-xs mt-1">Target: {lo}–{hi} °C</div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Add ingredients to calculate</div>
        )}
      </Card>

      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Water Frozen @ {serveTempC}°C</div>
        {isLoadingThermo ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : thermoMetrics ? (
          <>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-muted-foreground">Base</div>
                <div className="text-lg font-semibold">{thermoMetrics.base.waterFrozenPct.toFixed(1)}%</div>
              </div>
              {thermoMetrics.adjusted.hardeningEffect > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground">Adjusted (with hardening)</div>
                  <div className="text-lg font-semibold text-primary">{thermoMetrics.adjusted.waterFrozenPct.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Hardening effect: {thermoMetrics.adjusted.hardeningEffect.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
            <div className="h-3 rounded bg-muted mt-2 relative">
              <div className="absolute top-0 h-3 bg-primary" 
                   style={{ width: `${thermoMetrics.base.waterFrozenPct}%` }} />
            </div>
            <div className="text-xs mt-1">Ideal: 65-75% for scoopability</div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Add ingredients to calculate</div>
        )}
      </Card>

      <Card className="p-3">
        <div className="text-sm mb-2">Sugar Spectrum (g)</div>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart><Pie data={sugarData} dataKey="value" nameKey="name" outerRadius={70} label>
            {sugarData.map((_, i) => <Cell key={i} />)}
          </Pie></PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-3">
        <div className="text-sm mb-2">Composition (%)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={compData}>
            <XAxis dataKey="name" hide /><YAxis domain={[0,100]} /><Tooltip />
            <Bar dataKey="Water" stackId="a" /><Bar dataKey="Fat" stackId="a" />
            <Bar dataKey="MSNF" stackId="a" /><Bar dataKey="Sugars" stackId="a" />
            <Bar dataKey="Other" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-3">
        <div className="text-sm font-medium mb-2">Targets</div>
        <TargetBar label="Total Solids" value={sugarsPct+fatPct+msnfPct+otherPct} min={mode==='gelato'?36:38} max={mode==='gelato'?45:42} />
        <TargetBar label="Fat" value={fatPct} min={mode==='gelato'?6:10} max={mode==='gelato'?9:12} />
        <TargetBar label="MSNF" value={msnfPct} min={mode==='gelato'?10:18} max={mode==='gelato'?12:25} />
        <TargetBar label="Total Sugars" value={sugarsPct} min={mode==='gelato'?16:18} max={mode==='gelato'?22:22} />
      </Card>
    </div>
  );
}
