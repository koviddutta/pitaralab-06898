import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BaseRecipe {
  id: string;
  name: string;
  description: string;
  product_type: string;
  ingredients_json: any[];
  created_at: string;
}

export function BaseRecipeManager() {
  const [bases, setBases] = useState<BaseRecipe[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    product_type: 'ice_cream',
    ingredients_json: [{ ingredient: '', quantity: 0 }]
  });

  useEffect(() => {
    loadBases();
  }, []);

  const loadBases = async () => {
    try {
      const { data, error } = await supabase
        .from('base_recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBases(data || []);
    } catch (error: any) {
      console.error('Failed to load bases:', error);
      toast.error('Failed to load base recipes');
    }
  };

  const handleSave = async () => {
    try {
      const validIngredients = formData.ingredients_json.filter(
        ing => ing.ingredient.trim() !== '' && ing.quantity > 0
      );

      if (!formData.name.trim() || validIngredients.length === 0) {
        toast.error('Please fill in all required fields');
        return;
      }

      const saveData = {
        ...formData,
        ingredients_json: validIngredients
      };

      if (editingId) {
        const { error } = await supabase
          .from('base_recipes')
          .update(saveData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Base recipe updated');
      } else {
        const { error } = await supabase
          .from('base_recipes')
          .insert([saveData]);

        if (error) throw error;
        toast.success('Base recipe added');
      }

      resetForm();
      loadBases();
    } catch (error: any) {
      console.error('Failed to save base:', error);
      toast.error('Failed to save base recipe');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this base recipe?')) return;

    try {
      const { error } = await supabase
        .from('base_recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Base recipe deleted');
      loadBases();
    } catch (error: any) {
      console.error('Failed to delete base:', error);
      toast.error('Failed to delete base recipe');
    }
  };

  const startEdit = (base: BaseRecipe) => {
    setFormData({
      name: base.name,
      description: base.description,
      product_type: base.product_type,
      ingredients_json: base.ingredients_json
    });
    setEditingId(base.id);
    setIsAdding(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      product_type: 'ice_cream',
      ingredients_json: [{ ingredient: '', quantity: 0 }]
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients_json: [...formData.ingredients_json, { ingredient: '', quantity: 0 }]
    });
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients_json: formData.ingredients_json.filter((_, i) => i !== index)
    });
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...formData.ingredients_json];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, ingredients_json: updated });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Base Recipe Library</CardTitle>
            <CardDescription>
              Manage your collection of base recipes for quick access
            </CardDescription>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Base
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isAdding && (
          <Card className="border-primary/30">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Name *</Label>
                  <Input
                    placeholder="e.g., Classic Vanilla Base"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Type</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.product_type}
                    onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                  >
                    <option value="ice_cream">Ice Cream</option>
                    <option value="gelato">Gelato</option>
                    <option value="sorbet">Sorbet</option>
                    <option value="frozen_yogurt">Frozen Yogurt</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of this base recipe..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Ingredients *</Label>
                  <Button onClick={addIngredient} variant="ghost" size="sm" className="gap-1">
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                </div>

                {formData.ingredients_json.map((ing, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Ingredient name"
                      value={ing.ingredient}
                      onChange={(e) => updateIngredient(index, 'ingredient', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Quantity (g)"
                      value={ing.quantity || ''}
                      onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-32"
                    />
                    {formData.ingredients_json.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Save'} Base
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {bases.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No base recipes yet. Click "Add Base" to create one.</p>
          </div>
        )}

        <div className="space-y-3">
          {bases.map((base) => (
            <Card key={base.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{base.name}</h3>
                      <Badge variant="outline">{base.product_type.replace('_', ' ')}</Badge>
                    </div>
                    {base.description && (
                      <p className="text-sm text-muted-foreground mb-3">{base.description}</p>
                    )}
                    <div className="space-y-1">
                      {base.ingredients_json.map((ing: any, idx: number) => (
                        <div key={idx} className="text-sm flex justify-between">
                          <span>{ing.ingredient}</span>
                          <span className="text-muted-foreground">{ing.quantity}g</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(base)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(base.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
