import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordTransaction, InventoryItem } from '@/services/inventoryService';
import { useToast } from '@/hooks/use-toast';

interface UpdateStockDialogProps {
  inventory: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UpdateStockDialog({ inventory, open, onOpenChange, onSuccess }: UpdateStockDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<'add' | 'remove' | 'adjust' | 'order_received' | 'used_in_recipe'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const quantityValue = parseFloat(quantity);
    if (isNaN(quantityValue) || quantityValue <= 0) {
      toast({
        title: 'Invalid Quantity',
        description: 'Please enter a valid positive number',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { error } = await recordTransaction(
      inventory.id,
      transactionType,
      quantityValue,
      reason || undefined
    );

    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update stock',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Stock updated for ${inventory.ingredient_name}`,
      });
      onOpenChange(false);
      setQuantity('');
      setReason('');
      onSuccess?.();
    }
  };

  const getExpectedNewStock = () => {
    const quantityValue = parseFloat(quantity);
    if (isNaN(quantityValue)) return inventory.current_stock_kg;

    switch (transactionType) {
      case 'add':
      case 'order_received':
        return inventory.current_stock_kg + quantityValue;
      case 'remove':
      case 'used_in_recipe':
        return Math.max(0, inventory.current_stock_kg - quantityValue);
      case 'adjust':
        return quantityValue;
      default:
        return inventory.current_stock_kg;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Stock: {inventory.ingredient_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Current Stock</div>
            <div className="text-2xl font-bold">{inventory.current_stock_kg} kg</div>
          </div>

          <div>
            <Label htmlFor="transaction_type">Transaction Type</Label>
            <Select value={transactionType} onValueChange={(value: any) => setTransactionType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Stock</SelectItem>
                <SelectItem value="order_received">Order Received</SelectItem>
                <SelectItem value="remove">Remove Stock</SelectItem>
                <SelectItem value="used_in_recipe">Used in Recipe</SelectItem>
                <SelectItem value="adjust">Adjust to Exact Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">
              {transactionType === 'adjust' ? 'New Total Stock (kg)' : 'Quantity (kg)'}
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            {quantity && (
              <div className="text-sm text-muted-foreground mt-1">
                New stock will be: {getExpectedNewStock().toFixed(2)} kg
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Restocked from supplier, Used for Recipe #123"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
