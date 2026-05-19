import { buildAnalysisMarkdown, getMarkdownFilename } from '../markdownExport'

function buildAnalysis(overrides = {}) {
  const { analysis_data: analysisDataOverrides = {}, ...rootOverrides } = overrides

  return {
    product_name: 'Linear',
    product_url: 'https://linear.app',
    user_goals: 'Focus on activation',
    ai_provider: 'openai',
    created_at: '2026-05-10T12:00:00.000Z',
    analysis_data: {
      model: 'gpt-test',
      summary: {
        topTakeaways: ['Use backend summary first.'],
      },
      sections: {
        onboarding: 'Edited onboarding notes with evidence [src_1].',
        pricing: 'Edited pricing notes.',
        deltaVsMyProduct: 'Analysis not available for this section.',
      },
      originalSections: {
        onboarding: 'Original onboarding notes.',
      },
      sources: [
        {
          id: 'src_1',
          title: 'Linear homepage',
          type: 'web',
          url: 'https://linear.app',
          snippet: 'Build better products.',
        },
      ],
      ...analysisDataOverrides,
    },
    ...rootOverrides,
  }
}

describe('markdown export', () => {
  it('uses current section content, preserves citation tokens, and appends sources', () => {
    const markdown = buildAnalysisMarkdown(buildAnalysis())

    expect(markdown).toContain('# Linear Analysis')
    expect(markdown).toContain('1. Use backend summary first.')
    expect(markdown).toContain('## User Onboarding')
    expect(markdown).toContain('Edited onboarding notes with evidence [src_1].')
    expect(markdown).not.toContain('Original onboarding notes.')
    expect(markdown).not.toContain('[src_1](#source-src_1)')
    expect(markdown).toContain('## Sources')
    expect(markdown).toContain('- [src_1]')
    expect(markdown).toContain('**URL:** https://linear.app')
  })

  it('falls back for older analyses missing summary, quality, and model fields', () => {
    const markdown = buildAnalysisMarkdown(buildAnalysis({
      ai_provider: 'anthropic',
      analysis_data: {
        summary: undefined,
        quality: undefined,
        model: undefined,
        sections: {
          onboarding: '**Activation:**\n- Invite teammates earlier [src_2].',
        },
        sources: [],
      },
    }))

    expect(markdown).toContain('**Model:** anthropic')
    expect(markdown).toContain('1. Activation: Invite teammates earlier [src_2].')
    expect(markdown).not.toContain('## Sources')
  })

  it('creates a safe markdown filename from the product name', () => {
    expect(getMarkdownFilename({ product_name: 'ACME: Sales / CRM!' })).toBe('acme-sales-crm-analysis.md')
  })
})
