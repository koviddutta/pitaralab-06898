import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Brain, Cloud, CloudOff, Activity } from 'lucide-react';
import { isBackendReady } from '@/integrations/supabase/safeClient';
import { mlService } from '@/services/mlService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function MLStatusIndicator() {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'offline'>('offline');
  const [mlModel, setMlModel] = useState<any>(null);

  useEffect(() => {
    const checkStatus = () => {
      const backend = isBackendReady();
      setBackendStatus(backend ? 'connected' : 'offline');
      
      const model = mlService.loadModel();
      setMlModel(model);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusInfo = () => {
    if (backendStatus === 'offline') {
      return {
        icon: <CloudOff className="h-3 w-3" />,
        label: 'Offline',
        variant: 'secondary' as const,
        description: 'Backend offline. ML predictions use local models only.'
      };
    }

    if (mlModel) {
      const accuracy = Math.round(mlModel.accuracy * 100);
      return {
        icon: <Brain className="h-3 w-3" />,
        label: `ML Active (${accuracy}%)`,
        variant: 'default' as const,
        description: `Model trained ${new Date(mlModel.trained_at).toLocaleDateString()}. Backend connected.`
      };
    }

    return {
      icon: <Activity className="h-3 w-3" />,
      label: 'Connected',
      variant: 'outline' as const,
      description: 'Backend connected. ML model not yet trained.'
    };
  };

  const status = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={status.variant} className="gap-1 cursor-help">
            {status.icon}
            {status.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{status.description}</p>
          {mlModel && (
            <p className="text-xs text-muted-foreground mt-1">
              Features: {Object.keys(mlModel.feature_importance || {}).length}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
