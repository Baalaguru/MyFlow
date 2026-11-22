import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import type { TranslationKey } from '../i18n'

type Translate = (key: TranslationKey) => string

export function DashboardPage({ t }: { t: Translate }) {
  const [taskCount, setTaskCount] = useState<number | null>(null)
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    let active = true
    db.tasks
      .count()
      .then((count) => {
        if (active) setTaskCount(count)
      })
      .catch(() => {
        if (active) setStorageError(true)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{t('appTitle')}</p>
        <h1 className="font-display mt-1 text-4xl">{t('dashboardTitle')}</h1>
        <p className="muted mt-2 text-sm italic">{t('dashboardSubtitle')}</p>
      </header>

      <div className="panel flex items-center gap-3 px-4 py-3 text-sm">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: storageError ? 'var(--highlight)' : 'var(--growth)' }}
        />
        <span>{storageError ? t('notApplicable') : t('localFirst')}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="panel p-5">
          <p className="eyebrow">{t('tasksInLocalStore')}</p>
          <p className="font-display mt-2 text-5xl">{storageError ? '—' : (taskCount ?? '…')}</p>
          <p className="muted mt-3 text-sm">{t('noTasksYet')}</p>
        </section>

        <section className="panel p-5">
          <p className="eyebrow">{t('foundationReady')}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {['IndexedDB / Dexie', 'Light + Dark themes', 'English + Tamil', 'Offline status'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden="true" style={{ color: 'var(--growth)' }}>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="muted mt-4 text-sm leading-relaxed">{t('foundationNote')}</p>
        </section>
      </div>
    </div>
  )
}
