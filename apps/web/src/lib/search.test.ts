import { describe, expect, it } from 'vitest'
import type { TaskRecord } from './db'
import { searchLocalRecords, taskMatches, taskToResult } from './search'

const task: TaskRecord = {
  id: 'task-1',
  title: 'Water the basil plant',
  completed: false,
  createdAt: '2026-11-22T10:00:00.000Z',
}

describe('local search projection', () => {
  it('matches titles case-insensitively and ignores surrounding whitespace', () => {
    expect(taskMatches(task, '  BASIL  ')).toBe(true)
    expect(taskMatches(task, 'missing')).toBe(false)
  })

  it('maps tasks to stable deep-link results without duplicating the record', () => {
    expect(taskToResult(task)).toEqual({
      id: 'task:task-1',
      route: 'tasks',
      title: 'Water the basil plant',
      status: 'open',
    })
  })

  it('returns nothing for a blank query', async () => {
    expect(await searchLocalRecords('   ')).toEqual([])
  })
})
