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
  // === GELATO (Italian Style - Lower Fat) ===
  {
    name: 'Classic Vanilla Gelato',
    description: 'Traditional Italian gelato with Madagascar vanilla',
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
    name: 'Dark Chocolate Gelato',
    description: 'Intense cocoa gelato with 70% dark chocolate',
    mode: 'gelato',
    icon: <ChefHat className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 550 },
      { tag: 'id:heavy_cream', grams: 250 },
      { tag: 'id:smp', grams: 40 },
      { tag: 'id:sucrose', grams: 130 },
      { tag: 'id:dextrose', grams: 25 },
      { tag: 'id:cocoa_powder', grams: 30 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Pistachio Gelato',
    description: 'Creamy pistachio gelato with real nuts',
    mode: 'gelato',
    icon: <Sparkles className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 580 },
      { tag: 'id:heavy_cream', grams: 220 },
      { tag: 'id:smp', grams: 35 },
      { tag: 'id:sucrose', grams: 135 },
      { tag: 'id:dextrose', grams: 20 },
      { tag: 'id:pistachio_paste', grams: 50 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Stracciatella Gelato',
    description: 'Vanilla gelato with chocolate chips',
    mode: 'gelato',
    icon: <IceCream className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 590 },
      { tag: 'id:heavy_cream', grams: 210 },
      { tag: 'id:smp', grams: 40 },
      { tag: 'id:sucrose', grams: 138 },
      { tag: 'id:dextrose', grams: 20 },
      { tag: 'id:stabilizer', grams: 3 },
      { tag: 'id:dark_chocolate', grams: 40 }
    ]
  },
  {
    name: 'Hazelnut Gelato',
    description: 'Rich hazelnut gelato with toasted nuts',
    mode: 'gelato',
    icon: <ChefHat className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 570 },
      { tag: 'id:heavy_cream', grams: 230 },
      { tag: 'id:smp', grams: 35 },
      { tag: 'id:sucrose', grams: 132 },
      { tag: 'id:dextrose', grams: 20 },
      { tag: 'id:hazelnut_paste', grams: 55 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Coffee Gelato',
    description: 'Espresso-infused Italian gelato',
    mode: 'gelato',
    icon: <Sparkles className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 610 },
      { tag: 'id:heavy_cream', grams: 200 },
      { tag: 'id:smp', grams: 40 },
      { tag: 'id:sucrose', grams: 145 },
      { tag: 'id:dextrose', grams: 18 },
      { tag: 'id:coffee_extract', grams: 15 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },

  // === ICE CREAM (American Style - Rich & Creamy) ===
  {
    name: 'Vanilla Ice Cream',
    description: 'Rich American-style vanilla ice cream',
    mode: 'gelato',
    icon: <IceCream className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 500 },
      { tag: 'id:heavy_cream', grams: 350 },
      { tag: 'id:smp', grams: 30 },
      { tag: 'id:sucrose', grams: 135 },
      { tag: 'id:dextrose', grams: 18 },
      { tag: 'id:egg_yolk', grams: 50 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Chocolate Ice Cream',
    description: 'Decadent chocolate ice cream with cocoa',
    mode: 'gelato',
    icon: <ChefHat className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 480 },
      { tag: 'id:heavy_cream', grams: 360 },
      { tag: 'id:smp', grams: 30 },
      { tag: 'id:sucrose', grams: 140 },
      { tag: 'id:dextrose', grams: 20 },
      { tag: 'id:cocoa_powder', grams: 40 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Strawberry Ice Cream',
    description: 'Classic strawberry ice cream with real fruit',
    mode: 'gelato',
    icon: <Sparkles className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 450 },
      { tag: 'id:heavy_cream', grams: 320 },
      { tag: 'id:smp', grams: 30 },
      { tag: 'id:sucrose', grams: 125 },
      { tag: 'id:dextrose', grams: 18 },
      { tag: 'category:fruit', grams: 150 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Cookies & Cream',
    description: 'Vanilla ice cream with cookie pieces',
    mode: 'gelato',
    icon: <IceCream className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 490 },
      { tag: 'id:heavy_cream', grams: 340 },
      { tag: 'id:smp', grams: 30 },
      { tag: 'id:sucrose', grams: 132 },
      { tag: 'id:dextrose', grams: 18 },
      { tag: 'id:cookie_crumbs', grams: 60 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Mint Chocolate Chip',
    description: 'Refreshing mint ice cream with chocolate',
    mode: 'gelato',
    icon: <ChefHat className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:milk_3', grams: 480 },
      { tag: 'id:heavy_cream', grams: 350 },
      { tag: 'id:smp', grams: 30 },
      { tag: 'id:sucrose', grams: 135 },
      { tag: 'id:dextrose', grams: 18 },
      { tag: 'id:mint_extract', grams: 8 },
      { tag: 'id:dark_chocolate', grams: 45 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },

  // === SORBET (Dairy-Free) ===
  {
    name: 'Lemon Sorbet',
    description: 'Refreshing lemon sorbet, dairy-free',
    mode: 'gelato',
    icon: <Sparkles className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:water', grams: 650 },
      { tag: 'id:sucrose', grams: 200 },
      { tag: 'id:dextrose', grams: 40 },
      { tag: 'id:lemon_juice', grams: 100 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Strawberry Sorbet',
    description: 'Pure strawberry sorbet, dairy-free',
    mode: 'gelato',
    icon: <IceCream className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:water', grams: 480 },
      { tag: 'id:sucrose', grams: 180 },
      { tag: 'id:dextrose', grams: 35 },
      { tag: 'category:fruit', grams: 280 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Mango Sorbet',
    description: 'Tropical mango sorbet, dairy-free',
    mode: 'gelato',
    icon: <ChefHat className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:water', grams: 450 },
      { tag: 'id:sucrose', grams: 175 },
      { tag: 'id:dextrose', grams: 35 },
      { tag: 'id:mango_puree', grams: 320 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Raspberry Sorbet',
    description: 'Tart raspberry sorbet, dairy-free',
    mode: 'gelato',
    icon: <Sparkles className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:water', grams: 470 },
      { tag: 'id:sucrose', grams: 185 },
      { tag: 'id:dextrose', grams: 38 },
      { tag: 'id:raspberry_puree', grams: 290 },
      { tag: 'id:stabilizer', grams: 3 }
    ]
  },
  {
    name: 'Blood Orange Sorbet',
    description: 'Vibrant blood orange sorbet, dairy-free',
    mode: 'gelato',
    icon: <IceCream className="h-5 w-5" />,
    ingredients: [
      { tag: 'id:water', grams: 520 },
      { tag: 'id:sucrose', grams: 190 },
      { tag: 'id:dextrose', grams: 40 },
      { tag: 'id:orange_juice', grams: 230 },
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
    <Card className="border-dashed border-2 transition-all duration-200 ease-in-out">
      <CardHeader className="text-center p-6">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-200 ease-in-out">
            <ChefHat className="h-12 w-12 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Start Your Gelato Formula</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Choose a template to get started, or build your own recipe from scratch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEMPLATES.map((template) => (
            <Card
              key={template.name}
              className="cursor-pointer hover:border-primary transition-all duration-200 ease-in-out hover:shadow-elegant p-4"
              onClick={() => onSelectTemplate(template)}
            >
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  {template.icon}
                  {template.name}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Button variant="outline" size="sm" className="w-full transition-all duration-200 ease-in-out">
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 border-t border-border" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border" />
        </div>

        <Button 
          variant="default" 
          size="lg" 
          className="w-full transition-all duration-200 ease-in-out"
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
