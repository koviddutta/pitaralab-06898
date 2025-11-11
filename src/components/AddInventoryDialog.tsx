import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { addInventoryItem } from '@/services/inventoryService';
import { useToast } from '@/hooks/use-toast';

interface AddInventoryDialogProps {
  onSuccess?: () => void;
}

export function AddInventoryDialog({ onSuccess }: AddInventoryDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ingredient_name: '',
    current_stock_kg: '0',
    minimum_stock_kg: '5',
    expiry_date: '',
    batch_number: '',
    supplier: '',
    cost_per_kg: '',
    storage_location: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await addInventoryItem({
      ingredient_name: formData.ingredient_name,
      current_stock_kg: parseFloat(formData.current_stock_kg) || 0,
      minimum_stock_kg: parseFloat(formData.minimum_stock_kg) || 5,
      expiry_date: formData.expiry_date || null,
      batch_number: formData.batch_number || null,
      supplier: formData.supplier || null,
      cost_per_kg: formData.cost_per_kg ? parseFloat(formData.cost_per_kg) : null,
      storage_location: formData.storage_location || null,
      notes: formData.notes || null,
    });

    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add inventory item',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Inventory item added successfully',
      });
      setOpen(false);
      setFormData({
        ingredient_name: '',
        current_stock_kg: '0',
        minimum_stock_kg: '5',
        expiry_date: '',
        batch_number: '',
        supplier: '',
        cost_per_kg: '',
        storage_location: '',
        notes: '',
      });
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Ingredient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Ingredient to Inventory</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ingredient_name">Ingredient Name *</Label>
              <Input
                id="ingredient_name"
                value={formData.ingredient_name}
                onChange={(e) => setFormData({ ...formData, ingredient_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="current_stock_kg">Current Stock (kg) *</Label>
              <Input
                id="current_stock_kg"
                type="number"
                step="0.01"
                min="0"
                value={formData.current_stock_kg}
                onChange={(e) => setFormData({ ...formData, current_stock_kg: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="minimum_stock_kg">Reorder Threshold (kg) *</Label>
              <Input
                id="minimum_stock_kg"
                type="number"
                step="0.01"
                min="0"
                value={formData.minimum_stock_kg}
                onChange={(e) => setFormData({ ...formData, minimum_stock_kg: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input
                id="batch_number"
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost_per_kg">Cost per kg (₹)</Label>
              <Input
                id="cost_per_kg"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_per_kg}
                onChange={(e) => setFormData({ ...formData, cost_per_kg: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="storage_location">Storage Location</Label>
              <Input
                id="storage_location"
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                placeholder="e.g., Freezer A, Shelf 3"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this ingredient..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Ingredient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
