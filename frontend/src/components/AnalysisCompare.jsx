import ReactMarkdown from 'react-markdown'
import { useMemo, useState } from 'react'

const BASE_SECTION_DEFS = [
  { key: 'onboarding', label: 'User Onboarding' },
  { key: 'pricing', label: 'Pricing Strategy' },
  { key: 'valueProps', label: 'Value Propositions' },
  { key: 'competitive', label: 'Competitive Differentiation' },
  { key: 'actionPlan', label: 'Action Plan' },
]

function buildComparisonText(analyses, sectionDefs) {
  const header = `Competitor Comparison\n\n${analyses.map(a => a.product_name).join(' vs ')}\n`
  const body = (sectionDefs || []).map(sec => {
    const lines = analyses.map(a => {
      const content = a.analysis_data?.sections?.[sec.key] || 'No data.'
      return `## ${a.product_name}\n${content}`
    }).join('\n\n')
    return `\n\n# ${sec.label}\n${lines}`
  }).join('')
  return `${header}${body}`.trim()
}

export default function AnalysisCompare({ analyses, onBack }) {
  const [activeId, setActiveId] = useState(analyses?.[0]?.id)

  const sectionDefs = useMemo(() => {
    const includeDelta = (analyses || []).some(a => {
      const content = a.analysis_data?.sections?.deltaVsMyProduct
      return content && content !== 'Analysis not available for this section.'
    })

    return includeDelta
      ? [...BASE_SECTION_DEFS, { key: 'deltaVsMyProduct', label: 'Delta vs My product' }]
      : BASE_SECTION_DEFS
  }, [analyses])

  const activeAnalysis = (analyses || []).find(a => a.id === activeId) || analyses?.[0]

  const copyComparison = () => {
    const text = buildComparisonText(analyses, sectionDefs)
    navigator.clipboard.writeText(text)
    // Could add toast here later
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="ptp-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compare Competitors</h2>
            <p className="text-sm text-gray-600 mt-1">
              {analyses.map(a => a.product_name).join(' vs ')}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onBack}
              className="ptp-btn-secondary"
            >
              Back to History
            </button>
            <button
              onClick={copyComparison}
              className="ptp-btn-primary"
            >
              Copy Comparison
            </button>
            <button
              onClick={() => window.print()}
              className="ptp-btn-secondary"
            >
              Print/PDF
            </button>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-4">
        <div className="ptp-card p-4">
          <div className="text-sm font-medium text-zinc-900 mb-3">Competitor</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {analyses.map(a => {
              const active = a.id === (activeAnalysis?.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActiveId(a.id)}
                  className={active
                    ? 'px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium whitespace-nowrap'
                    : 'px-3 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-sm font-medium whitespace-nowrap'}
                >
                  {a.product_name}
                </button>
              )
            })}
          </div>
          {activeAnalysis?.ai_provider && (
            <div className="mt-3 text-xs text-zinc-500">
              Provider: <span className="font-medium text-zinc-700">{activeAnalysis.ai_provider}</span>
            </div>
          )}
        </div>

        {sectionDefs.map(sec => (
          <div key={sec.key} className="ptp-card p-4">
            <div className="text-sm font-semibold text-zinc-900 mb-2">
              {sec.label}
            </div>
            <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-zinc-900 prose-p:text-zinc-700 prose-li:text-zinc-700">
              <ReactMarkdown>
                {activeAnalysis?.analysis_data?.sections?.[sec.key] || 'No data available for this section.'}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block ptp-card p-6 mb-6 overflow-x-auto">
        <table className="min-w-full border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="sticky left-0 bg-white z-10 text-left p-3 border-b border-gray-200 text-sm font-semibold text-gray-900 w-48">
                Section
              </th>
              {analyses.map(a => (
                <th key={a.id} className="text-left p-3 border-b border-gray-200 text-sm font-semibold text-gray-900 min-w-[320px]">
                  <div className="flex flex-col">
                    <span className="text-base">{a.product_name}</span>
                    <span className="text-xs text-gray-500 font-normal mt-0.5">
                      {a.ai_provider || 'openai'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sectionDefs.map(sec => (
              <tr key={sec.key}>
                <td className="sticky left-0 bg-white z-10 align-top p-3 border-b border-gray-200 text-sm font-medium text-gray-900 w-48">
                  {sec.label}
                </td>
                {analyses.map(a => (
                  <td key={`${a.id}-${sec.key}`} className="align-top p-3 border-b border-gray-200">
                    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700">
                      <ReactMarkdown>
                        {a.analysis_data?.sections?.[sec.key] || 'No data available for this section.'}
                      </ReactMarkdown>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


