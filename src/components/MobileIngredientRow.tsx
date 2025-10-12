import React, { useState } from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { IngredientData } from '@/types/ingredients';

interface MobileIngredientRowProps {
  index: number;
  ingredientId: string;
  grams: number;
  ingredients: Record<string, IngredientData>;
  percentage?: string;
  onUpdate: (index: number, field: 'ingredientId' | 'grams', value: string | number) => void;
  onAdjust: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  isProductionMode?: boolean;
}

export const MobileIngredientRow: React.FC<MobileIngredientRowProps> = ({
  index,
  ingredientId,
  grams,
  ingredients,
  percentage,
  onUpdate,
  onAdjust,
  onRemove,
  isProductionMode = false,
}) => {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const ing = ingredients[ingredientId];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    const offset = touchStart - e.targetTouches[0].clientX;
    if (offset > 0 && offset < 100) {
      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // Swipe left detected
      onRemove(index);
    }
    setSwipeOffset(0);
  };

  if (isProductionMode) {
    return (
      <div className="py-4 border-b border-border last:border-0">
        <div className="text-base font-semibold mb-1">{ing?.name || ingredientId}</div>
        <div className="text-lg font-bold">{grams}g</div>
        {percentage && (
          <div className="text-sm text-muted-foreground mt-2">
            {percentage}% of batch
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateX(-${swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.2s ease-in-out' : 'none' }}
    >
      <div className="pb-4 border-b border-border last:border-0">
        <div className="flex justify-between items-center mb-4">
          <Label className="text-base font-medium">Ingredient {index + 1}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-11 w-11 p-0 text-destructive touch-target transition-all duration-200 ease-in-out"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <Select value={ingredientId} onValueChange={(value) => onUpdate(index, 'ingredientId', value)}>
          <SelectTrigger className="mb-4 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ingredients).map((ing) => (
              <SelectItem key={ing.id} value={ing.id}>
                {ing.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onAdjust(index, -10)}
            className="h-11 w-11 p-0 flex-shrink-0 touch-target transition-all duration-200 ease-in-out"
          >
            <Minus className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold">{grams}g</div>
            {percentage && (
              <div className="text-sm text-muted-foreground mt-1">{percentage}%</div>
            )}
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={() => onAdjust(index, 10)}
            className="h-11 w-11 p-0 flex-shrink-0 touch-target transition-all duration-200 ease-in-out"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Swipe delete indicator */}
      {swipeOffset > 20 && (
        <div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-destructive text-destructive-foreground px-4"
          style={{ width: `${swipeOffset}px` }}
        >
          <Trash2 className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
