import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Users, 
  DollarSign, 
  Target, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

export interface TeardownData {
  productName: string;
  productUrl?: string;
  analysisDate: string;
  onboarding: {
    steps: string[];
    timeToValue: string;
    highlights: string[];
    improvements: string[];
  };
  pricing: {
    model: string;
    tiers: Array<{
      name: string;
      price: string;
      features: string[];
    }>;
    strategy: string;
    competitivePosition: string;
  };
  valueProposition: {
    primary: string;
    secondary: string[];
    targetAudience: string;
    differentiators: string[];
  };
  competitive: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

interface TeardownResultsProps {
  data: TeardownData;
}

export function TeardownResults({ data }: TeardownResultsProps) {
  return (
    <div className="w-full max-w-6xl space-y-6 px-4 overflow-hidden">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl break-words">{data.productName} Teardown</CardTitle>
              <p className="text-muted-foreground mt-1">
                Analysis generated on {data.analysisDate}
                {data.productUrl && (
                  <span className="ml-2">
                    • <a href={data.productUrl} target="_blank" rel="noopener noreferrer" 
                         className="text-primary hover:underline">{data.productUrl}</a>
                  </span>
                )}
              </p>
            </div>
            <Badge variant="outline">AI Generated</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* User Onboarding */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 overflow-hidden">
            <div>
              <h4 className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Onboarding Flow
              </h4>
              <ul className="space-y-1 text-sm">
                {data.onboarding.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <span className="break-words">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator className="my-4" />

            <div>
              <h4 className="mb-2">Time to Value</h4>
              <p className="text-sm text-muted-foreground break-words">{data.onboarding.timeToValue}</p>
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Highlights
              </h4>
              <ul className="space-y-1 text-sm">
                {data.onboarding.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    <span className="break-words">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Potential Improvements
              </h4>
              <ul className="space-y-1 text-sm">
                {data.onboarding.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    <span className="break-words">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Strategy */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 overflow-hidden">
            <div>
              <h4 className="mb-2">Pricing Model</h4>
              <Badge variant="secondary">{data.pricing.model}</Badge>
            </div>

            <div>
              <h4 className="mb-3">Pricing Tiers</h4>
              <div className="space-y-3">
                {data.pricing.tiers.map((tier, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{tier.name}</span>
                      <span className="font-medium text-primary">{tier.price}</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {tier.features.slice(0, 3).map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-2">
                          <span>•</span>
                          <span className="break-words">{feature}</span>
                        </li>
                      ))}
                      {tier.features.length > 3 && (
                        <li className="text-xs">+{tier.features.length - 3} more features</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <h4 className="mb-2">Strategy Analysis</h4>
              <p className="text-sm text-muted-foreground mb-3 break-words">{data.pricing.strategy}</p>
              <div>
                <h5 className="text-sm font-medium mb-1">Competitive Position</h5>
                <p className="text-sm text-muted-foreground break-words">{data.pricing.competitivePosition}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Value Proposition */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Value Proposition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 overflow-hidden">
            <div>
              <h4 className="mb-2">Primary Value Proposition</h4>
              <p className="text-sm bg-primary/5 p-3 rounded-lg border break-words">
                {data.valueProposition.primary}
              </p>
            </div>

            <div>
              <h4 className="mb-2">Secondary Benefits</h4>
              <ul className="space-y-1 text-sm">
                {data.valueProposition.secondary.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="break-words">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator className="my-4" />

            <div>
              <h4 className="mb-2">Target Audience</h4>
              <p className="text-sm text-muted-foreground break-words">{data.valueProposition.targetAudience}</p>
            </div>

            <div>
              <h4 className="mb-2">Key Differentiators</h4>
              <div className="flex flex-wrap gap-2">
                {data.valueProposition.differentiators.map((diff, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {diff}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competitive Analysis */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Competitive Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 overflow-hidden">
            <div>
              <h4 className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Strengths
              </h4>
              <ul className="space-y-1 text-sm">
                {data.competitive.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600">+</span>
                    <span className="break-words">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Weaknesses
              </h4>
              <ul className="space-y-1 text-sm">
                {data.competitive.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-600">-</span>
                    <span className="break-words">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Opportunities
              </h4>
              <ul className="space-y-1 text-sm">
                {data.competitive.opportunities.map((opportunity, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600">→</span>
                    <span className="break-words">{opportunity}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-600" />
                Threats
              </h4>
              <ul className="space-y-1 text-sm">
                {data.competitive.threats.map((threat, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-600">⚠</span>
                    <span className="break-words">{threat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}