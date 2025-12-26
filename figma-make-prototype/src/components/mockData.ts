import { TeardownData } from './TeardownResults';

export function generateMockAnalysis(productName: string, productUrl?: string): TeardownData {
  const analysisDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Generate contextual mock data based on product name
  const mockData: Record<string, Partial<TeardownData>> = {
    slack: {
      onboarding: {
        steps: [
          'Email verification and account creation',
          'Choose workspace name and invite teammates',
          'Install desktop/mobile apps',
          'Complete guided tour of core features',
          'Set up first channels and integrations'
        ],
        timeToValue: '5-10 minutes to first message sent',
        highlights: [
          'Excellent guided tutorial with interactive elements',
          'Smart suggestions for team organization',
          'Seamless app installation prompts'
        ],
        improvements: [
          'Could reduce initial setup complexity',
          'Integration setup could be more intuitive',
          'Mobile onboarding feels rushed'
        ]
      },
      pricing: {
        model: 'Freemium with per-user monthly billing',
        tiers: [
          {
            name: 'Free',
            price: '$0',
            features: ['10,000 messages', 'Limited integrations', 'Basic search']
          },
          {
            name: 'Pro',
            price: '$7.25/user/month',
            features: ['Unlimited messages', 'Advanced integrations', 'Guest access', 'Screen sharing']
          },
          {
            name: 'Business+',
            price: '$12.50/user/month',
            features: ['Advanced security', 'Compliance exports', 'Custom retention', 'SAML SSO']
          }
        ],
        strategy: 'Aggressive freemium model to drive adoption, with clear upgrade incentives around message history and integrations',
        competitivePosition: 'Premium pricing but justified by feature richness and reliability'
      },
      valueProposition: {
        primary: 'Transform team communication and collaboration into organized, searchable, and productive conversations',
        secondary: [
          'Reduce email clutter and context switching',
          'Integrate all work tools in one place',
          'Enable asynchronous collaboration across time zones',
          'Create transparency and knowledge sharing'
        ],
        targetAudience: 'Knowledge workers in teams of 5-1000+, particularly in tech, creative, and remote-first companies',
        differentiators: ['Real-time collaboration', 'Extensive integrations', 'Superior search', 'Thread organization']
      },
      competitive: {
        strengths: [
          'Market-leading user experience and adoption',
          'Extensive ecosystem of integrations (2,400+)',
          'Strong brand recognition and network effects',
          'Proven scalability from small teams to enterprises'
        ],
        weaknesses: [
          'Can become overwhelming with notifications',
          'Pricing adds up quickly for larger teams',
          'Learning curve for advanced features',
          'Limited customization options'
        ],
        opportunities: [
          'Expand into project management capabilities',
          'AI-powered insights and automation',
          'Better mobile experience',
          'Small business market penetration'
        ],
        threats: [
          'Microsoft Teams bundling with Office 365',
          'Emerging async-first communication tools',
          'Economic pressure reducing software spend',
          'Privacy and data sovereignty concerns'
        ]
      }
    },
    notion: {
      onboarding: {
        steps: [
          'Account creation with Google/email',
          'Choose personal or team workspace',
          'Select from template gallery or start blank',
          'Interactive tutorial on blocks and pages',
          'Set up first workspace structure'
        ],
        timeToValue: '10-15 minutes to create first useful page',
        highlights: [
          'Beautiful template gallery for quick starts',
          'Interactive block-based tutorial',
          'Intuitive drag-and-drop interface'
        ],
        improvements: [
          'Initial blank page can be intimidating',
          'Template customization guidance lacking',
          'Performance education needed upfront'
        ]
      },
      pricing: {
        model: 'Freemium with per-user monthly billing',
        tiers: [
          {
            name: 'Personal',
            price: '$0',
            features: ['Limited blocks', 'Personal use only', 'Basic integrations']
          },
          {
            name: 'Personal Pro',
            price: '$4/month',
            features: ['Unlimited blocks', 'Guest access', 'Version history']
          },
          {
            name: 'Team',
            price: '$8/user/month',
            features: ['Collaborative workspace', 'Admin tools', 'Advanced permissions']
          }
        ],
        strategy: 'Low-cost entry point with generous free tier, focusing on individual adoption before team expansion',
        competitivePosition: 'Aggressive pricing to compete with specialized tools and Microsoft/Google suites'
      },
      valueProposition: {
        primary: 'Replace multiple productivity tools with one flexible workspace for notes, docs, databases, and project management',
        secondary: [
          'Eliminate app switching and context loss',
          'Create living, interconnected documentation',
          'Build custom workflows without code',
          'Scale from personal use to team collaboration'
        ],
        targetAudience: 'Knowledge workers, students, and teams seeking flexible productivity solutions, especially in creative and tech fields',
        differentiators: ['Block-based editing', 'Database functionality', 'Template ecosystem', 'All-in-one approach']
      },
      competitive: {
        strengths: [
          'Unmatched flexibility and customization',
          'Beautiful, modern interface design',
          'Strong community and template ecosystem',
          'Excellent mobile apps and offline support'
        ],
        weaknesses: [
          'Performance issues with large workspaces',
          'Steep learning curve for advanced features',
          'Limited real-time collaboration',
          'Can become disorganized without discipline'
        ],
        opportunities: [
          'Enterprise features and compliance',
          'AI-powered content assistance',
          'Advanced automation capabilities',
          'Industry-specific solutions'
        ],
        threats: [
          'Specialized tools maintaining feature advantages',
          'Microsoft and Google ecosystem lock-in',
          'Performance expectations vs. feature complexity',
          'Market saturation in productivity space'
        ]
      }
    }
  };

  const productKey = productName.toLowerCase();
  const baseData = mockData[productKey] || mockData.slack; // Fallback to Slack data

  return {
    productName,
    productUrl,
    analysisDate,
    ...baseData
  } as TeardownData;
}