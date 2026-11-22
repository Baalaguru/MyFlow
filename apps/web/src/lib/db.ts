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
