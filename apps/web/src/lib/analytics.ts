import type { TaskRecord } from './db'

export interface TaskSeriesPoint {
  label: string
  captured: number
  completed: number
}

function inLocalPeriod(date: Date, now: Date, days: number): boolean {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)
  return date >= start && date <= now
}

function capturedIn(tasks: TaskRecord[], start: Date, end: Date): TaskRecord[] {
  return tasks.filter((task) => {
    const created = new Date(task.createdAt)
    return !Number.isNaN(created.getTime()) && created >= start && created <= end
  })
}

function completedWithin(task: TaskRecord, start: Date, end: Date): boolean {
  if (!task.completed || !task.completedAt) return false
  const instant = new Date(task.completedAt)
  return !Number.isNaN(instant.getTime()) && instant >= start && instant <= end
}

/** Seven completed local days ending today. Counts are derived from real task records. */
export function weeklyTaskSeries(tasks: TaskRecord[], now = new Date()): TaskSeriesPoint[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index)
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
    const rows = capturedIn(tasks, day, next)
    return {
      label: String(day.getDate()),
      captured: rows.length,
      completed: rows.filter((task) => completedWithin(task, day, next)).length,
    }
  })
}

/** Six completed local months ending with the current month. */
export function monthlyTaskSeries(tasks: TaskRecord[], now = new Date()): TaskSeriesPoint[] {
  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    const rows = capturedIn(tasks, month, next)
    return {
      label: `${month.getMonth() + 1}/${String(month.getFullYear()).slice(2)}`,
      captured: rows.length,
      completed: rows.filter((task) => completedWithin(task, month, next)).length,
    }
  })
}

export function hasSeriesData(points: TaskSeriesPoint[]): boolean {
  return points.some((point) => point.captured > 0)
}

export function tasksInLastDays(tasks: TaskRecord[], days: number, now = new Date()): TaskRecord[] {
  return tasks.filter((task) => {
    const created = new Date(task.createdAt)
    return !Number.isNaN(created.getTime()) && inLocalPeriod(created, now, days)
  })
}
