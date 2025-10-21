import { useState, useEffect } from 'react';
import { enhancedMLService } from '@/services/mlService.enhanced';

interface MLPrediction {
  status: 'pass' | 'warn' | 'fail';
  score: number;
  suggestions: string[];
  confidence?: number;
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
        const result = enhancedMLService.predictRecipeSuccess(metrics, productType);
        setPrediction({
          status: result.status,
          score: result.score,
          suggestions: result.suggestions,
          confidence: result.confidence
        });
        console.log('Enhanced ML Prediction:', result);
      } catch (error) {
        console.error('ML prediction error:', error);
        // Show a default prediction even on error
        setPrediction({
          status: 'warn',
          score: 70,
          suggestions: ['Unable to generate prediction. Check recipe composition.'],
          confidence: 0.5
        });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [metrics, productType]);

  return { prediction, isLoading };
}
