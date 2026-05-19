import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnalysisDisplay from '../AnalysisDisplay'

vi.mock('../FeedbackWidget', () => ({
  default: () => <div data-testid="feedback-widget" />
}))

function buildAnalysis(overrides = {}) {
  const { analysis_data: analysisDataOverrides = {}, ...rootOverrides } = overrides

  return {
    id: 'analysis_1',
    product_name: 'Linear',
    product_url: 'https://linear.app',
    user_goals: 'Focus on activation',
    ai_provider: 'openai',
    created_at: '2026-05-10T12:00:00.000Z',
    analysis_data: {
      sections: {
        onboarding: '**Onboarding Flow**\n- Heuristic onboarding takeaway from section content.',
        pricing: '**Pricing Model**\n- Heuristic pricing takeaway from section content.',
        valueProps: '**Primary Value**\n- Heuristic value proposition takeaway from section content.',
        competitive: '**Strengths**\n- Heuristic competitive takeaway from section content.',
        actionPlan: '**What to copy**\n- Heuristic action takeaway from section content.',
        deltaVsMyProduct: 'Analysis not available for this section.',
      },
      evidence: {
        overall: {
          basis: 'mixed',
          confidence: 0.7,
          limitations: [],
        },
        onboarding: {
          basis: 'mixed',
          confidence: 0.7,
          sourceIds: ['src_1'],
          claims: [
            { text: 'Sourced claim [src_1].', basis: 'sourced', sourceIds: ['src_1'] },
            { text: 'Inferred claim.', basis: 'inferred', sourceIds: [] },
          ],
        },
      },
      sources: [],
      rawAnalysis: '',
      generatedAt: '2026-05-10T12:00:00.000Z',
      ...analysisDataOverrides,
    },
    ...rootOverrides,
  }
}

describe('AnalysisDisplay', () => {
  it('uses backend summary takeaways when present', () => {
    render(
      <AnalysisDisplay
        analysis={buildAnalysis({
          analysis_data: {
            summary: {
              topTakeaways: [
                'Backend takeaway one.',
                'Backend takeaway two.',
                'Backend takeaway three.',
              ],
            },
          },
        })}
      />
    )

    expect(screen.getByText('Backend takeaway one.')).toBeInTheDocument()
    expect(screen.getByText('Backend takeaway two.')).toBeInTheDocument()
  })

  it('falls back to section-derived takeaways when summary is absent', () => {
    render(<AnalysisDisplay analysis={buildAnalysis()} />)

    expect(screen.getByText(/Onboarding Flow: Heuristic onboarding takeaway/i)).toBeInTheDocument()
  })

  it('renders quality notes without requiring new fields on older analyses', () => {
    render(
      <AnalysisDisplay
        analysis={buildAnalysis({
          analysis_data: {
            quality: {
              warnings: ['Action plan is missing expected decision language.'],
              evidenceGaps: ['No pricing page was fetched.'],
            },
          },
        })}
      />
    )

    expect(screen.getByText(/view quality notes/i)).toBeInTheDocument()
    expect(screen.getByText('Action plan is missing expected decision language.')).toBeInTheDocument()
    expect(screen.getByText('No pricing page was fetched.')).toBeInTheDocument()
  })

  it('renders diagnostics, focus preset, and claim coverage when present', () => {
    render(
      <AnalysisDisplay
        analysis={buildAnalysis({
          focus_preset: 'pricing',
          analysis_data: {
            model: 'gpt-5.2',
            diagnostics: {
              provider: 'openai',
              model: 'gpt-5.2',
              generationTimeMs: 1250,
              sourceCount: 2,
              retryCount: 1,
              qualityPassed: false,
            },
          },
        })}
      />
    )

    expect(screen.getByText(/Preset:/)).toBeInTheDocument()
    expect(screen.getByText(/Pricing & packaging/)).toBeInTheDocument()
    expect(screen.getByText('Generation: 1.3s')).toBeInTheDocument()
    expect(screen.getByText('Sources: 2')).toBeInTheDocument()
    expect(screen.getByText('Retries: 1')).toBeInTheDocument()
    expect(screen.getByText('Quality: review')).toBeInTheDocument()
    expect(screen.getByText('1 sourced / 1 inferred')).toBeInTheDocument()
  })

  it('copies markdown from the current analysis sections', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(
      <AnalysisDisplay
        analysis={buildAnalysis({
          analysis_data: {
            summary: {
              topTakeaways: ['Copied backend takeaway.'],
            },
            sections: {
              onboarding: 'Current edited onboarding content [src_1].',
            },
            originalSections: {
              onboarding: 'Original onboarding content.',
            },
            sources: [
              {
                id: 'src_1',
                title: 'Linear homepage',
                url: 'https://linear.app',
              },
            ],
          },
        })}
      />
    )

    await user.click(screen.getByRole('button', { name: /copy markdown/i }))

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('Current edited onboarding content [src_1].')
    expect(writeText.mock.calls[0][0]).toContain('## Sources')
    expect(writeText.mock.calls[0][0]).not.toContain('Original onboarding content.')
  })
})
