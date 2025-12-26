import { useMemo, useState } from 'react'

const FEEDBACK_STORAGE_KEY = 'ptp_feedback_v1'
const FEEDBACK_LIMIT = 200

function generateId() {
  return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function readLocalFeedback() {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalFeedback(items) {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export default function FeedbackWidget({ analysis }) {
  const [rating, setRating] = useState(null) // up | down | null
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const evidenceBasis = analysis?.analysis_data?.evidence?.overall?.basis
  const evidenceConfidence = analysis?.analysis_data?.evidence?.overall?.confidence
  const sourceCount = Array.isArray(analysis?.analysis_data?.sources) ? analysis.analysis_data.sources.length : 0

  const helperText = useMemo(() => {
    if (!rating) return 'Your feedback helps improve prompt quality and sourcing.'
    if (rating === 'up') return 'Optional: what was most useful?'
    return 'What was wrong or missing? (Recommended)'
  }, [rating])

  const submitFeedback = async () => {
    setError(null)

    if (!analysis?.id || !analysis?.product_name) {
      setError('Missing analysis context.')
      return
    }
    if (!rating) {
      setError('Please choose a rating.')
      return
    }

    const trimmed = comment.trim()
    if (rating === 'down' && trimmed.length > 0 && trimmed.length < 5) {
      setError('Please add a bit more detail (at least 5 characters).')
      return
    }

    const payload = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      analysisId: analysis.id,
      productName: analysis.product_name,
      rating,
      comment: trimmed,
      context: {
        productUrl: analysis.product_url,
        aiProvider: analysis.ai_provider,
        evidenceBasis,
        evidenceConfidence,
        sourceCount,
      }
    }

    setSubmitting(true)
    try {
      const existing = readLocalFeedback()
      const next = [payload, ...existing].slice(0, FEEDBACK_LIMIT)
      writeLocalFeedback(next)

      // Best-effort send to backend (no UI blocking if it fails)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      try {
        await fetch(`${apiUrl}/api/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisId: payload.analysisId,
            productName: payload.productName,
            rating: payload.rating,
            comment: payload.comment,
            context: payload.context,
          })
        })
      } catch {
        // ignore network errors
      }

      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="ptp-card p-6 mb-6 border border-emerald-200/60 bg-emerald-50/30">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-800 font-semibold">✓</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Thanks for the feedback</h3>
            <p className="text-sm text-gray-600 mt-1">
              We’ll use it to improve sourcing, accuracy, and output consistency.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ptp-card p-6 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Feedback</h3>
          <p className="text-sm text-gray-600 mt-1">{helperText}</p>
        </div>
        {evidenceBasis && (
          <div className="text-xs text-gray-500">
            Evidence: <span className="font-medium">{String(evidenceBasis).toUpperCase()}</span>
            {typeof evidenceConfidence === 'number' && !Number.isNaN(evidenceConfidence) && (
              <span> • {Math.round(evidenceConfidence * 100)}%</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setRating('up')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            rating === 'up'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Helpful
        </button>
        <button
          type="button"
          onClick={() => setRating('down')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            rating === 'down'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Needs work
        </button>
      </div>

      {rating && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {rating === 'down' ? 'What was wrong?' : 'Optional note'}
          </label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={rating === 'down'
              ? 'E.g., pricing tiers are wrong; onboarding steps missing; needs citations…'
              : 'E.g., the pricing comparison was especially useful…'
            }
            className="ptp-textarea"
            disabled={submitting}
          />
        </div>
      )}

      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={submitFeedback}
          disabled={submitting}
          className="ptp-btn-primary"
        >
          {submitting ? 'Submitting…' : 'Submit feedback'}
        </button>
        <button
          type="button"
          onClick={() => {
            setRating(null)
            setComment('')
            setError(null)
          }}
          className="text-sm text-gray-600 hover:text-gray-900"
          disabled={submitting}
        >
          Reset
        </button>
      </div>
    </div>
  )
}


