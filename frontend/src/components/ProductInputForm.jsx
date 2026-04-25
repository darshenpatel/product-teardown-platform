import { useEffect, useMemo, useState } from 'react'
import TurnstileWidget from './TurnstileWidget'

const LAST_AI_PROVIDER_KEY = 'ptp_last_ai_provider_v1'
const LAST_USER_GOALS_KEY = 'ptp_last_user_goals_v1'
const MY_PRODUCT_KEY = 'ptp_my_product_v1'

function normalizeUrl(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function isProbablyUrl(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return false
  if (/^https?:\/\//i.test(trimmed)) return true
  if (/\s/.test(trimmed)) return false
  return trimmed.includes('.')
}

function deriveNameFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '')
    const parts = hostname.split('.').filter(Boolean)
    if (parts.length === 0) return ''
    const main = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
    return main ? main.charAt(0).toUpperCase() + main.slice(1) : ''
  } catch {
    return ''
  }
}

function parseProductQuery(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return { productName: '', productUrl: '' }

  if (isProbablyUrl(trimmed)) {
    const url = normalizeUrl(trimmed)
    return { productName: deriveNameFromUrl(url) || '', productUrl: url }
  }

  return { productName: trimmed, productUrl: '' }
}

export default function ProductInputForm({ onSubmit, error }) {
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  const [query, setQuery] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [overrideName, setOverrideName] = useState('')
  const [overrideUrl, setOverrideUrl] = useState('')
  const [userGoals, setUserGoals] = useState('')
  const [aiProvider, setAiProvider] = useState('openai')
  const [compareToMyProduct, setCompareToMyProduct] = useState(false)
  const [myProduct, setMyProduct] = useState(null)
  const [editingMyProduct, setEditingMyProduct] = useState(false)
  const [myProductDraft, setMyProductDraft] = useState({ name: '', url: '', notes: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0)

  useEffect(() => {
    try {
      const savedProvider = localStorage.getItem(LAST_AI_PROVIDER_KEY)
      if (savedProvider === 'openai' || savedProvider === 'anthropic') {
        setAiProvider(savedProvider)
      }
    } catch {
      // ignore
    }

    try {
      const savedGoals = localStorage.getItem(LAST_USER_GOALS_KEY)
      if (typeof savedGoals === 'string' && savedGoals.trim()) {
        setUserGoals(savedGoals)
      }
    } catch {
      // ignore
    }

    try {
      const raw = localStorage.getItem(MY_PRODUCT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.name === 'string' && parsed.name.trim()) {
          setMyProduct({
            name: parsed.name.trim(),
            url: typeof parsed.url === 'string' ? parsed.url.trim() : '',
            notes: typeof parsed.notes === 'string' ? parsed.notes.trim() : ''
          })
        }
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LAST_AI_PROVIDER_KEY, aiProvider)
    } catch {
      // ignore
    }
  }, [aiProvider])

  const parsed = useMemo(() => parseProductQuery(query), [query])

  const effectiveProductName = (overrideName || parsed.productName).trim()
  const effectiveProductUrl = (overrideUrl || parsed.productUrl).trim()

  const detectedHostname = useMemo(() => {
    if (!effectiveProductUrl) return ''
    try {
      return new URL(effectiveProductUrl).hostname.replace(/^www\./i, '')
    } catch {
      return ''
    }
  }, [effectiveProductUrl])

  const hasQuery = query.trim().length > 0
  const detectedType = hasQuery ? (parsed.productUrl ? 'url' : 'name') : null

  const submit = async (e) => {
    e.preventDefault()
    setValidationError(null)

    const productName = effectiveProductName
    const productUrl = effectiveProductUrl

    const myProductPayload = (() => {
      if (!compareToMyProduct) return undefined
      if (!myProduct?.name) return null
      return {
        name: myProduct.name,
        url: myProduct.url || undefined,
        notes: myProduct.notes || undefined,
      }
    })()

    if (!productName) {
      setValidationError('Enter a product name or paste a URL.')
      return
    }
    if (productName.length > 200) {
      setValidationError('Product name must be less than 200 characters.')
      return
    }
    if (userGoals.trim().length > 1000) {
      setValidationError('Goals must be less than 1000 characters.')
      return
    }
    if (productUrl) {
      try {
        // Validate URL shape early to avoid backend schema errors
        new URL(productUrl)
      } catch {
        setValidationError('Please enter a valid URL.')
        return
      }
    }

    if (compareToMyProduct) {
      if (!myProductPayload) {
        setValidationError('Set up “My product” to enable comparison.')
        return
      }
    }

    if (turnstileSiteKey && !turnstileToken) {
      setValidationError('Please complete the verification to continue.')
      return
    }

    setIsSubmitting(true)
    try {
      try {
        const goalsTrimmed = userGoals.trim()
        if (goalsTrimmed) {
          localStorage.setItem(LAST_USER_GOALS_KEY, goalsTrimmed)
        }
      } catch {
        // ignore
      }

      await onSubmit({
        productName,
        productUrl: productUrl || undefined,
        userGoals: userGoals.trim() || undefined,
        aiProvider,
        turnstileToken: turnstileToken || undefined,
        myProduct: myProductPayload || undefined,
      })

      // Reset the quick input for the next run (keep goals/provider as “template”)
      setQuery('')
      setOverrideName('')
      setOverrideUrl('')
    } finally {
      setIsSubmitting(false)
      // Turnstile tokens are single-use/short-lived; reset after each attempt.
      if (turnstileSiteKey) {
        setTurnstileToken(null)
        setTurnstileWidgetKey((v) => v + 1)
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="ptp-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Create a teardown
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Paste a product URL or type a product name. We’ll generate a structured teardown with evidence when available.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            className="text-sm text-zinc-600 hover:text-zinc-900 underline decoration-zinc-300 underline-offset-4"
            disabled={isSubmitting}
          >
            {showOptions ? 'Hide options' : 'Options'}
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5">
          {/* Omnibox */}
          <div>
            <label htmlFor="productQuery" className="block text-sm font-medium text-zinc-800 mb-2">
              Product
            </label>
            <input
              id="productQuery"
              value={query}
              onChange={(e) => {
                const next = e.target.value
                setQuery(next)
                setValidationError(null)
                // If the user changes the primary input, clear any overrides.
                setOverrideName('')
                setOverrideUrl('')
              }}
              placeholder="Paste URL or type product name…"
              className="ptp-input"
              disabled={isSubmitting}
              autoComplete="off"
              inputMode="url"
            />

            <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-zinc-500">
                Examples: <span className="font-medium text-zinc-600">Notion</span>,{' '}
                <span className="font-medium text-zinc-600">Linear</span>,{' '}
                <span className="font-medium text-zinc-600">ramp.com</span>
              </div>

              {detectedType && (
                <div className="flex items-center gap-2">
                  <span className={`ptp-pill ${detectedType === 'url' ? 'bg-zinc-50 text-zinc-700 border-zinc-200/70' : 'bg-zinc-50 text-zinc-700 border-zinc-200/70'}`}>
                    {detectedType === 'url' ? 'URL detected' : 'Name detected'}
                  </span>
                  {effectiveProductName && (
                    <span className="text-xs text-zinc-600">
                      → <span className="font-medium text-zinc-800">{effectiveProductName}</span>
                      {detectedHostname ? <span className="text-zinc-500"> ({detectedHostname})</span> : null}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          {showOptions && (
            <div className="ptp-card p-5 bg-zinc-50 border border-zinc-200/70">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label htmlFor="userGoals" className="block text-sm font-medium text-zinc-800 mb-2">
                    Focus (optional)
                  </label>
                  <textarea
                    id="userGoals"
                    value={userGoals}
                    onChange={(e) => setUserGoals(e.target.value)}
                    rows={3}
                    className="ptp-textarea"
                    placeholder="E.g., pricing strategy, onboarding flow, competitive positioning…"
                    disabled={isSubmitting}
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Tip: this is remembered as your last-used focus template.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className="block text-sm font-medium text-zinc-800">
                      AI provider
                    </label>
                    <span className="text-xs text-zinc-500">
                      OpenAI is typically faster; Claude may be more detailed.
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col sm:flex-row gap-3">
                    <label className="flex items-center gap-2 rounded-lg border border-zinc-200/70 bg-white px-3 py-2 text-sm text-zinc-800">
                      <input
                        type="radio"
                        name="aiProvider"
                        value="openai"
                        checked={aiProvider === 'openai'}
                        onChange={() => setAiProvider('openai')}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300"
                        disabled={isSubmitting}
                      />
                      OpenAI (GPT-4o)
                    </label>

                    <label className="flex items-center gap-2 rounded-lg border border-zinc-200/70 bg-white px-3 py-2 text-sm text-zinc-800">
                      <input
                        type="radio"
                        name="aiProvider"
                        value="anthropic"
                        checked={aiProvider === 'anthropic'}
                        onChange={() => setAiProvider('anthropic')}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300"
                        disabled={isSubmitting}
                      />
                      Anthropic (Claude Sonnet 4)
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="overrideName" className="block text-sm font-medium text-zinc-800 mb-2">
                      Product name override (optional)
                    </label>
                    <input
                      id="overrideName"
                      value={overrideName}
                      onChange={(e) => setOverrideName(e.target.value)}
                      placeholder={parsed.productName ? `Auto: ${parsed.productName}` : 'Auto-detected'}
                      className="ptp-input"
                      disabled={isSubmitting}
                    />
                    <p className="mt-2 text-xs text-zinc-500">
                      Leave blank to use the detected value.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="overrideUrl" className="block text-sm font-medium text-zinc-800 mb-2">
                      Product URL override (optional)
                    </label>
                    <input
                      id="overrideUrl"
                      value={overrideUrl}
                      onChange={(e) => setOverrideUrl(e.target.value)}
                      placeholder={parsed.productUrl ? `Auto: ${parsed.productUrl}` : 'Optional'}
                      className="ptp-input"
                      disabled={isSubmitting}
                    />
                    <p className="mt-2 text-xs text-zinc-500">
                      Adding a URL usually improves evidence and citations.
                    </p>
                  </div>
                </div>

                {/* My product baseline */}
                <div className="pt-2 border-t border-zinc-200/70">
                  <div className="flex items-start justify-between gap-4 flex-wrap pt-5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-800">
                        Compare to My product (optional)
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        If enabled, we’ll generate explicit deltas and recommendations vs your baseline.
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={compareToMyProduct}
                        onChange={(e) => {
                          setCompareToMyProduct(e.target.checked)
                          setValidationError(null)
                          if (!e.target.checked) setEditingMyProduct(false)
                        }}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300 rounded"
                        disabled={isSubmitting}
                      />
                      Enable
                    </label>
                  </div>

                  {compareToMyProduct && (
                    <div className="mt-4">
                      {myProduct && !editingMyProduct ? (
                        <div className="rounded-lg border border-zinc-200/70 bg-white p-4 flex items-start justify-between gap-4 flex-wrap">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-900">
                              {myProduct.name}
                            </div>
                            {myProduct.url && (
                              <div className="mt-1 text-xs text-zinc-600 break-all">
                                {myProduct.url}
                              </div>
                            )}
                            {myProduct.notes && (
                              <div className="mt-2 text-xs text-zinc-600">
                                {myProduct.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="ptp-btn-secondary px-3 py-1.5"
                              onClick={() => {
                                setEditingMyProduct(true)
                                setMyProductDraft({
                                  name: myProduct.name || '',
                                  url: myProduct.url || '',
                                  notes: myProduct.notes || '',
                                })
                              }}
                              disabled={isSubmitting}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ptp-btn-danger px-3 py-1.5"
                              onClick={() => {
                                try {
                                  localStorage.removeItem(MY_PRODUCT_KEY)
                                } catch {
                                  // ignore
                                }
                                setMyProduct(null)
                                setCompareToMyProduct(false)
                                setEditingMyProduct(false)
                              }}
                              disabled={isSubmitting}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-zinc-200/70 bg-white p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-zinc-800 mb-2">
                                My product name *
                              </label>
                              <input
                                value={myProductDraft.name}
                                onChange={(e) => setMyProductDraft(prev => ({ ...prev, name: e.target.value }))}
                                className="ptp-input"
                                placeholder="E.g., Acme"
                                disabled={isSubmitting}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-zinc-800 mb-2">
                                My product URL (optional)
                              </label>
                              <input
                                value={myProductDraft.url}
                                onChange={(e) => setMyProductDraft(prev => ({ ...prev, url: e.target.value }))}
                                className="ptp-input"
                                placeholder="https://yourproduct.com"
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="block text-sm font-medium text-zinc-800 mb-2">
                              Notes (optional)
                            </label>
                            <textarea
                              value={myProductDraft.notes}
                              onChange={(e) => setMyProductDraft(prev => ({ ...prev, notes: e.target.value }))}
                              className="ptp-textarea"
                              rows={3}
                              placeholder="E.g., pricing model, ICP, onboarding notes…"
                              disabled={isSubmitting}
                            />
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                            <div className="text-xs text-zinc-500">
                              Saved locally in your browser.
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="ptp-btn-secondary px-3 py-1.5"
                                onClick={() => {
                                  setEditingMyProduct(false)
                                  setMyProductDraft({ name: '', url: '', notes: '' })
                                  if (!myProduct) setCompareToMyProduct(false)
                                }}
                                disabled={isSubmitting}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="ptp-btn-primary px-3 py-1.5"
                                onClick={() => {
                                  const name = myProductDraft.name.trim()
                                  if (!name) {
                                    setValidationError('My product name is required.')
                                    return
                                  }
                                  if (name.length > 200) {
                                    setValidationError('My product name must be less than 200 characters.')
                                    return
                                  }

                                  const rawUrl = myProductDraft.url.trim()
                                  const url = rawUrl ? normalizeUrl(rawUrl) : ''
                                  if (url) {
                                    try {
                                      new URL(url)
                                    } catch {
                                      setValidationError('My product URL must be a valid URL.')
                                      return
                                    }
                                  }

                                  const notes = myProductDraft.notes.trim()
                                  if (notes.length > 2000) {
                                    setValidationError('My product notes must be less than 2000 characters.')
                                    return
                                  }

                                  const saved = { name, url, notes }
                                  try {
                                    localStorage.setItem(MY_PRODUCT_KEY, JSON.stringify(saved))
                                  } catch {
                                    // ignore
                                  }
                                  setMyProduct(saved)
                                  setEditingMyProduct(false)
                                  setValidationError(null)
                                }}
                                disabled={isSubmitting}
                              >
                                Save My product
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {(validationError || error) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Unable to run teardown</h3>
                  <div className="mt-1 text-sm text-red-700">
                    <p>{validationError || error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {turnstileSiteKey && (
            <div className="ptp-card p-4 bg-zinc-50 border border-zinc-200/70">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-medium text-zinc-800">
                    Verification
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Helps prevent automated abuse of the analysis API.
                  </div>
                </div>
                {turnstileToken ? (
                  <span className="ptp-pill bg-emerald-50 text-emerald-800 border-emerald-200">
                    Verified
                  </span>
                ) : (
                  <span className="ptp-pill bg-zinc-50 text-zinc-700 border-zinc-200/70">
                    Required
                  </span>
                )}
              </div>

              <div className="mt-3">
                <TurnstileWidget
                  key={turnstileWidgetKey}
                  siteKey={turnstileSiteKey}
                  onToken={(token) => {
                    setTurnstileToken(token)
                    setValidationError(null)
                  }}
                  onError={(message) => {
                    setTurnstileToken(null)
                    if (message) setValidationError(message)
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full ptp-btn-primary py-3"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 016.293-7.707l.707.707A7 7 0 005.707 12H4z"></path>
                </svg>
                Analyzing…
              </>
            ) : (
              'Generate teardown'
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-zinc-500">
              Typical runtime: 15–45 seconds (depending on evidence and provider).
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
