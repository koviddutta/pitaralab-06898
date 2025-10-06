import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { Thermometer, Gauge, PieChartIcon, Layers } from 'lucide-react';

interface ScienceMetricsPanelProps {
  podIndex: number;
  fpdt: number;
  mode: 'gelato' | 'kulfi';
  sugars: {
    sucrose: number;
    dextrose: number;
    fructose: number;
    lactose: number;
    other: number;
  };
  composition: {
    fat: number;
    msnf: number;
    water: number;
    sugars: number;
    other: number;
  };
}

const COLORS = {
  sucrose: 'hsl(var(--chart-1))',
  dextrose: 'hsl(var(--chart-2))',
  fructose: 'hsl(var(--chart-3))',
  lactose: 'hsl(var(--chart-4))',
  other: 'hsl(var(--chart-5))',
  fat: 'hsl(var(--primary))',
  msnf: 'hsl(var(--secondary))',
  water: 'hsl(var(--accent))',
  sugarsComp: 'hsl(var(--destructive))',
};

export const ScienceMetricsPanel: React.FC<ScienceMetricsPanelProps> = ({
  podIndex,
  fpdt,
  mode,
  sugars,
  composition
}) => {
  // POD gauge data (0-150 scale)
  const podGaugeData = [
    { name: 'Too Low', value: 80, fill: 'hsl(var(--destructive) / 0.3)' },
    { name: 'Optimal', value: 40, fill: 'hsl(var(--primary))' },
    { name: 'Too High', value: 30, fill: 'hsl(var(--destructive) / 0.3)' },
  ];

  const podNeedle = Math.min(Math.max(podIndex, 0), 150);
  const podAngle = ((podNeedle / 150) * 180) - 90;

  // Sugar breakdown pie data
  const sugarPieData = [
    { name: 'Sucrose', value: sugars.sucrose, fill: COLORS.sucrose },
    { name: 'Dextrose', value: sugars.dextrose, fill: COLORS.dextrose },
    { name: 'Fructose', value: sugars.fructose, fill: COLORS.fructose },
    { name: 'Lactose', value: sugars.lactose, fill: COLORS.lactose },
    { name: 'Other', value: sugars.other, fill: COLORS.other },
  ].filter(item => item.value > 0);

  // FPDT scale data
  const fpdtTarget = mode === 'gelato' 
    ? { min: 2.5, max: 3.5, label: 'Gelato Zone' }
    : { min: 2.0, max: 2.5, label: 'Kulfi Zone' };

  const fpdtScaleData = [
    { label: 'Current', value: fpdt }
  ];

  // Composition bar data
  const compositionData = [
    { name: 'Fat', value: composition.fat, fill: COLORS.fat },
    { name: 'MSNF', value: composition.msnf, fill: COLORS.msnf },
    { name: 'Sugars', value: composition.sugars, fill: COLORS.sugarsComp },
    { name: 'Water', value: composition.water, fill: COLORS.water },
    { name: 'Other', value: composition.other, fill: COLORS.other },
  ].filter(item => item.value > 0);

  // POD status
  const getPODStatus = () => {
    if (podIndex < 80) return { text: 'Low Sweetness', color: 'text-orange-500' };
    if (podIndex > 120) return { text: 'High Sweetness', color: 'text-red-500' };
    return { text: 'Balanced', color: 'text-green-500' };
  };

  const podStatus = getPODStatus();

  // FPDT status
  const getFPDTStatus = () => {
    if (fpdt < fpdtTarget.min) return { text: 'Too Soft', color: 'text-orange-500' };
    if (fpdt > fpdtTarget.max) return { text: 'Too Hard', color: 'text-orange-500' };
    return { text: 'Optimal', color: 'text-green-500' };
  };

  const fpdtStatus = getFPDTStatus();

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* POD Index Gauge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5" />
            POD Sweetness Index
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={podGaugeData}
                    cx="50%"
                    cy="90%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {podGaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Needle */}
              <div 
                className="absolute bottom-0 left-1/2 w-0.5 h-16 bg-foreground origin-bottom transition-transform"
                style={{ 
                  transform: `translateX(-50%) rotate(${podAngle}deg)`,
                }}
              />
            </div>
            <div className="text-center space-y-1">
              <div className="text-3xl font-bold">{podIndex.toFixed(0)}</div>
              <div className={`text-sm font-medium ${podStatus.color}`}>{podStatus.text}</div>
              <div className="text-xs text-muted-foreground">Target: 80-120 (Balanced)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FPDT Scale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Thermometer className="h-5 w-5" />
            Freezing Point Depression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart
                data={fpdtScaleData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={60} />
                <ReferenceLine 
                  x={fpdtTarget.min} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="3 3" 
                  label={{ value: 'Min', position: 'top', fontSize: 10 }}
                />
                <ReferenceLine 
                  x={fpdtTarget.max} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="3 3"
                  label={{ value: 'Max', position: 'top', fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value: any) => [`${value.toFixed(2)}°C`, 'FPDT']}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="text-center space-y-1">
              <div className="text-3xl font-bold">{fpdt.toFixed(2)}°C</div>
              <div className={`text-sm font-medium ${fpdtStatus.color}`}>{fpdtStatus.text}</div>
              <div className="text-xs text-muted-foreground">
                {fpdtTarget.label}: {fpdtTarget.min.toFixed(1)}-{fpdtTarget.max.toFixed(1)}°C
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sugar Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="h-5 w-5" />
            Sugar Composition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sugarPieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={70}
                dataKey="value"
              >
                {sugarPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: any) => [`${value.toFixed(1)}g`, 'Amount']}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Composition Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5" />
            Recipe Composition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={compositionData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: any) => [`${value.toFixed(1)}%`, 'Percentage']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {compositionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
