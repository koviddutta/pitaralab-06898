import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, Sparkles, IceCream } from 'lucide-react';
import type { IngredientData } from '@/types/ingredients';

interface RecipeTemplate {
  name: string;
  description: string;
  mode: 'gelato' | 'kulfi';
  icon: React.ReactNode;
  ingredients: Array<{
    tag: string;
    grams: number;
  }>;
}

const TEMPLATES: RecipeTemplate[] = [
  {
    name: 'Classic Vanilla',
    description: 'Traditional gelato base with Madagascar vanilla',
    mode: 'gelato',
    icon: <IceCream className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 600 },
      { tag: 'id:heavy_cream', grams: 200 },
      { tag: 'id:smp', grams: 40 },
      { tag: 'id:sucrose', grams: 140 },
      { tag: 'id:dextrose', grams: 20 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Mango Kulfi',
    description: 'Rich Indian frozen dessert with Alphonso mango',
    mode: 'kulfi',
    icon: <Sparkles className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 500 },
      { tag: 'id:heavy_cream', grams: 300 },
      { tag: 'id:smp', grams: 100 },
      { tag: 'id:sucrose', grams: 120 },
      { tag: 'id:dextrose', grams: 15 },
      { tag: 'category:fruit', grams: 150 }
    ]
  },
  {
    name: 'Dark Chocolate',
    description: 'Intense cocoa gelato with 70% dark chocolate',
    mode: 'gelato',
    icon: <ChefHat className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 550 },
      { tag: 'id:heavy_cream', grams: 250 },
      { tag: 'id:smp', grams: 40 },
      { tag: 'id:sucrose', grams: 130 },
      { tag: 'id:dextrose', grams: 25 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  }
];

interface RecipeTemplatesProps {
  onSelectTemplate: (template: RecipeTemplate) => void;
  onStartFromScratch: () => void;
  availableIngredients: IngredientData[];
}

export function RecipeTemplates({ onSelectTemplate, onStartFromScratch, availableIngredients }: RecipeTemplatesProps) {
  return (
    <Card className="border-dashed border-2">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <ChefHat className="h-12 w-12 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Start Your Gelato Formula</CardTitle>
        <CardDescription className="text-base">
          Choose a template to get started, or build your own recipe from scratch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEMPLATES.map((template) => (
            <Card
              key={template.name}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelectTemplate(template)}
            >
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {template.icon}
                  {template.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full">
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 border-t" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="flex-1 border-t" />
        </div>

        <Button 
          variant="default" 
          size="lg" 
          className="w-full"
          onClick={onStartFromScratch}
        >
          <Sparkles className="h-5 w-5 mr-2" />
          Start from Scratch
        </Button>
      </CardContent>
    </Card>
  );
}

export function resolveTemplateIngredients(
  template: RecipeTemplate,
  availableIngredients: IngredientData[]
): Array<{ ingredientId: string; grams: number }> {
  return template.ingredients
    .map(({ tag, grams }) => {
      // Try to find by tag first
      let ingredient = availableIngredients.find(ing => 
        ing.tags?.includes(tag) || 
        tag.startsWith('id:') && ing.id === tag.replace('id:', '')
      );
      
      // Fallback to category
      if (!ingredient && tag.startsWith('category:')) {
        const category = tag.replace('category:', '');
        ingredient = availableIngredients.find(ing => ing.category === category);
      }
      
      return ingredient ? { ingredientId: ingredient.id, grams } : null;
    })
    .filter((item): item is { ingredientId: string; grams: number } => item !== null);
}
