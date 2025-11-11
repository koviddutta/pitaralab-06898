import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Save, History, Info } from 'lucide-react';
import AIOptimization from './flavour-engine/AIOptimization';
import { 
  loadOptimizationPresets, 
  saveOptimizationPreset, 
  getDefaultTargets,
  BUILT_IN_PRESETS 
} from '@/services/optimizationService';
import { useToast } from '@/hooks/use-toast';

interface OptimizationWorkbenchProps {
  recipe: any[];
  metrics: any;
  productType: string;
}

export function OptimizationWorkbench({ recipe, metrics, productType }: OptimizationWorkbenchProps) {
  const { toast } = useToast();
  const [userPresets, setUserPresets] = useState<any[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserPresets();
  }, [productType]);

  const loadUserPresets = async () => {
    setIsLoading(true);
    const { data, error } = await loadOptimizationPresets(productType);
    if (error) {
      console.error('Error loading presets:', error);
    } else if (data) {
      setUserPresets(data);
    }
    setIsLoading(false);
  };

  const handleSavePreset = async (presetName: string, targetMetrics: any, algorithm: any) => {
    const { data, error } = await saveOptimizationPreset(
      presetName,
      productType,
      targetMetrics,
      algorithm
    );

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save optimization preset',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Preset Saved',
        description: `Optimization preset "${presetName}" saved successfully`,
      });
      loadUserPresets();
    }
  };

  const allPresets = [
    ...BUILT_IN_PRESETS.filter(p => p.product_type === productType),
    ...userPresets,
  ];

  if (recipe.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Optimization Workbench
          </CardTitle>
          <CardDescription>Advanced recipe optimization with multiple algorithms</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No recipe loaded. Go to the Calculator tab and create a recipe to enable optimization.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preset Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Optimization Presets</CardTitle>
              <CardDescription>Quick-start with proven configurations</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {allPresets.length} Available
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={selectedPreset?.preset_name || ''}
            onValueChange={(value) => {
              const preset = allPresets.find(p => p.preset_name === value);
              setSelectedPreset(preset);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a preset..." />
            </SelectTrigger>
            <SelectContent>
              {allPresets.map((preset, i) => (
                <SelectItem key={i} value={preset.preset_name}>
                  <div className="flex items-center gap-2">
                    <span>{preset.preset_name}</span>
                    {!preset.id && <Badge variant="outline" className="text-xs">Built-in</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPreset && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedPreset.preset_name}</strong>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>Sugars: {selectedPreset.target_metrics.sugars_pct}%</div>
                  <div>Fat: {selectedPreset.target_metrics.fat_pct}%</div>
                  <div>MSNF: {selectedPreset.target_metrics.msnf_pct}%</div>
                  <div>FPDT: {selectedPreset.target_metrics.fpdt}°C</div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Optimization Component */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Optimization
          </CardTitle>
          <CardDescription>
            Automatically improve recipe balance for texture, flavor, and composition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              AI Optimization is available in the Calculator tab. Create a recipe there and use the "Auto-Balance" feature for optimization.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Feature Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Available Optimization Modes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline">Composition</Badge>
              <span className="text-muted-foreground">Balance sugars, fat, MSNF, and solids</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">Texture</Badge>
              <span className="text-muted-foreground">Optimize for smooth, creamy texture</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">Freezing</Badge>
              <span className="text-muted-foreground">Perfect freezing point and scoopability</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">Cost</Badge>
              <span className="text-muted-foreground">Minimize cost while maintaining quality</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}