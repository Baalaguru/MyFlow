import type { TaskRecord, SubtaskRecord, TaskPriority } from './db'
import { calculateProgress, type ProgressSnapshot } from './progress'

export type { TaskPriority } from './db'
export const priorities: readonly TaskPriority[] = ['veryHigh', 'high', 'medium', 'low']
export const priorityRank: Record<TaskPriority, number> = { veryHigh: 0, high: 1, medium: 2, low: 3 }

export const taskViews = [
  'all', 'today', 'upcoming', 'overdue', 'completed', 'priority', 'category', 'calendar',
] as const
export type TaskView = (typeof taskViews)[number]

export interface TaskFilters {
  view: TaskView
  now?: Date
  query?: string
  priority?: TaskPriority
  category?: string
  calendarMonth?: string
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dueDateOf(task: TaskRecord): Date | null {
  if (!task.dueDate) return null
  const date = new Date(`${task.dueDate}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isScheduled(task: TaskRecord): boolean {
  return Boolean(task.dueDate || task.startTime)
}

export function sortTasks(tasks: TaskRecord[]): TaskRecord[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const priority = priorityRank[a.priority ?? 'medium'] - priorityRank[b.priority ?? 'medium']
    if (priority !== 0) return priority
    const due = (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
    if (due !== 0) return due
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export function filterTasks(tasks: TaskRecord[], filters: TaskFilters): TaskRecord[] {
  const now = filters.now ?? new Date()
  const today = localDateKey(now)
  const query = filters.query?.trim().toLocaleLowerCase() ?? ''
  const month = filters.calendarMonth ?? today.slice(0, 7)

  const rows = tasks.filter((task) => {
    if (query) {
      const haystack = `${task.title} ${task.description ?? ''} ${task.category ?? ''}`.toLocaleLowerCase()
      if (!haystack.includes(query)) return false
    }
    switch (filters.view) {
      case 'today':
        return task.dueDate === today
      case 'upcoming':
        return Boolean(task.dueDate && task.dueDate > today) && !task.completed
      case 'overdue':
        return Boolean(task.dueDate && task.dueDate < today) && !task.completed
      case 'completed':
        return task.completed
      case 'priority':
        return (task.priority ?? 'medium') === (filters.priority ?? 'medium')
      case 'category':
        return (task.category ?? '') === (filters.category ?? '')
      case 'calendar':
        return Boolean(task.dueDate && task.dueDate.startsWith(month))
      default:
        return true
    }
  })

  return sortTasks(rows)
}

/** Scheduled tasks in the selected range only; unscheduled notes never inflate progress. */
export function scheduledProgress(
  tasks: TaskRecord[],
  now = new Date(),
  days = 7,
): ProgressSnapshot {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1)
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  const scheduled = tasks.filter((task) => {
    if (!isScheduled(task)) return false
    const due = dueDateOf(task)
    if (!due) return Boolean(task.startTime) && start <= now && now < end
    return due >= start && due < end
  })
  return calculateProgress(scheduled.filter((task) => task.completed).length, scheduled.length)
}

export interface TaskSeriesPoint {
  label: string
  captured: number
  completed: number
}

export function completionSeries(tasks: TaskRecord[], days: number, now = new Date()): TaskSeriesPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1 + index)
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
    const key = localDateKey(day)
    const captured = tasks.filter((task) => {
      const created = new Date(task.createdAt)
      return !Number.isNaN(created.getTime()) && created >= day && created < next
    }).length
    const completed = tasks.filter((task) => {
      if (!task.completedAt) return false
      const instant = new Date(task.completedAt)
      return !Number.isNaN(instant.getTime()) && instant >= day && instant < next
    }).length
    return { label: String(day.getDate()), captured, completed, key: `${key}` }
  }).map(({ label, captured, completed }) => ({ label, captured, completed }))
}

/** Six completed local months ending with the current month, using real completion instants. */
export function monthlyCompletionSeries(
  tasks: TaskRecord[],
  months = 6,
  now = new Date(),
): TaskSeriesPoint[] {
  return Array.from({ length: months }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - months + 1 + index, 1)
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    const inRange = (value: string) => {
      const instant = new Date(value)
      return !Number.isNaN(instant.getTime()) && instant >= month && instant < next
    }
    return {
      label: `${month.getMonth() + 1}/${String(month.getFullYear()).slice(2)}`,
      captured: tasks.filter((task) => inRange(task.createdAt)).length,
      completed: tasks.filter((task) => task.completedAt && inRange(task.completedAt)).length,
    }
  })
}

export function priorityDistribution(tasks: TaskRecord[]): Record<TaskPriority, number> {
  const result: Record<TaskPriority, number> = { veryHigh: 0, high: 0, medium: 0, low: 0 }
  for (const task of tasks) result[task.priority ?? 'medium'] += 1
  return result
}

export function overdueCount(tasks: TaskRecord[], now = new Date()): number {
  const today = localDateKey(now)
  return tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < today).length
}

export function subtaskProgress(subtasks: SubtaskRecord[]): ProgressSnapshot {
  return calculateProgress(subtasks.filter((item) => item.completed).length, subtasks.length)
}

function addInterval(date: Date, task: TaskRecord): Date {
  const frequency = task.recurrence?.frequency ?? 'daily'
  const interval = Math.max(1, task.recurrence?.interval ?? 1)
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (frequency === 'daily') next.setDate(next.getDate() + interval)
  if (frequency === 'weekly') next.setDate(next.getDate() + 7 * interval)
  if (frequency === 'monthly') next.setMonth(next.getMonth() + interval)
  return next
}

/** Produces the next concrete occurrence. Never mutates or rewrites prior records. */
export function nextOccurrence(task: TaskRecord, allTasks: TaskRecord[], now = new Date()): TaskRecord | null {
  const rule = task.recurrence
  if (!rule) return null
  const rootId = task.recurrenceParentId ?? task.id
  const occurrences = allTasks.filter((row) => (row.recurrenceParentId ?? row.id) === rootId).length
  if (rule.count && occurrences >= rule.count) return null

  const base = dueDateOf(task) ?? new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const next = addInterval(base, task)
  const nextKey = localDateKey(next)
  if (rule.until && nextKey > rule.until) return null
  if (allTasks.some((row) => row.recurrenceParentId === rootId && row.dueDate === nextKey)) return null

  return {
    id: crypto.randomUUID(),
    title: task.title,
    description: task.description,
    priority: task.priority,
    category: task.category,
    dueDate: nextKey,
    startTime: task.startTime,
    endTime: task.endTime,
    completed: false,
    status: 'open',
    subtasks: (task.subtasks ?? []).map((item) => ({ ...item, id: crypto.randomUUID(), completed: false })),
    recurrence: { ...rule },
    recurrenceParentId: rootId,
    reminderOffsetMinutes: task.reminderOffsetMinutes,
    createdAt: now.toISOString(),
  }
}
