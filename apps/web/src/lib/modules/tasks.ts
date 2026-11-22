import { db, type RecurrenceRule, type SubtaskRecord, type TaskPriority, type TaskRecord } from '../db'
import { nextOccurrence, scheduledProgress } from '../tasks'
import type { ProgressSnapshot } from '../progress'

export interface TaskInput {
  title: string
  description?: string
  priority?: TaskPriority
  category?: string
  dueDate?: string
  startTime?: string
  endTime?: string
  subtasks?: SubtaskRecord[]
  recurrence?: RecurrenceRule
  reminderOffsetMinutes?: number
}

/** Legacy Phase 4 records had only id/title/completed/createdAt, so reads are normalised. */
export function normaliseTask(row: TaskRecord): TaskRecord {
  return {
    ...row,
    priority: row.priority ?? 'medium',
    status: row.status ?? (row.completed ? 'completed' : 'open'),
    subtasks: row.subtasks ?? [],
    completed: row.completed === true,
  }
}

function newId(): string {
  return crypto.randomUUID()
}

export async function addTask(input: TaskInput | string): Promise<TaskRecord> {
  const source: TaskInput = typeof input === 'string' ? { title: input } : input
  const title = source.title.trim()
  if (!title) throw new Error('empty task title')
  const record: TaskRecord = normaliseTask({
    id: newId(),
    title,
    description: source.description?.trim() || undefined,
    priority: source.priority ?? 'medium',
    category: source.category?.trim() || undefined,
    dueDate: source.dueDate || undefined,
    startTime: source.startTime || undefined,
    endTime: source.endTime || undefined,
    completed: false,
    status: 'open',
    subtasks: (source.subtasks ?? []).map((item) => ({ ...item, id: item.id || newId() })),
    recurrence: source.recurrence,
    reminderOffsetMinutes: source.reminderOffsetMinutes,
    createdAt: new Date().toISOString(),
  })
  await db.tasks.add(record)
  return record
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<void> {
  const clean: Partial<TaskRecord> = { ...patch }
  if (typeof clean.title === 'string') clean.title = clean.title.trim()
  if (!clean.title) delete clean.title
  await db.tasks.update(id, clean)
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id)
}

export async function listTasks(): Promise<TaskRecord[]> {
  const rows = await db.tasks.toArray()
  return rows
    .map(normaliseTask)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function toggleTask(id: string): Promise<void> {
  const [row, all] = await Promise.all([db.tasks.get(id), db.tasks.toArray()])
  if (!row) return
  const task = normaliseTask(row)
  const completed = !task.completed
  const now = new Date().toISOString()
  await db.tasks.update(id, {
    completed,
    status: completed ? 'completed' : 'open',
    completedAt: completed ? now : undefined,
  })
  if (completed) {
    const occurrence = nextOccurrence(task, all.map(normaliseTask), new Date())
    if (occurrence) await db.tasks.add(occurrence)
  }
}

export async function addSubtask(id: string, title: string): Promise<void> {
  const trimmed = title.trim()
  if (!trimmed) return
  const row = await db.tasks.get(id)
  if (!row) return
  const task = normaliseTask(row)
  await db.tasks.update(id, {
    subtasks: [...(task.subtasks ?? []), { id: newId(), title: trimmed, completed: false }],
  })
}

export async function toggleSubtask(id: string, subtaskId: string): Promise<void> {
  const row = await db.tasks.get(id)
  if (!row) return
  const task = normaliseTask(row)
  await db.tasks.update(id, {
    subtasks: (task.subtasks ?? []).map((item) =>
      item.id === subtaskId ? { ...item, completed: !item.completed } : item,
    ),
  })
}

export async function removeSubtask(id: string, subtaskId: string): Promise<void> {
  const row = await db.tasks.get(id)
  if (!row) return
  const task = normaliseTask(row)
  await db.tasks.update(id, { subtasks: (task.subtasks ?? []).filter((item) => item.id !== subtaskId) })
}

export async function taskProgress(): Promise<ProgressSnapshot> {
  return scheduledProgress(await listTasks())
}
