import { useState, useEffect } from 'react';
import { mlService } from '@/services/mlService';

interface MLPrediction {
  status: 'pass' | 'warn' | 'fail';
  score: number;
  suggestions: string[];
  confidence: number;
}

export function useMLPredictions(metrics: any, productType: string) {
  const [prediction, setPrediction] = useState<MLPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!metrics || !productType) {
      setPrediction(null);
      return;
    }

    setIsLoading(true);
    
    // Debounce predictions
    const timer = setTimeout(() => {
      try {
        const result = mlService.predictSuccess(metrics, productType);
        setPrediction(result);
      } catch (error) {
        console.error('ML prediction error:', error);
        setPrediction(null);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [metrics, productType]);

  return { prediction, isLoading };
}
