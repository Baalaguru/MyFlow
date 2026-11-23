import { db, type ExerciseRecord, type MuscleGroup, type PersonalRecordRecord, type WorkoutExerciseRecord, type WorkoutRecord, type WorkoutSetRecord } from '../db'
import { defaultExercises, derivePersonalRecords } from '../gym'

function newId(): string {
  return crypto.randomUUID()
}

export function normaliseSet(set: WorkoutSetRecord, workoutExerciseId: string, index: number): WorkoutSetRecord {
  return {
    ...set,
    id: set.id || newId(),
    workoutExerciseId: set.workoutExerciseId || workoutExerciseId,
    setNumber: Number.isFinite(set.setNumber) ? Math.max(1, set.setNumber) : index + 1,
    reps: Number.isFinite(set.reps) ? Math.max(0, Math.round(set.reps)) : 0,
    weight: Number.isFinite(set.weight) ? Math.max(0, set.weight) : 0,
    completed: set.completed === true,
    completedAt: set.completed === true ? set.completedAt : undefined,
  }
}

export function normaliseWorkoutExercise(ex: WorkoutExerciseRecord, workoutId: string, index: number): WorkoutExerciseRecord {
  const id = ex.id || newId()
  const sets = (ex.sets ?? []).map((set, i) => normaliseSet(set, id, i))
  return {
    ...ex,
    id,
    workoutId: ex.workoutId || workoutId,
    exerciseId: ex.exerciseId,
    order: Number.isFinite(ex.order) ? Math.max(0, ex.order) : index,
    sets: sets.sort((a, b) => a.setNumber - b.setNumber),
  }
}

export function normaliseWorkout(row: WorkoutRecord): WorkoutRecord {
  const exercises = (row.exercises ?? []).map((ex, i) => normaliseWorkoutExercise(ex, row.id, i))
  return {
    ...row,
    exercises: exercises.sort((a, b) => a.order - b.order),
  }
}

export async function ensureDefaultExercises(): Promise<ExerciseRecord[]> {
  const existing = await db.exercises.toArray()
  if (existing.length > 0) return existing.sort((a, b) => a.name.localeCompare(b.name))
  const seeded = defaultExercises()
  await db.exercises.bulkPut(seeded)
  return seeded
}

export async function listExercises(): Promise<ExerciseRecord[]> {
  const rows = await ensureDefaultExercises()
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export async function createExercise(input: { name: string; muscleGroup: MuscleGroup; notes?: string }): Promise<ExerciseRecord> {
  const name = input.name.trim()
  if (!name) throw new Error('empty exercise name')
  const record: ExerciseRecord = {
    id: newId(),
    name,
    muscleGroup: input.muscleGroup,
    notes: input.notes?.trim() || undefined,
    isCustom: true,
    createdAt: new Date().toISOString(),
  }
  await db.exercises.add(record)
  return record
}

export async function listWorkouts(): Promise<WorkoutRecord[]> {
  const rows = await db.workouts.toArray()
  return rows.map(normaliseWorkout).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function getWorkout(id: string): Promise<WorkoutRecord | undefined> {
  const row = await db.workouts.get(id)
  return row ? normaliseWorkout(row) : undefined
}

export async function createWorkout(note?: string): Promise<WorkoutRecord> {
  const record: WorkoutRecord = {
    id: newId(),
    startedAt: new Date().toISOString(),
    note: note?.trim() || undefined,
    exercises: [],
  }
  await db.workouts.add(record)
  return record
}

export async function saveWorkout(workout: WorkoutRecord): Promise<void> {
  await db.workouts.put(normaliseWorkout(workout))
  await rebuildPersonalRecords()
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.workouts.delete(id)
  await rebuildPersonalRecords()
}

export async function addExerciseToWorkout(workoutId: string, exerciseId: string): Promise<void> {
  const workout = await getWorkout(workoutId)
  if (!workout) return
  const id = newId()
  const next: WorkoutExerciseRecord = {
    id,
    workoutId,
    exerciseId,
    order: workout.exercises.length,
    sets: [{ id: newId(), workoutExerciseId: id, setNumber: 1, reps: 0, weight: 0, completed: false }],
  }
  await saveWorkout({ ...workout, exercises: [...workout.exercises, next] })
}

export async function addSet(workoutId: string, workoutExerciseId: string): Promise<void> {
  const workout = await getWorkout(workoutId)
  if (!workout) return
  const exercises = workout.exercises.map((ex) => {
    if (ex.id !== workoutExerciseId) return ex
    const setNumber = ex.sets.length + 1
    return {
      ...ex,
      sets: [...ex.sets, { id: newId(), workoutExerciseId, setNumber, reps: 0, weight: 0, completed: false }],
    }
  })
  await saveWorkout({ ...workout, exercises })
}

export async function updateSet(
  workoutId: string,
  workoutExerciseId: string,
  setId: string,
  patch: Partial<Pick<WorkoutSetRecord, 'reps' | 'weight' | 'completed'>>,
): Promise<void> {
  const workout = await getWorkout(workoutId)
  if (!workout) return
  const now = new Date().toISOString()
  const exercises = workout.exercises.map((ex) => {
    if (ex.id !== workoutExerciseId) return ex
    return {
      ...ex,
      sets: ex.sets.map((set) => {
        if (set.id !== setId) return set
        const completed = patch.completed ?? set.completed
        return {
          ...set,
          reps: patch.reps === undefined ? set.reps : Math.max(0, Math.round(patch.reps)),
          weight: patch.weight === undefined ? set.weight : Math.max(0, patch.weight),
          completed,
          completedAt: completed ? (set.completedAt ?? now) : undefined,
        }
      }),
    }
  })
  await saveWorkout({ ...workout, exercises })
}

export async function removeSet(workoutId: string, workoutExerciseId: string, setId: string): Promise<void> {
  const workout = await getWorkout(workoutId)
  if (!workout) return
  const exercises = workout.exercises.map((ex) => {
    if (ex.id !== workoutExerciseId) return ex
    const sets = ex.sets.filter((set) => set.id !== setId).map((set, i) => ({ ...set, setNumber: i + 1 }))
    return { ...ex, sets }
  })
  await saveWorkout({ ...workout, exercises })
}

export async function removeWorkoutExercise(workoutId: string, workoutExerciseId: string): Promise<void> {
  const workout = await getWorkout(workoutId)
  if (!workout) return
  await saveWorkout({
    ...workout,
    exercises: workout.exercises.filter((ex) => ex.id !== workoutExerciseId).map((ex, i) => ({ ...ex, order: i })),
  })
}

export async function finishWorkout(workoutId: string): Promise<void> {
  const workout = await getWorkout(workoutId)
  if (!workout) return
  await saveWorkout({ ...workout, endedAt: workout.endedAt ?? new Date().toISOString() })
}

export async function listPersonalRecords(): Promise<PersonalRecordRecord[]> {
  return db.personalRecords.toArray().then((rows) => rows.sort((a, b) => b.achievedAt.localeCompare(a.achievedAt)))
}

export async function rebuildPersonalRecords(): Promise<void> {
  const workouts = await listWorkouts()
  const records = derivePersonalRecords(workouts)
  await db.transaction('rw', db.personalRecords, async () => {
    await db.personalRecords.clear()
    if (records.length > 0) await db.personalRecords.bulkPut(records)
  })
}