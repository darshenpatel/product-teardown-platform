const MISSING_SECTION_TEXT = 'Analysis not available for this section.'

const SECTION_TITLES = {
  onboarding: 'User Onboarding',
  pricing: 'Pricing Strategy',
  valueProps: 'Value Propositions',
  competitive: 'Competitive Differentiation',
  actionPlan: 'Action Plan',
  deltaVsMyProduct: 'Delta vs My product',
}

const SECTION_ORDER = Object.keys(SECTION_TITLES)

function cleanText(value) {
  return String(value ?? '').trim()
}

function titleForSection(key) {
  return SECTION_TITLES[key] || key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getSections(analysis) {
  const sections = analysis?.analysis_data?.sections || {}
  const orderedKeys = [
    ...SECTION_ORDER,
    ...Object.keys(sections).filter((key) => !SECTION_ORDER.includes(key)),
  ]

  return orderedKeys
    .map((key) => ({
      key,
      title: titleForSection(key),
      content: cleanText(sections[key]),
    }))
    .filter((section) => section.content && section.content !== MISSING_SECTION_TEXT)
}

export function extractKeyTakeaways(sections) {
  const takeaways = []

  Object.entries(sections || {}).forEach(([, content]) => {
    const text = cleanText(content)
    if (!text || text === MISSING_SECTION_TEXT) return

    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
    const contentLines = lines.filter((line) => !line.match(/^#{1,6}\s/))
    if (contentLines.length === 0) return

    const boldLineIndex = contentLines.findIndex((line) =>
      line.includes('**') && (line.includes(':') || line.length < 150)
    )

    if (boldLineIndex !== -1) {
      const boldLine = contentLines[boldLineIndex]
      const boldMatch = boldLine.match(/\*\*([^*]+)\*\*/)

      if (boldMatch) {
        const boldText = boldMatch[1].trim().replace(/:\s*$/, '')
        let afterBold = boldLine.split('**').slice(2).join('**').trim()

        if (!afterBold || afterBold === ':') {
          const nextLine = contentLines[boldLineIndex + 1]
          if (nextLine && !nextLine.match(/^\*\*/) && nextLine.length > 10) {
            afterBold = nextLine.trim()
          }
        }

        afterBold = afterBold.replace(/^:\s*/, '').replace(/^[-\u2013\u2014]\s*/, '').trim()

        if (afterBold && afterBold.length > 5) {
          afterBold = afterBold.replace(/^[-\u2013\u2014\u2022*]\s*/, '').trim()
          takeaways.push(`${boldText}: ${afterBold.substring(0, 120)}${afterBold.length > 120 ? '...' : ''}`)
        } else {
          const nextMeaningful = contentLines.slice(boldLineIndex + 1).find((line) =>
            line.length > 20 && !line.match(/^\*\*/) && !line.match(/^[-•*]\s*/)
          )
          if (nextMeaningful) {
            const cleanedNext = nextMeaningful.replace(/^[-\u2013\u2014\u2022*]\s*/, '').trim()
            takeaways.push(`${boldText}: ${cleanedNext.substring(0, 120)}${cleanedNext.length > 120 ? '...' : ''}`)
          } else {
            takeaways.push(boldText)
          }
        }
      } else {
        const cleaned = boldLine.replace(/\*\*/g, '').trim()
        if (cleaned.length > 10) takeaways.push(cleaned.substring(0, 150))
      }
    } else {
      const bulletLine = contentLines.find((line) =>
        line.match(/^[\s]*[-•*]\s+/) || line.match(/^[\s]*\d+\.\s+/)
      )

      if (bulletLine) {
        const cleaned = bulletLine.replace(/^[\s]*[-\u2013\u2014\u2022*\d.]+\s+/, '').trim()
        if (cleaned.length > 10) {
          takeaways.push(cleaned.substring(0, 150) + (cleaned.length > 150 ? '...' : ''))
        }
      } else {
        const firstMeaningful = contentLines.find((line) => line.length > 20)
        if (firstMeaningful) {
          takeaways.push(firstMeaningful.length > 150 ? `${firstMeaningful.substring(0, 150)}...` : firstMeaningful)
        }
      }
    }
  })

  return takeaways.slice(0, 3)
}

export function getMarkdownTakeaways(analysis) {
  const topTakeaways = analysis?.analysis_data?.summary?.topTakeaways
  if (Array.isArray(topTakeaways)) {
    const summaryTakeaways = topTakeaways
      .map((item) => cleanText(item))
      .filter(Boolean)
      .slice(0, 3)

    if (summaryTakeaways.length > 0) return summaryTakeaways
  }

  return extractKeyTakeaways(analysis?.analysis_data?.sections)
}

function formatDate(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function formatSource(source, index) {
  const id = cleanText(source?.id) || `src_${index + 1}`
  const details = [
    source?.title ? `**Title:** ${cleanText(source.title)}` : null,
    source?.type ? `**Type:** ${cleanText(source.type)}` : null,
    source?.url ? `**URL:** ${cleanText(source.url)}` : null,
    source?.snippet ? `**Snippet:** ${cleanText(source.snippet)}` : null,
  ].filter(Boolean)

  if (details.length === 0) return `- [${id}]`
  return `- [${id}]\n  ${details.join('\n  ')}`
}

export function buildAnalysisMarkdown(analysis) {
  const analysisData = analysis?.analysis_data || {}
  const productName = cleanText(analysis?.product_name) || 'Product'
  const productUrl = cleanText(analysis?.product_url)
  const focus = cleanText(analysis?.user_goals)
  const generatedAt = formatDate(analysis?.created_at || analysisData.generatedAt)
  const model = cleanText(analysisData.model || analysis?.ai_provider || 'AI model')
  const takeaways = getMarkdownTakeaways(analysis)
  const sections = getSections(analysis)
  const sources = Array.isArray(analysisData.sources) ? analysisData.sources : []

  const lines = [`# ${productName} Analysis`, '']

  if (productUrl) lines.push(`**Product URL:** ${productUrl}`)
  if (focus) lines.push(`**Analysis Focus:** ${focus}`)
  if (generatedAt) lines.push(`**Generated:** ${generatedAt}`)
  lines.push(`**Model:** ${model}`)
  lines.push('')

  if (takeaways.length > 0) {
    lines.push('## Key Insights', '')
    takeaways.forEach((takeaway, index) => {
      lines.push(`${index + 1}. ${takeaway}`)
    })
    lines.push('')
  }

  sections.forEach((section) => {
    lines.push(`## ${section.title}`, '', section.content, '')
  })

  if (sources.length > 0) {
    lines.push('## Sources', '')
    sources.forEach((source, index) => {
      lines.push(formatSource(source, index), '')
    })
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

export function getMarkdownFilename(analysis) {
  const productName = cleanText(analysis?.product_name) || 'analysis'
  const slug = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80) || 'analysis'

  return `${slug}-analysis.md`
}

export function downloadMarkdown(markdown, filename) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
