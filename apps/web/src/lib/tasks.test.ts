import { describe, expect, it } from 'vitest'
import type { TaskRecord } from './db'
import {
  completionSeries,
  filterTasks,
  nextOccurrence,
  overdueCount,
  priorityDistribution,
  scheduledProgress,
  sortTasks,
  subtaskProgress,
} from './tasks'

const now = new Date('2026-11-22T12:00:00.000Z')

function task(patch: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: patch.id ?? crypto.randomUUID(),
    title: patch.title ?? 'Task',
    priority: patch.priority ?? 'medium',
    completed: patch.completed ?? false,
    status: patch.status ?? 'open',
    subtasks: patch.subtasks ?? [],
    createdAt: patch.createdAt ?? '2026-11-22T08:00:00.000Z',
    ...patch,
  }
}

describe('task projections', () => {
  it('sorts open work by priority before due date', () => {
    const rows = [
      task({ id: 'low', priority: 'low' }),
      task({ id: 'high', priority: 'high' }),
      task({ id: 'urgent', priority: 'veryHigh', dueDate: '2026-11-30' }),
    ]
    expect(sortTasks(rows).map((row) => row.id)).toEqual(['urgent', 'high', 'low'])
  })

  it('derives today, upcoming, overdue, completed, priority, category and calendar views', () => {
    const rows = [
      task({ id: 'today', dueDate: '2026-11-22' }),
      task({ id: 'later', dueDate: '2026-11-25' }),
      task({ id: 'late', dueDate: '2026-11-20' }),
      task({ id: 'done', completed: true, dueDate: '2026-11-21', status: 'completed' }),
      task({ id: 'tagged', priority: 'high', category: 'Home' }),
    ]
    const view = (name: Parameters<typeof filterTasks>[1]['view']) =>
      filterTasks(rows, { view: name, now, priority: 'high', category: 'Home', calendarMonth: '2026-11' }).map(
        (row) => row.id,
      )
    expect(view('today')).toEqual(['today'])
    expect(view('upcoming')).toEqual(['later'])
    expect(view('overdue')).toEqual(['late'])
    expect(view('completed')).toEqual(['done'])
    expect(view('priority')).toEqual(['tagged'])
    expect(view('category')).toEqual(['tagged'])
    expect(view('calendar')).toContain('today')
  })

  it('searches titles, descriptions and categories', () => {
    const rows = [
      task({ id: 'a', title: 'Water basil', description: 'Balcony plant' }),
      task({ id: 'b', title: 'Pay rent', category: 'Home' }),
    ]
    expect(filterTasks(rows, { view: 'all', query: 'balcony' }).map((row) => row.id)).toEqual(['a'])
    expect(filterTasks(rows, { view: 'all', query: 'home' }).map((row) => row.id)).toEqual(['b'])
  })

  it('excludes unscheduled tasks from progress and reports unavailable when none are scheduled', () => {
    expect(scheduledProgress([task({ completed: true })], now).available).toBe(false)
    const rows = [
      task({ id: 'a', dueDate: '2026-11-22', completed: true }),
      task({ id: 'b', dueDate: '2026-11-22' }),
      task({ id: 'c', completed: true }),
    ]
    expect(scheduledProgress(rows, now)).toMatchObject({ completed: 1, total: 2, percent: 50, available: true })
  })

  it('counts only real completion instants and overdue tasks', () => {
    const rows = [
      task({ completed: true, completedAt: '2026-11-22T10:00:00.000Z' }),
      task({ completed: true }),
      task({ dueDate: '2026-11-20' }),
    ]
    expect(completionSeries(rows, 7, now)[6]).toEqual({ label: '22', captured: 3, completed: 1 })
    expect(overdueCount(rows, now)).toBe(1)
    expect(priorityDistribution(rows).medium).toBe(3)
  })

  it('keeps subtasks independent', () => {
    const rows = [
      { id: 'a', title: 'Step one', completed: true },
      { id: 'b', title: 'Step two', completed: false },
    ]
    expect(subtaskProgress(rows)).toMatchObject({ completed: 1, total: 2, percent: 50 })
  })

  it('materialises bounded recurring occurrences without rewriting the parent', () => {
    const parent = task({
      id: 'root',
      title: 'Water plants',
      dueDate: '2026-11-22',
      recurrence: { frequency: 'weekly', interval: 1, count: 2 },
    })
    const first = nextOccurrence(parent, [parent], now)
    expect(first).toMatchObject({ dueDate: '2026-11-29', recurrenceParentId: 'root', completed: false })
    expect(first?.id).not.toBe(parent.id)
    expect(parent.dueDate).toBe('2026-11-22')

    const second = nextOccurrence(parent, [parent, first!], now)
    expect(second).toBeNull()
  })

  it('honours an end date for recurrence', () => {
    const parent = task({
      dueDate: '2026-11-22',
      recurrence: { frequency: 'daily', interval: 1, until: '2026-11-23' },
    })
    expect(nextOccurrence(parent, [parent], now)?.dueDate).toBe('2026-11-23')
    expect(nextOccurrence(parent, [parent, task({ dueDate: '2026-11-23', recurrenceParentId: parent.id })], now)).toBeNull()
  })
})
