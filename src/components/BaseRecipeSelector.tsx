import React, { useState } from 'react';
import { IceCreamCone, ChefHat, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BaseRecipe {
  id: string;
  name: string;
  description: string | null;
  product_type: string;
  ingredients_json: any[];
  created_at: string;
}

const BaseRecipeSelector = () => {
  const [selectedRecipe, setSelectedRecipe] = useState<BaseRecipe | null>(null);

  // Load base recipes from database
  const { data: recipes, isLoading } = useQuery({
    queryKey: ['base-recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('base_recipes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as BaseRecipe[];
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!recipes || recipes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Base Recipe Templates</CardTitle>
          <CardDescription>
            No base recipes found. Import or create some in the Database page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const groupedRecipes = recipes.reduce((acc, recipe) => {
    const type = recipe.product_type.replace('_', ' ');
    if (!acc[type]) acc[type] = [];
    acc[type].push(recipe);
    return acc;
  }, {} as Record<string, BaseRecipe[]>);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="gradient-accent">
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          Base Recipe Library
        </CardTitle>
        <CardDescription>
          Choose from your collection of base recipes
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue={Object.keys(groupedRecipes)[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(groupedRecipes).length}, 1fr)` }}>
            {Object.keys(groupedRecipes).map(type => (
              <TabsTrigger key={type} value={type} className="capitalize">
                {type}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(groupedRecipes).map(([type, typeRecipes]) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {typeRecipes.map((recipe) => (
                  <Card
                    key={recipe.id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{recipe.name}</CardTitle>
                      {recipe.description && (
                        <CardDescription className="line-clamp-2">
                          {recipe.description}
                        </CardDescription>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Badge variant="outline">
                          {(recipe.ingredients_json as any[]).length} ingredients
                        </Badge>
                        <Badge variant="outline">
                          {(recipe.ingredients_json as any[]).reduce((sum, ing) => sum + (ing.quantity_g || 0), 0).toFixed(0)}g total
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              
              {selectedRecipe && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IceCreamCone className="h-5 w-5 text-primary" />
                      {selectedRecipe.name}
                    </CardTitle>
                    <CardDescription>
                      {selectedRecipe.product_type.replace('_', ' ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Ingredients:</h4>
                        <ul className="space-y-2">
                          {(selectedRecipe.ingredients_json as any[]).map((ing, idx) => (
                            <li key={idx} className="flex justify-between text-sm">
                              <span>{ing.name || ing.ingredient}</span>
                              <span className="text-muted-foreground">
                                {(ing.quantity_g || ing.quantity || 0).toFixed(1)}g
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {selectedRecipe.description && (
                        <div>
                          <h4 className="font-semibold mb-2">Description:</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedRecipe.description}
                          </p>
                        </div>
                      )}
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(selectedRecipe.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BaseRecipeSelector;
