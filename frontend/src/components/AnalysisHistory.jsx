import { useMemo, useState } from 'react'

function formatDate(dateString) {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

function EvidencePill({ basis }) {
  if (!basis) return null
  const normalized = String(basis).toLowerCase()

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  )
}

export default function AnalysisHistory({
  history,
  onOpen,
  onDelete,
  onCompare,
  onNewAnalysis,
  onClearAll
}) {
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return history
    return (history || []).filter(item => {
      const name = (item.product_name || '').toLowerCase()
      const url = (item.product_url || '').toLowerCase()
      return name.includes(q) || url.includes(q)
    })
  }, [history, query])

  const selected = useMemo(() => {
    const selectedSet = new Set(selectedIds)
    return (history || []).filter(item => selectedSet.has(item.id))
  }, [history, selectedIds])

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const set = new Set(prev)
      if (set.has(id)) {
        set.delete(id)
        return Array.from(set)
      }
      if (set.size >= 3) return prev // max 3
      set.add(id)
      return Array.from(set)
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="ptp-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analysis History</h2>
            <p className="text-sm text-gray-600 mt-1">
              Saved to the backend when available and mirrored locally for fallback. Select 2–3 to compare.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onNewAnalysis}
              className="ptp-btn-primary"
            >
              New Analysis
            </button>
            <button
              onClick={onClearAll}
              className="ptp-btn-secondary"
              disabled={!history || history.length === 0}
            >
              Clear History
            </button>
          </div>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name or URL…"
          className="ptp-input"
        />
      </div>

      {selected.length >= 2 && (
        <div className="ptp-card p-4 mb-6 border border-emerald-200/60 bg-emerald-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-700">
              Comparing <span className="font-semibold">{selected.length}</span> analyses:
              <span className="ml-2 text-gray-600">
                {selected.map(a => a.product_name).join(' vs ')}
              </span>
            </div>
            <button
              onClick={() => onCompare(selected)}
              className="ptp-btn-primary"
            >
              Compare
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered && filtered.length > 0 ? (
          filtered.map((item) => {
            const basis = item.analysis_data?.evidence?.overall?.basis
            return (
              <div key={item.id} className="ptp-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {item.product_name}
                      </h3>
                      <EvidencePill basis={basis} />
                      {item?.my_product?.name && (
                        <span className="ptp-pill bg-zinc-50 text-zinc-700 border-zinc-200/70">
                          Δ vs {item.my_product.name}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      {formatDate(item.created_at)} • {item.ai_provider || 'openai'}
                    </div>

                    {item.product_url && (
                      <a
                        href={item.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {item.product_url}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      Compare
                    </label>
                    <button
                      onClick={() => onOpen(item)}
                      className="ptp-btn-secondary"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="ptp-btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="ptp-card p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900">No saved analyses yet</h3>
            <p className="text-sm text-gray-600 mt-2">
              Run an analysis to start building your comparison library.
            </p>
            <button
              onClick={onNewAnalysis}
              className="mt-4 ptp-btn-primary"
            >
              Create your first teardown
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

