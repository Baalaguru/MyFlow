import { db, type TaskRecord } from './db'
import type { RouteId } from './routes'

export interface SearchResult {
  id: string
  route: RouteId
  title: string
  status: 'open' | 'completed'
}

export function taskMatches(task: TaskRecord, query: string): boolean {
  return task.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
}

export function taskToResult(task: TaskRecord): SearchResult {
  return {
    id: `task:${task.id}`,
    route: 'tasks',
    title: task.title,
    status: task.completed ? 'completed' : 'open',
  }
}

/** Local read-only projection. Phase 4 has a task provider only; other modules are absent. */
export async function searchLocalRecords(query: string, limit = 8): Promise<SearchResult[]> {
  const normalised = query.trim().toLocaleLowerCase()
  if (!normalised) return []

  const tasks = await db.tasks.toArray()
  return tasks
    .filter((task) => taskMatches(task, normalised))
    .slice(0, limit)
    .map(taskToResult)
}
