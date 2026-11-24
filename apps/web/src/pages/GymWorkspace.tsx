import { useCallback, useEffect, useMemo, useState } from 'react'
import { ModuleFilterBar } from '../components/workspace/ModuleFilterBar'
import { ModuleHeader } from '../components/workspace/ModuleHeader'
import { ModuleProgress } from '../components/workspace/ModuleProgress'
import { Button, ConfirmDialog, Dialog, EmptyState, ErrorState, IconButton, LoadingSkeleton, StatCard, TextField, Toast } from '../components/ui'
import type { TranslationKey } from '../i18n'
import type { Appearance } from '../lib/appearance'
import type { ExerciseRecord, WorkoutRecord } from '../lib/db'
import { derivePersonalRecords, gymSummary, workoutCompletionProgress, workoutVolume } from '../lib/gym'
import {
  addExerciseToWorkout,
  addSet,
  createExercise,
  createWorkout,
  deleteExercise,
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
  const [exerciseMuscles, setExerciseMuscles] = useState<ExerciseRecord['muscleGroups']>(['chest'])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [setDrafts, setSetDrafts] = useState<Record<string, { reps: string; weight: string }>>({})

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
  const personalRecords = useMemo(() => derivePersonalRecords(workouts ?? []), [workouts])
  const activeWorkout = useMemo(() => (workouts ?? []).find((w) => !w.endedAt) ?? null, [workouts])
  const progress = workoutCompletionProgress(activeWorkout)

  const filtered = useMemo(() => {
    const rows = workouts ?? []
    if (filter === 'active') return rows.filter((w) => !w.endedAt)
    if (filter === 'completed') return rows.filter((w) => !!w.endedAt)
    return rows
  }, [workouts, filter])

  const exerciseNameById = useMemo(() => new Map(exercises.map((e) => [e.id, e.name])), [exercises])
  const prByExercise = useMemo(() => {
    const best = new Map<string, number>()
    for (const pr of personalRecords) {
      if (pr.metric !== 'maxWeight') continue
      const prev = best.get(pr.exerciseId)
      if (prev === undefined || pr.value > prev) best.set(pr.exerciseId, pr.value)
    }
    return [...best.entries()]
      .map(([exerciseId, value]) => ({ exerciseId, value, name: exerciseNameById.get(exerciseId) ?? exerciseId }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [personalRecords, exerciseNameById])

  const handleCreateWorkout = async () => {
    await createWorkout()
    await load()
    onSaved()
    notify('gymWorkoutCreated')
  }

  const handleCreateExercise = async () => {
    try {
      await createExercise({ name: exerciseName, muscleGroups: exerciseMuscles })
      setExerciseName('')
      setExerciseMuscles(['chest'])
      setNewExerciseOpen(false)
      await load()
      onSaved()
      notify('gymExerciseCreated')
    } catch {
      /* empty name ignored */
    }
  }

  const mutate = async (fn: () => Promise<void>, msg: TranslationKey) => {
    try {
      await fn()
      await load()
      onSaved()
      notify(msg)
    } catch (e) {
      if (e instanceof Error && e.message === 'in-use') {
        notify('gymExerciseInUse')
        return
      }
      throw e
    }
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

      {prByExercise.length > 0 ? (
        <section className="panel p-4 space-y-3">
          <div>
            <p className="eyebrow">{t('gymPRs')}</p>
            <p className="muted text-sm">{t('gymPRGraphLabel')}</p>
          </div>
          <div className="space-y-2">
            {prByExercise.map((pr) => {
              const max = prByExercise[0]?.value || 1
              const pct = Math.max(4, (pr.value / max) * 100)
              return (
                <div key={pr.exerciseId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate">{pr.name}</span>
                    <span className="muted">{pr.value} kg</span>
                  </div>
                  <div className="h-2 rounded" style={{ background: 'var(--mf-surface-muted, rgba(127,127,127,0.15))' }}>
                    <div className="h-2 rounded" style={{ width: `${pct}%`, background: 'var(--mf-accent, #4f46e5)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

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
                              value={setDrafts[set.id]?.reps ?? String(set.reps)}
                              aria-label={`${t('gymReps')} ${set.setNumber}`}
                              onChange={(e) => setSetDrafts((prev) => ({ ...prev, [set.id]: { reps: e.target.value, weight: prev[set.id]?.weight ?? String(set.weight) } }))}
                              onBlur={() => {
                                const raw = setDrafts[set.id]?.reps
                                if (raw === undefined) return
                                const reps = raw === '' ? 0 : Math.max(0, Math.round(Number(raw)))
                                setSetDrafts((prev) => ({ ...prev, [set.id]: { reps: String(reps), weight: prev[set.id]?.weight ?? String(set.weight) } }))
                                if (reps !== set.reps) void mutate(() => updateSet(workout.id, ex.id, set.id, { reps }), 'gymSetUpdated')
                              }}
                            />
                          </label>
                          <label className="flex items-center gap-1">
                            <span className="muted text-xs">{t('gymWeight')}</span>
                            <input
                              className="field min-h-[32px] px-2 py-1 text-sm w-full"
                              type="number"
                              min={0}
                              step="0.5"
                              value={setDrafts[set.id]?.weight ?? String(set.weight)}
                              aria-label={`${t('gymWeight')} ${set.setNumber}`}
                              onChange={(e) => setSetDrafts((prev) => ({ ...prev, [set.id]: { reps: prev[set.id]?.reps ?? String(set.reps), weight: e.target.value } }))}
                              onBlur={() => {
                                const raw = setDrafts[set.id]?.weight
                                if (raw === undefined) return
                                const weight = raw === '' ? 0 : Math.max(0, Number(raw))
                                setSetDrafts((prev) => ({ ...prev, [set.id]: { reps: prev[set.id]?.reps ?? String(set.reps), weight: String(weight) } }))
                                if (weight !== set.weight) void mutate(() => updateSet(workout.id, ex.id, set.id, { weight }), 'gymSetUpdated')
                              }}
                            />
                          </label>
                          <Button
                            type="button"
                            variant={set.completed ? 'primary' : 'ghost'}
                            className="min-h-[32px] px-2 py-1 text-xs"
                            aria-label={`${t('gymCompleteSet')} ${set.setNumber}`}
                            onClick={() => {
                              const draft = setDrafts[set.id]
                              const reps = draft?.reps === undefined ? undefined : Math.max(0, Math.round(Number(draft.reps || 0)))
                              const weight = draft?.weight === undefined ? undefined : Math.max(0, Number(draft.weight || 0))
                              void mutate(() => updateSet(workout.id, ex.id, set.id, { reps, weight, completed: !set.completed }), 'gymSetUpdated')
                            }}
                          >
                            {set.completed ? '✓' : '○'}
                          </Button>
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
          <fieldset className="space-y-2 text-sm">
            <legend>{t('gymMuscleGroup')}</legend>
            <div className="flex flex-wrap gap-2">
              {(['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'fullBody', 'other'] as const).map((g) => {
                const selected = exerciseMuscles.includes(g)
                return (
                  <button
                    key={g}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs ${selected ? 'font-medium' : 'muted'}`}
                    style={{ borderColor: 'var(--mf-border)', background: selected ? 'var(--mf-surface-muted, rgba(127,127,127,0.12))' : 'transparent' }}
                    aria-pressed={selected}
                    onClick={() => setExerciseMuscles((prev) => selected ? (prev.length > 1 ? prev.filter((x) => x !== g) : prev) : [...prev, g])}
                  >
                    {t(`gymMuscle_${g}` as TranslationKey)}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setNewExerciseOpen(false)}>{t('cancelAction')}</Button>
            <Button type="submit">{t('saveAction')}</Button>
          </div>
        </form>

        {exercises.length > 0 ? (
          <div className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: 'var(--mf-border)' }}>
            <p className="eyebrow">{t('gymExercises')}</p>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {exercises.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{ex.name}</span>
                  <IconButton
                    label={t('deleteAction')}
                    onClick={() => void mutate(async () => {
                      const ok = await deleteExercise(ex.id)
                      if (!ok) throw new Error('in-use')
                    }, 'gymExerciseRemoved')}
                  >
                    ×
                  </IconButton>
                </div>
              ))}
            </div>
          </div>
        ) : null}
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