import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { getSupabase } from '@/integrations/supabase/safeClient';
import { useToast } from '@/hooks/use-toast';

interface WarningExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warning: string;
  mode: 'gelato' | 'kulfi';
  metrics?: any;
}

export const WarningExplanationDialog: React.FC<WarningExplanationDialogProps> = ({
  open,
  onOpenChange,
  warning,
  mode,
  metrics,
}) => {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && warning) {
      fetchExplanation();
    }
  }, [open, warning]);

  const fetchExplanation = async () => {
    setIsLoading(true);
    setExplanation('');

    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.functions.invoke('explain-warning', {
        body: { warning, mode, metrics }
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast({
            title: "Rate Limit Exceeded",
            description: "Too many AI requests. Please try again later.",
            variant: "destructive"
          });
        } else if (data.error.includes('credits') || data.error.includes('Payment')) {
          toast({
            title: "AI Credits Exhausted",
            description: "Please add credits to your Lovable workspace.",
            variant: "destructive"
          });
        } else {
          throw new Error(data.error);
        }
        onOpenChange(false);
        return;
      }

      setExplanation(data.explanation || 'Unable to generate explanation.');
    } catch (error) {
      console.error('Warning explanation error:', error);
      toast({
        title: "Explanation Failed",
        description: error instanceof Error ? error.message : "Failed to get explanation",
        variant: "destructive"
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Warning Explanation
          </DialogTitle>
          <DialogDescription>
            Understanding and fixing formulation issues
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Display */}
          <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-900 dark:text-orange-100">
                  {warning.replace(/⚠️|🔧/g, '').trim()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Explanation */}
          {isLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    AI is analyzing the issue...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : explanation ? (
            <Card>
              <CardContent className="p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {explanation}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Additional Resources */}
          {!isLoading && explanation && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => window.open('/glossary', '_blank')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                View Glossary
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
