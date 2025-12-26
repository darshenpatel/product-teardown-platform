"use client";

import React, { useState } from 'react';
import { Header } from './components/Header';
import { ProductInputForm } from './components/ProductInputForm';
import { AnalysisLoader } from './components/AnalysisLoader';
import { TeardownResults, TeardownData } from './components/TeardownResults';
import { analysisApi } from './services/api';
import { transformBackendResponse } from './services/dataTransformer';

type AppState = 'input' | 'loading' | 'results';

export default function App() {
  const [state, setState] = useState<AppState>('input');
  const [analysisData, setAnalysisData] = useState<TeardownData | null>(null);
  const [currentProduct, setCurrentProduct] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleAnalysisSubmit = async (data: {
    productName: string;
    productUrl: string;
    context: string;
    inputMethod: 'text' | /* 'voice' | */ 'url';
    aiProvider: 'openai' | 'anthropic';
  }) => {
    setCurrentProduct(data.productName);
    setState('loading');
    setError(null);

    try {
      // Make real API call to backend
      const backendResponse = await analysisApi.createAnalysis({
        productName: data.productName,
        productUrl: data.productUrl || undefined,
        userGoals: data.context || undefined,
        aiProvider: data.aiProvider,
      });

      // Transform backend response to UI format
      const transformedData = transformBackendResponse(backendResponse);
      setAnalysisData(transformedData);
      setState('results');
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setState('input');
    }
  };

  const handleNewAnalysis = () => {
    setState('input');
    setAnalysisData(null);
    setCurrentProduct('');
    setError(null);
  };

  const extractProductFromUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      const parts = domain.split('.');
      const mainPart = parts.length > 2 ? parts[1] : parts[0];
      return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
    } catch {
      return 'Unknown Product';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        onNewAnalysis={handleNewAnalysis}
        hasResults={state === 'results'}
      />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
          {state === 'input' && (
            <div className="w-full max-w-4xl space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-medium">
                  AI-Powered Product Analysis
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Get comprehensive insights into any product's onboarding, pricing strategy, 
                  value proposition, and competitive positioning in minutes.
                </p>
              </div>
              
              <div className="flex justify-center">
                <ProductInputForm
                  onSubmit={handleAnalysisSubmit}
                  isLoading={state === 'loading'}
                  error={error}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <span className="text-xl">👥</span>
                  </div>
                  <h3 className="font-medium">Onboarding Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Understand user activation patterns
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <span className="text-xl">💰</span>
                  </div>
                  <h3 className="font-medium">Pricing Strategy</h3>
                  <p className="text-sm text-muted-foreground">
                    Decode monetization approaches
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <span className="text-xl">🎯</span>
                  </div>
                  <h3 className="font-medium">Value Proposition</h3>
                  <p className="text-sm text-muted-foreground">
                    Identify core value drivers
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <span className="text-xl">📊</span>
                  </div>
                  <h3 className="font-medium">Competitive Intel</h3>
                  <p className="text-sm text-muted-foreground">
                    SWOT analysis and positioning
                  </p>
                </div>
              </div>
            </div>
          )}

          {state === 'loading' && (
            <AnalysisLoader productName={currentProduct} />
          )}

          {state === 'results' && analysisData && (
            <TeardownResults data={analysisData} />
          )}
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            ProductTeardown • AI-powered competitive analysis platform • 
            <span className="text-primary"> Built for product managers and entrepreneurs</span>
          </p>
        </div>
      </footer>
    </div>
  );
}