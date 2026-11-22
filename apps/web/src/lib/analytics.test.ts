import { describe, expect, it } from 'vitest'
import type { TaskRecord } from './db'
import { hasSeriesData, monthlyTaskSeries, weeklyTaskSeries } from './analytics'

const now = new Date('2026-11-22T12:00:00.000Z')

function task(id: string, createdAt: string, completed: boolean, completedAt?: string): TaskRecord {
  return { id, title: id, completed, createdAt, completedAt }
}

describe('dashboard analytics', () => {
  it('returns seven real days with no invented activity', () => {
    const points = weeklyTaskSeries([], now)
    expect(points).toHaveLength(7)
    expect(hasSeriesData(points)).toBe(false)
    expect(points.every((point) => point.captured === 0 && point.completed === 0)).toBe(true)
  })

  it('counts captured and completed tasks in the correct local day', () => {
    const tasks = [
      task('a', '2026-11-22T09:00:00.000Z', true, '2026-11-22T11:00:00.000Z'),
      task('b', '2026-11-22T10:00:00.000Z', false),
      task('legacy', '2026-11-22T10:30:00.000Z', true),
      task('old', '2026-10-01T10:00:00.000Z', true, '2026-10-01T11:00:00.000Z'),
    ]
    const points = weeklyTaskSeries(tasks, now)
    expect(points[6]).toEqual({ label: String(now.getDate()), captured: 3, completed: 1 })
    expect(hasSeriesData(points)).toBe(true)
  })

  it('returns six months without data when the task store is empty', () => {
    const points = monthlyTaskSeries([], now)
    expect(points).toHaveLength(6)
    expect(hasSeriesData(points)).toBe(false)
  })
})
