import { useCallback, useEffect, useState } from 'react'
import { QuickCapture } from '../components/QuickCapture'
import { ModuleFilterBar } from '../components/workspace/ModuleFilterBar'
import { ModuleHeader } from '../components/workspace/ModuleHeader'
import { ModuleProgress } from '../components/workspace/ModuleProgress'
import { EmptyState } from '../components/ui'
import type { TranslationKey } from '../i18n'
import type { TaskRecord } from '../lib/db'
import { listTasks, taskProgress, toggleTask } from '../lib/modules/tasks'
import { unavailableProgress, type ProgressSnapshot } from '../lib/progress'

type TaskFilter = 'all' | 'open' | 'done'

interface TasksWorkspaceProps {
  t: (key: TranslationKey) => string
  revision: number
  onSaved: () => void
}

export function TasksWorkspace({ t, revision, onSaved }: TasksWorkspaceProps) {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [progress, setProgress] = useState<ProgressSnapshot>(unavailableProgress)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [loading, setLoading] = useState(true)
  const [problem, setProblem] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)

  const load = useCallback(async () => {
    const [rows, snapshot] = await Promise.all([listTasks(), taskProgress()])
    setTasks(rows)
    setProgress(snapshot)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load, revision])

  const changeTask = async (id: string) => {
    try {
      await toggleTask(id)
      await load()
    } catch {
      setProblem(true)
    }
  }

  const visible = tasks.filter((task) => {
    if (filter === 'open') return !task.completed
    if (filter === 'done') return task.completed
    return true
  })

  const captureLabels = {
    open: t('newTask'),
    title: t('quickCaptureTitle'),
    field: t('quickCapturePlaceholder'),
    placeholder: t('quickCapturePlaceholder'),
    save: t('saveAction'),
    close: t('cancelAction'),
    saved: t('capturedToast'),
    error: t('captureError'),
  }

  return (
    <ModuleHeader
      route="tasks"
      eyebrow={t('modulesLabel')}
      title={t('navTasks')}
      subtitle={t('workspaceSubtitleTasks')}
      progress={
        <ModuleProgress
          snapshot={progress}
          label={t('progressLabel')}
          completedLabel={t('progressCompletedOf')}
          unavailableLabel={t('progressUnavailable')}
        />
      }
      filters={
        <ModuleFilterBar
          label={t('moduleFilters')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('filterAll') },
            { value: 'open', label: t('filterOpen') },
            { value: 'done', label: t('filterDone') },
          ]}
        />
      }
      actions={
        <QuickCapture
          open={captureOpen}
          onClose={() => setCaptureOpen(false)}
          onSaved={() => {
            onSaved()
            void load()
          }}
          labels={captureLabels}
          trigger={
            <button type="button" className="btn btn-primary min-h-[44px]" onClick={() => setCaptureOpen(true)}>
              {t('newTask')}
            </button>
          }
        />
      }
    >
      {problem ? <p role="alert" className="text-sm" style={{ color: 'var(--mf-danger)' }}>{t('errorBody')}</p> : null}

      {loading ? (
        <p className="muted">{t('loadingLabel')}</p>
      ) : visible.length === 0 ? (
        <EmptyState title={t('emptyTitle')} body={t('noTasksInView')} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((task) => (
            <li key={task.id} className="panel flex items-start gap-3 p-4">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => void changeTask(task.id)}
                aria-label={task.title}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <div className="min-w-0">
                <p className={task.completed ? 'muted line-through' : ''}>{task.title}</p>
                <p className="muted mt-1 text-xs">
                  {t(task.completed ? 'taskStatusDone' : 'taskStatusOpen')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModuleHeader>
  )
}
