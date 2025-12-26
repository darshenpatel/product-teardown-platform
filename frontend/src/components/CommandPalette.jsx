import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import { useEffect, useMemo, useState } from 'react'

export default function CommandPalette({ open, onClose, actions }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions || []
    return (actions || []).filter(a => {
      const label = String(a.label || '').toLowerCase()
      const hint = String(a.hint || '').toLowerCase()
      return label.includes(q) || hint.includes(q)
    })
  }, [actions, query])

  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-start justify-center p-4 pt-24">
        <DialogPanel className="w-full max-w-xl ptp-card shadow-ptp-md">
          <div className="p-4 border-b border-zinc-100">
            <DialogTitle className="text-sm font-medium text-zinc-900">
              Command palette
            </DialogTitle>
            <p className="mt-1 text-xs text-zinc-500">
              Type to search. Enter to run. Esc to close.
            </p>
          </div>

          <div className="p-4">
            <Combobox
              value={null}
              onChange={(action) => {
                try {
                  action?.run?.()
                } finally {
                  onClose?.()
                }
              }}
            >
              <ComboboxInput
                className="ptp-input"
                placeholder="Search commands…"
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
              />

              <ComboboxOptions className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-zinc-200/70 bg-white p-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-zinc-600">
                    No matches.
                  </div>
                ) : (
                  filtered.map((action) => (
                    <ComboboxOption
                      key={action.id}
                      value={action}
                      className={({ active }) =>
                        `cursor-pointer rounded-md px-3 py-2 ${
                          active ? 'bg-zinc-50' : ''
                        }`
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zinc-900 truncate">
                            {action.label}
                          </div>
                          {action.hint ? (
                            <div className="text-xs text-zinc-500 truncate">
                              {action.hint}
                            </div>
                          ) : null}
                        </div>
                        {action.shortcut ? (
                          <span className="ptp-kbd">{action.shortcut}</span>
                        ) : null}
                      </div>
                    </ComboboxOption>
                  ))
                )}
              </ComboboxOptions>
            </Combobox>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}


