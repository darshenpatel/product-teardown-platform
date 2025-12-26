import { useEffect, useState } from 'react'
import ProductInputForm from './components/ProductInputForm'
import AnalysisDisplay from './components/AnalysisDisplay'
import LoadingState from './components/LoadingState'
import AnalysisHistory from './components/AnalysisHistory'
import AnalysisCompare from './components/AnalysisCompare'
import CommandPalette from './components/CommandPalette'
import './App.css'

const HISTORY_STORAGE_KEY = 'ptp_analysis_history_v1'
const HISTORY_LIMIT = 20

function App() {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState('new') // new | history | compare
  const [history, setHistory] = useState([])
  const [compareAnalyses, setCompareAnalyses] = useState([])
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setHistory(parsed)
      }
    } catch (err) {
      console.warn('Failed to load history:', err)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = (e.key || '').toLowerCase()
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && key === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const persistHistory = (updater) => {
    setHistory((prev) => {
      const next = updater(prev)
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next))
      } catch (err) {
        console.warn('Failed to persist history:', err)
      }
      return next
    })
  }

  const handleAnalysisSubmit = async (productData) => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      // Clean up empty fields (recursively) before sending
      const cleanValue = (value) => {
        if (Array.isArray(value)) {
          return value
            .map(cleanValue)
            .filter(v => v !== '' && v !== null && v !== undefined)
        }

        if (value && typeof value === 'object') {
          const entries = Object.entries(value)
            .map(([k, v]) => [k, cleanValue(v)])
            .filter(([_, v]) => {
              if (v === '' || v === null || v === undefined) return false
              if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false
              return true
            })
          return Object.fromEntries(entries)
        }

        return value
      }

      const cleanedData = cleanValue(productData)

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Analysis failed')
      }

      const result = await response.json()
      const analysisData = result.data
      setAnalysis(analysisData)
      setView('new') // keep consistent navigation; analysis is shown when present

      // Save to local history for later comparison
      if (analysisData?.id) {
        persistHistory((prev) => {
          const deduped = prev.filter(item => item.id !== analysisData.id)
          return [analysisData, ...deduped].slice(0, HISTORY_LIMIT)
        })
      }
    } catch (err) {
      setError(err.message)
      console.error('Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNewAnalysis = () => {
    setAnalysis(null)
    setError(null)
    setView('new')
    setCompareAnalyses([])
  }

  const handleViewHistory = () => {
    setError(null)
    setView('history')
  }

  const handleOpenFromHistory = (item) => {
    setError(null)
    setCompareAnalyses([])
    setAnalysis(item)
    setView('new')
  }

  const handleUpdateAnalysis = (updated) => {
    setAnalysis(updated)
    if (updated?.id) {
      persistHistory((prev) => {
        const hasExisting = prev.some(item => item.id === updated.id)
        if (!hasExisting) return [updated, ...prev].slice(0, HISTORY_LIMIT)
        return prev.map(item => item.id === updated.id ? updated : item)
      })
    }
  }

  const handleDeleteFromHistory = (id) => {
    persistHistory((prev) => prev.filter(item => item.id !== id))
  }

  const handleClearHistory = () => {
    persistHistory(() => [])
  }

  const handleCompare = (selectedAnalyses) => {
    setCompareAnalyses(selectedAnalyses)
    setView('compare')
  }

  const paletteActions = [
    {
      id: 'new-analysis',
      label: 'New teardown',
      hint: 'Start a new competitor teardown',
      run: handleNewAnalysis,
    },
    {
      id: 'open-library',
      label: 'Open library',
      hint: 'Browse saved teardowns',
      run: handleViewHistory,
    },
    ...(history || []).slice(0, 8).map((item) => ({
      id: `open-${item.id}`,
      label: `Open: ${item.product_name}`,
      hint: item.product_url || '',
      run: () => handleOpenFromHistory(item),
    })),
  ]

  return (
    <div className="ptp-page">
      <div className="ptp-shell">
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          actions={paletteActions}
        />

        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
              Product Teardown Platform
            </h1>
            <p className="mt-2 text-sm sm:text-base text-zinc-600">
              AI-powered competitive analysis to understand market positioning and product strategies.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Tip: Press <span className="ptp-kbd">⌘K</span> (or <span className="ptp-kbd">Ctrl+K</span>) to open the command palette.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleNewAnalysis} className="ptp-btn-primary">
              New Analysis
            </button>
            <button onClick={handleViewHistory} className="ptp-btn-secondary">
              Library {history.length > 0 ? `(${history.length})` : ''}
            </button>
          </div>
        </header>

        {loading ? (
          <LoadingState />
        ) : view === 'compare' ? (
          <AnalysisCompare
            analyses={compareAnalyses}
            onBack={() => setView('history')}
          />
        ) : view === 'history' ? (
          <AnalysisHistory
            history={history}
            onOpen={handleOpenFromHistory}
            onDelete={handleDeleteFromHistory}
            onCompare={handleCompare}
            onNewAnalysis={handleNewAnalysis}
            onClearAll={handleClearHistory}
          />
        ) : analysis ? (
          <AnalysisDisplay 
            analysis={analysis} 
            onNewAnalysis={handleNewAnalysis}
            onUpdateAnalysis={handleUpdateAnalysis}
          />
        ) : (
          <ProductInputForm 
            onSubmit={handleAnalysisSubmit}
            error={error}
          />
        )}
      </div>
    </div>
  )
}

export default App
