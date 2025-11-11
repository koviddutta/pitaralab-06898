import { useState, useEffect } from 'react';
import { getAllInventory, recordTransaction, type InventoryItem } from '@/services/inventoryService';

export interface InventoryStatus {
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'not-tracked';
  stockLevel?: number;
  minLevel?: number;
  inventoryId?: string;
  costPerKg?: number;
}

export function useInventoryIntegration() {
  const [inventoryMap, setInventoryMap] = useState<Map<string, InventoryItem>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getAllInventory();
      if (error) throw error;
      
      const map = new Map<string, InventoryItem>();
      data?.forEach(item => {
        // Map by ingredient name (case-insensitive)
        map.set(item.ingredient_name.toLowerCase(), item);
      });
      setInventoryMap(map);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInventoryStatus = (ingredientName: string): InventoryStatus => {
    const item = inventoryMap.get(ingredientName.toLowerCase());
    
    if (!item) {
      return { status: 'not-tracked' };
    }

    const stockLevel = parseFloat(item.current_stock_kg.toString());
    const minLevel = parseFloat(item.minimum_stock_kg.toString());

    if (stockLevel <= 0) {
      return {
        status: 'out-of-stock',
        stockLevel,
        minLevel,
        inventoryId: item.id,
        costPerKg: item.cost_per_kg ? parseFloat(item.cost_per_kg.toString()) : undefined
      };
    }

    if (stockLevel <= minLevel) {
      return {
        status: 'low-stock',
        stockLevel,
        minLevel,
        inventoryId: item.id,
        costPerKg: item.cost_per_kg ? parseFloat(item.cost_per_kg.toString()) : undefined
      };
    }

    return {
      status: 'in-stock',
      stockLevel,
      minLevel,
      inventoryId: item.id,
      costPerKg: item.cost_per_kg ? parseFloat(item.cost_per_kg.toString()) : undefined
    };
  };

  const checkStockAvailability = (ingredientName: string, quantityKg: number): {
    available: boolean;
    message?: string;
    currentStock?: number;
  } => {
    const status = getInventoryStatus(ingredientName);
    
    if (status.status === 'not-tracked') {
      return { available: true };
    }

    if (status.status === 'out-of-stock') {
      return {
        available: false,
        message: `${ingredientName} is out of stock`,
        currentStock: status.stockLevel
      };
    }

    if (status.stockLevel !== undefined && status.stockLevel < quantityKg) {
      return {
        available: false,
        message: `Insufficient stock for ${ingredientName}. Available: ${status.stockLevel.toFixed(2)}kg, Required: ${quantityKg.toFixed(2)}kg`,
        currentStock: status.stockLevel
      };
    }

    return { available: true, currentStock: status.stockLevel };
  };

  const deductFromInventory = async (
    ingredientName: string,
    quantityKg: number,
    recipeId?: string,
    recipeName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const status = getInventoryStatus(ingredientName);
    
    if (status.status === 'not-tracked' || !status.inventoryId) {
      return { success: true }; // Not tracked, no need to deduct
    }

    try {
      const reason = recipeName 
        ? `Used in recipe: ${recipeName}`
        : 'Used in recipe';
      
      const { error } = await recordTransaction(
        status.inventoryId,
        'used_in_recipe',
        quantityKg,
        reason,
        recipeId
      );

      if (error) {
        return { success: false, error: error.message };
      }

      // Reload inventory to get updated stock levels
      await loadInventory();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deduct from inventory'
      };
    }
  };

  return {
    inventoryMap,
    isLoading,
    getInventoryStatus,
    checkStockAvailability,
    deductFromInventory,
    reloadInventory: loadInventory
  };
}
