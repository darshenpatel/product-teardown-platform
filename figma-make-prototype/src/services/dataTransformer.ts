import { TeardownData } from '../components/TeardownResults';
import { BackendAnalysisResponse } from './api';

export function transformBackendResponse(backendData: BackendAnalysisResponse): TeardownData {
  const { data } = backendData;
  const { analysis_data, product_name, product_url, created_at } = data;
  const sections = analysis_data.sections;

  return {
    productName: product_name,
    productUrl: product_url,
    analysisDate: new Date(created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    
    // Transform onboarding section
    onboarding: {
      steps: extractKeyPoints(sections.onboarding),
      timeToValue: extractSingleInsight(sections.onboarding, ['time to value', 'activation', 'first value']),
      highlights: extractKeyPoints(sections.onboarding).slice(0, 3),
      improvements: ['Analysis shows areas for onboarding optimization'],
    },

    // Transform pricing section  
    pricing: {
      model: extractSingleInsight(sections.pricing, ['freemium', 'model', 'approach', 'per-seat', 'saas']) || extractFirstParagraph(sections.pricing) || 'See pricing details',
      tiers: extractPricingTiers(sections.pricing),
      strategy: extractSingleInsight(sections.pricing, ['strategy', 'scaling', 'value-based', 'customization']) || extractFirstParagraph(sections.pricing) || 'See pricing strategy',
      competitivePosition: extractSingleInsight(sections.pricing, ['competitive', 'position', 'market', 'incentives', 'enterprise']) || 'See competitive analysis',
    },

    // Transform value proposition section
    valueProposition: {
      primary: extractSingleInsight(sections.valueProps, ['primary', 'main', 'core']) || extractFirstParagraph(sections.valueProps) || 'Core value proposition available',
      secondary: extractKeyPoints(sections.valueProps),
      targetAudience: extractSingleInsight(sections.valueProps, ['audience', 'customer', 'user']) || extractSingleInsight(sections.valueProps, ['target']) || 'See audience analysis',
      differentiators: extractKeyPoints(sections.valueProps),
    },

    // Transform competitive section
    competitive: {
      strengths: extractCompetitivePoints(sections.competitive, 'strengths'),
      weaknesses: extractCompetitivePoints(sections.competitive, 'weaknesses'),
      opportunities: extractCompetitivePoints(sections.competitive, 'opportunities'),
      threats: extractCompetitivePoints(sections.competitive, 'threats'),
    },
  };
}

// Simplified helper functions for realistic AI responses
function extractKeyPoints(text: string): string[] {
  if (!text || text.trim() === '' || text === 'Analysis not available for this section.') {
    return ['No analysis available'];
  }
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const keyPoints: string[] = [];
  
  for (const line of lines) {
    // Skip section headers (## or ###)
    if (line.match(/^#{1,4}\s+/)) {
      continue;
    }
    
    // Look for key insights in bold format with or without numbers:
    // **Title**: Description OR 1. **Title**: Description
    if (line.match(/^\d*\.?\s*\*\*.*\*\*:/)) {
      // Clean the formatting and get the full content
      let cleaned = line.replace(/^\d*\.?\s*\*\*(.*?)\*\*:\s*/, '$1: ').trim();
      // Remove any remaining ** formatting
      cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
      if (cleaned.length > 20) {
        keyPoints.push(cleaned);
      }
    }
  }
  
  // If no key points found from bold headers, look for bullet points
  if (keyPoints.length === 0) {
    for (const line of lines) {
      if (line.match(/^[\-\*\•]/)) {
        let cleaned = line.replace(/^[\-\*\•]\s*/, '').trim();
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
        if (cleaned.length > 20 && !cleaned.toLowerCase().includes('analysis not available')) {
          keyPoints.push(cleaned);
        }
      }
    }
  }
  
  // Limit to 3 key points for readability
  return keyPoints.length > 0 ? keyPoints.slice(0, 3) : ['Analysis content available'];
}

function extractSingleInsight(text: string, keywords: string[]): string {
  if (!text || text.trim() === '') return '';
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // First, look for bold headings with keywords (handle both formats)
  for (const line of lines) {
    if (line.match(/^\d*\.?\s*\*\*.*\*\*:/)) {
      const lowerLine = line.toLowerCase();
      for (const keyword of keywords) {
        if (lowerLine.includes(keyword.toLowerCase())) {
          let cleaned = line.replace(/^\d*\.?\s*\*\*(.*?)\*\*:\s*/, '$1: ').trim();
          // Clean all markdown formatting
          cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
          return cleaned;
        }
      }
    }
  }
  
  // Return the first substantial line that's not a header
  for (const line of lines) {
    if (!line.match(/^#{1,4}\s+/) && line.match(/^\d*\.?\s*\*\*.*\*\*:/) && line.length > 20) {
      let cleaned = line.replace(/^\d*\.?\s*\*\*(.*?)\*\*:\s*/, '$1: ').trim();
      cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
      return cleaned;
    }
  }
  
  return '';
}

function extractFirstParagraph(text: string): string {
  if (!text || text.trim() === '') return '';
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Find the first substantive content line (skip headers)
  for (const line of lines) {
    if (!line.match(/^#{1,4}\s+/) && line.match(/^\d*\.?\s*\*\*.*\*\*:/) && line.length > 20) {
      // Clean up markdown formatting
      let cleaned = line.replace(/^\d*\.?\s*\*\*(.*?)\*\*:\s*/, '$1: ').trim();
      cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
      return cleaned;
    }
  }
  
  return '';
}

function extractCompetitivePoints(text: string, category: 'strengths' | 'weaknesses' | 'opportunities' | 'threats'): string[] {
  if (!text || text.trim() === '' || text === 'Analysis not available for this section.') {
    return [`No ${category} analysis available`];
  }
  
  // Split text into sections based on **SWOT Category**:
  const sections = text.split(/\*\*(Strengths|Weaknesses|Opportunities|Threats)\*\*\s*:?\s*/i);
  
  const categoryPoints: string[] = [];
  
  // Find the section for our category
  for (let i = 0; i < sections.length; i++) {
    if (sections[i] && sections[i].toLowerCase() === category.toLowerCase()) {
      // The next section contains our content
      const content = sections[i + 1];
      if (content) {
        // Extract bullet points from this section
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        for (const line of lines) {
          // Stop if we hit another **Section** (but allow **other formatting**)
          if (line.match(/^\*\*(Strengths|Weaknesses|Opportunities|Threats)\*\*/i)) {
            break;
          }
          
          // Extract bullet points
          if (line.match(/^[\-\*\•]/)) {
            const cleaned = line.replace(/^[\-\*\•]\s*/, '').trim();
            if (cleaned.length > 10) {
              categoryPoints.push(cleaned);
            }
          }
        }
        break;
      }
    }
  }
  
  // Limit to 3 points
  if (categoryPoints.length > 0) {
    return categoryPoints.slice(0, 3);
  }
  
  // If no structured content found, return a meaningful fallback
  return [`${category.charAt(0).toUpperCase() + category.slice(1)} analysis available - check full details`];
}

function extractPricingTiers(text: string): Array<{ name: string; price: string; features: string[] }> {
  if (!text || text.trim() === '') {
    return [{
      name: 'Standard',
      price: 'See pricing details',
      features: ['Analysis available in full text']
    }];
  }
  
  // Extract key pricing insights
  const keyPoints = extractKeyPoints(text);
  
  // Look for price information in the text
  const priceMatch = text.match(/\$[\d,]+-?[\d,]*(?:\/[\w\s]+)?/);
  const price = priceMatch ? priceMatch[0] : 'Contact for pricing';
  
  // Determine tier name based on content
  let tierName = 'Standard';
  if (text.toLowerCase().includes('freemium') || text.toLowerCase().includes('free tier')) {
    tierName = 'Freemium';
  } else if (text.toLowerCase().includes('enterprise')) {
    tierName = 'Enterprise';
  } else if (text.toLowerCase().includes('per-seat') || text.toLowerCase().includes('per user')) {
    tierName = 'Per User';
  }
  
  return [{
    name: tierName,
    price: price,
    features: keyPoints
  }];
}