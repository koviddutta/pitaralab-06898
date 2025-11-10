import { useState } from 'react';
import { Microscope, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useIngredients } from '@/contexts/IngredientsContext';
import type { IngredientData } from '@/lib/ingredientLibrary';

interface IngredientAnalyzerProps {
  currentRecipe?: Array<{ ingredientData?: IngredientData; quantity_g: number }>;
}

export default function IngredientAnalyzer({ currentRecipe }: IngredientAnalyzerProps) {
  const { ingredients: allIngredients } = useIngredients();
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientData | null>(null);

  const analyzeIngredient = (ing: IngredientData) => {
    // Calculate composition breakdown
    const total = (ing.water_pct ?? 0) + (ing.fat_pct ?? 0) + (ing.sugars_pct ?? 0) + 
                  (ing.msnf_pct ?? 0) + (ing.other_solids_pct ?? 0);
    
    // Functional role analysis
    const roles = [];
    if ((ing.fat_pct ?? 0) > 10) roles.push('Fat Source');
    if ((ing.sugars_pct ?? 0) > 20) roles.push('Sweetener');
    if ((ing.msnf_pct ?? 0) > 30) roles.push('Protein/MSNF Source');
    if (ing.category === 'other') roles.push('Texture Modifier');
    if (ing.category === 'flavor') roles.push('Flavor Enhancer');
    
    // Ice cream impact
    const impacts = [];
    if ((ing.fat_pct ?? 0) > 5) impacts.push('Increases creaminess and richness');
    if ((ing.sugars_pct ?? 0) > 15) impacts.push('Lowers freezing point, affects hardness');
    if ((ing.msnf_pct ?? 0) > 20) impacts.push('Improves body and texture');
    if ((ing.water_pct ?? 0) > 70) impacts.push('High water content, dilutes solids');
    
    // Sweetness contribution
    const sweetnessType = (ing.sugars_pct ?? 0) > 50 ? 'High Sweetness' :
                          (ing.sugars_pct ?? 0) > 20 ? 'Moderate Sweetness' : 'Low Sweetness';
    
    return { total, roles, impacts, sweetnessType };
  };

  const getRecipeContext = (ing: IngredientData) => {
    if (!currentRecipe) return null;
    
    const recipeItem = currentRecipe.find(r => r.ingredientData?.id === ing.id);
    if (!recipeItem) return null;
    
    const totalMass = currentRecipe.reduce((sum, r) => sum + r.quantity_g, 0);
    const percentage = (recipeItem.quantity_g / totalMass) * 100;
    
    return {
      grams: recipeItem.quantity_g,
      percentage,
      totalMass
    };
  };

  const analysis = selectedIngredient ? analyzeIngredient(selectedIngredient) : null;
  const recipeContext = selectedIngredient ? getRecipeContext(selectedIngredient) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Microscope className="h-5 w-5 text-primary" />
            Ingredient Deep Dive
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Analyze the composition, functional roles, and ice cream impact of individual ingredients
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Select Ingredient</Label>
            <Select 
              value={selectedIngredient?.id || ''} 
              onValueChange={(id) => {
                const ing = allIngredients.find(i => i.id === id);
                setSelectedIngredient(ing || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an ingredient to analyze..." />
              </SelectTrigger>
              <SelectContent>
                {allIngredients
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} - {ing.category}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIngredient && analysis && (
            <>
              {/* Basic Info */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selectedIngredient.category}</Badge>
                {analysis.roles.map((role, idx) => (
                  <Badge key={idx} variant="secondary">{role}</Badge>
                ))}
              </div>

              {/* Recipe Context */}
              {recipeContext && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>In Current Recipe:</strong> {recipeContext.grams.toFixed(1)}g 
                    ({recipeContext.percentage.toFixed(1)}% of {recipeContext.totalMass.toFixed(0)}g batch)
                  </AlertDescription>
                </Alert>
              )}

              {/* Composition Breakdown */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Composition Breakdown
                </h3>
                <div className="space-y-3">
                  {selectedIngredient.water_pct != null && selectedIngredient.water_pct > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Water</span>
                        <span className="font-medium">{selectedIngredient.water_pct.toFixed(1)}%</span>
                      </div>
                      <Progress value={selectedIngredient.water_pct} className="h-2" />
                    </div>
                  )}
                  
                  {selectedIngredient.fat_pct != null && selectedIngredient.fat_pct > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Fat</span>
                        <span className="font-medium">{selectedIngredient.fat_pct.toFixed(1)}%</span>
                      </div>
                      <Progress value={selectedIngredient.fat_pct} className="h-2" />
                    </div>
                  )}
                  
                  {selectedIngredient.sugars_pct != null && selectedIngredient.sugars_pct > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Sugars ({analysis.sweetnessType})</span>
                        <span className="font-medium">{selectedIngredient.sugars_pct.toFixed(1)}%</span>
                      </div>
                      <Progress value={selectedIngredient.sugars_pct} className="h-2" />
                    </div>
                  )}
                  
                  {selectedIngredient.msnf_pct != null && selectedIngredient.msnf_pct > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>MSNF (Milk Solids Non-Fat)</span>
                        <span className="font-medium">{selectedIngredient.msnf_pct.toFixed(1)}%</span>
                      </div>
                      <Progress value={selectedIngredient.msnf_pct} className="h-2" />
                    </div>
                  )}
                  
                  {selectedIngredient.other_solids_pct != null && selectedIngredient.other_solids_pct > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Other Solids</span>
                        <span className="font-medium">{selectedIngredient.other_solids_pct.toFixed(1)}%</span>
                      </div>
                      <Progress value={selectedIngredient.other_solids_pct} className="h-2" />
                    </div>
                  )}
                </div>
              </div>

              {/* Ice Cream Impact */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Ice Cream Impact
                </h3>
                <div className="space-y-2">
                  {analysis.impacts.map((impact, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-primary/5 rounded">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{impact}</span>
                    </div>
                  ))}
                  {analysis.impacts.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      This ingredient has a neutral or balanced impact on ice cream properties.
                    </p>
                  )}
                </div>
              </div>

              {/* Advanced Properties */}
              {selectedIngredient.lactose_pct != null && (
                <div>
                  <h3 className="font-medium mb-3">Advanced Properties</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-card-secondary rounded-lg">
                      <div className="text-xs text-muted-foreground">Lactose</div>
                      <div className="text-lg font-semibold">{selectedIngredient.lactose_pct.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedIngredient && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select an ingredient above to see detailed composition analysis, functional roles, and impact on ice cream properties.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
