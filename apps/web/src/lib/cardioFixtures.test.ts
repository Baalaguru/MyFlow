import { describe, expect, it } from 'vitest'
import fixture from '../../../../contracts/fixtures/cardio.metrics.json'
import { cardioFixtureResult } from './cardio'

interface CardioFixtureCase {
  rule: string
  case: string
  input: Record<string, unknown>
  expected: unknown
}

const cases = fixture.cases as unknown as CardioFixtureCase[]

describe('shared cardio metric fixtures', () => {
  it('contains all eleven contract rules', () => {
    expect(cases).toHaveLength(11)
    expect(new Set(cases.map((item) => item.rule)).size).toBe(11)
  })

  for (const item of cases) {
    it(`${item.rule}: ${item.case}`, () => {
      const actual = cardioFixtureResult(item)
      if (item.expected !== null && typeof item.expected === 'object') {
        expect(actual, item.case).toMatchObject(item.expected as Record<string, unknown>)
      } else {
        expect(actual, item.case).toBe(item.expected)
      }
    })
  }
})
