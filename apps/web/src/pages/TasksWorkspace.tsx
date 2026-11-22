import { useCallback, useEffect, useMemo, useState } from 'react'
import { TaskForm } from '../components/tasks/TaskForm'
import { ModuleFilterBar } from '../components/workspace/ModuleFilterBar'
import { ModuleHeader } from '../components/workspace/ModuleHeader'
import { ModuleProgress } from '../components/workspace/ModuleProgress'
import {
  BarGraph,
  Button,
  ConfirmDialog,
  Dialog,
  EmptyState,
  IconButton,
  ResponsiveCard,
  SelectField,
  StatCard,
  TextField,
  Toast,
} from '../components/ui'
import { chartPalettes, type PresetId } from '../generated/tokens'
import type { TranslationKey } from '../i18n'
import type { Appearance } from '../lib/appearance'
import { resolveColorMode } from '../lib/appearance'
import type { RecurrenceFrequency, TaskRecord } from '../lib/db'
import {
  addTask,
  deleteTask,
  listTasks,
  removeSubtask,
  taskProgress,
  toggleSubtask,
  toggleTask,
  updateTask,
  type TaskInput,
} from '../lib/modules/tasks'
import { unavailableProgress, type ProgressSnapshot } from '../lib/progress'
import {
  completionSeries,
  filterTasks,
  monthlyCompletionSeries,
  overdueCount,
  priorities,
  priorityDistribution,
  taskViews,
  type TaskPriority,
  type TaskView,
} from '../lib/tasks'

type Translate = (key: TranslationKey) => string
type PriorityFilter = TaskPriority | 'all'

const viewKey: Record<TaskView, TranslationKey> = {
  all: 'viewAll',
  today: 'viewToday',
  upcoming: 'viewUpcoming',
  overdue: 'viewOverdue',
  completed: 'viewCompleted',
  priority: 'viewPriority',
  category: 'viewCategory',
  calendar: 'viewCalendar',
}

const priorityKey: Record<TaskPriority, TranslationKey> = {
  veryHigh: 'priorityVeryHigh',
  high: 'priorityHigh',
  medium: 'priorityMedium',
  low: 'priorityLow',
}

const frequencyKey: Record<RecurrenceFrequency, TranslationKey> = {
  daily: 'recurrenceDaily',
  weekly: 'recurrenceWeekly',
  monthly: 'recurrenceMonthly',
}

const weekdayKeys: TranslationKey[] = [
  'weekdaySun',
  'weekdayMon',
  'weekdayTue',
  'weekdayWed',
  'weekdayThu',
  'weekdayFri',
  'weekdaySat',
]

function localMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split('-').map(Number)
  return localMonth(new Date(year, index - 1 + delta, 1))
}

function monthCells(month: string): { key: string; day: number; inMonth: boolean }[] {
  const [year, index] = month.split('-').map(Number)
  const first = new Date(year, index - 1, 1)
  const start = new Date(year, index - 1, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, position) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + position)
    return {
      key: `${localMonth(date)}-${String(date.getDate()).padStart(2, '0')}`,
      day: date.getDate(),
      inMonth: date.getMonth() === index - 1,
    }
  })
}

interface TasksWorkspaceProps {
  t: Translate
  appearance: Appearance
  revision: number
  onSaved: () => void
}

export function TasksWorkspace({ t, appearance, revision, onSaved }: TasksWorkspaceProps) {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [progress, setProgress] = useState<ProgressSnapshot>(unavailableProgress)
  const [view, setView] = useState<TaskView>('all')
  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => localMonth(new Date()))
  const [loading, setLoading] = useState(true)
  const [problem, setProblem] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<TaskRecord | null>(null)
  const [deleting, setDeleting] = useState<TaskRecord | null>(null)
  const [notice, setNotice] = useState<TranslationKey | null>(null)

  const load = useCallback(async () => {
    try {
      const [rows, snapshot] = await Promise.all([listTasks(), taskProgress()])
      setTasks(rows)
      setProgress(snapshot)
      setProblem(false)
    } catch {
      setProblem(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, revision])

  const flash = (key: TranslationKey) => {
    setNotice(key)
    window.setTimeout(() => setNotice(null), 2600)
  }

  const run = async (action: () => Promise<unknown>, success?: TranslationKey) => {
    try {
      await action()
      await load()
      onSaved()
      if (success) flash(success)
    } catch {
      setProblem(true)
    }
  }

  const categories = useMemo(
    () => [...new Set(tasks.map((task) => task.category).filter((value): value is string => Boolean(value)))].sort(),
    [tasks],
  )

  const visible = useMemo(
    () => filterTasks(tasks, {
      view,
      query,
      priority: priorityFilter === 'all' ? undefined : priorityFilter,
      category: categoryFilter || undefined,
      calendarMonth,
    }),
    [tasks, view, query, priorityFilter, categoryFilter, calendarMonth],
  )

  const now = new Date()
  const daily = completionSeries(tasks, 1, now)[0]?.completed ?? 0
  const weekly = completionSeries(tasks, 7, now)
  const monthly = monthlyCompletionSeries(tasks, 6, now)
  const openTasks = tasks.filter((task) => !task.completed)
  const distribution = priorityDistribution(openTasks)
  const overdue = overdueCount(tasks, now)
  const palette = chartPalettes[appearance.preset as PresetId][resolveColorMode(appearance.mode)]

  const clearFilters = () => {
    setQuery('')
    setPriorityFilter('all')
    setCategoryFilter('')
  }

  const submitEditor = (input: TaskInput) => {
    const current = editing
    setEditorOpen(false)
    void run(
      () => current ? updateTask(current.id, input) : addTask(input),
      current ? 'taskUpdated' : 'taskSaved',
    )
  }

  return (
    <>
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
            value={view}
            onChange={setView}
            note={view === 'calendar' ? t('calendarEmpty') : undefined}
            options={taskViews.map((name) => ({ value: name, label: t(viewKey[name]) }))}
          />
        }
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setEditorOpen(true)
            }}
          >
            {t('newTask')}
          </Button>
        }
      >
        {problem ? <p role="alert" className="text-sm" style={{ color: 'var(--mf-danger)' }}>{t('errorBody')}</p> : null}

        <section className="space-y-3" aria-label={t('moduleFilters')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              label={t('filterQuery')}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <SelectField
              label={t('filterPriority')}
              value={priorityFilter}
              options={[
                { value: 'all', label: t('filterAll') },
                ...priorities.map((value) => ({ value, label: t(priorityKey[value]) })),
              ]}
              onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
            />
            <SelectField
              label={t('filterCategory')}
              value={categoryFilter}
              options={[
                { value: '', label: t('filterAll') },
                ...categories.map((value) => ({ value, label: value })),
              ]}
              onChange={(event) => setCategoryFilter(event.target.value)}
            />
          </div>
          <Button variant="ghost" onClick={clearFilters}>{t('clearFilters')}</Button>
        </section>

        {loading ? (
          <p className="muted">{t('loadingLabel')}</p>
        ) : view === 'calendar' ? (
          <section className="panel space-y-3 p-4" data-testid="task-calendar" aria-label={t('viewCalendar')}>
            <div className="flex items-center justify-between gap-2">
              <IconButton label={t('previousMonth')} onClick={() => setCalendarMonth((month) => shiftMonth(month, -1))}>‹</IconButton>
              <h2 className="text-base">{calendarMonth}</h2>
              <IconButton label={t('nextMonth')} onClick={() => setCalendarMonth((month) => shiftMonth(month, 1))}>›</IconButton>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {weekdayKeys.map((key) => <span key={key} className="eyebrow">{t(key)}</span>)}
              {monthCells(calendarMonth).map((cell) => {
                const deadlines = tasks.filter((task) => task.dueDate === cell.key)
                return (
                  <div
                    key={cell.key}
                    className="min-h-[72px] rounded-md border p-1 text-left"
                    style={{ borderColor: 'var(--mf-border)', opacity: cell.inMonth ? 1 : 0.45 }}
                    data-date={cell.key}
                  >
                    <p className="text-xs">{cell.day}</p>
                    {deadlines.slice(0, 2).map((task) => (
                      <p key={task.id} className="mt-0.5 truncate text-[10px]" title={task.title}>{task.title}</p>
                    ))}
                  </div>
                )
              })}
            </div>
          </section>
        ) : visible.length === 0 ? (
          <EmptyState title={t('emptyTitle')} body={t('noTasksInView')} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {visible.map((task) => (
              <li key={task.id} className="panel p-4" data-testid="task-card" data-task-id={task.id}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => void run(() => toggleTask(task.id))}
                    aria-label={task.title}
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className={task.completed ? 'muted break-words line-through' : 'break-words'}>{task.title}</p>
                    {task.description ? <p className="muted break-words text-xs">{task.description}</p> : null}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--mf-muted)' }}>
                      <span>{t(priorityKey[task.priority ?? 'medium'])}</span>
                      <span>{t(task.completed ? 'taskStatusDone' : 'taskStatusOpen')}</span>
                      {task.category ? <span>{task.category}</span> : null}
                      {task.dueDate ? <span>{t('taskFieldDueDate')}: {task.dueDate}</span> : null}
                      {task.startTime ? <span>{t('taskFieldStartTime')}: {task.startTime}</span> : null}
                      {task.endTime ? <span>{t('taskFieldEndTime')}: {task.endTime}</span> : null}
                      {task.recurrence ? <span>{t(frequencyKey[task.recurrence.frequency])}</span> : null}
                    </div>
                    {task.subtasks?.length ? (
                      <ul className="space-y-1" aria-label={t('taskFieldSubtasks')}>
                        {task.subtasks.map((item) => (
                          <li key={item.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => void run(() => toggleSubtask(task.id, item.id))}
                              aria-label={item.title}
                              className="h-4 w-4"
                            />
                            <span className={item.completed ? 'muted line-through' : ''}>{item.title}</span>
                            <IconButton
                              label={t('removeSubtask')}
                              onClick={() => void run(() => removeSubtask(task.id, item.id))}
                            >
                              ×
                            </IconButton>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {task.reminderOffsetMinutes !== undefined ? (
                      <p className="muted text-xs">{t('reminderNote')}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => { setEditing(task); setEditorOpen(true) }}>
                        {t('editTask')}
                      </Button>
                      <Button variant="ghost" onClick={() => void run(() => toggleTask(task.id))}>
                        {t(task.completed ? 'markOpen' : 'markComplete')}
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleting(task)}>{t('deleteTask')}</Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="space-y-4" data-testid="task-analytics" aria-label={t('analyticsTitle')}>
          <h2 className="text-xl">{t('analyticsTitle')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard caption={t('dailyCompletion')} value={String(daily)} detail={t('historicalNote')} />
            <StatCard
              caption={t('completedTotal')}
              value={progress.available ? `${progress.completed}/${progress.total}` : '—'}
              detail={progress.available ? t('unscheduledNote') : t('progressUnavailable')}
            />
            <StatCard caption={t('overdueTasks')} value={String(overdue)} detail={t('historicalNote')} />
            <StatCard
              caption={t('priorityDistribution')}
              value={String(openTasks.length)}
              detail={t('unscheduledNote')}
            />
          </div>
          <ul className="grid gap-2 sm:grid-cols-4">
            {priorities.map((value) => (
              <li key={value} className="panel px-3 py-2 text-xs">
                {t(priorityKey[value])}: {distribution[value]}
              </li>
            ))}
          </ul>
          <div className="grid gap-4 lg:grid-cols-2">
            <ResponsiveCard title={t('weeklyCompletion')}>
              {weekly.some((point) => point.completed > 0) ? (
                <BarGraph
                  labels={weekly.map((point) => point.label)}
                  values={weekly.map((point) => point.completed)}
                  colors={palette}
                  axisColor={palette[3]}
                  gridColor={palette[4]}
                  description={t('weeklyCompletion')}
                />
              ) : (
                <EmptyState title={t('weeklyCompletion')} body={t('noDataForRange')} />
              )}
            </ResponsiveCard>
            <ResponsiveCard title={t('monthlyCompletion')}>
              {monthly.some((point) => point.completed > 0) ? (
                <BarGraph
                  labels={monthly.map((point) => point.label)}
                  values={monthly.map((point) => point.completed)}
                  colors={palette}
                  axisColor={palette[3]}
                  gridColor={palette[4]}
                  description={t('monthlyCompletion')}
                />
              ) : (
                <EmptyState title={t('monthlyCompletion')} body={t('noDataForRange')} />
              )}
            </ResponsiveCard>
          </div>
          <p className="muted text-xs">{t('historicalNote')}</p>
        </section>
      </ModuleHeader>

      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? t('editTask') : t('newTask')}
        closeLabel={t('cancelAction')}
      >
        <TaskForm t={t} initial={editing ?? undefined} onSubmit={submitEditor} onCancel={() => setEditorOpen(false)} />
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('deleteTask')}
        closeLabel={t('cancelAction')}
        body={t('deleteTaskConfirm')}
        confirmLabel={t('deleteTask')}
        cancelLabel={t('cancelAction')}
        onConfirm={() => {
          if (deleting) void run(() => deleteTask(deleting.id), 'taskDeleted')
          setDeleting(null)
        }}
      />

      <Toast message={notice ? t(notice) : ''} visible={notice !== null} />
    </>
  )
}
