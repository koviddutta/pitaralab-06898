import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Plus } from 'lucide-react';
import { getSupabase } from '@/integrations/supabase/safeClient';
import { useToast } from '@/hooks/use-toast';
import { logEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

interface Suggestion {
  ingredient: string;
  grams: number;
  reason: string;
}

interface AISuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: Suggestion[];
  onAddSuggestion: (suggestion: Suggestion) => void;
  isLoading: boolean;
}

export const AISuggestionDialog: React.FC<AISuggestionDialogProps> = ({
  open,
  onOpenChange,
  suggestions,
  onAddSuggestion,
  isLoading,
}) => {
  const { toast } = useToast();

  const handleAddSuggestion = async (suggestion: Suggestion) => {
    try {
      // Log acceptance to database for detailed telemetry
      const supabase = await getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('ai_suggestion_events').insert({
          user_id: user.id,
          ingredient: suggestion.ingredient,
          reason: suggestion.reason,
          accepted: true,
        });
      }

      // Log to general events for aggregate analytics
      logEvent(ANALYTICS_EVENTS.AI_SUGGEST_ACCEPT, {
        ingredient: suggestion.ingredient,
        grams: suggestion.grams
      });

      // Apply the suggestion
      onAddSuggestion(suggestion);
      
      // Show success toast
      toast({
        title: `Added ${suggestion.ingredient}`,
        description: suggestion.reason,
      });

      // Close dialog
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to log suggestion:', error);
      toast({
        title: 'Error',
        description: 'Failed to add suggestion',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Ingredient Suggestions
          </DialogTitle>
          <DialogDescription>
            Based on your current recipe, here are smart ingredient additions
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing recipe...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-lg">{suggestion.ingredient}</h4>
                        <span className="text-sm text-muted-foreground">{suggestion.grams}g</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddSuggestion(suggestion)}
                      className="flex-shrink-0"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
