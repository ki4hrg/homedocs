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

/** `kind` narrows the search to Homebox locations or paperless tags; `label` replaces the button's "Find in …" text. */
type Source = { system: 'homebox' | 'paperless'; name: string; kind?: 'location' | 'tag'; label?: string }

const PLACEHOLDER = {
  location: 'Search Homebox locations',
  tag: 'Search paperless tags',
  homebox: 'Search Homebox items',
  paperless: 'Search paperless documents',
} as const

export function LinkPicker({
  systems,
  link,
  initialQuery = '',
}: {
  systems: Source[]
  link: (system: string, externalId: string) => Promise<{ error?: string }>
  /** Pre-filled search, e.g. the place's own name when looking for its Homebox location. */
  initialQuery?: string
}) {
  const [source, setSource] = useState<Source | null>(null)
  const system = source?.system ?? null
  const kind = source?.kind ?? null
  const [q, setQ] = useState(initialQuery)
  const [hits, setHits] = useState<Hit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!system || q.trim().length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const narrow = kind ? `&kind=${kind}` : ''
        const res = await fetch(`/api/ext/search?system=${system}${narrow}&q=${encodeURIComponent(q)}`, { signal: controller.signal })
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
  }, [system, kind, q])

  if (!system) {
    return (
      <div className="flex flex-wrap gap-2">
        {systems.map((s) => (
          <button key={`${s.system}:${s.kind ?? ''}`} type="button" className={buttonClass('secondary')} onClick={() => setSource(s)}>
            {s.label ?? `Find in ${s.name}`}
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
          placeholder={PLACEHOLDER[kind ?? system]}
          aria-label="Search"
        />
        <button type="button" className={buttonClass('ghost', 'shrink-0')} onClick={() => setSource(null)}>
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
                  const r = await link(source!.system, h.externalId)
                  if (r.error) setError(r.error)
                  else {
                    setSource(null)
                    setQ(initialQuery)
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
