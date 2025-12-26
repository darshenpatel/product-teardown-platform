"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Link, Search /* , Mic, MicOff */ } from 'lucide-react';

interface ProductInputFormProps {
  onSubmit: (data: {
    productName: string;
    productUrl: string;
    context: string;
    inputMethod: 'text' | /* 'voice' | */ 'url';
    aiProvider: 'openai' | 'anthropic';
  }) => void;
  isLoading: boolean;
  error?: string | null;
}

export function ProductInputForm({ onSubmit, isLoading, error }: ProductInputFormProps) {
  const [productName, setProductName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [context, setContext] = useState('');
  // const [isRecording, setIsRecording] = useState(false); // Hidden for MVP
  const [activeTab, setActiveTab] = useState<'text' | /* 'voice' | */ 'url'>('text');
  const [aiProvider, setAiProvider] = useState<'openai' | 'anthropic'>('openai');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() && !productUrl.trim()) return;

    // Ensure we always have a product name - extract from URL if needed
    const finalProductName = productName.trim() || extractProductFromUrl(productUrl.trim());

    onSubmit({
      productName: finalProductName,
      productUrl: productUrl.trim(),
      context: context.trim(),
      inputMethod: activeTab,
      aiProvider,
    });
  };

  const extractProductFromUrl = (url: string): string => {
    if (!url) return '';
    try {
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fullUrl = 'https://' + url;
      }
      const domain = new URL(fullUrl).hostname;
      const parts = domain.split('.');
      const mainPart = parts.length > 2 ? parts[1] : parts[0];
      return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
    } catch {
      return 'Unknown Product';
    }
  };

  /* VOICE FUNCTIONALITY - Hidden for MVP, uncomment to enable
  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    // In a real implementation, this would integrate with speech recognition
    if (!isRecording) {
      // Simulate voice input
      setTimeout(() => {
        setProductName('Slack');
        setIsRecording(false);
      }, 2000);
    }
  };
  */

  const isFormValid = productName.trim() || productUrl.trim();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Analyze a Product
        </CardTitle>
        <p className="text-muted-foreground">
          Enter a product name or URL to get started
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Method Tabs */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                activeTab === 'text'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-muted-foreground/10'
              }`}
            >
              Text
            </button>
            {/* VOICE TAB - Hidden for MVP
            <button
              type="button"
              onClick={() => setActiveTab('voice')}
              className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                activeTab === 'voice'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-muted-foreground/10'
              }`}
            >
              Voice
            </button>
            */}
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                activeTab === 'url'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-muted-foreground/10'
              }`}
            >
              URL
            </button>
          </div>

          {/* Text Input */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Slack, Notion, Figma"
                disabled={isLoading}
              />
            </div>
          )}

          {/* VOICE INPUT - Hidden for MVP
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <Label>Voice Input</Label>
              <div className="flex flex-col items-center space-y-4">
                <Button
                  type="button"
                  variant={isRecording ? 'destructive' : 'outline'}
                  size="lg"
                  onClick={handleVoiceToggle}
                  disabled={isLoading}
                  className="w-24 h-24 rounded-full"
                >
                  {isRecording ? (
                    <MicOff className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
                </p>
                {productName && (
                  <p className="text-sm bg-muted p-2 rounded">
                    Detected: "{productName}"
                  </p>
                )}
              </div>
            </div>
          )}
          */}

          {/* URL Input */}
          {activeTab === 'url' && (
            <div className="space-y-2">
              <Label htmlFor="productUrl">Product URL</Label>
              <div className="relative">
                <Link className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="productUrl"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://slack.com"
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Context Field */}
          <div className="space-y-2">
            <Label htmlFor="context">Context (Optional)</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What specific aspects are you interested in? e.g., pricing strategy, onboarding flow, competitive positioning"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* AI Provider Selection */}
          <div className="space-y-3">
            <Label>AI Provider</Label>
            <div className="flex" style={{ gap: '2rem' }}>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="openai"
                  checked={aiProvider === 'openai'}
                  onChange={(e) => setAiProvider(e.target.value as 'openai' | 'anthropic')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                  disabled={isLoading}
                />
                <span className="ml-4 text-sm">OpenAI GPT-4o</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="anthropic"
                  checked={aiProvider === 'anthropic'}
                  onChange={(e) => setAiProvider(e.target.value as 'openai' | 'anthropic')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                  disabled={isLoading}
                />
                <span className="ml-4 text-sm">Anthropic Claude Sonnet 4</span>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 text-destructive">⚠️</div>
                <div>
                  <h3 className="text-sm font-medium text-destructive">
                    Analysis Error
                  </h3>
                  <p className="text-sm text-destructive/80 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Generate Teardown'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}