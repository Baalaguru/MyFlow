import { useCallback, useEffect, useMemo, useState } from 'react'
import { ModuleHeader } from '../components/workspace/ModuleHeader'
import { ModuleProgress } from '../components/workspace/ModuleProgress'
import {
  BarGraph,
  Button,
  ConfirmDialog,
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
import type { HabitLogRecord, HabitRecord, HabitScheduleType } from '../lib/db'
import {
  aggregateCompletion,
  calculateStreaks,
  habitHeatmap,
  habitTrend,
  normaliseSchedule,
} from '../lib/habits'
import {
  clearHabitLog,
  createHabit,
  deleteHabit,
  listHabitLogs,
  listHabits,
  setHabitArchived,
  setHabitLog,
  setHabitPaused,
  todayKey,
  updateHabit,
} from '../lib/modules/habits'
import { unavailableProgress } from '../lib/progress'

type Translate = (key: TranslationKey) => string

interface Props {
  t: Translate
  appearance: Appearance
  revision: number
  onSaved: () => void
}

const weekdayKeys: TranslationKey[] = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat']

function defaultForm() {
  return {
    name: '',
    description: '',
    icon: '🌱',
    accent: 'var(--mf-module-accent)',
    scheduleType: 'daily' as HabitScheduleType,
    weekdays: [1, 2, 3, 4, 5] as number[],
    target: '',
    reminderOffsetMinutes: '',
  }
}

export function HabitsWorkspace({ t, appearance, revision, onSaved }: Props) {
  const [habits, setHabits] = useState<HabitRecord[]>([])
  const [logs, setLogs] = useState<HabitLogRecord[]>([])
  const [form, setForm] = useState(defaultForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<TranslationKey | null>(null)

  const load = useCallback(async () => {
    const [h, l] = await Promise.all([listHabits(), listHabitLogs()])
    setHabits(h)
    setLogs(l)
  }, [])

  useEffect(() => {
    void load()
  }, [load, revision])

  const notify = (key: TranslationKey) => {
    setToast(key)
    window.setTimeout(() => setToast(null), 2200)
  }

  const today = todayKey()
  const activeHabits = habits.filter((h) => !h.archived)
  const visibleHabits = habits

  const progress = useMemo(() => aggregateCompletion(activeHabits.filter((h) => !h.paused), logs, 1), [activeHabits, logs])
  const weekly = useMemo(() => aggregateCompletion(activeHabits.filter((h) => !h.paused), logs, 7), [activeHabits, logs])
  const monthly = useMemo(() => aggregateCompletion(activeHabits.filter((h) => !h.paused), logs, 30), [activeHabits, logs])
  const chartMode = resolveColorMode(appearance.mode)
  const preset = (appearance.preset in chartPalettes ? appearance.preset : 'vintageLibrary') as PresetId
  const chartPalette = chartPalettes[preset][chartMode]

  const saveHabit = async () => {
    const name = form.name.trim()
    if (!name) return
    const schedule = normaliseSchedule({ type: form.scheduleType, weekdays: form.scheduleType === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : form.weekdays })
    const payload = {
      name,
      description: form.description.trim() || undefined,
      icon: form.icon.trim() || undefined,
      accent: form.accent || undefined,
      schedule,
      target: form.target ? Number(form.target) : undefined,
      reminderOffsetMinutes: form.reminderOffsetMinutes ? Number(form.reminderOffsetMinutes) : undefined,
    }
    if (editingId) {
      await updateHabit(editingId, payload)
      notify('habitUpdated')
    } else {
      await createHabit(payload)
      notify('habitSaved')
    }
    setForm(defaultForm())
    setEditingId(null)
    await load()
    onSaved()
  }

  const startEdit = (habit: HabitRecord) => {
    setEditingId(habit.id)
    setForm({
      name: habit.name,
      description: habit.description ?? '',
      icon: habit.icon ?? '🌱',
      accent: habit.accent ?? 'var(--mf-module-accent)',
      scheduleType: habit.schedule.type,
      weekdays: habit.schedule.weekdays,
      target: habit.target?.toString() ?? '',
      reminderOffsetMinutes: habit.reminderOffsetMinutes?.toString() ?? '',
    })
  }

  const logStatus = (habitId: string) => logs.find((l) => l.habitId === habitId && l.localDate === today)?.status

  const mark = async (habitId: string, status: HabitLogRecord['status'] | 'clear') => {
    if (status === 'clear') await clearHabitLog(habitId, today)
    else await setHabitLog(habitId, today, status)
    await load()
    onSaved()
    notify('habitLogSaved')
  }

  const trendHabit = activeHabits.find((h) => !h.paused) ?? activeHabits[0]
  const trend = trendHabit ? habitTrend(trendHabit, logs, 14) : []
  const heatmapHabit = trendHabit
  const heatmap = heatmapHabit ? habitHeatmap(heatmapHabit, logs, 28) : []

  return (
    <ModuleHeader
      route="habits"
      eyebrow={t('navHabits')}
      title={t('habitsTitle')}
      subtitle={t('habitsSubtitle')}
      progress={
        <ModuleProgress
          snapshot={progress.available ? progress : unavailableProgress}
          label={t('progressLabel')}
          completedLabel={t('progressCompletedOf')}
          unavailableLabel={t('progressUnavailable')}
        />
      }
      actions={editingId ? <Button variant="ghost" onClick={() => { setEditingId(null); setForm(defaultForm()) }}>{t('cancelAction')}</Button> : undefined}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard caption={t('habitCompletionDaily')} value={progress.available ? `${progress.percent}%` : '—'} detail={t('habitStats')} />
        <StatCard caption={t('habitCompletionWeekly')} value={weekly.available ? `${weekly.percent}%` : '—'} detail={t('habitStats')} />
        <StatCard caption={t('habitCompletionMonthly')} value={monthly.available ? `${monthly.percent}%` : '—'} detail={t('habitStats')} />
      </div>

      <section className="panel space-y-4 p-4">
        <h2 className="text-lg font-semibold">{editingId ? t('editAction') : t('addAction')}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label={t('habitName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label={t('habitDescription')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <TextField label={t('habitIcon')} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          <SelectField
            label={t('habitSchedule')}
            value={form.scheduleType}
            onChange={(e) => setForm({ ...form, scheduleType: e.target.value as HabitScheduleType })}
            options={[
              { value: 'daily', label: t('scheduleDaily') },
              { value: 'weekdays', label: t('scheduleWeekdays') },
              { value: 'custom', label: t('scheduleCustom') },
            ]}
          />
          <TextField label={t('habitTarget')} type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
          <TextField label={t('habitReminder')} type="number" value={form.reminderOffsetMinutes} onChange={(e) => setForm({ ...form, reminderOffsetMinutes: e.target.value })} />
        </div>
        {form.scheduleType !== 'daily' ? (
          <div className="flex flex-wrap gap-2" aria-label={t('habitSchedule')}>
            {weekdayKeys.map((key, index) => {
              const selected = form.weekdays.includes(index)
              return (
                <button
                  key={key}
                  type="button"
                  className="min-h-[44px] rounded-pill border px-3 text-sm"
                  style={selected ? { backgroundColor: 'var(--mf-module-accent)', color: 'var(--mf-onPrimary)', borderColor: 'var(--mf-module-accent)' } : { borderColor: 'var(--mf-border)' }}
                  aria-pressed={selected}
                  onClick={() => {
                    const weekdays = selected ? form.weekdays.filter((d) => d !== index) : [...form.weekdays, index].sort()
                    setForm({ ...form, weekdays })
                  }}
                >
                  {t(key)}
                </button>
              )
            })}
          </div>
        ) : null}
        <p className="muted text-xs">{t('habitReminderNote')}</p>
        <div className="flex gap-2"><Button onClick={() => void saveHabit()}>{t('saveAction')}</Button></div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('habitToday')}</h2>
        {visibleHabits.length === 0 ? <EmptyState title={t('emptyTitle')} body={t('habitNoData')} /> : null}
        <div className="grid gap-3">
          {visibleHabits.map((habit) => {
            const status = logStatus(habit.id)
            const streak = calculateStreaks(habit, logs)
            return (
              <ResponsiveCard key={habit.id} title={habit.name}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{habit.icon ? `${habit.icon} ` : ''}{habit.name}</p>
                    <p className="muted text-sm">{habit.description}</p>
                    <p className="muted text-xs mt-1">{t('habitStreak')}: {streak.currentStreak} · {t('habitLongestStreak')}: {streak.longestStreak}</p>
                    {habit.paused ? <span className="eyebrow">{t('habitPaused')}</span> : null}
                    {habit.archived ? <span className="eyebrow">{t('habitArchived')}</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant={status === 'done' ? 'primary' : 'secondary'} onClick={() => void mark(habit.id, 'done')}>{t('habitMarkDone')}</Button>
                    <Button variant={status === 'skipped' ? 'primary' : 'secondary'} onClick={() => void mark(habit.id, 'skipped')}>{t('habitMarkSkipped')}</Button>
                    <Button variant={status === 'rest' ? 'primary' : 'secondary'} onClick={() => void mark(habit.id, 'rest')}>{t('habitMarkRest')}</Button>
                    <Button variant="ghost" onClick={() => void mark(habit.id, 'clear')}>{t('habitClearLog')}</Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: 'var(--mf-border)' }}>
                  <Button variant="ghost" onClick={() => startEdit(habit)}>{t('editAction')}</Button>
                  <Button variant="ghost" onClick={() => void setHabitPaused(habit.id, !habit.paused).then(load).then(onSaved)}>{habit.paused ? t('habitResume') : t('habitPause')}</Button>
                  <Button variant="ghost" onClick={() => void setHabitArchived(habit.id, !habit.archived).then(load).then(onSaved)}>{habit.archived ? t('habitUnarchive') : t('habitArchive')}</Button>
                  <IconButton label={t('deleteAction')} onClick={() => setDeleteId(habit.id)}>🗑</IconButton>
                </div>
              </ResponsiveCard>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4 space-y-3">
          <h2 className="text-lg font-semibold">{t('habitTrends')}</h2>
          {trend.some((p) => p.scheduled > 0) ? (
            <BarGraph
              labels={trend.map((p) => p.label)}
              values={trend.map((p) => p.completed)}
              colors={chartPalette}
              description={t('habitTrends')}
            />
          ) : <EmptyState title={t('analyticsEmptyTitle')} body={t('habitNoData')} />}
        </div>
        <div className="panel p-4 space-y-3">
          <h2 className="text-lg font-semibold">{t('habitMonthlyHeatmap')}</h2>
          {heatmap.length > 0 ? (
            <div className="grid grid-cols-7 gap-1">
              {heatmap.map((cell) => {
                const color = cell.status === 'done' ? 'var(--mf-growth)' : cell.status === 'skipped' ? 'var(--mf-muted)' : cell.status === 'rest' ? 'var(--mf-border)' : cell.status === 'missed' ? 'color-mix(in srgb, var(--mf-error) 35%, transparent)' : 'transparent'
                return <div key={cell.localDate} title={`${cell.localDate}: ${cell.status}`} className="h-6 rounded-sm border" style={{ backgroundColor: color, borderColor: 'var(--mf-border)' }} />
              })}
            </div>
          ) : <EmptyState title={t('analyticsEmptyTitle')} body={t('habitNoData')} />}
        </div>
      </section>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={t('deleteAction')}
        closeLabel={t('cancelAction')}
        body={t('habitDeleteConfirm')}
        confirmLabel={t('deleteAction')}
        cancelLabel={t('cancelAction')}
        onConfirm={async () => {
          if (deleteId) await deleteHabit(deleteId)
          setDeleteId(null)
          await load()
          onSaved()
          notify('habitDeleted')
        }}
      />
      <Toast message={toast ? t(toast) : ''} visible={!!toast} />
    </ModuleHeader>
  )
}