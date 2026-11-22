export interface ProgressSnapshot {
  completed: number
  total: number
  percent: number | null
  available: boolean
}

export const unavailableProgress: ProgressSnapshot = {
  completed: 0,
  total: 0,
  percent: null,
  available: false,
}

/** Returns null percent when there is no goal, so the UI cannot imply false completion. */
export function calculateProgress(completed: number, total: number): ProgressSnapshot {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) {
    return { ...unavailableProgress }
  }

  const safeTotal = Math.floor(total)
  const safeCompleted = Math.max(0, Math.min(Math.floor(completed), safeTotal))
  return {
    completed: safeCompleted,
    total: safeTotal,
    percent: Math.round((safeCompleted / safeTotal) * 100),
    available: true,
  }
}
