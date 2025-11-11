import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Search, RefreshCw, Edit, Trash2, TrendingDown, Calendar, AlertTriangle } from 'lucide-react';
import { getAllInventory, getLowStockItems, getExpiringItems, deleteInventoryItem, checkAllInventoryAlerts, InventoryItem } from '@/services/inventoryService';
import { AddInventoryDialog } from '@/components/AddInventoryDialog';
import { UpdateStockDialog } from '@/components/UpdateStockDialog';
import { InventoryAlertsPanel } from '@/components/InventoryAlertsPanel';
import { useToast } from '@/hooks/use-toast';

export default function Inventory() {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    const [allData, lowData, expiringData] = await Promise.all([
      getAllInventory(),
      getLowStockItems(),
      getExpiringItems(),
    ]);

    if (allData.error || lowData.error || expiringData.error) {
      toast({
        title: 'Error',
        description: 'Failed to load inventory',
        variant: 'destructive',
      });
    } else {
      setInventory(allData.data || []);
      setLowStockItems(lowData.data || []);
      setExpiringItems(expiringData.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleRefreshAlerts = async () => {
    await checkAllInventoryAlerts();
    toast({
      title: 'Alerts Refreshed',
      description: 'Inventory alerts have been updated',
    });
    loadInventory();
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete ${name} from inventory?`)) return;

    const { error } = await deleteInventoryItem(id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete inventory item',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: `${name} removed from inventory`,
      });
      loadInventory();
    }
  };

  const handleUpdateStock = (item: InventoryItem) => {
    setSelectedItem(item);
    setUpdateDialogOpen(true);
  };

  const filteredInventory = inventory.filter(item =>
    item.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStockStatus = (current: number, minimum: number) => {
    if (current === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (current <= minimum) return { label: 'Low Stock', variant: 'destructive' as const };
    if (current <= minimum * 1.5) return { label: 'Reorder Soon', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Ingredient Inventory
          </h1>
          <p className="text-muted-foreground mt-1">
            Track stock levels, expiry dates, and manage reorders
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefreshAlerts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Alerts
          </Button>
          <AddInventoryDialog onSuccess={loadInventory} />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-yellow-600" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{inventory.reduce((sum, item) => sum + (item.current_stock_kg * (item.cost_per_kg || 0)), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel */}
      <InventoryAlertsPanel />

      {/* Inventory Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Inventory ({inventory.length})
          </TabsTrigger>
          <TabsTrigger value="low-stock">
            Low Stock ({lowStockItems.length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring Soon ({expiringItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Inventory Items</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search ingredients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredInventory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No matching ingredients found' : 'No inventory items yet'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => {
                      const status = getStockStatus(item.current_stock_kg, item.minimum_stock_kg);
                      const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.current_stock_kg} kg</div>
                              <div className="text-xs text-muted-foreground">
                                Min: {item.minimum_stock_kg} kg
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.expiry_date ? (
                              <div>
                                <div>{new Date(item.expiry_date).toLocaleDateString()}</div>
                                {daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
                                  <div className="text-xs text-orange-600 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {daysUntilExpiry <= 0 ? 'Expired' : `${daysUntilExpiry}d left`}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{item.supplier || '—'}</TableCell>
                          <TableCell>{item.storage_location || '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateStock(item)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Update
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id, item.ingredient_name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No low stock items
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Current / Minimum</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-destructive">{item.current_stock_kg} kg</span>
                            <span className="text-muted-foreground">/ {item.minimum_stock_kg} kg</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.supplier || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStock(item)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Reorder
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <CardTitle>Expiring Soon (Next 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {expiringItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items expiring soon
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead>Batch #</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringItems.map((item) => {
                      const daysLeft = getDaysUntilExpiry(item.expiry_date);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                          <TableCell>{item.current_stock_kg} kg</TableCell>
                          <TableCell>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={daysLeft && daysLeft <= 3 ? 'destructive' : 'secondary'}>
                              {daysLeft !== null ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : '—'}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.batch_number || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Stock Dialog */}
      {selectedItem && (
        <UpdateStockDialog
          inventory={selectedItem}
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          onSuccess={loadInventory}
        />
      )}
    </div>
  );
}
