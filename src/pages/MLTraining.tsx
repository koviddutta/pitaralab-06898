import { MLTrainingPanel } from '@/components/MLTrainingPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MLTraining() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculator
          </Button>
          <div>
            <h1 className="text-3xl font-bold">ML Training Center</h1>
            <p className="text-muted-foreground">
              Train and manage machine learning models for recipe optimization
            </p>
          </div>
        </div>

        <MLTrainingPanel />
      </div>
    </div>
  );
}
