import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, BarChart3, Save, X } from 'lucide-react';

interface WelcomeTourProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TOUR_SEEN_KEY = 'meetha-pitara-tour-seen';

export function WelcomeTour({ open: controlledOpen, onOpenChange }: WelcomeTourProps) {
  const [step, setStep] = useState(0);
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    // Auto-show on first visit if not controlled
    if (controlledOpen === undefined) {
      const hasSeenTour = localStorage.getItem(TOUR_SEEN_KEY);
      if (!hasSeenTour) {
        setInternalOpen(true);
      }
    }
  }, [controlledOpen]);

  const steps = [
    {
      title: 'Smart Ingredient Search',
      description: 'Press "/" to instantly search for ingredients. Our smart search understands categories, tags, and common names.',
      icon: <Search className="h-12 w-12 text-primary" />,
      highlight: 'Search through 100+ ingredients with keyboard shortcuts and autocomplete'
    },
    {
      title: 'Real-Time Metrics',
      description: 'Watch your recipe metrics update instantly as you add ingredients. Track FPDT, Total Solids, Fat%, and more.',
      icon: <BarChart3 className="h-12 w-12 text-primary" />,
      highlight: 'Get instant feedback on whether your recipe meets professional standards'
    },
    {
      title: 'Save & Share',
      description: 'Save your recipes to the cloud and access them from any device. Export to CSV for production use.',
      icon: <Save className="h-12 w-12 text-primary" />,
      highlight: 'Build your personal recipe library and never lose a formula again'
    }
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_SEEN_KEY, 'true');
    setIsOpen(false);
    setStep(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={handleSkip}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {currentStep.icon}
          </div>
          <DialogTitle className="text-center text-xl">
            {currentStep.title}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted rounded-lg p-4 my-4">
          <p className="text-sm text-center text-muted-foreground">
            {currentStep.highlight}
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-2 rounded-full transition-colors ${
                idx === step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleSkip}>
            Skip Tour
          </Button>
          <Button onClick={handleNext}>
            {step < steps.length - 1 ? (
              <>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function showTourAgain() {
  localStorage.removeItem(TOUR_SEEN_KEY);
  window.location.reload();
}
