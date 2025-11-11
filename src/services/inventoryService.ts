/**
 * Inventory Management Service
 * Handles ingredient stock tracking, expiry monitoring, and reorder alerts
 */

import { supabase } from '@/integrations/supabase/client';

export interface InventoryItem {
  id: string;
  user_id: string;
  ingredient_name: string;
  current_stock_kg: number;
  minimum_stock_kg: number;
  expiry_date: string | null;
  batch_number: string | null;
  supplier: string | null;
  cost_per_kg: number | null;
  storage_location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  user_id: string;
  inventory_id: string;
  transaction_type: 'add' | 'remove' | 'adjust' | 'order_received' | 'used_in_recipe';
  quantity_kg: number;
  previous_stock_kg: number;
  new_stock_kg: number;
  reason: string | null;
  recipe_id: string | null;
  created_at: string;
}

export interface InventoryAlert {
  id: string;
  user_id: string;
  inventory_id: string | null;
  alert_type: 'low_stock' | 'expired' | 'expiring_soon' | 'out_of_stock';
  alert_message: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Fetch all inventory items for the current user
 */
export async function getAllInventory() {
  const { data, error } = await supabase
    .from('ingredient_inventory')
    .select('*')
    .order('ingredient_name', { ascending: true });

  return { data, error };
}

/**
 * Get a single inventory item by ID
 */
export async function getInventoryItem(id: string) {
  const { data, error } = await supabase
    .from('ingredient_inventory')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

/**
 * Add a new ingredient to inventory
 */
export async function addInventoryItem(item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('ingredient_inventory')
    .insert([{ ...item, user_id: user.id }])
    .select()
    .single();

  if (data && !error) {
    // Check for alerts after adding
    await checkAndCreateAlerts(data.id);
  }

  return { data, error };
}

/**
 * Update an existing inventory item
 */
export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
  const { data, error } = await supabase
    .from('ingredient_inventory')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (data && !error) {
    // Check for alerts after update
    await checkAndCreateAlerts(data.id);
  }

  return { data, error };
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(id: string) {
  const { error } = await supabase
    .from('ingredient_inventory')
    .delete()
    .eq('id', id);

  return { error };
}

/**
 * Record a stock transaction (add/remove/adjust)
 */
export async function recordTransaction(
  inventoryId: string,
  transactionType: InventoryTransaction['transaction_type'],
  quantityKg: number,
  reason?: string,
  recipeId?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  // Get current stock
  const { data: inventory, error: fetchError } = await getInventoryItem(inventoryId);
  if (fetchError || !inventory) return { data: null, error: fetchError || new Error('Inventory not found') };

  const previousStock = inventory.current_stock_kg;
  let newStock = previousStock;

  switch (transactionType) {
    case 'add':
    case 'order_received':
      newStock = previousStock + quantityKg;
      break;
    case 'remove':
    case 'used_in_recipe':
      newStock = Math.max(0, previousStock - quantityKg);
      break;
    case 'adjust':
      newStock = quantityKg; // Direct adjustment to specific amount
      break;
  }

  // Update inventory stock
  const { error: updateError } = await updateInventoryItem(inventoryId, {
    current_stock_kg: newStock,
  });

  if (updateError) return { data: null, error: updateError };

  // Record transaction
  const { data, error } = await supabase
    .from('inventory_transactions')
    .insert([{
      user_id: user.id,
      inventory_id: inventoryId,
      transaction_type: transactionType,
      quantity_kg: quantityKg,
      previous_stock_kg: previousStock,
      new_stock_kg: newStock,
      reason,
      recipe_id: recipeId,
    }])
    .select()
    .single();

  return { data, error };
}

/**
 * Get transaction history for an inventory item
 */
export async function getTransactionHistory(inventoryId: string, limit = 50) {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('inventory_id', inventoryId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
}

/**
 * Check and create alerts for low stock, expiry, etc.
 */
export async function checkAndCreateAlerts(inventoryId: string) {
  const { data: inventory, error } = await getInventoryItem(inventoryId);
  if (error || !inventory) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const alerts: Omit<InventoryAlert, 'id' | 'created_at'>[] = [];

  // Check for out of stock
  if (inventory.current_stock_kg === 0) {
    alerts.push({
      user_id: user.id,
      inventory_id: inventoryId,
      alert_type: 'out_of_stock',
      alert_message: `${inventory.ingredient_name} is out of stock!`,
      is_read: false,
    });
  }
  // Check for low stock
  else if (inventory.current_stock_kg <= inventory.minimum_stock_kg) {
    alerts.push({
      user_id: user.id,
      inventory_id: inventoryId,
      alert_type: 'low_stock',
      alert_message: `${inventory.ingredient_name} is running low (${inventory.current_stock_kg}kg remaining). Reorder threshold: ${inventory.minimum_stock_kg}kg`,
      is_read: false,
    });
  }

  // Check for expiry
  if (inventory.expiry_date) {
    const expiryDate = new Date(inventory.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      alerts.push({
        user_id: user.id,
        inventory_id: inventoryId,
        alert_type: 'expired',
        alert_message: `${inventory.ingredient_name} has expired (${inventory.expiry_date})`,
        is_read: false,
      });
    } else if (daysUntilExpiry <= 7) {
      alerts.push({
        user_id: user.id,
        inventory_id: inventoryId,
        alert_type: 'expiring_soon',
        alert_message: `${inventory.ingredient_name} expires in ${daysUntilExpiry} day(s) (${inventory.expiry_date})`,
        is_read: false,
      });
    }
  }

  // Insert alerts if any
  if (alerts.length > 0) {
    await supabase.from('inventory_alerts').insert(alerts);
  }
}

/**
 * Run alert check for all inventory items
 */
export async function checkAllInventoryAlerts() {
  const { data: inventory, error } = await getAllInventory();
  if (error || !inventory) return { error };

  // Clear old alerts first
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  await supabase
    .from('inventory_alerts')
    .delete()
    .eq('user_id', user.id);

  // Check each item
  for (const item of inventory) {
    await checkAndCreateAlerts(item.id);
  }

  return { error: null };
}

/**
 * Get all alerts for the current user
 */
export async function getInventoryAlerts(onlyUnread = false) {
  let query = supabase
    .from('inventory_alerts')
    .select('*')
    .order('created_at', { ascending: false });

  if (onlyUnread) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Mark an alert as read
 */
export async function markAlertAsRead(alertId: string) {
  const { error } = await supabase
    .from('inventory_alerts')
    .update({ is_read: true })
    .eq('id', alertId);

  return { error };
}

/**
 * Mark all alerts as read
 */
export async function markAllAlertsAsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('inventory_alerts')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return { error };
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string) {
  const { error } = await supabase
    .from('inventory_alerts')
    .delete()
    .eq('id', alertId);

  return { error };
}

/**
 * Get low stock items
 */
export async function getLowStockItems() {
  const { data, error } = await supabase
    .from('ingredient_inventory')
    .select('*')
    .filter('current_stock_kg', 'lte', 'minimum_stock_kg')
    .order('current_stock_kg', { ascending: true });

  return { data, error };
}

/**
 * Get expiring items (within 7 days)
 */
export async function getExpiringItems() {
  const today = new Date().toISOString().split('T')[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ingredient_inventory')
    .select('*')
    .gte('expiry_date', today)
    .lte('expiry_date', weekFromNow)
    .order('expiry_date', { ascending: true });

  return { data, error };
}
