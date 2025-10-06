import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface WarningTooltipProps {
  warning: string;
}

export const WarningTooltip: React.FC<WarningTooltipProps> = ({ warning }) => {
  // Generate quick fix suggestions based on warning text
  const getQuickFix = (warning: string): string => {
    if (warning.includes('Lactose') && warning.includes('11%')) {
      return 'Quick fix: Reduce SMP by 10g OR add 2% glucose syrup';
    }
    if (warning.includes('Protein') && warning.includes('5%')) {
      return 'Quick fix: Lower MSNF by 5-10g to reduce chewiness';
    }
    if (warning.includes('Too soft') || warning.includes('FPDT < 2.5')) {
      return 'Quick fix: Lower dextrose 2-4% OR raise sucrose';
    }
    if (warning.includes('Too hard') || warning.includes('FPDT > 3.5')) {
      return 'Quick fix: Add dextrose 2-4% OR increase water';
    }
    if (warning.includes('Fat') && warning.includes('gelato')) {
      return 'Quick fix: Adjust cream/milk ratio to reach 6-9%';
    }
    if (warning.includes('MSNF') && warning.includes('gelato')) {
      return 'Quick fix: Adjust SMP amount to reach 10-12%';
    }
    if (warning.includes('sugars')) {
      return 'Quick fix: Balance sugar types to reach 16-22%';
    }
    if (warning.includes('Total solids')) {
      return 'Quick fix: Adjust total ingredient amounts';
    }
    return 'Review recipe composition and adjust accordingly';
  };

  const quickFix = getQuickFix(warning);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center justify-center hover:opacity-70 transition-opacity">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p className="text-sm">{quickFix}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
