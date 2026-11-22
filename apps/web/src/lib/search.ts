import { db, type TaskRecord } from './db'
import type { RouteId } from './routes'

export interface SearchResult {
  id: string
  route: RouteId
  title: string
  status: 'open' | 'completed'
}

export function taskMatches(task: TaskRecord, query: string): boolean {
  const normalised = query.trim().toLocaleLowerCase()
  if (!normalised) return false
  const haystack = `${task.title} ${task.description ?? ''} ${task.category ?? ''}`.toLocaleLowerCase()
  return haystack.includes(normalised)
}

export function taskToResult(task: TaskRecord): SearchResult {
  return {
    id: `task:${task.id}`,
    route: 'tasks',
    title: task.title,
    status: task.completed ? 'completed' : 'open',
  }
}

/** Local read-only projection. Tasks remain the only indexed record type. */
export async function searchLocalRecords(query: string, limit = 8): Promise<SearchResult[]> {
  const normalised = query.trim().toLocaleLowerCase()
  if (!normalised) return []

  const tasks = await db.tasks.toArray()
  return tasks
    .filter((task) => taskMatches(task, normalised))
    .slice(0, limit)
    .map(taskToResult)
}
