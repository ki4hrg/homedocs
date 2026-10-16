'use client'

/*
 * Search Homebox or paperless and link a result. Typing searches through our
 * server (the token never reaches the browser); picking a result asks the
 * server to fetch it again and store the link.
 */

import { useEffect, useState, useTransition } from 'react'
import { buttonClass } from './ui/Button'
import { TextInput } from './ui/Field'

type Hit = { externalId: string; title: string; subtitle: string; hasThumb: boolean }

export function LinkPicker({
  systems,
  link,
}: {
  systems: { system: 'homebox' | 'paperless'; name: string }[]
  link: (system: string, externalId: string) => Promise<{ error?: string }>
}) {
  const [system, setSystem] = useState<(typeof systems)[number]['system'] | null>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!system || q.trim().length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ext/search?system=${system}&q=${encodeURIComponent(q)}`, { signal: controller.signal })
        const body = (await res.json()) as { hits?: Hit[]; error?: string }
        setError(body.error ?? null)
        setHits(body.hits ?? [])
      } catch {
        // superseded by the next keystroke
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [system, q])

  if (!system) {
    return (
      <div className="flex flex-wrap gap-2">
        {systems.map((s) => (
          <button key={s.system} type="button" className={buttonClass('secondary')} onClick={() => setSystem(s.system)}>
            Find in {s.name}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-card p-3">
      <div className="flex gap-2">
        <TextInput
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={system === 'homebox' ? 'Search Homebox items' : 'Search paperless documents'}
          aria-label="Search"
        />
        <button type="button" className={buttonClass('ghost', 'shrink-0')} onClick={() => setSystem(null)}>
          Close
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-line">
        {hits.map((h) => (
          <li key={h.externalId}>
            <button
              type="button"
              disabled={pending}
              className="flex w-full min-h-12 flex-col items-start px-1 py-2 text-left hover:bg-sunk"
              onClick={() =>
                start(async () => {
                  const r = await link(system, h.externalId)
                  if (r.error) setError(r.error)
                  else {
                    setSystem(null)
                    setQ('')
                    setHits([])
                  }
                })
              }
            >
              <span className="text-[15px] text-ink">{h.title}</span>
              {h.subtitle ? <span className="text-sm text-ink-3">{h.subtitle}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
