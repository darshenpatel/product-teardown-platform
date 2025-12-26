import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Loader2, Search, Users, DollarSign, Target, TrendingUp } from 'lucide-react';

interface AnalysisLoaderProps {
  productName: string;
}

const analysisSteps = [
  { icon: Search, label: 'Gathering product data', duration: 2000 },
  { icon: Users, label: 'Analyzing onboarding flow', duration: 3000 },
  { icon: DollarSign, label: 'Evaluating pricing strategy', duration: 2500 },
  { icon: Target, label: 'Identifying value propositions', duration: 2000 },
  { icon: TrendingUp, label: 'Running competitive analysis', duration: 3000 },
];

export function AnalysisLoader({ productName }: AnalysisLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let stepTimer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;

    const runStep = (stepIndex: number) => {
      if (stepIndex >= analysisSteps.length) {
        setProgress(100);
        return;
      }

      setCurrentStep(stepIndex);
      const step = analysisSteps[stepIndex];
      const stepProgress = (stepIndex / analysisSteps.length) * 100;
      
      // Animate progress for current step
      let currentProgress = stepProgress;
      const progressIncrement = (100 / analysisSteps.length) / (step.duration / 50);
      
      progressTimer = setInterval(() => {
        currentProgress += progressIncrement;
        setProgress(Math.min(currentProgress, (stepIndex + 1) / analysisSteps.length * 100));
      }, 50);

      stepTimer = setTimeout(() => {
        clearInterval(progressTimer);
        runStep(stepIndex + 1);
      }, step.duration);
    };

    runStep(0);

    return () => {
      clearTimeout(stepTimer);
      clearInterval(progressTimer);
    };
  }, []);

  const CurrentIcon = currentStep < analysisSteps.length ? analysisSteps[currentStep].icon : Search;

  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="pt-6">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <CurrentIcon className="h-6 w-6 absolute top-3 left-3 text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              Analyzing {productName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {currentStep < analysisSteps.length 
                ? analysisSteps[currentStep].label 
                : 'Finalizing analysis'}
            </p>
          </div>

          <div className="space-y-3">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Analysis Steps</h4>
            <div className="space-y-1">
              {analysisSteps.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-sm py-1 px-2 rounded transition-colors ${
                      isCompleted 
                        ? 'text-green-600 bg-green-50' 
                        : isCurrent 
                        ? 'text-primary bg-primary/5' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    <StepIcon className="h-3 w-3" />
                    <span>{step.label}</span>
                    {isCompleted && <span className="ml-auto text-xs">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}