import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, AlertTriangle, AlertCircle, X, CheckCheck } from 'lucide-react';
import { getInventoryAlerts, markAlertAsRead, markAllAlertsAsRead, deleteAlert, InventoryAlert } from '@/services/inventoryService';
import { useToast } from '@/hooks/use-toast';

export function InventoryAlertsPanel() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    const { data, error } = await getInventoryAlerts(showOnlyUnread);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load alerts',
        variant: 'destructive',
      });
    } else {
      setAlerts((data || []) as InventoryAlert[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();
  }, [showOnlyUnread]);

  const handleMarkAsRead = async (alertId: string) => {
    const { error } = await markAlertAsRead(alertId);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark alert as read',
        variant: 'destructive',
      });
    } else {
      loadAlerts();
    }
  };

  const handleMarkAllAsRead = async () => {
    const { error } = await markAllAlertsAsRead();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark all alerts as read',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'All alerts marked as read',
      });
      loadAlerts();
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    const { error } = await deleteAlert(alertId);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete alert',
        variant: 'destructive',
      });
    } else {
      loadAlerts();
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'out_of_stock':
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'low_stock':
      case 'expiring_soon':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (type: string): "default" | "destructive" => {
    switch (type) {
      case 'out_of_stock':
      case 'expired':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Inventory Alerts</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOnlyUnread(!showOnlyUnread)}
            >
              {showOnlyUnread ? 'Show All' : 'Show Unread'}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {showOnlyUnread ? 'No unread alerts' : 'No alerts'}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  variant={getAlertVariant(alert.alert_type)}
                  className={alert.is_read ? 'opacity-60' : ''}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getAlertIcon(alert.alert_type)}
                      <div className="flex-1">
                        <AlertDescription>
                          <div className="flex items-start justify-between gap-2">
                            <span>{alert.alert_message}</span>
                            {!alert.is_read && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.created_at).toLocaleString()}
                          </div>
                        </AlertDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!alert.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(alert.id)}
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
