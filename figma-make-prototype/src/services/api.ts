import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AnalysisRequest {
  productName: string;
  productUrl?: string;
  userGoals?: string;
  aiProvider: 'openai' | 'anthropic';
}

export interface BackendAnalysisResponse {
  success: boolean;
  data: {
    id: string;
    product_name: string;
    product_url?: string;
    user_goals?: string;
    ai_provider: string;
    analysis_data: {
      sections: {
        onboarding: string;
        pricing: string;
        valueProps: string;
        competitive: string;
      };
      rawAnalysis: string;
      generatedAt: string;
    };
    created_at: string;
  };
}

export const analysisApi = {
  createAnalysis: async (request: AnalysisRequest): Promise<BackendAnalysisResponse> => {
    try {
      console.log('🚀 Making API request to:', `${API_BASE_URL}/api/analysis`);
      console.log('📦 Request data:', request);

      const response = await axios.post(`${API_BASE_URL}/api/analysis`, {
        productName: request.productName,
        productUrl: request.productUrl || undefined,
        userGoals: request.userGoals || undefined,
        aiProvider: request.aiProvider,
      });

      console.log('✅ API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API error:', error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new Error(message);
      }
      
      throw new Error('Failed to analyze product. Please try again.');
    }
  },
};