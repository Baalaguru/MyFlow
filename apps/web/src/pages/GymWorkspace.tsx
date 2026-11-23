import { useCallback, useEffect, useMemo, useState } from 'react'
import { ModuleFilterBar } from '../components/workspace/ModuleFilterBar'
import { ModuleHeader } from '../components/workspace/ModuleHeader'
import { ModuleProgress } from '../components/workspace/ModuleProgress'
import { Button, ConfirmDialog, Dialog, EmptyState, ErrorState, IconButton, LoadingSkeleton, StatCard, TextField, Toast } from '../components/ui'
import type { TranslationKey } from '../i18n'
import type { Appearance } from '../lib/appearance'
import type { ExerciseRecord, WorkoutRecord } from '../lib/db'
import { gymSummary, workoutCompletionProgress, workoutVolume } from '../lib/gym'
import {
  addExerciseToWorkout,
  addSet,
  createExercise,
  createWorkout,
  deleteWorkout,
  finishWorkout,
  listExercises,
  listWorkouts,
  removeSet,
  removeWorkoutExercise,
  updateSet,
} from '../lib/modules/gym'

type Translate = (key: TranslationKey) => string

interface GymWorkspaceProps {
  t: Translate
  appearance: Appearance
  revision: number
  onSaved: () => void
}

export function GymWorkspace({ t, revision, onSaved }: GymWorkspaceProps) {
  const [workouts, setWorkouts] = useState<WorkoutRecord[] | null>(null)
  const [exercises, setExercises] = useState<ExerciseRecord[]>([])
  const [problem, setProblem] = useState(false)
  const [toast, setToast] = useState<TranslationKey | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [newExerciseOpen, setNewExerciseOpen] = useState(false)
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseMuscle, setExerciseMuscle] = useState<ExerciseRecord['muscleGroup']>('chest')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setProblem(false)
      const [w, e] = await Promise.all([listWorkouts(), listExercises()])
      setWorkouts(w)
      setExercises(e)
    } catch {
      setProblem(true)
    }
  }, [])

  useEffect(() => { void load() }, [load, revision])

  const notify = (key: TranslationKey) => {
    setToast(key)
    window.setTimeout(() => setToast(null), 2200)
  }

  const summary = useMemo(() => gymSummary(workouts ?? []), [workouts])
  const activeWorkout = useMemo(() => (workouts ?? []).find((w) => !w.endedAt) ?? null, [workouts])
  const progress = workoutCompletionProgress(activeWorkout)

  const filtered = useMemo(() => {
    const rows = workouts ?? []
    if (filter === 'active') return rows.filter((w) => !w.endedAt)
    if (filter === 'completed') return rows.filter((w) => !!w.endedAt)
    return rows
  }, [workouts, filter])

  const exerciseNameById = useMemo(() => new Map(exercises.map((e) => [e.id, e.name])), [exercises])

  const handleCreateWorkout = async () => {
    await createWorkout()
    await load()
    onSaved()
    notify('gymWorkoutCreated')
  }

  const handleCreateExercise = async () => {
    try {
      await createExercise({ name: exerciseName, muscleGroup: exerciseMuscle })
      setExerciseName('')
      setNewExerciseOpen(false)
      await load()
      onSaved()
      notify('gymExerciseCreated')
    } catch {
      /* empty name ignored */
    }
  }

  const mutate = async (fn: () => Promise<void>, msg: TranslationKey) => {
    await fn()
    await load()
    onSaved()
    notify(msg)
  }

  if (problem) {
    return (
      <div className="space-y-6">
        <header><p className="eyebrow">{t('modulesLabel')}</p><h1>{t('navGym')}</h1></header>
        <ErrorState title={t('errorTitle')} body={t('errorBody')} actionLabel={t('retryAction')} onRetry={() => void load()} />
      </div>
    )
  }

  if (!workouts) {
    return <div className="space-y-6"><header><p className="eyebrow">{t('modulesLabel')}</p><h1>{t('navGym')}</h1></header><LoadingSkeleton label={t('loadingLabel')} lines={4} /></div>
  }

  return (
    <ModuleHeader
      route="gym"
      eyebrow={t('modulesLabel')}
      title={t('navGym')}
      subtitle={t('workspaceSubtitleGym')}
      progress={
        <ModuleProgress
          snapshot={progress}
          label={t('progressLabel')}
          completedLabel={t('progressCompletedOf')}
          unavailableLabel={t('gymNoActiveWorkout')}
        />
      }
      filters={
        <ModuleFilterBar
          label={t('moduleFilters')}
          value={filter}
          onChange={(v) => setFilter(v as typeof filter)}
          options={[
            { value: 'all', label: t('filterAll') },
            { value: 'active', label: t('gymFilterActive') },
            { value: 'completed', label: t('gymFilterCompleted') },
          ]}
        />
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setNewExerciseOpen(true)}>{t('gymNewExercise')}</Button>
          <Button onClick={() => void handleCreateWorkout()}>{t('gymNewWorkout')}</Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard caption={t('gymWorkouts')} value={String(summary.workoutCount)} detail={t('gymTotalVolume') + ': ' + Math.round(summary.totalVolume)} />
        <StatCard caption={t('gymPRs')} value={String(summary.prCount)} detail={t('gymPRHint')} />
        <StatCard caption={t('gymExercises')} value={String(exercises.length)} detail={t('gymExerciseLibrary')} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t('emptyTitle')} body={t('moduleEmptyGym')} />
      ) : (
        <div className="space-y-4">
          {filtered.map((workout) => (
            <section key={workout.id} className="panel p-4 space-y-3" data-testid={`workout-${workout.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="eyebrow">{new Date(workout.startedAt).toLocaleString()}</p>
                  <p className="muted text-xs">
                    {t('gymVolume')}: {Math.round(workoutVolume(workout))} · {workout.endedAt ? t('gymFilterCompleted') : t('gymFilterActive')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!workout.endedAt ? (
                    <Button variant="secondary" onClick={() => void mutate(() => finishWorkout(workout.id), 'gymWorkoutFinished')}>{t('gymFinishWorkout')}</Button>
                  ) : null}
                  <IconButton label={t('deleteAction')} onClick={() => setDeleteId(workout.id)}>×</IconButton>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  className="field min-h-[36px] text-sm"
                  aria-label={t('gymAddExercise')}
                  defaultValue=""
                  onChange={(e) => {
                    const id = e.target.value
                    if (!id) return
                    e.target.value = ''
                    void mutate(() => addExerciseToWorkout(workout.id, id), 'gymExerciseAdded')
                  }}
                >
                  <option value="">{t('gymAddExercise')}</option>
                  {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </select>
              </div>

              {workout.exercises.length === 0 ? (
                <p className="muted text-sm">{t('gymNoExercises')}</p>
              ) : (
                workout.exercises.map((ex) => (
                  <div key={ex.id} className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--mf-border)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{exerciseNameById.get(ex.exerciseId) ?? ex.exerciseId}</p>
                      <div className="flex gap-1">
                        <IconButton label={t('gymAddSet')} onClick={() => void mutate(() => addSet(workout.id, ex.id), 'gymSetAdded')}>+</IconButton>
                        <IconButton label={t('deleteAction')} onClick={() => void mutate(() => removeWorkoutExercise(workout.id, ex.id), 'gymExerciseRemoved')}>×</IconButton>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {ex.sets.map((set) => (
                        <div key={set.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-2 text-sm">
                          <span className="muted text-xs w-6">#{set.setNumber}</span>
                          <label className="flex items-center gap-1">
                            <span className="muted text-xs">{t('gymReps')}</span>
                            <input
                              className="field min-h-[32px] px-2 py-1 text-sm w-full"
                              type="number"
                              min={0}
                              value={set.reps}
                              aria-label={`${t('gymReps')} ${set.setNumber}`}
                              onChange={(e) => void mutate(() => updateSet(workout.id, ex.id, set.id, { reps: Number(e.target.value) }), 'gymSetUpdated')}
                            />
                          </label>
                          <label className="flex items-center gap-1">
                            <span className="muted text-xs">{t('gymWeight')}</span>
                            <input
                              className="field min-h-[32px] px-2 py-1 text-sm w-full"
                              type="number"
                              min={0}
                              step="0.5"
                              value={set.weight}
                              aria-label={`${t('gymWeight')} ${set.setNumber}`}
                              onChange={(e) => void mutate(() => updateSet(workout.id, ex.id, set.id, { weight: Number(e.target.value) }), 'gymSetUpdated')}
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={set.completed}
                              aria-label={`${t('gymCompleteSet')} ${set.setNumber}`}
                              onChange={(e) => void mutate(() => updateSet(workout.id, ex.id, set.id, { completed: e.target.checked }), 'gymSetUpdated')}
                            />
                            {t('gymDone')}
                          </label>
                          <IconButton label={t('deleteAction')} onClick={() => void mutate(() => removeSet(workout.id, ex.id, set.id), 'gymSetRemoved')}>×</IconButton>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>
          ))}
        </div>
      )}

      <Dialog open={newExerciseOpen} onClose={() => setNewExerciseOpen(false)} title={t('gymNewExercise')} closeLabel={t('cancelAction')}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void handleCreateExercise() }}>
          <TextField label={t('gymExerciseName')} value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} autoFocus />
          <label className="block space-y-1 text-sm">
            <span>{t('gymMuscleGroup')}</span>
            <select className="field" value={exerciseMuscle} onChange={(e) => setExerciseMuscle(e.target.value as ExerciseRecord['muscleGroup'])}>
              {(['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'fullBody', 'other'] as const).map((g) => (
                <option key={g} value={g}>{t(`gymMuscle_${g}` as TranslationKey)}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setNewExerciseOpen(false)}>{t('cancelAction')}</Button>
            <Button type="submit">{t('saveAction')}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { const id = deleteId; setDeleteId(null); if (id) void mutate(() => deleteWorkout(id), 'gymWorkoutDeleted') }}
        title={t('deleteAction')}
        body={t('gymDeleteWorkoutConfirm')}
        confirmLabel={t('deleteAction')}
        cancelLabel={t('cancelAction')}
        closeLabel={t('cancelAction')}
      />

      {toast ? <Toast message={t(toast)} visible={!!toast} /> : null}
    </ModuleHeader>
  )
}