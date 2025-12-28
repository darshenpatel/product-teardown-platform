import { useEffect, useRef, useState } from 'react'

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const TURNSTILE_SCRIPT_ID = 'ptp-turnstile-script'

let scriptPromise = null

function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Turnstile requires a browser environment'))
  if (window.turnstile) return Promise.resolve(window.turnstile)

  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID)
    if (existing) {
      // Script tag exists but may not be loaded yet.
      existing.addEventListener('load', () => resolve(window.turnstile))
      existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')))
      return
    }

    const script = document.createElement('script')
    script.id = TURNSTILE_SCRIPT_ID
    script.src = TURNSTILE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export default function TurnstileWidget({ siteKey, onToken, onError }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    if (!siteKey) {
      setLoading(false)
      return undefined
    }

    loadTurnstileScript()
      .then((turnstile) => {
        if (!mounted) return
        if (!containerRef.current) return

        // Clean up any previous widget (defensive)
        if (widgetIdRef.current && turnstile?.remove) {
          try { turnstile.remove(widgetIdRef.current) } catch { /* ignore */ }
          widgetIdRef.current = null
        }

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            onToken?.(token)
          },
          'expired-callback': () => {
            onToken?.(null)
          },
          'error-callback': () => {
            onToken?.(null)
            onError?.('Verification failed. Please retry.')
          }
        })

        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setLoading(false)
        onToken?.(null)
        onError?.(err?.message || 'Failed to load verification widget.')
      })

    return () => {
      mounted = false
      const turnstile = window.turnstile
      if (widgetIdRef.current && turnstile?.remove) {
        try { turnstile.remove(widgetIdRef.current) } catch { /* ignore */ }
      }
      widgetIdRef.current = null
    }
  }, [siteKey, onError, onToken])

  return (
    <div>
      <div ref={containerRef} />
      {loading && (
        <div className="mt-2 text-xs text-zinc-500">
          Loading verification…
        </div>
      )}
    </div>
  )
}


