import Dexie, { type Table } from 'dexie'
import type { WidgetId } from './widgets'

export interface SettingRecord {
  key: string
  value: unknown
}

export type TaskPriority = 'veryHigh' | 'high' | 'medium' | 'low'
export type TaskStatus = 'open' | 'completed'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly'

export interface SubtaskRecord {
  id: string
  title: string
  completed: boolean
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number
  count?: number
  until?: string
}

/** Optional fields keep Phase 4 rows readable without a data rewrite. */
export interface TaskRecord {
  id: string
  title: string
  description?: string
  priority?: TaskPriority
  category?: string
  dueDate?: string
  startTime?: string
  endTime?: string
  status?: TaskStatus
  completed: boolean
  subtasks?: SubtaskRecord[]
  recurrence?: RecurrenceRule
  recurrenceParentId?: string
  reminderOffsetMinutes?: number
  createdAt: string
  completedAt?: string
}

export type HabitScheduleType = 'daily' | 'weekdays' | 'custom'
export type HabitLogStatus = 'done' | 'skipped' | 'rest'

/** Weekday mask: 0=Sun..6=Sat, matching JS Date.getDay(). */
export interface HabitSchedule {
  type: HabitScheduleType
  weekdays: number[]
}

export interface HabitRecord {
  id: string
  name: string
  description?: string
  icon?: string
  accent?: string
  schedule: HabitSchedule
  target?: number
  reminderOffsetMinutes?: number
  paused: boolean
  archived: boolean
  createdAt: string
}

export interface HabitLogRecord {
  id: string
  habitId: string
  localDate: string
  status: HabitLogStatus
  value?: number
  completedAt?: string
  createdAt: string
}

export interface MascotStateRecord {
  id: 'default'
  companion: string
  plantStyle: string
  animationsEnabled: boolean
  updatedAt: string
}

export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'fullBody' | 'other'

export interface ExerciseRecord {
  id: string
  name: string
  /** v1 single-group field kept for backward compat; prefer muscleGroups. */
  muscleGroup?: MuscleGroup
  muscleGroups: MuscleGroup[]
  notes?: string
  isCustom: boolean
  createdAt: string
}

export interface WorkoutSetRecord {
  id: string
  workoutExerciseId: string
  setNumber: number
  reps: number
  weight: number
  completed: boolean
  completedAt?: string
}

export interface WorkoutExerciseRecord {
  id: string
  workoutId: string
  exerciseId: string
  order: number
  sets: WorkoutSetRecord[]
}

export interface WorkoutRecord {
  id: string
  startedAt: string
  endedAt?: string
  note?: string
  exercises: WorkoutExerciseRecord[]
}

export interface PersonalRecordRecord {
  id: string
  exerciseId: string
  metric: 'maxWeight' | 'maxVolume' | 'maxReps'
  value: number
  achievedAt: string
  workoutId: string
  setId: string
}

export interface WidgetConfig {
  id: WidgetId
  columns: number
  rows: number
  visible: boolean
  background: string
  accent: string
}

export interface DashboardRecord {
  id: string
  name: string
  order: number
  isDefault: boolean
  widgets: WidgetConfig[]
  createdAt: string
}

class MyFlowDatabase extends Dexie {
  settings!: Table<SettingRecord, string>
  tasks!: Table<TaskRecord, string>
  dashboards!: Table<DashboardRecord, string>
  habits!: Table<HabitRecord, string>
  habitLogs!: Table<HabitLogRecord, string>
  mascotState!: Table<MascotStateRecord, string>
  exercises!: Table<ExerciseRecord, string>
  workouts!: Table<WorkoutRecord, string>
  personalRecords!: Table<PersonalRecordRecord, string>

  constructor() {
    super('myflow')
    this.version(1).stores({
      settings: 'key',
      tasks: 'id, completed, dueDate',
    })
    this.version(2).stores({
      settings: 'key',
      tasks: 'id, completed, dueDate',
      dashboards: 'id, order, isDefault',
    })
    this.version(3).stores({
      settings: 'key',
      tasks: 'id, completed, dueDate, priority, category, recurrenceParentId',
      dashboards: 'id, order, isDefault',
    })
    this.version(4).stores({
      settings: 'key',
      tasks: 'id, completed, dueDate, priority, category, recurrenceParentId',
      dashboards: 'id, order, isDefault',
      habits: 'id, paused, archived, createdAt',
      habitLogs: 'id, habitId, localDate, [habitId+localDate], status',
      mascotState: 'id',
    })
    this.version(5).stores({
      settings: 'key',
      tasks: 'id, completed, dueDate, priority, category, recurrenceParentId',
      dashboards: 'id, order, isDefault',
      habits: 'id, paused, archived, createdAt',
      habitLogs: 'id, habitId, localDate, [habitId+localDate], status',
      mascotState: 'id',
      exercises: 'id, name, muscleGroup, isCustom, createdAt',
      workouts: 'id, startedAt, endedAt',
      personalRecords: 'id, exerciseId, metric, achievedAt, [exerciseId+metric]',
    })
  }
}

export const db = new MyFlowDatabase()

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}
