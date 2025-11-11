import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Beaker, DollarSign, Sparkles, Candy, Info } from 'lucide-react';
import { ChemistryDashboard } from '@/components/ChemistryDashboard';
import { CostAnalysisDashboard } from '@/components/CostAnalysisDashboard';
import { OptimizationWorkbench } from '@/components/OptimizationWorkbench';
import SugarBlendOptimizer from '@/components/flavour-engine/SugarBlendOptimizer';

interface AIFlavourEngineProps {
  initialRecipe?: any[];
  initialMetrics?: any;
  initialProductType?: string;
}

export default function AIFlavourEngine({ 
  initialRecipe = [], 
  initialMetrics = null,
  initialProductType = 'ice_cream'
}: AIFlavourEngineProps) {
  const [activeTab, setActiveTab] = useState('chemistry');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                AI Flavour Engine
              </CardTitle>
              <CardDescription>
                Advanced analysis and optimization tools for perfect recipes
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              ✨ Enhanced Features
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Feature Tour Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Welcome to the AI Flavour Engine!</strong> Here you'll find all advanced analysis tools:
          Chemistry deep-dive, Real-time costing, AI optimization, and Sugar spectrum analysis.
        </AlertDescription>
      </Alert>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chemistry" className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            <span className="hidden sm:inline">Chemistry</span>
          </TabsTrigger>
          <TabsTrigger value="costing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Cost Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Optimize</span>
          </TabsTrigger>
          <TabsTrigger value="sugar" className="flex items-center gap-2">
            <Candy className="h-4 w-4" />
            <span className="hidden sm:inline">Sugar Blend</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chemistry" className="mt-6">
          <ChemistryDashboard 
            recipe={initialRecipe}
            metrics={initialMetrics}
          />
        </TabsContent>

        <TabsContent value="costing" className="mt-6">
          <CostAnalysisDashboard 
            recipe={initialRecipe}
            recipeName="Current Recipe"
          />
        </TabsContent>

        <TabsContent value="optimization" className="mt-6">
          <OptimizationWorkbench 
            recipe={initialRecipe}
            metrics={initialMetrics}
            productType={initialProductType}
          />
        </TabsContent>

        <TabsContent value="sugar" className="mt-6">
          <SugarBlendOptimizer 
            productType={initialProductType as any}
            totalSugarAmount={initialMetrics?.totalSugars_g || 200}
            onOptimizedBlend={(blend) => console.log('Optimized blend:', blend)}
          />
        </TabsContent>
      </Tabs>

      {/* Feature Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Feature Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">
                ✅ Available
              </Badge>
              <span className="text-muted-foreground">Chemistry Analysis (Offline)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">
                ✅ Available
              </Badge>
              <span className="text-muted-foreground">Cost Calculator (Offline)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">
                ✅ Available
              </Badge>
              <span className="text-muted-foreground">Sugar Optimizer (Offline)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">
                🔌 Backend
              </Badge>
              <span className="text-muted-foreground">AI Optimization (Enhanced)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}