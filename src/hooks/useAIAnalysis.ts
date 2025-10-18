import { useState, useCallback } from 'react';
import { getSupabase } from '@/integrations/supabase/safeClient';
import { useToast } from '@/hooks/use-toast';

interface AIAnalysis {
  successScore: number;
  texturePredict: string;
  warnings: string[];
  suggestions: string[];
  confidence: number;
}

export function useAIAnalysis() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const analyze = useCallback(async (recipe: any[], metrics: any, productType: string) => {
    if (!recipe || recipe.length === 0) {
      setAnalysis(null);
      return;
    }

    setIsLoading(true);
    
    try {
      const supabase = await getSupabase();
      
      const { data, error } = await supabase.functions.invoke('analyze-recipe', {
        body: { recipe, metrics, productType }
      });

      if (error) {
        if (error.message?.includes('rate limit')) {
          toast({
            title: 'Rate limit reached',
            description: 'You\'ve used all your AI analyses this hour. Try ML predictions or wait.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        setAnalysis(null);
        return;
      }

      setAnalysis(data);
    } catch (error: any) {
      console.error('AI analysis error:', error);
      toast({
        title: 'AI analysis failed',
        description: error.message || 'Using ML predictions instead',
        variant: 'destructive',
      });
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { analysis, isLoading, analyze };
}
