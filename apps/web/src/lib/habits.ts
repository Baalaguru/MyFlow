import { calculateProgress, unavailableProgress, type ProgressSnapshot } from './progress'
import type { HabitLogRecord, HabitRecord, HabitSchedule } from './db'

export const weekdayOrder = [0, 1, 2, 3, 4, 5, 6] as const
export const mascotStages = ['seed', 'sprout', 'bloom', 'grove'] as const
export type MascotStage = (typeof mascotStages)[number]

export interface HabitDayStatus {
  localDate: string
  scheduled: boolean
  status: HabitLogRecord['status'] | 'missed' | 'none'
}

export interface HabitStats {
  currentStreak: number
  longestStreak: number
  daily: ProgressSnapshot
  weekly: ProgressSnapshot
  monthly: ProgressSnapshot
  consistency: ProgressSnapshot
}

export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(key: string, days: number): string {
  const date = parseLocalDate(key)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

export function daysBetween(start: string, end: string): string[] {
  const out: string[] = []
  let cursor = start
  while (cursor <= end) {
    out.push(cursor)
    cursor = addDays(cursor, 1)
    if (out.length > 3660) break
  }
  return out
}

export function normaliseSchedule(schedule: HabitSchedule | undefined): HabitSchedule {
  if (!schedule) return { type: 'daily', weekdays: [0, 1, 2, 3, 4, 5, 6] }
  if (schedule.type === 'daily') return { type: 'daily', weekdays: [0, 1, 2, 3, 4, 5, 6] }
  const weekdays = [...new Set((schedule.weekdays ?? []).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
  return { type: schedule.type, weekdays: weekdays.length > 0 ? weekdays : [1, 2, 3, 4, 5] }
}

export function isScheduledDay(habit: HabitRecord, localDate: string): boolean {
  if (habit.archived || habit.paused) return false
  if (localDate < habit.createdAt.slice(0, 10)) return false
  const schedule = normaliseSchedule(habit.schedule)
  if (schedule.type === 'daily') return true
  return schedule.weekdays.includes(parseLocalDate(localDate).getDay())
}

export function logForDay(logs: HabitLogRecord[], habitId: string, localDate: string): HabitLogRecord | undefined {
  return logs.find((log) => log.habitId === habitId && log.localDate === localDate)
}

export function dayStatus(habit: HabitRecord, logs: HabitLogRecord[], localDate: string): HabitDayStatus {
  const scheduled = isScheduledDay(habit, localDate)
  const log = logForDay(logs, habit.id, localDate)
  if (log) return { localDate, scheduled, status: log.status }
  if (scheduled) {
    const today = localDateKey(new Date())
    return { localDate, scheduled, status: localDate < today ? 'missed' : 'none' }
  }
  return { localDate, scheduled: false, status: 'none' }
}

function rangeKeys(now: Date, days: number): string[] {
  const end = localDateKey(now)
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)
  return daysBetween(localDateKey(startDate), end)
}

export function completionForRange(habit: HabitRecord, logs: HabitLogRecord[], keys: string[]): ProgressSnapshot {
  const scheduled = keys.filter((key) => isScheduledDay(habit, key))
  if (scheduled.length === 0) return { ...unavailableProgress }
  const done = scheduled.filter((key) => logForDay(logs, habit.id, key)?.status === 'done').length
  return calculateProgress(done, scheduled.length)
}

export function calculateStreaks(habit: HabitRecord, logs: HabitLogRecord[], now = new Date()): { currentStreak: number; longestStreak: number } {
  const today = localDateKey(now)
  const start = habit.createdAt.slice(0, 10)
  const keys = daysBetween(start, today)
  let longest = 0
  let running = 0
  let current = 0
  let lastDoneIndex = -1

  keys.forEach((key, index) => {
    if (!isScheduledDay(habit, key)) return
    const status = logForDay(logs, habit.id, key)?.status
    if (status === 'done') {
      running += 1
      longest = Math.max(longest, running)
      lastDoneIndex = index
      return
    }
    if (status === 'skipped' || status === 'rest') return
    running = 0
  })

  // Current streak counts consecutive done scheduled days ending at the last done scheduled day.
  if (lastDoneIndex >= 0) {
    for (let i = lastDoneIndex; i >= 0; i -= 1) {
      const key = keys[i]
      if (!isScheduledDay(habit, key)) continue
      const status = logForDay(logs, habit.id, key)?.status
      if (status === 'done') {
        current += 1
        continue
      }
      if (status === 'skipped' || status === 'rest') continue
      break
    }
  }

  return { currentStreak: current, longestStreak: longest }
}

export function habitStats(habit: HabitRecord, logs: HabitLogRecord[], now = new Date()): HabitStats {
  const streaks = calculateStreaks(habit, logs, now)
  const daily = completionForRange(habit, logs, [localDateKey(now)])
  const weekly = completionForRange(habit, logs, rangeKeys(now, 7))
  const monthly = completionForRange(habit, logs, rangeKeys(now, 30))
  return {
    ...streaks,
    daily,
    weekly,
    monthly,
    consistency: monthly,
  }
}

export interface HeatmapCell {
  localDate: string
  status: HabitDayStatus['status']
  scheduled: boolean
}

export function habitHeatmap(habit: HabitRecord, logs: HabitLogRecord[], days: number, now = new Date()): HeatmapCell[] {
  return rangeKeys(now, days).map((key) => {
    const state = dayStatus(habit, logs, key)
    return { localDate: key, status: state.status, scheduled: state.scheduled }
  })
}

export interface TrendPoint {
  label: string
  completed: number
  scheduled: number
}

export function habitTrend(habit: HabitRecord, logs: HabitLogRecord[], days: number, now = new Date()): TrendPoint[] {
  return rangeKeys(now, days).map((key) => {
    const scheduled = isScheduledDay(habit, key)
    const done = logForDay(logs, habit.id, key)?.status === 'done'
    return { label: key.slice(5), completed: done ? 1 : 0, scheduled: scheduled ? 1 : 0 }
  })
}

export function aggregateCompletion(habits: HabitRecord[], logs: HabitLogRecord[], days: number, now = new Date()): ProgressSnapshot {
  const keys = rangeKeys(now, days)
  let scheduled = 0
  let done = 0
  for (const habit of habits) {
    for (const key of keys) {
      if (!isScheduledDay(habit, key)) continue
      scheduled += 1
      if (logForDay(logs, habit.id, key)?.status === 'done') done += 1
    }
  }
  return scheduled === 0 ? { ...unavailableProgress } : calculateProgress(done, scheduled)
}

export function mascotStageFromCompletions(completedDays: number): MascotStage {
  if (completedDays >= 30) return 'grove'
  if (completedDays >= 14) return 'bloom'
  if (completedDays >= 5) return 'sprout'
  return 'seed'
}

export function mascotProgress(habits: HabitRecord[], logs: HabitLogRecord[]) {
  const completedDays = logs.filter((log) => log.status === 'done' && habits.some((h) => h.id === log.habitId)).length
  const stage = mascotStageFromCompletions(completedDays)
  const nextThreshold = stage === 'seed' ? 5 : stage === 'sprout' ? 14 : stage === 'bloom' ? 30 : 30
  return {
    completedDays,
    stage,
    nextThreshold,
    percent: Math.min(100, Math.round((completedDays / nextThreshold) * 100)),
  }
}