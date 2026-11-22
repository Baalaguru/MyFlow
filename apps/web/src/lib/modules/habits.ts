import { db, type HabitLogRecord, type HabitLogStatus, type HabitRecord } from '../db'
import { localDateKey, normaliseSchedule } from '../habits'

export interface HabitInput {
  name: string
  description?: string
  icon?: string
  accent?: string
  schedule: HabitRecord['schedule']
  target?: number
  reminderOffsetMinutes?: number
  paused?: boolean
  archived?: boolean
}

function newId(): string {
  return crypto.randomUUID()
}

export function normaliseHabit(row: HabitRecord): HabitRecord {
  return {
    ...row,
    schedule: normaliseSchedule(row.schedule),
    paused: row.paused === true,
    archived: row.archived === true,
  }
}

export async function listHabits(): Promise<HabitRecord[]> {
  const rows = await db.habits.toArray()
  return rows.map(normaliseHabit).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function listHabitLogs(): Promise<HabitLogRecord[]> {
  return db.habitLogs.toArray()
}

export async function createHabit(input: HabitInput): Promise<HabitRecord> {
  const name = input.name.trim()
  if (!name) throw new Error('empty habit name')
  const record: HabitRecord = {
    id: newId(),
    name,
    description: input.description?.trim() || undefined,
    icon: input.icon?.trim() || undefined,
    accent: input.accent?.trim() || undefined,
    schedule: normaliseSchedule(input.schedule),
    target: input.target,
    reminderOffsetMinutes: input.reminderOffsetMinutes,
    paused: input.paused === true,
    archived: input.archived === true,
    createdAt: new Date().toISOString(),
  }
  await db.habits.add(record)
  return record
}

export async function updateHabit(id: string, patch: Partial<HabitInput>): Promise<void> {
  const current = await db.habits.get(id)
  if (!current) return
  const next: Partial<HabitRecord> = { ...patch }
  if (typeof next.name === 'string') next.name = next.name.trim()
  if (next.name === '') delete next.name
  if (patch.schedule) next.schedule = normaliseSchedule(patch.schedule)
  if (typeof next.description === 'string') next.description = next.description.trim() || undefined
  await db.habits.update(id, next)
}

export async function deleteHabit(id: string): Promise<void> {
  await db.transaction('rw', db.habits, db.habitLogs, async () => {
    await db.habits.delete(id)
    await db.habitLogs.where('habitId').equals(id).delete()
  })
}

export async function setHabitPaused(id: string, paused: boolean): Promise<void> {
  await db.habits.update(id, { paused })
}

export async function setHabitArchived(id: string, archived: boolean): Promise<void> {
  await db.habits.update(id, { archived, paused: archived ? false : undefined })
}

export async function setHabitLog(habitId: string, localDate: string, status: HabitLogStatus, value?: number): Promise<void> {
  const existing = await db.habitLogs.where('[habitId+localDate]').equals([habitId, localDate]).first()
  const now = new Date().toISOString()
  const record: HabitLogRecord = {
    id: existing?.id ?? newId(),
    habitId,
    localDate,
    status,
    value: status === 'done' ? value : undefined,
    completedAt: status === 'done' ? now : undefined,
    createdAt: existing?.createdAt ?? now,
  }
  await db.habitLogs.put(record)
}

export async function clearHabitLog(habitId: string, localDate: string): Promise<void> {
  await db.habitLogs.where('[habitId+localDate]').equals([habitId, localDate]).delete()
}

export async function getMascotState() {
  const row = await db.mascotState.get('default')
  return (
    row ?? {
      id: 'default' as const,
      companion: 'sprout',
      plantStyle: 'fern',
      animationsEnabled: true,
      updatedAt: new Date().toISOString(),
    }
  )
}

export async function saveMascotState(patch: Partial<{ companion: string; plantStyle: string; animationsEnabled: boolean }>) {
  const current = await getMascotState()
  await db.mascotState.put({ ...current, ...patch, id: 'default', updatedAt: new Date().toISOString() })
}

export function todayKey(now = new Date()): string {
  return localDateKey(now)
}