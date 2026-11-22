import { db, type TaskRecord } from '../db'
import { calculateProgress, type ProgressSnapshot } from '../progress'

export async function addTask(title: string): Promise<void> {
  const trimmed = title.trim()
  if (!trimmed) return
  await db.tasks.add({
    id: crypto.randomUUID(),
    title: trimmed,
    completed: false,
    createdAt: new Date().toISOString(),
  })
}

export async function listTasks(): Promise<TaskRecord[]> {
  const tasks = await db.tasks.toArray()
  return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function toggleTask(id: string): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task) return
  const completed = !task.completed
  await db.tasks.update(id, {
    completed,
    completedAt: completed ? new Date().toISOString() : undefined,
  })
}

export async function taskProgress(): Promise<ProgressSnapshot> {
  const tasks = await db.tasks.toArray()
  return calculateProgress(
    tasks.filter((task) => task.completed).length,
    tasks.length,
  )
}
