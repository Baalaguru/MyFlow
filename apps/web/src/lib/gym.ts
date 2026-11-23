import type {
  ExerciseRecord,
  MuscleGroup,
  PersonalRecordRecord,
  WorkoutExerciseRecord,
  WorkoutRecord,
  WorkoutSetRecord,
} from './db'
import { calculateProgress, unavailableProgress, type ProgressSnapshot } from './progress'

export const muscleGroups: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'fullBody', 'other']

export interface GymSummary {
  workoutCount: number
  totalVolume: number
  prCount: number
  lastWorkoutAt?: string
}

export function setVolume(set: Pick<WorkoutSetRecord, 'reps' | 'weight' | 'completed'>): number {
  if (!set.completed) return 0
  const reps = Number.isFinite(set.reps) ? Math.max(0, set.reps) : 0
  const weight = Number.isFinite(set.weight) ? Math.max(0, set.weight) : 0
  return reps * weight
}

export function workoutExerciseVolume(exercise: Pick<WorkoutExerciseRecord, 'sets'>): number {
  return (exercise.sets ?? []).reduce((sum, set) => sum + setVolume(set), 0)
}

export function workoutVolume(workout: Pick<WorkoutRecord, 'exercises'>): number {
  return (workout.exercises ?? []).reduce((sum, ex) => sum + workoutExerciseVolume(ex), 0)
}

export function completedSets(sets: WorkoutSetRecord[]): WorkoutSetRecord[] {
  return sets.filter((set) => set.completed)
}

export function isPrBetter(_metric: PersonalRecordRecord['metric'], candidate: number, current: number): boolean {
  if (candidate === current) return false
  return candidate > current
}

export function derivePersonalRecords(workouts: WorkoutRecord[]): PersonalRecordRecord[] {
  const best = new Map<string, PersonalRecordRecord>()
  const ordered = [...workouts].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  for (const workout of ordered) {
    for (const exercise of workout.exercises ?? []) {
      for (const set of exercise.sets ?? []) {
        if (!set.completed) continue
        const achievedAt = set.completedAt ?? workout.endedAt ?? workout.startedAt
        const candidates: Array<[PersonalRecordRecord['metric'], number]> = [
          ['maxWeight', Math.max(0, set.weight)],
          ['maxReps', Math.max(0, set.reps)],
          ['maxVolume', setVolume(set)],
        ]
        for (const [metric, value] of candidates) {
          if (value <= 0 && metric !== 'maxReps') continue
          const key = `${exercise.exerciseId}:${metric}`
          const current = best.get(key)
          if (!current || isPrBetter(metric, value, current.value)) {
            best.set(key, {
              id: `${exercise.exerciseId}:${metric}:${workout.id}:${set.id}`,
              exerciseId: exercise.exerciseId,
              metric,
              value,
              achievedAt,
              workoutId: workout.id,
              setId: set.id,
            })
          }
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.achievedAt.localeCompare(a.achievedAt))
}

export function latestExercisePerformance(workouts: WorkoutRecord[], exerciseId: string): { volume: number; maxWeight: number; reps: number } | null {
  const ordered = [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  for (const workout of ordered) {
    for (const exercise of workout.exercises ?? []) {
      if (exercise.exerciseId !== exerciseId) continue
      const done = completedSets(exercise.sets ?? [])
      if (done.length === 0) continue
      return {
        volume: done.reduce((sum, set) => sum + setVolume(set), 0),
        maxWeight: Math.max(...done.map((set) => set.weight)),
        reps: done.reduce((sum, set) => sum + set.reps, 0),
      }
    }
  }
  return null
}

export function progressiveOverloadDelta(
  workouts: WorkoutRecord[],
  exerciseId: string,
): { volumeDelta: number; weightDelta: number } | null {
  const occurrences: Array<{ volume: number; maxWeight: number; at: string }> = []
  const ordered = [...workouts].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  for (const workout of ordered) {
    for (const exercise of workout.exercises ?? []) {
      if (exercise.exerciseId !== exerciseId) continue
      const done = completedSets(exercise.sets ?? [])
      if (done.length === 0) continue
      occurrences.push({
        at: workout.startedAt,
        volume: done.reduce((sum, set) => sum + setVolume(set), 0),
        maxWeight: Math.max(...done.map((set) => set.weight)),
      })
    }
  }
  if (occurrences.length < 2) return null
  const prev = occurrences[occurrences.length - 2]
  const curr = occurrences[occurrences.length - 1]
  return { volumeDelta: curr.volume - prev.volume, weightDelta: curr.maxWeight - prev.maxWeight }
}

export function gymSummary(workouts: WorkoutRecord[]): GymSummary {
  const ordered = [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const prs = derivePersonalRecords(workouts)
  return {
    workoutCount: workouts.length,
    totalVolume: workouts.reduce((sum, workout) => sum + workoutVolume(workout), 0),
    prCount: prs.length,
    lastWorkoutAt: ordered[0]?.startedAt,
  }
}

export function workoutCompletionProgress(workout: WorkoutRecord | null | undefined): ProgressSnapshot {
  if (!workout) return { ...unavailableProgress }
  const sets = (workout.exercises ?? []).flatMap((ex) => ex.sets ?? [])
  if (sets.length === 0) return { ...unavailableProgress }
  return calculateProgress(sets.filter((s) => s.completed).length, sets.length)
}

export function formatKg(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function defaultExercises(now = new Date().toISOString()): ExerciseRecord[] {
  const seed: Array<[string, string, MuscleGroup]> = [
    ['bench-press', 'Bench Press', 'chest'],
    ['squat', 'Squat', 'legs'],
    ['deadlift', 'Deadlift', 'back'],
    ['overhead-press', 'Overhead Press', 'shoulders'],
    ['barbell-row', 'Barbell Row', 'back'],
    ['pull-up', 'Pull-up', 'back'],
    ['bicep-curl', 'Bicep Curl', 'arms'],
    ['tricep-extension', 'Tricep Extension', 'arms'],
    ['plank', 'Plank', 'core'],
  ]
  return seed.map(([id, name, muscleGroup]) => ({ id, name, muscleGroup, isCustom: false, createdAt: now }))
}