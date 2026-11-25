/**
 * Pure cardio rules. No Dexie, React, sensor, or location access lives here.
 * Measurements that were not supplied or were rejected stay null; never infer a
 * step count, distance, speed, or calorie figure from nothing.
 */

export type StepSource = 'manual' | 'sensor' | 'session'
export type CalorieBasis = 'manual' | 'metWalking' | 'metJumpRope' | 'unavailable'
export type CountSource = 'manual' | 'sensor_assisted'
export type SourceQuality = 'manual' | 'gps_accepted' | 'gps_filtered' | 'unavailable'

export interface StepRecordLike {
  id?: string
  localDate: string
  stepCount: number
  source: StepSource
  sourceEventId: string
  createdAt?: string
}

export interface WalkingSessionLike {
  id?: string
  localDate: string
  startedAt?: string
  endedAt?: string
  stepCount: number
  durationSeconds: number
  distanceMeters: number | null
  calories: number | null
  bodyWeightKg?: number | null
  calorieBasis?: CalorieBasis
  source?: 'manual' | 'sensor'
}

export interface JumpRopeSessionLike {
  id?: string
  localDate: string
  startedAt?: string
  endedAt?: string
  durationSeconds: number
  jumpCount: number
  countSource?: CountSource
  rounds: number
  restSeconds: number
  calories: number | null
  bodyWeightKg?: number | null
  calorieBasis?: CalorieBasis
}

export interface CyclingSessionLike {
  id?: string
  localDate: string
  startedAt?: string
  endedAt?: string
  durationSeconds: number
  movingSeconds: number
  pauseSeconds: number
  stationarySeconds: number
  distanceMeters: number | null
  averageSpeedKmh: number | null
  maxSpeedKmh: number | null
  sourceQuality?: SourceQuality
}

export interface SpeedSample {
  speedKmh: number
  accuracyMeters: number
  accepted?: boolean
  recordedAt?: string
  latitude?: number | null
  longitude?: number | null
}

export interface StepGoalProgress {
  available: boolean
  percent: number | null
  overGoal: boolean
}

export interface WalkingSummary {
  sessionCount: number
  steps: number | null
  durationSeconds: number
  distanceMeters: number | null
  calories: number | null
  calorieBasis: CalorieBasis
  source: 'manual' | 'sensor' | 'unavailable'
}

export interface JumpRopeSummary {
  sessionCount: number
  jumpCount: number
  durationSeconds: number
  rounds: number
  restSeconds: number
  calories: number | null
  calorieBasis: CalorieBasis
  sensorAssistedCount: number
}

export interface CyclingSummary {
  sessionCount: number
  durationSeconds: number
  movingSeconds: number
  pauseSeconds: number
  stationarySeconds: number
  distanceMeters: number | null
  averageSpeedKmh: number | null
  maxSpeedKmh: number | null
  sourceQuality: SourceQuality | 'mixed'
}

export interface CombinedCardioSummary {
  localDate: string
  distanceAvailable: boolean
  caloriesAvailable: boolean
  walking: WalkingSummary & { goalProgress: StepGoalProgress; lastSessionAt: string | null }
  jumpRope: JumpRopeSummary
  cycling: CyclingSummary
  sessionCount: number
  durationSeconds: number
  distanceMeters: number | null
  calories: number | null
}

export interface CardioPoint {
  label: string
  localDate: string
  steps: number | null
  distanceMeters: number | null
  durationSeconds: number | null
  speedKmh: number | null
  jumps: number | null
}

export const MET_WALKING = 3.5
export const MET_JUMP_ROPE = 11.8
export const GPS_MAX_ACCEPTED_ACCURACY_METERS = 50
export const GPS_MAX_ACCEPTED_SPEED_KMH = 120

const stepPrecedence: StepSource[] = ['manual', 'sensor', 'session']

export function localDateKey(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Rounding is presentation-only; all rules keep full-precision values. */
export function roundDisplay(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10) / 10
}

export function nonNegative(value: number | null | undefined, fallback = 0): number {
  return Number.isFinite(value) && (value as number) >= 0 ? (value as number) : fallback
}

export function positive(value: number | null | undefined, fallback = 1): number {
  return Number.isFinite(value) && (value as number) > 0 ? (value as number) : fallback
}

function finiteOrNull(value: number | null | undefined): number | null {
  return Number.isFinite(value) ? (value as number) : null
}

function sum(values: readonly (number | null | undefined)[]): number {
  return values.reduce<number>((total, value) => total + nonNegative(value), 0)
}

function stepSource(value: unknown): StepSource | null {
  return value === 'manual' || value === 'sensor' || value === 'session' ? value : null
}

/**
 * Deduplicates identical source/date/event identities, then applies source
 * precedence manual > sensor > session. A date with no records has no total.
 */
export function dailySteps(records: readonly StepRecordLike[], localDate: string): number | null {
  if (!Array.isArray(records) || !localDate) return null
  const seen = new Set<string>()
  const bySource: Record<StepSource, number[]> = { manual: [], sensor: [], session: [] }
  for (const record of records) {
    if (!record || record.localDate !== localDate) continue
    const source = stepSource(record.source)
    const eventId = record.sourceEventId
    if (!source || typeof eventId !== 'string' || !eventId) continue
    const identity = `${source}+${localDate}+${eventId}`
    if (seen.has(identity)) continue
    seen.add(identity)
    const count = finiteOrNull(record.stepCount)
    if (count === null || count < 0) continue
    bySource[source].push(count)
  }
  for (const source of stepPrecedence) {
    if (bySource[source].length > 0) return sum(bySource[source])
  }
  return null
}

export function stepGoalProgress(
  steps: number | null | undefined,
  goal: number | { stepGoal: number } | null | undefined,
): StepGoalProgress {
  const unavailable: StepGoalProgress = { available: false, percent: null, overGoal: false }
  const target = typeof goal === 'number' ? goal : goal?.stepGoal
  if (!Number.isFinite(target) || (target as number) <= 0) return unavailable
  if (!Number.isFinite(steps) || (steps as number) < 0) return unavailable
  const completed = steps as number
  return {
    available: true,
    percent: (completed * 100) / (target as number),
    overGoal: completed > (target as number),
  }
}

/**
 * MET estimate: kcal = MET × body mass (kg) × duration (hours).
 * Returns null whenever any assumption is missing or invalid.
 */
export function metCalories(
  kind: 'walking' | 'jumpRope' | null | undefined,
  bodyWeightKg: number | null | undefined,
  durationSeconds: number | null | undefined,
): number | null {
  const met = kind === 'walking' ? MET_WALKING : kind === 'jumpRope' ? MET_JUMP_ROPE : null
  if (met === null) return null
  if (!Number.isFinite(bodyWeightKg) || (bodyWeightKg as number) <= 0) return null
  if (!Number.isFinite(durationSeconds) || (durationSeconds as number) <= 0) return null
  return (met * (bodyWeightKg as number) * (durationSeconds as number)) / 3600
}

export function cyclingAverageSpeedKmh(
  distanceMeters: number | null | undefined,
  movingSeconds: number | null | undefined,
): number | null {
  if (!Number.isFinite(distanceMeters) || (distanceMeters as number) <= 0) return null
  if (!Number.isFinite(movingSeconds) || (movingSeconds as number) <= 0) return null
  const speed = ((distanceMeters as number) / (movingSeconds as number)) * 3.6
  return Math.round(speed * 1e9) / 1e9
}

/** Only accepted, accurate, plausible points contribute to a maximum. */
export function cyclingMaxSpeedKmh(samples: readonly SpeedSample[]): number | null {
  if (!Array.isArray(samples)) return null
  const plausible = samples.filter((sample) => {
    if (!sample || sample.accepted === false) return false
    if (sample.latitude === null || sample.longitude === null) return false
    if (sample.latitude !== undefined && !Number.isFinite(sample.latitude)) return false
    if (sample.longitude !== undefined && !Number.isFinite(sample.longitude)) return false
    if (!Number.isFinite(sample.speedKmh) || !Number.isFinite(sample.accuracyMeters)) return false
    return sample.accuracyMeters >= 0
      && sample.accuracyMeters <= GPS_MAX_ACCEPTED_ACCURACY_METERS
      && sample.speedKmh >= 0
      && sample.speedKmh <= GPS_MAX_ACCEPTED_SPEED_KMH
  })
  // Sub-second bursts from a GPS chip are not independent measurements.
  const ordered = [...plausible].sort((a, b) => (a.recordedAt ?? '').localeCompare(b.recordedAt ?? ''))
  const accepted: SpeedSample[] = []
  for (const sample of ordered) {
    if (sample.recordedAt && accepted.length > 0) {
      const previous = accepted[accepted.length - 1].recordedAt
      const gap = previous ? new Date(sample.recordedAt).getTime() - new Date(previous).getTime() : Number.NaN
      if (Number.isFinite(gap) && gap >= 0 && gap < 1000) continue
    }
    accepted.push(sample)
  }
  if (accepted.length === 0) return null
  return Math.max(...accepted.map((sample) => sample.speedKmh))
}

function dateSessions<T extends { localDate: string }>(sessions: readonly T[] | null | undefined, localDate: string): T[] {
  if (!Array.isArray(sessions) || !localDate) return []
  return sessions.filter((session) => session && session.localDate === localDate)
}

function lastTimestamp(sessions: readonly { startedAt?: string; endedAt?: string }[]): string | null {
  const stamps = sessions
    .flatMap((session) => [session?.endedAt, session?.startedAt])
    .filter((value): value is string => typeof value === 'string' && !!value)
    .sort()
  return stamps.length > 0 ? stamps[stamps.length - 1] : null
}

function combineBasis(bases: readonly CalorieBasis[]): CalorieBasis {
  if (bases.length === 0 || bases.every((basis) => basis === 'unavailable')) return 'unavailable'
  if (bases.every((basis) => basis === 'metWalking')) return 'metWalking'
  if (bases.every((basis) => basis === 'metJumpRope')) return 'metJumpRope'
  return 'manual'
}

export function walkingSummary(
  sessions: readonly WalkingSessionLike[] | null | undefined,
  stepRecords: readonly StepRecordLike[] | null | undefined,
  goal: number | { stepGoal: number } | null | undefined,
  localDate: string,
): WalkingSummary & { goalProgress: StepGoalProgress; lastSessionAt: string | null } {
  const rows = dateSessions(sessions, localDate)
  const steps = dailySteps(stepRecords ?? [], localDate)
  const knownDistances = rows.map((session) => finiteOrNull(session.distanceMeters)).filter((value): value is number => value !== null && value >= 0)
  const knownCalories = rows.map((session) => finiteOrNull(session.calories)).filter((value): value is number => value !== null && value >= 0)
  const bases = rows.map((session) => session.calorieBasis ?? (session.calories === null ? 'unavailable' : 'manual'))
  const sources: ('manual' | 'sensor')[] = rows.map((session) => (session.source === 'sensor' ? 'sensor' : 'manual'))
  return {
    sessionCount: rows.length,
    steps,
    goalProgress: stepGoalProgress(steps, goal),
    durationSeconds: sum(rows.map((session) => session.durationSeconds)),
    distanceMeters: knownDistances.length > 0 ? sum(knownDistances) : null,
    calories: knownCalories.length > 0 ? sum(knownCalories) : null,
    calorieBasis: combineBasis(bases),
    source: sources.length === 0 ? 'unavailable' : (sources[0] === 'sensor' && sources.every((source) => source === 'sensor') ? 'sensor' : 'manual'),
    lastSessionAt: lastTimestamp(rows),
  }
}

export function jumpRopeSummary(
  sessions: readonly JumpRopeSessionLike[] | null | undefined,
  localDate: string,
): JumpRopeSummary & { lastSessionAt: string | null } {
  const rows = dateSessions(sessions, localDate)
  const knownCalories = rows.map((session) => finiteOrNull(session.calories)).filter((value): value is number => value !== null && value >= 0)
  return {
    sessionCount: rows.length,
    jumpCount: sum(rows.map((session) => session.jumpCount)),
    durationSeconds: sum(rows.map((session) => session.durationSeconds)),
    rounds: sum(rows.map((session) => session.rounds)),
    restSeconds: sum(rows.map((session) => session.restSeconds)),
    calories: knownCalories.length > 0 ? sum(knownCalories) : null,
    calorieBasis: combineBasis(rows.map((session) => session.calorieBasis ?? (session.calories === null ? 'unavailable' : 'manual'))),
    sensorAssistedCount: rows.filter((session) => session.countSource === 'sensor_assisted').length,
    lastSessionAt: lastTimestamp(rows),
  }
}

export function cyclingSummary(
  sessions: readonly CyclingSessionLike[] | null | undefined,
  localDate: string,
): CyclingSummary & { lastSessionAt: string | null } {
  const rows = dateSessions(sessions, localDate)
  const knownDistances = rows.map((session) => finiteOrNull(session.distanceMeters)).filter((value): value is number => value !== null && value >= 0)
  const knownMaxSpeeds = rows.map((session) => finiteOrNull(session.maxSpeedKmh)).filter((value): value is number => value !== null && value >= 0)
  const movingSeconds = sum(rows.map((session) => session.movingSeconds))
  const distanceMeters = knownDistances.length > 0 ? sum(knownDistances) : null
  const qualities = new Set(rows.map((session) => session.sourceQuality ?? 'manual'))
  return {
    sessionCount: rows.length,
    durationSeconds: sum(rows.map((session) => session.durationSeconds)),
    movingSeconds,
    pauseSeconds: sum(rows.map((session) => session.pauseSeconds)),
    stationarySeconds: sum(rows.map((session) => session.stationarySeconds)),
    distanceMeters,
    averageSpeedKmh: cyclingAverageSpeedKmh(distanceMeters, movingSeconds),
    maxSpeedKmh: knownMaxSpeeds.length > 0 ? Math.max(...knownMaxSpeeds) : null,
    sourceQuality: qualities.size === 0 ? 'unavailable' : qualities.size > 1 ? 'mixed' : ([...qualities][0] as SourceQuality),
    lastSessionAt: lastTimestamp(rows),
  }
}

export interface CardioSessionSets {
  walking?: readonly WalkingSessionLike[] | null
  jumpRope?: readonly JumpRopeSessionLike[] | null
  cycling?: readonly CyclingSessionLike[] | null
  stepRecords?: readonly StepRecordLike[] | null
  stepGoal?: number | { stepGoal: number } | null
}

export function combinedCardioSummary(
  sessions: CardioSessionSets | readonly (WalkingSessionLike | JumpRopeSessionLike | CyclingSessionLike)[],
  localDate: string,
): CombinedCardioSummary {
  const sets: CardioSessionSets = Array.isArray(sessions)
    ? {
      walking: sessions.filter((row): row is WalkingSessionLike => 'stepCount' in row),
      jumpRope: sessions.filter((row): row is JumpRopeSessionLike => 'jumpCount' in row),
      cycling: sessions.filter((row): row is CyclingSessionLike => 'movingSeconds' in row),
    }
    : (sessions as CardioSessionSets) ?? {}
  const walking = walkingSummary(sets.walking, sets.stepRecords, sets.stepGoal, localDate)
  const jumpRope = jumpRopeSummary(sets.jumpRope, localDate)
  const cycling = cyclingSummary(sets.cycling, localDate)
  const distances = [walking.distanceMeters, cycling.distanceMeters].filter((value): value is number => value !== null)
  const calories = [walking.calories, jumpRope.calories].filter((value): value is number => value !== null)
  return {
    localDate,
    distanceAvailable: distances.length > 0,
    caloriesAvailable: calories.length > 0,
    walking,
    jumpRope,
    cycling,
    sessionCount: walking.sessionCount + jumpRope.sessionCount + cycling.sessionCount,
    durationSeconds: walking.durationSeconds + jumpRope.durationSeconds + cycling.durationSeconds,
    distanceMeters: distances.length > 0 ? sum(distances) : null,
    calories: calories.length > 0 ? sum(calories) : null,
  }
}

function dayStart(now: Date, days: number): Date {
  const count = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - count + 1)
}

function emptyPoint(localDate: string, label: string): CardioPoint {
  return { label, localDate, steps: null, distanceMeters: null, durationSeconds: null, speedKmh: null, jumps: null }
}

/** Missing days are explicit nulls, never invented zeros. */
export function stepSeries(
  records: readonly StepRecordLike[],
  days: number,
  now = new Date(),
): CardioPoint[] {
  const first = dayStart(now, days)
  const count = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index)
    const localDate = localDateKey(day)
    const point = emptyPoint(localDate, String(day.getDate()))
    point.steps = dailySteps(records, localDate)
    return point
  })
}

export type SeriesMode = 'week' | 'month'

/** Aggregates daily points into local-calendar weeks or months without fake data. */
export function weeklyMonthlySeries(
  points: readonly CardioPoint[],
  mode: SeriesMode,
): CardioPoint[] {
  const fields = ['steps', 'distanceMeters', 'durationSeconds', 'speedKmh', 'jumps'] as const
  const buckets = new Map<string, CardioPoint>()
  for (const point of points ?? []) {
    if (!point || !/^\d{4}-\d{2}-\d{2}$/.test(point.localDate)) continue
    const date = new Date(`${point.localDate}T00:00:00`)
    if (Number.isNaN(date.getTime())) continue
    const key = mode === 'month'
      ? point.localDate.slice(0, 7)
      : localDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7)))
    const label = mode === 'month' ? key : key.slice(5)
    const bucket = buckets.get(key) ?? emptyPoint(key, label)
    for (const field of fields) {
      const value = finiteOrNull(point[field])
      if (value === null) continue
      bucket[field] = nonNegative(bucket[field]) + nonNegative(value)
    }
    buckets.set(key, bucket)
  }
  return [...buckets.values()].sort((a, b) => a.localDate.localeCompare(b.localDate))
}

export function walkingDistanceSeries(
  sessions: readonly WalkingSessionLike[],
  days: number,
  now = new Date(),
): CardioPoint[] {
  const first = dayStart(now, days)
  const count = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index)
    const localDate = localDateKey(day)
    const point = emptyPoint(localDate, String(day.getDate()))
    const rows = dateSessions(sessions, localDate)
    const distances = rows.map((row) => finiteOrNull(row.distanceMeters)).filter((value): value is number => value !== null && value >= 0)
    point.distanceMeters = distances.length > 0 ? sum(distances) : null
    point.durationSeconds = rows.length > 0 ? sum(rows.map((row) => row.durationSeconds)) : null
    return point
  })
}

export function jumpRopePerformanceSeries(
  sessions: readonly JumpRopeSessionLike[],
  days: number,
  now = new Date(),
): CardioPoint[] {
  const first = dayStart(now, days)
  const count = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index)
    const localDate = localDateKey(day)
    const point = emptyPoint(localDate, String(day.getDate()))
    const rows = dateSessions(sessions, localDate)
    point.jumps = rows.length > 0 ? sum(rows.map((row) => row.jumpCount)) : null
    point.durationSeconds = rows.length > 0 ? sum(rows.map((row) => row.durationSeconds)) : null
    return point
  })
}

export function cyclingTrendSeries(
  sessions: readonly CyclingSessionLike[],
  days: number,
  now = new Date(),
): CardioPoint[] {
  const first = dayStart(now, days)
  const count = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index)
    const localDate = localDateKey(day)
    const point = emptyPoint(localDate, String(day.getDate()))
    const rows = dateSessions(sessions, localDate)
    const distances = rows.map((row) => finiteOrNull(row.distanceMeters)).filter((value): value is number => value !== null && value >= 0)
    point.distanceMeters = distances.length > 0 ? sum(distances) : null
    point.durationSeconds = rows.length > 0 ? sum(rows.map((row) => row.durationSeconds)) : null
    point.speedKmh = cyclingAverageSpeedKmh(point.distanceMeters, sum(rows.map((row) => row.movingSeconds)))
    return point
  })
}

function readDate(input: Record<string, unknown>): string {
  return typeof input.localDate === 'string'
    ? input.localDate
    : typeof input.date === 'string' ? input.date : ''
}

function readNow(input: Record<string, unknown>): Date {
  const value = input.now
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function readDays(input: Record<string, unknown>): number {
  return Number.isFinite(input.days) ? (input.days as number) : 7
}

/** Contract fixtures may omit localDate when every row belongs to the case date. */
function withLocalDate<T extends { localDate?: string }>(rows: unknown, date: string): T[] {
  if (!Array.isArray(rows)) return []
  return (rows as readonly T[]).map((row) => ({ ...row, localDate: row.localDate ?? date }))
}

/**
 * Shared-fixture adapter. Rule names are matched semantically so the same
 * contract fixture can be consumed by both web tests and other surfaces.
 */
export function cardioFixtureResult(testCase: {
  rule?: string
  input?: Record<string, unknown>
}): unknown {
  const input = testCase.input ?? {}
  const rule = (testCase.rule ?? '').toLowerCase()
  const date = readDate(input)
  const records = withLocalDate<StepRecordLike>(input.records ?? input.stepRecords, date)
  const walking = withLocalDate<WalkingSessionLike>(input.walkingSessions ?? input.walking, date)
  const jumpRope = withLocalDate<JumpRopeSessionLike>(input.jumpRopeSessions ?? input.jumpRope, date)
  const cycling = withLocalDate<CyclingSessionLike>(input.cyclingSessions ?? input.cycling, date)

  if (rule.includes('round')) return roundDisplay((input.value ?? input.number ?? 0) as number)
  if (rule.includes('localdate') || rule.includes('local.date')) {
    return localDateKey(readNow(input))
  }
  if (rule.includes('nonnegative')) return nonNegative((input.value ?? input.number ?? 0) as number)
  if (rule.includes('positive')) return positive((input.value ?? input.number ?? 1) as number)
  if (rule.includes('goal')) return stepGoalProgress((input.dailySteps ?? input.steps ?? null) as number | null, (input.goal ?? input.stepGoal ?? null) as number | { stepGoal: number } | null)
  if (rule.includes('step')) return dailySteps(records, date)
  if (rule.includes('met')) {
    const kind = (input.kind ?? null) as 'walking' | 'jumpRope' | null
    const weightKg = (input.bodyWeightKg ?? null) as number | null
    const walkingRow = input.walking as { durationSeconds?: number; bodyWeightKg?: number } | undefined
    const jumpRow = input.jumpRope as { durationSeconds?: number; bodyWeightKg?: number } | undefined
    if (walkingRow || jumpRow) {
      return {
        walking: metCalories('walking', walkingRow?.bodyWeightKg ?? weightKg, walkingRow?.durationSeconds ?? null),
        jumpRope: metCalories('jumpRope', jumpRow?.bodyWeightKg ?? weightKg, jumpRow?.durationSeconds ?? null),
      }
    }
    return metCalories(kind, weightKg, (input.durationSeconds ?? null) as number | null)
  }
  if (rule.includes('maxspeed') || rule.includes('max.speed')) return cyclingMaxSpeedKmh((input.points ?? input.samples ?? []) as SpeedSample[])
  if (rule.includes('pause')) {
    const duration = (input.durationSeconds ?? 0) as number
    const pause = (input.pauseSeconds ?? 0) as number
    const stationary = (input.stationarySeconds ?? 0) as number
    if (rule.includes('summary')) return cyclingSummary([{
      localDate: date,
      durationSeconds: duration,
      movingSeconds: duration - pause - stationary,
      pauseSeconds: pause,
      stationarySeconds: stationary,
      distanceMeters: (input.distanceMeters ?? null) as number | null,
      averageSpeedKmh: null,
      maxSpeedKmh: null,
      sourceQuality: 'manual',
    }], date)
    const movingSeconds = duration - pause - stationary
    return {
      movingSeconds,
      averageSpeedKmh: cyclingAverageSpeedKmh((input.distanceMeters ?? null) as number | null, movingSeconds),
    }
  }
  if (rule.includes('averagespeed') || rule.includes('average.speed') || rule.includes('avg.speed')) {
    return cyclingAverageSpeedKmh((input.distanceMeters ?? null) as number | null, (input.movingSeconds ?? null) as number | null)
  }
  if (rule.includes('countsource') && !rule.includes('summary')) {
    return {
      jumpCount: (input.jumpCount ?? 0) as number,
      countSource: (input.countSource ?? 'manual') as CountSource,
      verified: false,
    }
  }
  if (rule.includes('jump') && rule.includes('summary')) return jumpRopeSummary(jumpRope, date)
  if (rule.includes('walking') && rule.includes('summary')) return walkingSummary(walking, records, (input.goal ?? input.stepGoal ?? null) as number | null, date)
  if (rule.includes('cycling') && rule.includes('summary')) return cyclingSummary(cycling, date)
  if (rule.includes('combined') || rule.includes('summary')) {
    return combinedCardioSummary({ walking, jumpRope, cycling, stepRecords: records, stepGoal: (input.goal ?? input.stepGoal ?? null) as number | null }, date)
  }
  if (rule.includes('weekly') || rule.includes('monthly')) {
    const points = (input.points ?? stepSeries(records, readDays(input), readNow(input))) as CardioPoint[]
    return weeklyMonthlySeries(points, rule.includes('month') ? 'month' : 'week')
  }
  if (rule.includes('series') && rule.includes('step')) return stepSeries(records, readDays(input), readNow(input))
  if (rule.includes('series') && rule.includes('jump')) return jumpRopePerformanceSeries(jumpRope, readDays(input), readNow(input))
  if (rule.includes('series') && rule.includes('cycl')) return cyclingTrendSeries(cycling, readDays(input), readNow(input))
  if (rule.includes('distance')) return walkingDistanceSeries(walking, readDays(input), readNow(input))
  if (rule.includes('step')) return dailySteps(records, date)
  throw new Error(`unknown cardio fixture rule: ${testCase.rule ?? ''}`)
}
