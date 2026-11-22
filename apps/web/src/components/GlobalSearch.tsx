import { useEffect, useState } from 'react'
import type { TranslationKey } from '../i18n'
import type { RouteId } from '../lib/routes'
import { searchLocalRecords, type SearchResult } from '../lib/search'
import { SearchField } from './ui'

interface GlobalSearchProps {
  t: (key: TranslationKey) => string
  onNavigate: (route: RouteId) => void
}

export function GlobalSearch({ t, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let active = true
    if (!query.trim()) {
      setResults([])
      return () => {
        active = false
      }
    }
    void searchLocalRecords(query).then((rows) => {
      if (active) setResults(rows)
    })
    return () => {
      active = false
    }
  }, [query])

  const select = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    onNavigate(result.route)
  }

  return (
    <div
      className="relative w-full"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <SearchField
        label={t('searchPlaceholder')}
        placeholder={t('searchPlaceholder')}
        value={query}
        onChange={(value) => {
          setQuery(value)
          setOpen(true)
        }}
      />
      {open && query.trim() ? (
        <section
          className="panel absolute left-0 right-0 top-full z-40 mt-2 p-3"
          aria-label={t('searchResults')}
        >
          <p className="eyebrow mb-2">{t('searchResults')}</p>
          {results.length === 0 ? (
            <p className="muted text-sm">{t('searchNoMatches')}</p>
          ) : (
            <ul className="space-y-1">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    className="flex min-h-[44px] w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--mf-surfaceAlt)]"
                    onClick={() => select(result)}
                  >
                    <span>{result.title}</span>
                    <span className="muted text-xs">{t(result.status === 'completed' ? 'searchResultTaskDone' : 'searchResultTaskOpen')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="muted mt-2 text-xs">{t('searchHint')}</p>
        </section>
      ) : null}
    </div>
  )
}
