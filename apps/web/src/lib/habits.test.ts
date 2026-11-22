import { describe, expect, it } from 'vitest'
import type { HabitLogRecord, HabitRecord } from './db'
import { aggregateCompletion, calculateStreaks, completionForRange, habitHeatmap, mascotStageFromCompletions } from './habits'

function habit(partial: Partial<HabitRecord> = {}): HabitRecord {
  return {
    id: 'h1',
    name: 'Read',
    schedule: { type: 'daily', weekdays: [0, 1, 2, 3, 4, 5, 6] },
    paused: false,
    archived: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    ...partial,
  }
}

function log(localDate: string, status: HabitLogRecord['status'], habitId = 'h1'): HabitLogRecord {
  return { id: `${habitId}-${localDate}`, habitId, localDate, status, createdAt: `${localDate}T08:00:00.000Z` }
}

describe('habit rules', () => {
  it('treats skipped and rest days as non-breaking, but missed scheduled days break streaks', () => {
    const h = habit()
    const logs = [log('2026-11-01', 'done'), log('2026-11-02', 'skipped'), log('2026-11-03', 'rest'), log('2026-11-04', 'done')]
    expect(calculateStreaks(h, logs, new Date('2026-11-04T12:00:00'))).toEqual({ currentStreak: 2, longestStreak: 2 })

    const broken = [...logs, log('2026-11-06', 'done')]
    // 2026-11-05 scheduled and missed => break
    expect(calculateStreaks(h, broken, new Date('2026-11-06T12:00:00')).currentStreak).toBe(1)
  })

  it('recomputes streaks from history when schedule changes', () => {
    const h = habit({ schedule: { type: 'weekdays', weekdays: [1, 3, 5] } }) // Mon/Wed/Fri
    // 2026-11-02 Mon, 2026-11-03 Tue unscheduled, 2026-11-04 Wed
    const logs = [log('2026-11-02', 'done'), log('2026-11-03', 'done'), log('2026-11-04', 'done')]
    // Tuesday log is on an unscheduled day; it should not break or count toward scheduled streak.
    expect(calculateStreaks(h, logs, new Date('2026-11-04T12:00:00'))).toEqual({ currentStreak: 2, longestStreak: 2 })
  })

  it('uses scheduled days as completion denominator', () => {
    const h = habit({ schedule: { type: 'weekdays', weekdays: [1, 2, 3, 4, 5] } })
    const logs = [log('2026-11-03', 'done'), log('2026-11-04', 'skipped')] // Mon done, Tue skipped
    const progress = completionForRange(h, logs, ['2026-11-03', '2026-11-04', '2026-11-08']) // Mon,Tue,Sat(unscheduled)
    expect(progress).toMatchObject({ available: true, completed: 1, total: 2, percent: 50 })
  })

  it('returns unavailable aggregate completion when nothing is scheduled', () => {
    const h = habit({ paused: true })
    expect(aggregateCompletion([h], [], 7, new Date('2026-11-10T12:00:00')).available).toBe(false)
  })

  it('builds heatmap cells with explicit statuses', () => {
    const h = habit()
    const cells = habitHeatmap(h, [log('2026-11-09', 'done')], 3, new Date('2026-11-10T12:00:00'))
    expect(cells).toHaveLength(3)
    expect(cells.find((c) => c.localDate === '2026-11-09')?.status).toBe('done')
  })

  it('derives mascot stage from completed days without regression', () => {
    expect(mascotStageFromCompletions(0)).toBe('seed')
    expect(mascotStageFromCompletions(5)).toBe('sprout')
    expect(mascotStageFromCompletions(14)).toBe('bloom')
    expect(mascotStageFromCompletions(30)).toBe('grove')
  })
})