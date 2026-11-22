import { BarGraph, Button, EmptyState, ProgressBar } from '../ui'
import { chartPalettes, type PresetId } from '../../generated/tokens'
import type { TranslationKey } from '../../i18n'
import type { Appearance } from '../../lib/appearance'
import { resolveColorMode } from '../../lib/appearance'
import { monthlyTaskSeries, weeklyTaskSeries, hasSeriesData } from '../../lib/analytics'
import type { HabitLogRecord, HabitRecord, TaskRecord, WidgetConfig } from '../../lib/db'
import { aggregateCompletion, calculateStreaks, mascotProgress } from '../../lib/habits'
import { scheduledProgress } from '../../lib/tasks'
import { widgetRegistry } from '../../lib/widgets'
import { QuickCapture } from '../QuickCapture'

type Translate = (key: TranslationKey) => string

interface WidgetBodyProps {
  widget: WidgetConfig
  t: Translate
  tasks: TaskRecord[]
  habits: HabitRecord[]
  habitLogs: HabitLogRecord[]
  appearance: Appearance
  onToggleTask: (id: string) => void
  onSaved: () => void
}

function placeholder(widget: WidgetConfig, t: Translate) {
  const definition = widgetRegistry[widget.id]
  return <EmptyState title={t(definition.nameKey)} body={t(definition.noteKey)} />
}

export function WidgetBody({ widget, t, tasks, habits, habitLogs, appearance, onToggleTask, onSaved }: WidgetBodyProps) {
  const open = tasks.filter((task) => !task.completed)
  const progress = scheduledProgress(tasks)
  const palette = chartPalettes[appearance.preset as PresetId][resolveColorMode(appearance.mode)]

  if (widget.id === 'todoOverview') {
    if (!progress.available) {
      return <EmptyState title={t(widgetRegistry[widget.id].nameKey)} body={t('progressUnavailable')} />
    }
    return (
      <div className="space-y-3">
        <ProgressBar
          value={progress.percent ?? 0}
          label={`${progress.completed} ${t('progressCompletedOf')} ${progress.total}`}
        />
        <ul className="space-y-1">
          {open.slice(0, 3).map((task) => (
            <li key={task.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggleTask(task.id)}
                aria-label={task.title}
                className="mt-0.5 h-4 w-4"
              />
              <span className="min-w-0 break-words">{task.title}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (widget.id === 'weeklyStatistics' || widget.id === 'monthlyStatistics') {
    const points = widget.id === 'weeklyStatistics' ? weeklyTaskSeries(tasks) : monthlyTaskSeries(tasks)
    if (!hasSeriesData(points)) return <EmptyState title={t(widgetRegistry[widget.id].nameKey)} body={t('noDataForRange')} />
    const description = widget.id === 'weeklyStatistics' ? t('chartWeeklyDescription') : t('chartMonthlyDescription')
    return (
      <div className="space-y-2">
        <BarGraph
          labels={points.map((point) => point.label)}
          values={points.map((point) => point.captured)}
          colors={palette}
          axisColor={palette[3]}
          gridColor={palette[4]}
          description={description}
        />
        <p className="muted text-xs">
          {t('chartCaptured')}: {points.reduce((sum, point) => sum + point.captured, 0)} · {t('chartCompleted')}:{' '}
          {points.reduce((sum, point) => sum + point.completed, 0)}
        </p>
      </div>
    )
  }

  if (widget.id === 'quickCapture') {
    return (
      <QuickCapture
        open={false}
        onClose={() => undefined}
        onSaved={onSaved}
        labels={{
          open: t('widgetQuickCapture'),
          title: t('quickCaptureTitle'),
          field: t('quickCapturePlaceholder'),
          placeholder: t('quickCapturePlaceholder'),
          save: t('saveAction'),
          close: t('cancelAction'),
          saved: t('capturedToast'),
          error: t('captureError'),
        }}
        trigger={<Button variant="secondary" className="min-h-[44px]">{t('newTask')}</Button>}
      />
    )
  }

  if (widget.id === 'habitOverview') {
    const active = habits.filter((habit) => !habit.archived)
    const progress7 = aggregateCompletion(active.filter((h) => !h.paused), habitLogs, 7)
    if (!progress7.available) return <EmptyState title={t('widgetHabits')} body={t('habitNoData')} />
    return (
      <div className="space-y-2">
        <ProgressBar value={progress7.percent ?? 0} label={`${progress7.completed} ${t('progressCompletedOf')} ${progress7.total}`} />
        <p className="muted text-xs">{active.length} {t('navHabits').toLowerCase()}</p>
      </div>
    )
  }

  if (widget.id === 'currentStreak') {
    const active = habits.filter((habit) => !habit.archived && !habit.paused)
    if (active.length === 0) return <EmptyState title={t('widgetStreak')} body={t('habitNoData')} />
    const best = active
      .map((habit) => ({ habit, streak: calculateStreaks(habit, habitLogs).currentStreak }))
      .sort((a, b) => b.streak - a.streak)[0]
    return (
      <div className="space-y-1">
        <p className="stat-number" style={{ color: 'var(--mf-module-accent)' }}>{best.streak}</p>
        <p className="muted text-xs">{best.habit.name}</p>
      </div>
    )
  }

  if (widget.id === 'mascotGrowth') {
    if (habits.filter((h) => !h.archived).length === 0) return <EmptyState title={t('widgetMascot')} body={t('mascotNoHabits')} />
    const mascot = mascotProgress(habits, habitLogs)
    return (
      <div className="space-y-2">
        <p className="eyebrow" style={{ color: 'var(--mf-module-accent)' }}>{t(`mascotStage${mascot.stage[0].toUpperCase()}${mascot.stage.slice(1)}` as TranslationKey)}</p>
        <ProgressBar value={mascot.percent} label={`${mascot.completedDays} / ${mascot.nextThreshold}`} />
        <p className="muted text-xs">{t('mascotProgressNote')}</p>
      </div>
    )
  }

  return placeholder(widget, t)
}
