import { describe, expect, it } from 'vitest'
import type { TaskRecord } from './db'
import { completionSeries, nextOccurrence, scheduledProgress } from './tasks'
import progressFixture from '../../../../contracts/fixtures/task.progress.json'
import recurrenceFixture from '../../../../contracts/fixtures/task.recurrence.json'

interface ProgressCase {
  case: string
  input: { now: string; tasks: TaskRecord[] }
  expected: Record<string, number | null | boolean>
}

interface RecurrenceCase {
  case: string
  input: { now: string; task: TaskRecord; tasks: TaskRecord[] }
  expected: Record<string, unknown> | null
}

const progressCases = progressFixture.cases as unknown as ProgressCase[]
const recurrenceCases = recurrenceFixture.cases as unknown as RecurrenceCase[]

describe('shared task fixtures', () => {
  it('uses the scheduled-only progress denominator from the contract fixture', () => {
    for (const item of progressCases.slice(0, 2)) {
      expect(scheduledProgress(item.input.tasks, new Date(item.input.now)), item.case).toMatchObject(item.expected)
    }
  })

  it('places local midnight in one day only', () => {
    const item = progressCases[2]
    const point = completionSeries(item.input.tasks, 7, new Date(item.input.now)).at(-1)
    expect(point, item.case).toMatchObject(item.expected)
  })

  it('generates bounded recurrence occurrences from the contract fixture', () => {
    for (const item of recurrenceCases) {
      const result = nextOccurrence(item.input.task, item.input.tasks, new Date(item.input.now))
      if (item.expected === null) {
        expect(result, item.case).toBeNull()
      } else {
        expect(result, item.case).toMatchObject(item.expected)
      }
    }
  })
})
