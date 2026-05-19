import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import FeedbackWidget from './FeedbackWidget'
import { buildAnalysisMarkdown, downloadMarkdown, getMarkdownFilename } from '../utils/markdownExport'

const FOCUS_PRESET_LABELS = {
  general: 'General teardown',
  onboarding: 'Onboarding & activation',
  pricing: 'Pricing & packaging',
  positioning: 'Positioning & differentiation',
  growth: 'Growth opportunities',
}

export default function AnalysisDisplay({ analysis, onNewAnalysis, onUpdateAnalysis }) {
  const { product_name, product_url, user_goals, ai_provider, analysis_data, created_at } = analysis
  const [expandedSections, setExpandedSections] = useState({})
  const [editingSections, setEditingSections] = useState({})
  const [draftSections, setDraftSections] = useState({})
  const [showOriginalSections, setShowOriginalSections] = useState({})
  const [highlightedSourceId, setHighlightedSourceId] = useState(null)

  const formatConfidence = (confidence) => {
    if (typeof confidence !== 'number' || Number.isNaN(confidence)) return null
    const pct = Math.round(confidence * 100)
    return `${pct}%`
  }

  const EvidenceBadge = ({ basis, confidence }) => {
    if (!basis) return null

    const normalized = String(basis).toLowerCase()
    const confidenceText = formatConfidence(confidence)

    const stylesByBasis = {
      sourced: 'bg-green-50 text-green-800 border-green-200',
      mixed: 'bg-blue-50 text-blue-800 border-blue-200',
      inferred: 'bg-yellow-50 text-yellow-800 border-yellow-200'
    }

    const labelByBasis = {
      sourced: 'SOURCED',
      mixed: 'MIXED',
      inferred: 'INFERRED'
    }

    const cls = stylesByBasis[normalized] || 'bg-gray-50 text-gray-800 border-gray-200'
    const label = labelByBasis[normalized] || String(basis).toUpperCase()

    return (
      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
        <span>{label}</span>
        {confidenceText && (
          <span className="text-[11px] opacity-80">{confidenceText}</span>
        )}
      </span>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleSection = (sectionKey) => {
    if (editingSections[sectionKey]) return
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }

  const getPreview = (content) => {
    if (!content) return 'Analysis not available for this section.'
    const lines = content.split('\n').filter(line => line.trim())
    return lines.slice(0, 2).join('\n') + (lines.length > 2 ? '...' : '')
  }

  const allowedSourceIds = new Set((analysis_data?.sources || []).map(s => s.id))
  const linkifyCitations = (markdown) => {
    if (!markdown || allowedSourceIds.size === 0) return markdown
    return String(markdown).replace(/\[src_(\d+)\]/g, (match) => {
      const id = match.slice(1, -1) // src_#
      if (!allowedSourceIds.has(id)) return match
      return `[${id}](#source-${id})`
    })
  }

  const originalSections = analysis_data?.originalSections

  const isSectionEdited = (sectionKey) => {
    const original = originalSections?.[sectionKey]
    const current = analysis_data?.sections?.[sectionKey]
    return typeof original === 'string' && typeof current === 'string' && original !== current
  }

  const startEditing = (sectionKey, currentContent) => {
    setExpandedSections(prev => ({ ...prev, [sectionKey]: true }))
    setShowOriginalSections(prev => ({ ...prev, [sectionKey]: false }))
    setEditingSections(prev => ({ ...prev, [sectionKey]: true }))
    setDraftSections(prev => ({ ...prev, [sectionKey]: currentContent || '' }))
  }

  const cancelEditing = (sectionKey) => {
    setEditingSections(prev => ({ ...prev, [sectionKey]: false }))
    setDraftSections(prev => {
      const next = { ...prev }
      delete next[sectionKey]
      return next
    })
  }

  const saveSection = (sectionKey) => {
    const draft = draftSections[sectionKey]
    if (typeof draft !== 'string') return

    const prevAnalysisData = analysis?.analysis_data || {}
    const prevSections = prevAnalysisData.sections || {}

    const existingOriginal = prevAnalysisData.originalSections
    const nextOriginalSections = existingOriginal || { ...prevSections }

    const nextSections = {
      ...prevSections,
      [sectionKey]: draft,
    }

    const now = new Date().toISOString()
    const nextEdits = {
      ...(prevAnalysisData.edits || {}),
      [sectionKey]: { updatedAt: now },
    }

    const nextAnalysis = {
      ...analysis,
      analysis_data: {
        ...prevAnalysisData,
        sections: nextSections,
        originalSections: nextOriginalSections,
        edits: nextEdits,
      }
    }

    onUpdateAnalysis?.(nextAnalysis)

    setEditingSections(prev => ({ ...prev, [sectionKey]: false }))
    setDraftSections(prev => {
      const next = { ...prev }
      delete next[sectionKey]
      return next
    })
    setShowOriginalSections(prev => ({ ...prev, [sectionKey]: false }))
  }

  const toggleOriginal = (sectionKey) => {
    if (!isSectionEdited(sectionKey)) return
    setShowOriginalSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))
  }

  const AnalysisSection = ({ title, content, icon, sectionKey, evidence, defaultExpanded = false }) => {
    const isExpanded = expandedSections[sectionKey] !== undefined 
      ? expandedSections[sectionKey] 
      : defaultExpanded

    const isEditing = Boolean(editingSections[sectionKey])
    const edited = isSectionEdited(sectionKey)
    const viewingOriginal = Boolean(showOriginalSections[sectionKey]) && edited && !isEditing
    const originalContent = originalSections?.[sectionKey]
    const displayContent = viewingOriginal ? (originalContent || content) : content
    const claims = Array.isArray(evidence?.claims) ? evidence.claims : []
    const sourcedClaims = claims.filter((claim) => claim.basis === 'sourced' || claim.basis === 'mixed').length
    const inferredClaims = claims.filter((claim) => claim.basis === 'inferred').length
    
    return (
      <div className="ptp-card ptp-card-hover mb-4">
        <div 
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-zinc-50 transition-colors duration-150"
          onClick={() => toggleSection(sectionKey)}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-3">
              {icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {evidence && (
              <EvidenceBadge basis={evidence.basis} confidence={evidence.confidence} />
            )}
            {claims.length > 0 && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-50 text-zinc-700 border-zinc-200">
                {sourcedClaims} sourced / {inferredClaims} inferred
              </span>
            )}
            {edited && (
              <span className="ptp-pill bg-zinc-50 text-zinc-700 border-zinc-200/70">
                Edited
              </span>
            )}
            {edited && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleOriginal(sectionKey)
                }}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                disabled={isEditing}
              >
                {viewingOriginal ? 'Show edited' : 'Show original'}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (isEditing) {
                  cancelEditing(sectionKey)
                } else {
                  startEditing(sectionKey, content)
                }
              }}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-none' : 'max-h-0'}`}>
          <div className="px-6 pb-6 pt-0 border-t border-zinc-100">
            {isEditing ? (
              <div className="pt-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="text-xs text-zinc-600">
                    Editing markdown. Evidence badges reflect the original generated output.
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveSection(sectionKey)}
                      className="ptp-btn-primary px-3 py-1.5"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelEditing(sectionKey)}
                      className="ptp-btn-secondary px-3 py-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <textarea
                  value={draftSections[sectionKey] ?? ''}
                  onChange={(e) => setDraftSections(prev => ({ ...prev, [sectionKey]: e.target.value }))}
                  className="mt-4 ptp-textarea min-h-[260px] font-mono text-[13px]"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="prose prose-gray max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-3 prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-em:text-gray-800 prose-ul:list-disc prose-ul:ml-6 prose-ul:space-y-2 prose-ol:list-decimal prose-ol:ml-6 prose-ol:space-y-2 prose-li:text-gray-700 prose-li:leading-relaxed">
                {edited && (
                  <div className="pt-5 pb-1 text-xs text-zinc-600">
                    {viewingOriginal ? 'Viewing original output.' : 'This section has been edited.'}{' '}
                    Evidence badges reflect the original generated output.
                  </div>
                )}

                {displayContent ? (
                    <ReactMarkdown
                      components={{
                      h2: ({...props}) => <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4" {...props} />,
                      h3: ({...props}) => <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-3" {...props} />,
                      h4: ({...props}) => <h4 className="text-base font-semibold text-gray-900 mt-3 mb-2" {...props} />,
                      p: ({...props}) => <p className="text-gray-700 leading-relaxed mb-3" {...props} />,
                      strong: ({...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                      em: ({...props}) => <em className="italic text-gray-800" {...props} />,
                      ul: ({...props}) => <ul className="list-disc ml-6 space-y-2 mb-4" {...props} />,
                      ol: ({...props}) => <ol className="list-decimal ml-6 space-y-2 mb-4" {...props} />,
                      li: ({...props}) => <li className="text-gray-700 leading-relaxed" {...props} />,
                      a: ({ href, children, ...props }) => {
                        const safeHref = typeof href === 'string' ? href : ''
                        const cls = 'text-emerald-700 hover:text-emerald-800 underline decoration-emerald-300 underline-offset-2'

                        if (safeHref.startsWith('#source-')) {
                          return (
                            <a
                              href={safeHref}
                              className={cls}
                              onClick={(e) => {
                                e.preventDefault()
                                const targetId = safeHref.slice(1)
                                const el = document.getElementById(targetId)
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                  const srcId = targetId.replace(/^source-/, '')
                                  setHighlightedSourceId(srcId)
                                  window.setTimeout(() => setHighlightedSourceId(null), 2000)
                                }
                              }}
                              {...props}
                            >
                              {children}
                            </a>
                          )
                        }

                        return (
                          <a
                            href={safeHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cls}
                            {...props}
                          >
                            {children}
                          </a>
                        )
                      },
                      code: ({inline, ...props}) =>
                        inline ? (
                          <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                        ) : (
                          <code className="block bg-zinc-100 text-zinc-800 p-3 rounded text-sm font-mono overflow-x-auto mb-4" {...props} />
                        ),
                    }}
                  >
                    {linkifyCitations(displayContent)}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-500 italic">Analysis not available for this section.</p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {!isExpanded && (
          <div className="px-6 pb-6 pt-0">
            <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({...props}) => <p className="text-sm text-gray-600 mb-2" {...props} />,
                  strong: ({...props}) => <strong className="font-semibold text-gray-700" {...props} />,
                  em: ({...props}) => <em className="italic" {...props} />,
                  a: ({ href, children, ...props }) => {
                    const safeHref = typeof href === 'string' ? href : ''
                    const cls = 'text-emerald-700 hover:text-emerald-800 underline decoration-emerald-300 underline-offset-2'
                    if (safeHref.startsWith('#source-')) {
                      return (
                        <a
                          href={safeHref}
                          className={cls}
                          onClick={(e) => {
                            e.preventDefault()
                            const targetId = safeHref.slice(1)
                            const el = document.getElementById(targetId)
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              const srcId = targetId.replace(/^source-/, '')
                              setHighlightedSourceId(srcId)
                              window.setTimeout(() => setHighlightedSourceId(null), 2000)
                            }
                          }}
                          {...props}
                        >
                          {children}
                        </a>
                      )
                    }
                    return (
                      <a
                        href={safeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cls}
                        {...props}
                      >
                        {children}
                      </a>
                    )
                  },
                }}
              >
                {getPreview(linkifyCitations(displayContent))}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    )
  }

  const baseSections = [
    {
      key: 'onboarding',
      title: 'User Onboarding',
      content: analysis_data.sections?.onboarding,
      evidence: analysis_data.evidence?.onboarding,
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    },
    {
      key: 'pricing',
      title: 'Pricing Strategy',
      content: analysis_data.sections?.pricing,
      evidence: analysis_data.evidence?.pricing,
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      key: 'valueProps',
      title: 'Value Propositions',
      content: analysis_data.sections?.valueProps,
      evidence: analysis_data.evidence?.valueProps,
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    },
    {
      key: 'competitive',
      title: 'Competitive Differentiation',
      content: analysis_data.sections?.competitive,
      evidence: analysis_data.evidence?.competitive,
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      key: 'actionPlan',
      title: 'Action Plan',
      content: analysis_data.sections?.actionPlan,
      evidence: analysis_data.evidence?.actionPlan,
      icon: (
        <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ]

  const deltaContent = analysis_data.sections?.deltaVsMyProduct
  const hasDelta = Boolean(deltaContent && deltaContent !== 'Analysis not available for this section.')

  const sections = [
    ...baseSections,
    ...(hasDelta ? [
      {
        key: 'deltaVsMyProduct',
        title: 'Delta vs My product',
        content: deltaContent,
        evidence: analysis_data.evidence?.deltaVsMyProduct,
        icon: (
          <svg className="w-6 h-6 text-zinc-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      }
    ] : [])
  ]

  const scrollToSection = (sectionKey) => {
    const element = document.getElementById(`section-${sectionKey}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const expandAll = () => {
    const newState = {}
    sections.forEach(section => {
      newState[section.key] = true
    })
    setExpandedSections(newState)
  }

  const collapseAll = () => {
    const newState = {}
    sections.forEach(section => {
      newState[section.key] = false
    })
    setExpandedSections(newState)
  }

  const extractKeyTakeaways = (sections) => {
    const takeaways = []
    
    // Extract first key point from each section
    Object.entries(sections || {}).forEach(([, content]) => {
      if (content && content !== 'Analysis not available for this section.') {
        const lines = content.split('\n').filter(line => line.trim())
        
        // Skip markdown headers (lines starting with #)
        const contentLines = lines.filter(line => !line.match(/^#{1,6}\s/))
        
        if (contentLines.length === 0) return
        
        // Look for bold text (markdown **text** or **text:**)
        const boldLineIndex = contentLines.findIndex(line => 
          line.includes('**') && (line.includes(':') || line.length < 150)
        )
        
        if (boldLineIndex !== -1) {
          const boldLine = contentLines[boldLineIndex]
          // Extract text between ** markers
          const boldMatch = boldLine.match(/\*\*([^*]+)\*\*/)
          if (boldMatch) {
            const boldText = boldMatch[1].trim().replace(/:\s*$/, '') // Remove trailing colon
            
            // Get the text after the bold part on the same line
            let afterBold = boldLine.split('**').slice(2).join('**').trim()
            
            // If no content on same line, check next line
            if (!afterBold || afterBold === ':') {
              const nextLine = contentLines[boldLineIndex + 1]
              if (nextLine && !nextLine.match(/^\*\*/) && nextLine.length > 10) {
                afterBold = nextLine.trim()
              }
            }
            
            // Clean up the afterBold text - remove leading colon, dashes, and other formatting
            afterBold = afterBold.replace(/^:\s*/, '').replace(/^[-–—]\s*/, '').trim()
            
            if (afterBold && afterBold.length > 5) {
              // Remove any leading dashes or bullets from the content
              afterBold = afterBold.replace(/^[-–—•*]\s*/, '').trim()
              takeaways.push(`${boldText}: ${afterBold.substring(0, 120)}${afterBold.length > 120 ? '...' : ''}`)
            } else {
              // If still no content, look for the next meaningful line
              const nextMeaningful = contentLines.slice(boldLineIndex + 1).find(line => 
                line.length > 20 && !line.match(/^\*\*/) && !line.match(/^[-•*]\s*/)
              )
              if (nextMeaningful) {
                // Remove dashes and bullets from the content
                const cleanedNext = nextMeaningful.replace(/^[-–—•*]\s*/, '').trim()
                takeaways.push(`${boldText}: ${cleanedNext.substring(0, 120)}${cleanedNext.length > 120 ? '...' : ''}`)
              } else {
                // Fallback: just use the bold text
                takeaways.push(boldText)
              }
            }
          } else {
            // No bold markers found, try to extract anyway
            const cleaned = boldLine.replace(/\*\*/g, '').trim()
            if (cleaned.length > 10) {
              takeaways.push(cleaned.substring(0, 150))
            }
          }
        } else {
          // Look for bullet points
          const bulletLine = contentLines.find(line => 
            line.match(/^[\s]*[-•*]\s+/) || line.match(/^[\s]*\d+\.\s+/)
          )
          if (bulletLine) {
            const cleaned = bulletLine.replace(/^[\s]*[-–—•*\d.]+\s+/, '').trim()
            if (cleaned.length > 10) {
              takeaways.push(cleaned.substring(0, 150) + (cleaned.length > 150 ? '...' : ''))
            }
          } else if (contentLines[0]) {
            // Get first meaningful line (skip empty or very short lines)
            const firstMeaningful = contentLines.find(line => line.length > 20 && !line.match(/^[\s]*$/))
            if (firstMeaningful) {
              const shortSummary = firstMeaningful.length > 150 ? firstMeaningful.substring(0, 150) + '...' : firstMeaningful
              takeaways.push(shortSummary)
            }
          }
        }
      }
    })
    
    return takeaways.slice(0, 3) // Top 3 insights
  }

  const getSummaryTakeaways = () => {
    const topTakeaways = analysis_data?.summary?.topTakeaways
    if (!Array.isArray(topTakeaways)) return []

    return topTakeaways
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 3)
  }

  const keyTakeaways = getSummaryTakeaways()
  const displayedTakeaways = keyTakeaways.length > 0
    ? keyTakeaways
    : extractKeyTakeaways(analysis_data.sections)

  const qualityWarnings = Array.isArray(analysis_data?.quality?.warnings)
    ? analysis_data.quality.warnings.filter(Boolean)
    : []
  const qualityGaps = Array.isArray(analysis_data?.quality?.evidenceGaps)
    ? analysis_data.quality.evidenceGaps.filter(Boolean)
    : []
  const hasQualityNotes = qualityWarnings.length > 0 || qualityGaps.length > 0
  const diagnostics = analysis_data?.diagnostics
  const focusPresetLabel = FOCUS_PRESET_LABELS[analysis?.focus_preset]
  const formatDuration = (ms) => {
    if (typeof ms !== 'number' || Number.isNaN(ms)) return null
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`
  }
  const markdownExport = buildAnalysisMarkdown(analysis)

  const copyMarkdown = () => {
    navigator.clipboard.writeText(markdownExport)
  }

  const exportMarkdown = () => {
    downloadMarkdown(markdownExport, getMarkdownFilename(analysis))
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="ptp-card p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h2 className="text-3xl font-bold text-gray-900">{product_name}</h2>
              {analysis?.my_product?.name && (
                <span className="ptp-pill bg-zinc-50 text-zinc-700 border-zinc-200/70">
                  Δ vs {analysis.my_product.name}
                </span>
              )}
            </div>
            {product_url && (
              <a 
                href={product_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                {product_url}
              </a>
            )}
          </div>
          <button
            onClick={onNewAnalysis}
            className="ptp-btn-secondary"
          >
            New Analysis
          </button>
        </div>
        
        {(focusPresetLabel || user_goals) && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Analysis Focus:</h4>
            <div className="text-gray-700 text-sm bg-gray-50 p-3 rounded space-y-1">
              {focusPresetLabel && (
                <p><span className="font-medium">Preset:</span> {focusPresetLabel}</p>
              )}
              {user_goals && (
                <p>{user_goals}</p>
              )}
            </div>
          </div>
        )}
        
        <p className="text-sm text-gray-500">
          Generated on {formatDate(created_at)} using {analysis_data?.model || ai_provider || 'AI model'}
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
          <span className="ptp-pill bg-zinc-50 text-zinc-700 border-zinc-200/70">
            Provider: {diagnostics?.provider || ai_provider || 'unknown'}
          </span>
          {(diagnostics?.model || analysis_data?.model) && (
            <span className="ptp-pill bg-zinc-50 text-zinc-700 border-zinc-200/70">
              Model: {diagnostics?.model || analysis_data.model}
            </span>
          )}
          {typeof diagnostics?.generationTimeMs === 'number' && (
            <span className="ptp-pill bg-zinc-50 text-zinc-700 border-zinc-200/70">
              Generation: {formatDuration(diagnostics.generationTimeMs)}
            </span>
          )}
          {typeof diagnostics?.sourceCount === 'number' && (
            <span className="ptp-pill bg-zinc-50 text-zinc-700 border-zinc-200/70">
              Sources: {diagnostics.sourceCount}
            </span>
          )}
          {typeof diagnostics?.retryCount === 'number' && (
            <span className={`ptp-pill ${diagnostics.retryCount > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-zinc-50 text-zinc-700 border-zinc-200/70'}`}>
              Retries: {diagnostics.retryCount}
            </span>
          )}
          {typeof diagnostics?.qualityPassed === 'boolean' && (
            <span className={`ptp-pill ${diagnostics.qualityPassed ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
              Quality: {diagnostics.qualityPassed ? 'passed' : 'review'}
            </span>
          )}
        </div>

        {analysis_data?.evidence?.overall && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-700 font-medium">Evidence</span>
              <EvidenceBadge
                basis={analysis_data.evidence.overall.basis}
                confidence={analysis_data.evidence.overall.confidence}
              />
              {Array.isArray(analysis_data?.sources) && (
                <span className="text-sm text-gray-600">
                  {analysis_data.sources.length} source{analysis_data.sources.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {Array.isArray(analysis_data?.evidence?.overall?.limitations) && analysis_data.evidence.overall.limitations.length > 0 && (
              <details className="text-sm text-gray-600">
                <summary className="cursor-pointer hover:text-gray-900">
                  View evidence limitations
                </summary>
                <ul className="mt-2 list-disc ml-6 space-y-1">
                  {analysis_data.evidence.overall.limitations.slice(0, 8).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </details>
            )}
            {hasQualityNotes && (
              <details className="text-sm text-gray-600">
                <summary className="cursor-pointer hover:text-gray-900">
                  View quality notes
                </summary>
                <div className="mt-2 space-y-3">
                  {qualityGaps.length > 0 && (
                    <div>
                      <div className="font-medium text-gray-800">Evidence gaps</div>
                      <ul className="mt-1 list-disc ml-6 space-y-1">
                        {qualityGaps.slice(0, 8).map((item, idx) => (
                          <li key={`gap-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {qualityWarnings.length > 0 && (
                    <div>
                      <div className="font-medium text-gray-800">Quality warnings</div>
                      <ul className="mt-1 list-disc ml-6 space-y-1">
                        {qualityWarnings.slice(0, 8).map((item, idx) => (
                          <li key={`warning-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Evidence Sources */}
      {(Array.isArray(analysis_data?.sources) && analysis_data.sources.length > 0) && (
        <div className="ptp-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sources</h3>
            <span className="text-xs text-gray-500 font-medium">
              {analysis_data.sources.length} source{analysis_data.sources.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-4">
            {analysis_data.sources.map((src) => (
              <div
                id={`source-${src.id}`}
                key={src.id}
                className={`rounded-lg p-4 border transition-colors scroll-mt-24 ${
                  highlightedSourceId === src.id
                    ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-200'
                    : 'bg-zinc-50 border-zinc-200/70'
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-800">
                      {src.id}
                    </span>
                    {src.type && (
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {src.type}
                      </span>
                    )}
                  </div>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-700 hover:text-emerald-800 underline break-all"
                    >
                      {src.url}
                    </a>
                  )}
                </div>

                {src.title && (
                  <div className="mt-2 text-sm font-medium text-gray-900">
                    {src.title}
                  </div>
                )}

                {src.snippet && (
                  <div className="mt-2 text-sm text-gray-700 leading-relaxed">
                    {src.snippet}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Takeaways Summary */}
      <div className="bg-emerald-50/50 rounded-ptp border border-emerald-200/60 p-6 mb-6 shadow-ptp-sm">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-emerald-700 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
        </div>
        
        <div className="space-y-3">
          {displayedTakeaways.map((takeaway, index) => (
            <div key={index} className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                {index + 1}
              </div>
              <p className="text-gray-700 leading-relaxed">{takeaway}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Overview */}
      <div className="ptp-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Analysis Overview</h3>
          <div className="flex space-x-2">
            <button
              onClick={expandAll}
              className="px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors border border-emerald-200/60"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors border border-zinc-200/70"
            >
              Collapse All
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map((section) => (
            <button
              key={section.key}
              onClick={() => scrollToSection(section.key)}
              className="flex items-center p-3 text-left bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors group border border-zinc-200/70"
            >
              <div className="flex-shrink-0 mr-3 opacity-70 group-hover:opacity-100">
                {section.icon}
              </div>
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">
                  {section.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {section.content ? 'Click to jump to section' : 'No data available'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Sections */}
      <div className="space-y-1">
        {sections.map((section) => (
          <div key={section.key} id={`section-${section.key}`}>
            <AnalysisSection
              title={section.title}
              content={section.content}
              icon={section.icon}
              sectionKey={section.key}
              evidence={section.evidence}
            />
          </div>
        ))}
      </div>

      {/* Action Items & Next Steps */}
      {/* Action Plan is now generated by the model and rendered as a first-class section above. */}

      {/* Action Buttons */}
      <div className="ptp-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={copyMarkdown}
            className="ptp-btn-secondary px-6 py-2 flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Markdown
          </button>
          
          <button
            onClick={onNewAnalysis}
            className="ptp-btn-primary px-6 py-2 flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Analyze Competitor
          </button>
          
          <button
            onClick={exportMarkdown}
            className="ptp-btn-secondary px-6 py-2 flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 7H7a2 2 0 01-2-2V6a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2z" />
            </svg>
            Export Markdown
          </button>
        </div>
      </div>

      <FeedbackWidget analysis={analysis} />

      {/* Raw Analysis (for debugging/fallback) */}
      {analysis_data.rawAnalysis && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Full Raw Analysis
            </summary>
            <div className="mt-4 text-sm text-gray-600 border-t pt-4 prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({...props}) => <h2 className="text-lg font-semibold text-gray-900 mt-4 mb-3" {...props} />,
                  h3: ({...props}) => <h3 className="text-base font-semibold text-gray-900 mt-3 mb-2" {...props} />,
                  p: ({...props}) => <p className="text-gray-600 mb-2 leading-relaxed" {...props} />,
                  strong: ({...props}) => <strong className="font-semibold text-gray-700" {...props} />,
                  em: ({...props}) => <em className="italic" {...props} />,
                  ul: ({...props}) => <ul className="list-disc ml-4 space-y-1 mb-3" {...props} />,
                  ol: ({...props}) => <ol className="list-decimal ml-4 space-y-1 mb-3" {...props} />,
                  li: ({...props}) => <li className="text-gray-600" {...props} />,
                }}
              >
                {analysis_data.rawAnalysis}
              </ReactMarkdown>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
