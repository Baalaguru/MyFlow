import Dexie, { type Table } from 'dexie'

export interface SettingRecord {
  key: string
  value: unknown
}

export interface TaskRecord {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  createdAt: string
}

class MyFlowDatabase extends Dexie {
  settings!: Table<SettingRecord, string>
  tasks!: Table<TaskRecord, string>

  constructor() {
    super('myflow')
    this.version(1).stores({
      settings: 'key',
      tasks: 'id, completed, dueDate',
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
