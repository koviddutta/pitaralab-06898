/**
 * BalancingSuggestionsDialog - Shows balancing suggestions with apply actions
 */

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Plus, Minus, Trash2, Wand2 } from 'lucide-react';
import type { BalancingSuggestion } from '@/types/calculator';

interface BalancingSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: BalancingSuggestion[];
  onApplySuggestion: (suggestion: BalancingSuggestion) => void;
  onApplyAll: () => void;
}

const ACTION_ICONS = {
  add: Plus,
  increase: Plus,
  decrease: Minus,
  remove: Trash2
};

const PRIORITY_COLORS = {
  1: 'destructive',
  2: 'secondary',
  3: 'outline'
} as const;

export function BalancingSuggestionsDialog({
  open,
  onOpenChange,
  suggestions,
  onApplySuggestion,
  onApplyAll
}: BalancingSuggestionsDialogProps) {
  if (suggestions.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Balancing Suggestions
          </DialogTitle>
          <DialogDescription>
            Apply these suggestions to improve your recipe balance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
          {suggestions.map((suggestion) => {
            const Icon = ACTION_ICONS[suggestion.action];
            return (
              <div 
                key={suggestion.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Badge variant={PRIORITY_COLORS[suggestion.priority as 1 | 2 | 3] || 'outline'}>
                    <Icon className="h-3 w-3 mr-1" />
                    {suggestion.action}
                  </Badge>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {suggestion.ingredientName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {suggestion.action === 'add' || suggestion.action === 'increase' 
                      ? `+${suggestion.quantityChange.toFixed(0)}g` 
                      : `-${suggestion.quantityChange.toFixed(0)}g`
                    } {suggestion.reason}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onApplySuggestion(suggestion)}
                  className="flex-shrink-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={onApplyAll}
            className="flex-1"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Apply All ({suggestions.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
