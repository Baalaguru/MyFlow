import {
  db,
  type CyclingSessionRecord,
  type JumpRopeSessionRecord,
  type StepGoalRecord,
  type StepRecordRecord,
  type WalkingSessionRecord,
} from '../db'
import {
  cyclingAverageSpeedKmh,
  localDateKey,
  metCalories,
  nonNegative,
  type CalorieBasis,
  type CountSource,
  type SourceQuality,
  type StepSource,
} from '../cardio'

export function newId(): string {
  return crypto.randomUUID()
}

function text(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function optionalText(value: string | null | undefined): string | undefined {
  return text(value) || undefined
}

function validDate(value: string | null | undefined, fallback?: string): string {
  const raw = text(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (fallback && /^\d{4}-\d{2}-\d{2}$/.test(fallback)) return fallback
  return localDateKey(new Date())
}

function validTimestamp(value: string | null | undefined, fallback?: string): string {
  if (value) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  if (fallback) {
    const parsed = new Date(fallback)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return new Date().toISOString()
}

function validTimePart(value: string | null | undefined): string {
  const raw = text(value)
  return /^\d{2}:\d{2}$/.test(raw) ? raw : '09:00'
}

export function combineDateTime(localDate: string, time: string): string {
  const parsed = new Date(`${validDate(localDate)}T${validTimePart(time)}:00`)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export function timePart(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '09:00'
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`
}

function elapsedSeconds(startedAt: string, endedAt: string): number {
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.round((end - start) / 1000)
}

function seconds(value: number | null | undefined, fallbackSeconds = 0): number {
  if (!Number.isFinite(value) || (value as number) < 0) return fallbackSeconds
  return Math.round(value as number)
}

function measure(value: number | null | undefined): number | null {
  return Number.isFinite(value) && (value as number) > 0 ? (value as number) : null
}

function weight(value: number | null | undefined): number | null {
  return measure(value)
}

function validStepSource(value: StepSource | null | undefined): StepSource {
  return value === 'sensor' || value === 'session' ? value : 'manual'
}

function validWalkingSource(value: 'manual' | 'sensor' | null | undefined): 'manual' | 'sensor' {
  return value === 'sensor' ? 'sensor' : 'manual'
}

function validCountSource(value: CountSource | null | undefined): CountSource {
  return value === 'sensor_assisted' ? 'sensor_assisted' : 'manual'
}

function validSourceQuality(value: SourceQuality | null | undefined): SourceQuality {
  return value === 'gps_accepted' || value === 'gps_filtered' || value === 'unavailable'
    ? value
    : 'manual'
}

export interface StepRecordInput {
  localDate: string
  stepCount: number
  source?: StepSource
  sourceEventId?: string
  createdAt?: string
}

export function normaliseStepRecord(input: StepRecordInput & Partial<Pick<StepRecordRecord, 'id'>>): StepRecordRecord {
  return {
    id: input.id || newId(),
    localDate: validDate(input.localDate),
    stepCount: Math.round(nonNegative(input.stepCount)),
    source: validStepSource(input.source),
    sourceEventId: optionalText(input.sourceEventId) || newId(),
    createdAt: validTimestamp(input.createdAt),
  }
}

export async function listStepRecords(): Promise<StepRecordRecord[]> {
  const rows = await db.stepRecords.toArray()
  return rows.sort((a, b) => b.localDate.localeCompare(a.localDate) || a.createdAt.localeCompare(b.createdAt))
}

export async function listStepRecordsByDate(localDate: string): Promise<StepRecordRecord[]> {
  const rows = await db.stepRecords.where('localDate').equals(validDate(localDate)).toArray()
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Append-only: a repeated source/date/event identity is rejected, never overwritten. */
export async function addStepRecord(input: StepRecordInput): Promise<boolean> {
  const record = normaliseStepRecord(input)
  const existing = await db.stepRecords
    .where('[source+localDate+sourceEventId]')
    .equals([record.source, record.localDate, record.sourceEventId])
    .first()
  if (existing) return false
  await db.stepRecords.add(record)
  return true
}

export function stepGoalId(localDate: string): string {
  return `goal:${validDate(localDate)}`
}

export async function listStepGoals(): Promise<StepGoalRecord[]> {
  const rows = await db.stepGoals.toArray()
  return rows.sort((a, b) => a.localDate.localeCompare(b.localDate))
}

export async function getStepGoal(localDate: string): Promise<StepGoalRecord | undefined> {
  return db.stepGoals.get(stepGoalId(localDate))
}

export async function setStepGoal(localDate: string, stepGoal: number): Promise<StepGoalRecord> {
  const date = validDate(localDate)
  const record: StepGoalRecord = {
    id: stepGoalId(date),
    localDate: date,
    stepGoal: Math.round(nonNegative(stepGoal)),
    updatedAt: new Date().toISOString(),
  }
  await db.stepGoals.put(record)
  return record
}

export interface WalkingSessionInput {
  id?: string
  localDate: string
  startedAt?: string
  endedAt?: string
  stepCount?: number
  durationSeconds?: number
  distanceMeters?: number | null
  bodyWeightKg?: number | null
  calories?: number | null
  source?: 'manual' | 'sensor'
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export function normaliseWalkingSession(
  input: WalkingSessionInput & Partial<Pick<WalkingSessionRecord, 'id'>>,
): WalkingSessionRecord {
  const startedAt = validTimestamp(input.startedAt)
  const endedAt = validTimestamp(input.endedAt, startedAt)
  const durationSeconds = input.durationSeconds === undefined || input.durationSeconds === null
    ? elapsedSeconds(startedAt, endedAt)
    : seconds(input.durationSeconds)
  const explicitCalories = measure(input.calories)
  const bodyWeightKg = weight(input.bodyWeightKg)
  const estimated = explicitCalories === null
    ? metCalories('walking', bodyWeightKg, durationSeconds)
    : null
  let calorieBasis: CalorieBasis = 'unavailable'
  if (explicitCalories !== null) calorieBasis = 'manual'
  else if (estimated !== null) calorieBasis = 'metWalking'
  return {
    id: input.id || newId(),
    localDate: validDate(input.localDate, localDateKey(new Date(startedAt))),
    startedAt,
    endedAt,
    stepCount: Math.round(nonNegative(input.stepCount)),
    durationSeconds,
    distanceMeters: measure(input.distanceMeters),
    calories: explicitCalories ?? estimated,
    bodyWeightKg,
    calorieBasis: calorieBasis as WalkingSessionRecord['calorieBasis'],
    source: validWalkingSource(input.source),
    notes: optionalText(input.notes),
    createdAt: validTimestamp(input.createdAt),
    updatedAt: validTimestamp(input.updatedAt),
  }
}

export async function listWalkingSessions(): Promise<WalkingSessionRecord[]> {
  const rows = await db.walkingSessions.toArray()
  return rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function saveWalkingSession(input: WalkingSessionInput): Promise<WalkingSessionRecord> {
  const record = normaliseWalkingSession(input)
  await db.walkingSessions.put(record)
  return record
}

export async function deleteWalkingSession(id: string): Promise<void> {
  await db.walkingSessions.delete(id)
}

export interface JumpRopeSessionInput {
  id?: string
  localDate: string
  startedAt?: string
  endedAt?: string
  durationSeconds?: number
  jumpCount?: number
  countSource?: CountSource
  rounds?: number
  restSeconds?: number
  bodyWeightKg?: number | null
  calories?: number | null
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export function normaliseJumpRopeSession(
  input: JumpRopeSessionInput & Partial<Pick<JumpRopeSessionRecord, 'id'>>,
): JumpRopeSessionRecord {
  const startedAt = validTimestamp(input.startedAt)
  const endedAt = validTimestamp(input.endedAt, startedAt)
  const durationSeconds = input.durationSeconds === undefined || input.durationSeconds === null
    ? elapsedSeconds(startedAt, endedAt)
    : seconds(input.durationSeconds)
  const explicitCalories = measure(input.calories)
  const bodyWeightKg = weight(input.bodyWeightKg)
  const estimated = explicitCalories === null
    ? metCalories('jumpRope', bodyWeightKg, durationSeconds)
    : null
  let calorieBasis: CalorieBasis = 'unavailable'
  if (explicitCalories !== null) calorieBasis = 'manual'
  else if (estimated !== null) calorieBasis = 'metJumpRope'
  return {
    id: input.id || newId(),
    localDate: validDate(input.localDate, localDateKey(new Date(startedAt))),
    startedAt,
    endedAt,
    durationSeconds,
    jumpCount: Math.round(nonNegative(input.jumpCount)),
    countSource: validCountSource(input.countSource),
    rounds: Math.round(nonNegative(input.rounds)),
    restSeconds: seconds(input.restSeconds),
    calories: explicitCalories ?? estimated,
    bodyWeightKg,
    calorieBasis: calorieBasis as JumpRopeSessionRecord['calorieBasis'],
    notes: optionalText(input.notes),
    createdAt: validTimestamp(input.createdAt),
    updatedAt: validTimestamp(input.updatedAt),
  }
}

export async function listJumpRopeSessions(): Promise<JumpRopeSessionRecord[]> {
  const rows = await db.jumpRopeSessions.toArray()
  return rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function saveJumpRopeSession(input: JumpRopeSessionInput): Promise<JumpRopeSessionRecord> {
  const record = normaliseJumpRopeSession(input)
  await db.jumpRopeSessions.put(record)
  return record
}

export async function deleteJumpRopeSession(id: string): Promise<void> {
  await db.jumpRopeSessions.delete(id)
}

export interface CyclingSessionInput {
  id?: string
  localDate: string
  startedAt?: string
  endedAt?: string
  durationSeconds?: number
  movingSeconds?: number
  pauseSeconds?: number
  stationarySeconds?: number
  distanceMeters?: number | null
  averageSpeedKmh?: number | null
  maxSpeedKmh?: number | null
  sourceQuality?: SourceQuality
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export function normaliseCyclingSession(
  input: CyclingSessionInput & Partial<Pick<CyclingSessionRecord, 'id'>>,
): CyclingSessionRecord {
  const startedAt = validTimestamp(input.startedAt)
  const endedAt = validTimestamp(input.endedAt, startedAt)
  const durationSeconds = input.durationSeconds === undefined || input.durationSeconds === null
    ? elapsedSeconds(startedAt, endedAt)
    : seconds(input.durationSeconds)
  const sourceQuality = validSourceQuality(input.sourceQuality)
  const distanceMeters = measure(input.distanceMeters)
  const movingSeconds = seconds(input.movingSeconds)
  const averageSpeedKmh = cyclingAverageSpeedKmh(distanceMeters, movingSeconds)
    ?? (sourceQuality === 'manual' ? null : measure(input.averageSpeedKmh))
  // A manual ride has no sampled speeds, so a maximum is never inferred.
  const maxSpeedKmh = sourceQuality === 'gps_accepted' ? measure(input.maxSpeedKmh) : null
  return {
    id: input.id || newId(),
    localDate: validDate(input.localDate, localDateKey(new Date(startedAt))),
    startedAt,
    endedAt,
    durationSeconds,
    movingSeconds,
    pauseSeconds: seconds(input.pauseSeconds),
    stationarySeconds: seconds(input.stationarySeconds),
    distanceMeters,
    averageSpeedKmh,
    maxSpeedKmh,
    sourceQuality,
    notes: optionalText(input.notes),
    createdAt: validTimestamp(input.createdAt),
    updatedAt: validTimestamp(input.updatedAt),
  }
}

export async function listCyclingSessions(): Promise<CyclingSessionRecord[]> {
  const rows = await db.cyclingSessions.toArray()
  return rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function saveCyclingSession(input: CyclingSessionInput): Promise<CyclingSessionRecord> {
  const record = normaliseCyclingSession(input)
  await db.cyclingSessions.put(record)
  return record
}

export async function deleteCyclingSession(id: string): Promise<void> {
  await db.cyclingSessions.delete(id)
}

export { elapsedSeconds, measure, seconds, validCountSource, validSourceQuality, validStepSource }
