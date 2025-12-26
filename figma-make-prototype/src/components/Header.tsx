import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BarChart3, Menu /* Search, Lightbulb */ } from 'lucide-react';

interface HeaderProps {
  onNewAnalysis: () => void;
  hasResults: boolean;
}

export function Header({ onNewAnalysis, hasResults }: HeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-semibold">ProductTeardown</h1>
              <Badge variant="secondary" className="text-xs">BETA</Badge>
            </div>
          </div>

          {/* NAVIGATION - Hidden for MVP (non-functional)
          <nav className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Search className="h-4 w-4" />
                <span>Analyze</span>
              </div>
              <div className="flex items-center gap-1">
                <Lightbulb className="h-4 w-4" />
                <span>Insights</span>
              </div>
            </div>
          </nav>
          */}

          <div className="flex items-center gap-2">
            {hasResults && (
              <Button variant="outline" size="sm" onClick={onNewAnalysis}>
                New Analysis
              </Button>
            )}
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}