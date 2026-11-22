import { describe, expect, it } from 'vitest'
import { calculateProgress, unavailableProgress } from './progress'

describe('progress calculation', () => {
  it('marks an empty module as unavailable instead of 0%', () => {
    expect(calculateProgress(0, 0)).toEqual(unavailableProgress)
  })

  it('calculates a rounded percentage from real counts', () => {
    expect(calculateProgress(1, 4)).toEqual({ completed: 1, total: 4, percent: 25, available: true })
    expect(calculateProgress(2, 3).percent).toBe(67)
  })

  it('clamps invalid or excessive completed counts', () => {
    expect(calculateProgress(-2, 5).completed).toBe(0)
    expect(calculateProgress(9, 5).completed).toBe(5)
    expect(calculateProgress(Number.NaN, 5)).toEqual(unavailableProgress)
  })

  it('never divides by zero or negative totals', () => {
    expect(calculateProgress(3, 0)).toEqual(unavailableProgress)
    expect(calculateProgress(3, -1)).toEqual(unavailableProgress)
  })
})
