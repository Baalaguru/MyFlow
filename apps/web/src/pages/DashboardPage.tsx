import { useEffect, useState } from 'react'
import type { TranslationKey } from '../i18n'
import { listTasks, taskProgress } from '../lib/modules/tasks'
import { unavailableProgress, type ProgressSnapshot } from '../lib/progress'

type Translate = (key: TranslationKey) => string

const foundationItems: TranslationKey[] = [
  'foundationItemStorage',
  'foundationItemThemes',
  'foundationItemLanguages',
  'foundationItemStatus',
]

export function DashboardPage({ t, revision }: { t: Translate; revision: number }) {
  const [taskCount, setTaskCount] = useState<number | null>(null)
  const [progress, setProgress] = useState<ProgressSnapshot>(unavailableProgress)
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([listTasks(), taskProgress()])
      .then(([tasks, snapshot]) => {
        if (active) {
          setTaskCount(tasks.length)
          setProgress(snapshot)
        }
      })
      .catch(() => {
        if (active) setStorageError(true)
      })
    return () => {
      active = false
    }
  }, [revision])

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{t('appTitle')}</p>
        <h1>{t('dashboardTitle')}</h1>
        <p className="muted mt-2 text-sm italic">{t('dashboardSubtitle')}</p>
      </header>

      <div className="panel flex items-center gap-3 px-4 py-3 text-sm">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-pill"
          style={{ backgroundColor: storageError ? 'var(--mf-highlight)' : 'var(--mf-growth)' }}
        />
        <span>{storageError ? t('notApplicable') : t('localFirst')}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="panel p-5">
          <p className="eyebrow">{t('tasksInLocalStore')}</p>
          <p className="stat-number mt-2">{storageError ? '—' : (taskCount ?? '…')}</p>
          {taskCount === 0 ? <p className="muted mt-3 text-sm">{t('noTasksYet')}</p> : null}
          {progress.available ? (
            <p className="muted mt-3 text-sm">
              {progress.completed} {t('progressCompletedOf')} {progress.total}
            </p>
          ) : null}
        </section>

        <section className="panel p-5">
          <p className="eyebrow">{t('foundationReady')}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {foundationItems.map((key) => (
              <li key={key} className="flex items-center gap-2">
                <span aria-hidden="true" style={{ color: 'var(--mf-growth)' }}>
                  ✓
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
          <p className="muted mt-4 text-sm leading-relaxed">{t('foundationNote')}</p>
        </section>
      </div>
    </div>
  )
}
