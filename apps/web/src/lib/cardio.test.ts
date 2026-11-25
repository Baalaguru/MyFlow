import { describe, expect, it } from 'vitest'
import {
  cyclingAverageSpeedKmh,
  cyclingMaxSpeedKmh,
  cyclingSummary,
  combinedCardioSummary,
  cyclingTrendSeries,
  dailySteps,
  jumpRopePerformanceSeries,
  jumpRopeSummary,
  localDateKey,
  metCalories,
  nonNegative,
  positive,
  roundDisplay,
  stepGoalProgress,
  stepSeries,
  walkingDistanceSeries,
  walkingSummary,
  weeklyMonthlySeries,
  type CardioPoint,
  type CyclingSessionLike,
  type JumpRopeSessionLike,
  type StepRecordLike,
  type WalkingSessionLike,
} from './cardio'

const DATE = '2026-11-24'

function step(source: StepRecordLike['source'], eventId: string, count: number, localDate = DATE): StepRecordLike {
  return { localDate, stepCount: count, source, sourceEventId: eventId, createdAt: `${localDate}T09:00:00.000Z` }
}

function walk(patch: Partial<WalkingSessionLike> = {}): WalkingSessionLike {
  return {
    localDate: DATE,
    startedAt: `${DATE}T08:00:00.000Z`,
    endedAt: `${DATE}T08:30:00.000Z`,
    stepCount: 2500,
    durationSeconds: 1800,
    distanceMeters: 1800,
    calories: null,
    bodyWeightKg: 70,
    calorieBasis: 'metWalking',
    source: 'manual',
    ...patch,
  }
}

function jump(patch: Partial<JumpRopeSessionLike> = {}): JumpRopeSessionLike {
  return {
    localDate: DATE,
    startedAt: `${DATE}T18:00:00.000Z`,
    endedAt: `${DATE}T18:10:00.000Z`,
    durationSeconds: 600,
    jumpCount: 300,
    countSource: 'manual',
    rounds: 3,
    restSeconds: 60,
    calories: null,
    bodyWeightKg: 70,
    calorieBasis: 'metJumpRope',
    ...patch,
  }
}

function ride(patch: Partial<CyclingSessionLike> = {}): CyclingSessionLike {
  return {
    localDate: DATE,
    startedAt: `${DATE}T07:00:00.000Z`,
    endedAt: `${DATE}T07:30:00.000Z`,
    durationSeconds: 1800,
    movingSeconds: 1500,
    pauseSeconds: 300,
    stationarySeconds: 60,
    distanceMeters: 9000,
    averageSpeedKmh: 21.6,
    maxSpeedKmh: null,
    sourceQuality: 'manual',
    ...patch,
  }
}

describe('cardio primitives', () => {
  it('uses local calendar dates and display rounding', () => {
    expect(localDateKey(new Date(2026, 10, 4, 23, 59))).toBe('2026-11-04')
    expect(roundDisplay(12.25)).toBe(12.3)
    expect(roundDisplay(Number.NaN)).toBe(0)
    expect(nonNegative(-3, 5)).toBe(5)
    expect(nonNegative(0)).toBe(0)
    expect(positive(0)).toBe(1)
    expect(positive(12)).toBe(12)
  })
})

describe('dailySteps', () => {
  it('returns null when a date has no records', () => {
    expect(dailySteps([step('manual', 'a', 100, '2026-11-23')], DATE)).toBeNull()
    expect(dailySteps([], DATE)).toBeNull()
  })

  it('deduplicates by source + date + sourceEventId', () => {
    expect(dailySteps([step('manual', 'a', 100), step('manual', 'a', 100), step('manual', 'b', 50)], DATE)).toBe(150)
  })

  it('applies manual > sensor > session precedence and keeps distinct events', () => {
    expect(dailySteps([
      step('sensor', 'shared', 900),
      step('session', 'shared', 800),
      step('manual', 'shared', 1000),
      step('manual', 'second', 200),
      step('sensor', 'sensorOnly', 300),
    ], DATE)).toBe(1200)
    expect(dailySteps([step('sensor', 'shared', 900), step('session', 'shared', 800)], DATE)).toBe(900)
    expect(dailySteps([step('session', 'a', 100), step('session', 'b', 200)], DATE)).toBe(300)
  })

  it('ignores invalid counts and event identities', () => {
    expect(dailySteps([step('manual', '', 500), step('manual', 'ok', Number.NaN)], DATE)).toBeNull()
  })
})

describe('stepGoalProgress', () => {
  it('reports unavailable without both steps and a positive goal', () => {
    expect(stepGoalProgress(null, 8000)).toEqual({ available: false, percent: null, overGoal: false })
    expect(stepGoalProgress(500, null)).toEqual({ available: false, percent: null, overGoal: false })
    expect(stepGoalProgress(500, 0)).toEqual({ available: false, percent: null, overGoal: false })
  })

  it('computes percent and over-goal state', () => {
    expect(stepGoalProgress(4000, 8000)).toEqual({ available: true, percent: 50, overGoal: false })
    expect(stepGoalProgress(9000, { stepGoal: 8000 })).toEqual({ available: true, percent: 112.5, overGoal: true })
  })
})

describe('metCalories', () => {
  it('uses MET 3.5 walking and 11.8 jump rope', () => {
    expect(metCalories('walking', 70, 1800)).toBe(122.5)
    expect(metCalories('jumpRope', 70, 1800)).toBe(413)
  })

  it('returns null without sufficient assumptions', () => {
    expect(metCalories(null, 70, 1800)).toBeNull()
    expect(metCalories('walking', null, 1800)).toBeNull()
    expect(metCalories('walking', 0, 1800)).toBeNull()
    expect(metCalories('walking', 70, 0)).toBeNull()
    expect(metCalories('walking', 70, Number.NaN)).toBeNull()
  })
})

describe('cycling speed rules', () => {
  it('derives average speed only from measured distance and moving time', () => {
    expect(cyclingAverageSpeedKmh(9000, 1500)).toBe(21.6)
    expect(cyclingAverageSpeedKmh(null, 1500)).toBeNull()
    expect(cyclingAverageSpeedKmh(9000, 0)).toBeNull()
    expect(cyclingAverageSpeedKmh(-1, 1500)).toBeNull()
  })

  it('filters rejected, inaccurate, and implausible GPS samples', () => {
    expect(cyclingMaxSpeedKmh([
      { speedKmh: 18, accuracyMeters: 8, accepted: true },
      { speedKmh: 44, accuracyMeters: 12, accepted: true },
      { speedKmh: 90, accuracyMeters: 51, accepted: true },
      { speedKmh: 130, accuracyMeters: 5, accepted: true },
      { speedKmh: 200, accuracyMeters: 5, accepted: false },
    ])).toBe(44)
    expect(cyclingMaxSpeedKmh([{ speedKmh: 30, accuracyMeters: 60, accepted: true }])).toBeNull()
    expect(cyclingMaxSpeedKmh([])).toBeNull()
  })
})

describe('summaries', () => {
  it('leaves unavailable values explicit in walking summaries', () => {
    const missing = walkingSummary([], [], null, DATE)
    expect(missing.steps).toBeNull()
    expect(missing.distanceMeters).toBeNull()
    expect(missing.calories).toBeNull()
    expect(missing.calorieBasis).toBe('unavailable')
    expect(missing.goalProgress.available).toBe(false)
    expect(missing.lastSessionAt).toBeNull()

    const present = walkingSummary([walk()], [step('manual', 'a', 4000)], 8000, DATE)
    expect(present.steps).toBe(4000)
    expect(present.goalProgress).toEqual({ available: true, percent: 50, overGoal: false })
    expect(present.distanceMeters).toBe(1800)
    expect(present.durationSeconds).toBe(1800)
    expect(present.calories).toBeNull()
    expect(present.calorieBasis).toBe('metWalking')
    expect(present.sessionCount).toBe(1)
    expect(present.lastSessionAt).toBe(`${DATE}T08:30:00.000Z`)
  })

  it('summarizes jump-rope sessions and labels sensor-assisted counts honestly', () => {
    const summary = jumpRopeSummary([
      jump(),
      jump({ id: 'b', jumpCount: 120, calories: 100, calorieBasis: 'manual', countSource: 'sensor_assisted', durationSeconds: 300 }),
      jump({ id: 'c', localDate: '2026-11-23' }),
    ], DATE)
    expect(summary.sessionCount).toBe(2)
    expect(summary.jumpCount).toBe(420)
    expect(summary.durationSeconds).toBe(900)
    expect(summary.rounds).toBe(6)
    expect(summary.restSeconds).toBe(120)
    expect(summary.calories).toBe(100)
    expect(summary.calorieBasis).toBe('manual')
    expect(summary.sensorAssistedCount).toBe(1)
    expect(jumpRopeSummary([], DATE).jumpCount).toBe(0)
    expect(jumpRopeSummary([], DATE).calories).toBeNull()
  })

  it('summarizes cycling without inventing maximum speed for manual rides', () => {
    const summary = cyclingSummary([ride(), ride({ id: 'b', distanceMeters: null, averageSpeedKmh: null })], DATE)
    expect(summary.sessionCount).toBe(2)
    expect(summary.durationSeconds).toBe(3600)
    expect(summary.movingSeconds).toBe(3000)
    expect(summary.pauseSeconds).toBe(600)
    expect(summary.stationarySeconds).toBe(120)
    expect(summary.distanceMeters).toBe(9000)
    expect(summary.averageSpeedKmh).toBe(10.8)
    expect(summary.maxSpeedKmh).toBeNull()
    expect(summary.sourceQuality).toBe('manual')

    const gps = cyclingSummary([ride({ sourceQuality: 'gps_accepted', maxSpeedKmh: 32 })], DATE)
    expect(gps.maxSpeedKmh).toBe(32)
    expect(cyclingSummary([], DATE).distanceMeters).toBeNull()
  })

  it('combines cardio summaries with explicit unavailability', () => {
    const empty = combinedCardioSummary({ stepRecords: [], stepGoal: null }, DATE)
    expect(empty.sessionCount).toBe(0)
    expect(empty.distanceMeters).toBeNull()
    expect(empty.calories).toBeNull()
    expect(empty.walking.steps).toBeNull()
    expect(empty.jumpRope.calories).toBeNull()
    expect(empty.cycling.maxSpeedKmh).toBeNull()

    const full = combinedCardioSummary({
      walking: [walk({ calories: 130, calorieBasis: 'manual' })],
      jumpRope: [jump({ calories: 118 })],
      cycling: [ride()],
      stepRecords: [step('manual', 'a', 4000)],
      stepGoal: 8000,
    }, DATE)
    expect(full.sessionCount).toBe(3)
    expect(full.durationSeconds).toBe(4200)
    expect(full.distanceMeters).toBe(10800)
    expect(full.calories).toBe(248)
    expect(full.walking.goalProgress.percent).toBe(50)
  })
})

describe('cardio series', () => {
  const now = new Date(2026, 10, 24, 12, 0)

  it('keeps missing step days null rather than zero', () => {
    const points = stepSeries([step('manual', 'a', 4000, '2026-11-23')], 3, now)
    expect(points.map((point) => point.localDate)).toEqual(['2026-11-22', '2026-11-23', '2026-11-24'])
    expect(points.map((point) => point.steps)).toEqual([null, 4000, null])
  })

  it('aggregates weeks and months without inventing values', () => {
    const points: CardioPoint[] = [
      { label: '22', localDate: '2026-11-22', steps: 100, distanceMeters: 2, durationSeconds: 10, speedKmh: 12, jumps: 4 },
      { label: '23', localDate: '2026-11-23', steps: null, distanceMeters: null, durationSeconds: null, speedKmh: null, jumps: null },
      { label: '01', localDate: '2026-12-01', steps: 50, distanceMeters: 1, durationSeconds: 5, speedKmh: 10, jumps: 2 },
    ]
    const weekly = weeklyMonthlySeries(points, 'week')
    expect(weekly).toHaveLength(3)
    expect(weekly[0].steps).toBe(100)
    expect(weekly[0].localDate).toBe('2026-11-16')
    expect(weekly[1].steps).toBeNull()
    const monthly = weeklyMonthlySeries(points, 'month')
    expect(monthly.map((point) => [point.localDate, point.steps])).toEqual([['2026-11', 100], ['2026-12', 50]])
  })

  it('builds module-specific trends with available measurements', () => {
    expect(walkingDistanceSeries([walk()], 1, now)[0].distanceMeters).toBe(1800)
    expect(jumpRopePerformanceSeries([jump()], 1, now)[0].jumps).toBe(300)
    expect(cyclingTrendSeries([ride()], 1, now)[0].speedKmh).toBe(21.6)
    expect(cyclingTrendSeries([ride({ distanceMeters: null })], 1, now)[0].speedKmh).toBeNull()
    expect(walkingDistanceSeries([], 1, now)[0].durationSeconds).toBeNull()
    expect(jumpRopePerformanceSeries([], 1, now)[0].jumps).toBeNull()
    expect(jumpRopePerformanceSeries([], 1, now)[0].durationSeconds).toBeNull()
    expect(cyclingTrendSeries([], 1, now)[0].durationSeconds).toBeNull()
  })
})
