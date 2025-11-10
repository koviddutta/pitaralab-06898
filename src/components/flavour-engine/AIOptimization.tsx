import { useState } from 'react';
import { Sparkles, Zap, CheckCircle, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OptimizerConfig, compareOptimizers } from '@/lib/optimize.advanced';
import { Row, OptimizeTarget } from '@/lib/optimize';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AIOptimizationProps {
  allTargetsMet: boolean;
  suggestions: string[];
  isOptimizing: boolean;
  onAutoOptimize: (algorithm: OptimizerConfig['algorithm']) => void;
  currentRows?: Row[];
  targets?: OptimizeTarget;
}

export default function AIOptimization({
  allTargetsMet,
  suggestions,
  isOptimizing,
  onAutoOptimize,
  currentRows,
  targets
}: AIOptimizationProps) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<OptimizerConfig['algorithm']>('hybrid');
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<Array<{
    algorithm: string;
    score: number;
    time: number;
    result: Row[];
  }> | null>(null);

  const algorithmInfo = {
    'hill-climbing': {
      name: 'Hill Climbing',
      description: 'Fast local optimization. Best for recipes already close to targets.',
      speed: 'Very Fast',
      quality: 'Good',
      icon: '⚡'
    },
    'genetic': {
      name: 'Genetic Algorithm',
      description: 'Evolutionary approach. Explores many solutions simultaneously.',
      speed: 'Moderate',
      quality: 'Excellent',
      icon: '🧬'
    },
    'particle-swarm': {
      name: 'Particle Swarm',
      description: 'Swarm intelligence. Good at finding global optima.',
      speed: 'Moderate',
      quality: 'Very Good',
      icon: '🐝'
    },
    'hybrid': {
      name: 'Hybrid (GA + Hill)',
      description: 'Best of both: broad exploration then refinement.',
      speed: 'Slower',
      quality: 'Best',
      icon: '🚀'
    }
  };

  const generateSuggestions = () => {
    if (allTargetsMet) {
      return [
        'Recipe is already balanced! Consider experimenting with flavor variations.',
        'Try the Temperature Tuning tool to optimize for different serving temperatures.',
        'Use Sugar Blend Optimizer to fine-tune sweetness profile.'
      ];
    }
    
    return [
      'Recipe needs optimization. AI can automatically adjust ingredients to meet targets.',
      `Recommended algorithm: ${algorithmInfo[selectedAlgorithm].name} - ${algorithmInfo[selectedAlgorithm].description}`,
      'Lock any ingredients you want to keep unchanged before optimizing.'
    ];
  };

  const currentSuggestions = suggestions.length > 0 ? suggestions : generateSuggestions();

  const runComparison = async () => {
    if (!currentRows || !targets) return;
    
    setIsComparing(true);
    try {
      const results = compareOptimizers(currentRows, targets);
      setComparisonResults(results);
    } catch (error) {
      console.error('Comparison error:', error);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Optimization
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Advanced algorithms to automatically balance your recipe
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <Alert variant={allTargetsMet ? 'default' : 'destructive'}>
            {allTargetsMet ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <strong>{allTargetsMet ? 'Recipe Balanced ✓' : 'Optimization Needed'}</strong>
              <br />
              {allTargetsMet 
                ? 'All parameters are within target ranges'
                : 'Some parameters are outside target ranges'}
            </AlertDescription>
          </Alert>

          {/* Algorithm Selection */}
          <div>
            <Label>Optimization Algorithm</Label>
            <Select 
              value={selectedAlgorithm} 
              onValueChange={(val) => setSelectedAlgorithm(val as OptimizerConfig['algorithm'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(algorithmInfo).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.icon} {info.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Algorithm Details */}
            <div className="mt-3 p-4 bg-card-secondary rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{algorithmInfo[selectedAlgorithm].name}</span>
                <div className="flex gap-2">
                  <Badge variant="outline">{algorithmInfo[selectedAlgorithm].speed}</Badge>
                  <Badge variant="secondary">{algorithmInfo[selectedAlgorithm].quality}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {algorithmInfo[selectedAlgorithm].description}
              </p>
            </div>
          </div>

          {/* AI Suggestions */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              AI Insights
            </h3>
            <div className="space-y-2">
              {currentSuggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm p-3 bg-primary/5 rounded-lg">
                  <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optimize Button */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => onAutoOptimize(selectedAlgorithm)}
              disabled={isOptimizing || isComparing}
              className="w-full"
              size="lg"
            >
              {isOptimizing ? (
                <>
                  <span className="animate-spin mr-2">⚙️</span>
                  Optimizing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Auto-Optimize
                </>
              )}
            </Button>
            
            <Button 
              onClick={runComparison}
              disabled={isOptimizing || isComparing || !currentRows || !targets}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {isComparing ? (
                <>
                  <span className="animate-spin mr-2">⚙️</span>
                  Comparing...
                </>
              ) : (
                <>
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Compare All
                </>
              )}
            </Button>
          </div>

          {/* Info Footer */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border/50">
            <p><strong>How it works:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Analyzes current recipe and target parameters</li>
              <li>Uses selected AI algorithm to find optimal ingredient quantities</li>
              <li>Respects min/max constraints and locked ingredients</li>
              <li>Iteratively improves recipe to meet all targets</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisonResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Algorithm Comparison Results
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Performance metrics for all optimization algorithms (lower score is better)
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Algorithm</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Rank</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonResults.map((result, idx) => (
                  <TableRow key={result.algorithm}>
                    <TableCell className="font-medium">
                      {algorithmInfo[result.algorithm as OptimizerConfig['algorithm']]?.icon}{' '}
                      {algorithmInfo[result.algorithm as OptimizerConfig['algorithm']]?.name || result.algorithm}
                    </TableCell>
                    <TableCell>
                      <Badge variant={idx === 0 ? 'default' : 'outline'}>
                        {result.score.toFixed(3)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {result.time.toFixed(0)}ms
                    </TableCell>
                    <TableCell>
                      {idx === 0 ? (
                        <Badge variant="default" className="bg-green-600">
                          🏆 Best
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">#{idx + 1}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <Alert className="mt-4">
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                <strong>Winner: {algorithmInfo[comparisonResults[0].algorithm as OptimizerConfig['algorithm']]?.name}</strong>
                <br />
                This algorithm achieved the best score ({comparisonResults[0].score.toFixed(3)}) 
                in {comparisonResults[0].time.toFixed(0)}ms. Click "Auto-Optimize" after selecting it to apply.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
