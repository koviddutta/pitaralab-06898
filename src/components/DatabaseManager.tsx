import React, { useState } from 'react';
import { Database, Download, Upload } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getAllIngredients } from '@/services/ingredientService';

const DatabaseManager = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<'all'|'dairy'|'sugar'|'fruit'|'stabilizer'|'flavor'|'fat'|'other'>('all');
  
  // Fetch ingredients from Supabase
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: getAllIngredients
  });

  const exportData = () => {
    const data = { ingredients };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meetha-pitara-ingredients.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Database Exported",
      description: "Ingredients database exported",
    });
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    toast({
      title: "Import Not Available",
      description: "Use the Admin Panel to manage ingredients",
      variant: "default"
    });
  };

  const categories = ['all', 'dairy', 'sugar', 'fruit', 'stabilizer', 'flavor', 'fat', 'other'];
  const filteredIngredients = ingredients.filter(i => tab === 'all' ? true : i.category === tab);

  return (
    <div className="space-y-6">
      {/* Performance Dashboard */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Database Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Ingredients:</span>
                <Badge variant="secondary">{ingredients.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {categories.slice(1).map(cat => (
                <Badge key={cat} variant="outline" className="text-xs">
                  {cat}: {ingredients.filter(i => i.category === cat).length}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Database Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Ingredient Database ({ingredients.length} items)
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" asChild>
                <label>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={importData}
                  />
                </label>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-8 w-full">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="text-xs">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {categories.map(cat => (
              <TabsContent key={cat} value={cat} className="mt-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Showing {filteredIngredients.length} ingredients from Supabase
                  </p>
                  
                  {filteredIngredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 grid md:grid-cols-5 gap-4 items-center">
                        <div>
                          <span className="font-medium">{ingredient.name}</span>
                          <div className="text-sm text-gray-500">{ingredient.category}</div>
                        </div>
                        <div className="text-sm">
                          <div>Water: {ingredient.water_pct}%</div>
                          <div>Fat: {ingredient.fat_pct}%</div>
                        </div>
                        <div className="text-sm">
                          {ingredient.sugars_pct && <div>Sugars: {ingredient.sugars_pct}%</div>}
                          {ingredient.msnf_pct && <div>MSNF: {ingredient.msnf_pct}%</div>}
                        </div>
                        <div className="text-sm">
                          {ingredient.sp_coeff && <div>SP: {ingredient.sp_coeff}</div>}
                          {ingredient.pac_coeff && <div>PAC: {ingredient.pac_coeff}</div>}
                        </div>
                        <div className="text-sm">
                          {ingredient.cost_per_kg && <div>₹{ingredient.cost_per_kg}/kg</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredIngredients.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No ingredients in this category
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseManager;
