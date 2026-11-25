import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ModuleFilterBar } from '../components/workspace/ModuleFilterBar'
import { ModuleHeader } from '../components/workspace/ModuleHeader'
import { ModuleProgress } from '../components/workspace/ModuleProgress'
import {
  BarGraph,
  Button,
  ConfirmDialog,
  DataTable,
  DateField,
  Dialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  ResponsiveCard,
  SelectField,
  StatCard,
  TextArea,
  TextField,
  TimeField,
  Toast,
} from '../components/ui'
import { chartPalettes, type PresetId } from '../generated/tokens'
import type { TranslationKey } from '../i18n'
import type { Appearance } from '../lib/appearance'
import { resolveColorMode } from '../lib/appearance'
import {
  combinedCardioSummary,
  cyclingAverageSpeedKmh,
  cyclingSummary,
  cyclingTrendSeries,
  jumpRopePerformanceSeries,
  jumpRopeSummary,
  localDateKey,
  roundDisplay,
  stepSeries,
  walkingDistanceSeries,
  walkingSummary,
  weeklyMonthlySeries,
  type CardioPoint,
} from '../lib/cardio'
import type {
  CyclingSessionRecord,
  JumpRopeSessionRecord,
  StepGoalRecord,
  StepRecordRecord,
  WalkingSessionRecord,
} from '../lib/db'
import {
  addStepRecord,
  combineDateTime,
  deleteCyclingSession,
  deleteJumpRopeSession,
  deleteWalkingSession,
  listCyclingSessions,
  listJumpRopeSessions,
  listStepGoals,
  listStepRecords,
  listWalkingSessions,
  saveCyclingSession,
  saveJumpRopeSession,
  saveWalkingSession,
  setStepGoal,
  timePart,
} from '../lib/modules/cardio'
import { unavailableProgress } from '../lib/progress'

type Translate = (key: TranslationKey) => string
type Section = 'walking' | 'jumpRope' | 'cycling' | 'analytics'
type DeleteKind = 'walking' | 'jumpRope' | 'cycling'
type TimerPhase = 'idle' | 'running' | 'paused' | 'stopped'
type PointField = 'steps' | 'distanceMeters' | 'durationSeconds' | 'speedKmh' | 'jumps'

interface CardioWorkspaceProps {
  t: Translate
  appearance: Appearance
  revision: number
  onSaved: () => void
}

const sections: Section[] = ['walking', 'jumpRope', 'cycling', 'analytics']

const sectionKeys: Record<Section, TranslationKey> = {
  walking: 'cardioSectionWalking',
  jumpRope: 'cardioSectionJumpRope',
  cycling: 'cardioSectionCycling',
  analytics: 'cardioSectionAnalytics',
}

const deleteCopy: Record<DeleteKind, { title: TranslationKey; body: TranslationKey; success: TranslationKey }> = {
  walking: {
    title: 'deleteAction',
    body: 'dialogBody',
    success: 'cardioDeleted',
  },
  jumpRope: {
    title: 'deleteAction',
    body: 'dialogBody',
    success: 'cardioDeleted',
  },
  cycling: {
    title: 'deleteAction',
    body: 'dialogBody',
    success: 'cardioDeleted',
  },
}

interface WalkingDraft {
  id: string
  localDate: string
  startTime: string
  endTime: string
  stepCount: string
  durationSeconds: number
  distanceMeters: string
  bodyWeightKg: string
  calories: string
  notes: string
}

interface JumpRopeDraft {
  id: string
  localDate: string
  startTime: string
  endTime: string
  durationSeconds: number
  jumpCount: string
  countSource: 'manual' | 'sensor_assisted'
  rounds: string
  restSeconds: number
  bodyWeightKg: string
  calories: string
  notes: string
}

interface CyclingDraft {
  id: string
  localDate: string
  startTime: string
  endTime: string
  durationSeconds: number
  movingSeconds: number
  pauseSeconds: number
  stationarySeconds: string
  distanceMeters: string
  notes: string
}

function toNumber(value: string, fallback = 0): number {
  if (value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function optionalNumber(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function endTimeAfter(startTime: string, seconds: number): string {
  const parsed = new Date(`${startTime || '09:00'}:00`)
  if (Number.isNaN(parsed.getTime())) return startTime
  const end = new Date(parsed.getTime() + Math.max(0, seconds) * 1000)
  return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
}

function emptyWalkingDraft(localDate: string): WalkingDraft {
  return {
    id: '', localDate, startTime: '09:00', endTime: '09:00', stepCount: '', durationSeconds: 0,
    distanceMeters: '', bodyWeightKg: '', calories: '', notes: '',
  }
}

function walkingDraft(row: WalkingSessionRecord): WalkingDraft {
  return {
    id: row.id,
    localDate: row.localDate,
    startTime: timePart(row.startedAt),
    endTime: timePart(row.endedAt),
    stepCount: String(row.stepCount),
    durationSeconds: row.durationSeconds,
    distanceMeters: row.distanceMeters === null ? '' : String(row.distanceMeters),
    bodyWeightKg: row.bodyWeightKg === null ? '' : String(row.bodyWeightKg),
    calories: row.calories === null ? '' : String(row.calories),
    notes: row.notes ?? '',
  }
}

function emptyJumpRopeDraft(localDate: string): JumpRopeDraft {
  return {
    id: '', localDate, startTime: '18:00', endTime: '18:00', durationSeconds: 0, jumpCount: '',
    countSource: 'manual', rounds: '', restSeconds: 0, bodyWeightKg: '', calories: '', notes: '',
  }
}

function jumpRopeDraft(row: JumpRopeSessionRecord): JumpRopeDraft {
  return {
    id: row.id,
    localDate: row.localDate,
    startTime: timePart(row.startedAt),
    endTime: timePart(row.endedAt),
    durationSeconds: row.durationSeconds,
    jumpCount: String(row.jumpCount),
    countSource: row.countSource,
    rounds: String(row.rounds),
    restSeconds: row.restSeconds,
    bodyWeightKg: row.bodyWeightKg === null ? '' : String(row.bodyWeightKg),
    calories: row.calories === null ? '' : String(row.calories),
    notes: row.notes ?? '',
  }
}

function emptyCyclingDraft(localDate: string): CyclingDraft {
  return {
    id: '', localDate, startTime: '07:00', endTime: '07:00', durationSeconds: 0,
    movingSeconds: 0, pauseSeconds: 0, stationarySeconds: '', distanceMeters: '', notes: '',
  }
}

function cyclingDraft(row: CyclingSessionRecord): CyclingDraft {
  return {
    id: row.id,
    localDate: row.localDate,
    startTime: timePart(row.startedAt),
    endTime: timePart(row.endedAt),
    durationSeconds: row.durationSeconds,
    movingSeconds: row.movingSeconds,
    pauseSeconds: row.pauseSeconds,
    stationarySeconds: String(row.stationarySeconds),
    distanceMeters: row.distanceMeters === null ? '' : String(row.distanceMeters),
    notes: row.notes ?? '',
  }
}

function measured(value: number | null, t: Translate): string {
  return value === null ? t('notRecorded') : String(roundDisplay(value))
}

function SessionTimer({
  t,
  onChange,
  rest = false,
}: {
  t: Translate
  onChange: (seconds: number, phase: TimerPhase) => void
  rest?: boolean
}) {
  const [seconds, setSeconds] = useState(0)
  const [phase, setPhase] = useState<TimerPhase>('idle')
  const callback = useRef(onChange)
  callback.current = onChange

  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      setSeconds((current) => {
        const next = current + 1
        callback.current(next, 'running')
        return next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  const change = (nextSeconds: number, nextPhase: TimerPhase) => {
    setSeconds(nextSeconds)
    setPhase(nextPhase)
    callback.current(nextSeconds, nextPhase)
  }

  return (
    <div className="panel space-y-3 p-4" data-testid={rest ? 'cardio-rest-timer' : 'cardio-session-timer'}>
      <p className="eyebrow">{t(rest ? ('cardioRestTimer') : ('cardioFieldDuration'))}</p>
      <p className="stat-number" data-testid={rest ? 'cardio-rest-seconds' : 'cardio-timer-seconds'}>{seconds}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={phase === 'running'}
          onClick={() => change(phase === 'paused' ? seconds : 0, 'running')}
        >
          {t(phase === 'paused' ? ('cardioResumeTimer') : ('cardioStartTimer'))}
        </Button>
        <Button type="button" variant="secondary" disabled={phase !== 'running'} onClick={() => change(seconds, 'paused')}>
          {t('cardioPauseTimer')}
        </Button>
        <Button type="button" variant="ghost" disabled={phase === 'idle'} onClick={() => change(seconds, 'stopped')}>
          {t('cardioStopTimer')}
        </Button>
      </div>
    </div>
  )
}

function CyclingTimer({
  t,
  onChange,
}: {
  t: Translate
  onChange: (seconds: number, movingSeconds: number, pauseSeconds: number, phase: TimerPhase) => void
}) {
  const [phase, setPhase] = useState<TimerPhase>('idle')
  const [moving, setMoving] = useState(0)
  const [paused, setPaused] = useState(0)
  const callback = useRef(onChange)
  callback.current = onChange

  const publish = (nextPhase: TimerPhase, nextMoving: number, nextPaused: number) => {
    setPhase(nextPhase)
    setMoving(nextMoving)
    setPaused(nextPaused)
    callback.current(nextMoving + nextPaused, nextMoving, nextPaused, nextPhase)
  }

  useEffect(() => {
    if (phase !== 'running' && phase !== 'paused') return
    const id = window.setInterval(() => {
      if (phase === 'running') setMoving((current) => {
        const next = current + 1
        callback.current(next + paused, next, paused, phase)
        return next
      })
      else setPaused((current) => {
        const next = current + 1
        callback.current(moving + next, moving, next, phase)
        return next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase, moving, paused])

  return (
    <div className="panel space-y-3 p-4" data-testid="cardio-cycling-timer">
      <p className="eyebrow">{t('cardioFieldDuration')}</p>
      <div className="flex flex-wrap gap-4 text-sm">
        <span>{t('cardioFieldDuration')}: {moving + paused}</span>
        <span>{t('cardioFieldPause')}: {paused}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={phase === 'running'} onClick={() => publish('running', phase === 'paused' ? moving : 0, phase === 'paused' ? paused : 0)}>
          {t(phase === 'paused' ? ('cardioResumeTimer') : ('cardioStartTimer'))}
        </Button>
        <Button type="button" variant="secondary" disabled={phase !== 'running'} onClick={() => publish('paused', moving, paused)}>
          {t('cardioPauseTimer')}
        </Button>
        <Button type="button" variant="ghost" disabled={phase === 'idle'} onClick={() => publish('stopped', moving, paused)}>
          {t('cardioStopTimer')}
        </Button>
      </div>
    </div>
  )
}

function CardioChart({
  title,
  description,
  points,
  field,
  palette,
  t,
}: {
  title: string
  description: string
  points: readonly CardioPoint[]
  field: PointField
  palette: string[]
  t: Translate
}) {
  const filled = points.filter((point) => point[field] !== null)
  if (filled.length === 0) {
    return <EmptyState title={title} body={t('noDataForRange')} />
  }
  return (
    <ResponsiveCard title={title}>
      <BarGraph
        labels={filled.map((point) => point.label)}
        values={filled.map((point) => point[field] ?? 0)}
        colors={palette}
        axisColor={palette[3]}
        gridColor={palette[4]}
        description={description}
      />
    </ResponsiveCard>
  )
}

export function CardioWorkspace({ t, appearance, revision, onSaved }: CardioWorkspaceProps) {
  const [walking, setWalking] = useState<WalkingSessionRecord[] | null>(null)
  const [steps, setSteps] = useState<StepRecordRecord[]>([])
  const [goals, setGoals] = useState<StepGoalRecord[]>([])
  const [jumpRope, setJumpRope] = useState<JumpRopeSessionRecord[]>([])
  const [cycling, setCycling] = useState<CyclingSessionRecord[]>([])
  const [problem, setProblem] = useState(false)
  const [toast, setToast] = useState<TranslationKey | null>(null)
  const [section, setSection] = useState<Section>('walking')
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()))
  const [stepCountDraft, setStepCountDraft] = useState('')
  const [goalDraft, setGoalDraft] = useState('')
  const [walkingDialog, setWalkingDialog] = useState<WalkingDraft | null>(null)
  const [jumpDialog, setJumpDialog] = useState<JumpRopeDraft | null>(null)
  const [cyclingDialog, setCyclingDialog] = useState<CyclingDraft | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ kind: DeleteKind; id: string } | null>(null)

  const load = useCallback(async () => {
    try {
      setProblem(false)
      const [localWalking, localSteps, localGoals, localJumpRope, localCycling] = await Promise.all([
        listWalkingSessions(), listStepRecords(), listStepGoals(), listJumpRopeSessions(), listCyclingSessions(),
      ])
      setWalking(localWalking)
      setSteps(localSteps)
      setGoals(localGoals)
      setJumpRope(localJumpRope)
      setCycling(localCycling)
    } catch {
      setProblem(true)
    }
  }, [])

  useEffect(() => { void load() }, [load, revision])

  useEffect(() => {
    setGoalDraft(String(goals.find((goal) => goal.localDate === selectedDate)?.stepGoal ?? ''))
  }, [goals, selectedDate])

  const notify = (key: TranslationKey) => {
    setToast(key)
    window.setTimeout(() => setToast(null), 2400)
  }

  const run = async (action: () => Promise<unknown>, success: TranslationKey, inUse?: TranslationKey): Promise<boolean> => {
    try {
      await action()
      await load()
      onSaved()
      notify(success)
      return true
    } catch (error) {
      if (error instanceof Error && error.message === 'in-use' && inUse) {
        notify(inUse)
        return false
      }
      setProblem(true)
      return false
    }
  }

  const preset = (appearance.preset in chartPalettes ? appearance.preset : 'vintageLibrary') as PresetId
  const palette = chartPalettes[preset][resolveColorMode(appearance.mode)]

  const goal = useMemo(
    () => goals.find((item) => item.localDate === selectedDate)?.stepGoal ?? null,
    [goals, selectedDate],
  )
  const stepSummary = useMemo(
    () => walkingSummary(walking ?? [], steps, goal, selectedDate),
    [walking, steps, goal, selectedDate],
  )
  const jumpSummary = useMemo(() => jumpRopeSummary(jumpRope, selectedDate), [jumpRope, selectedDate])
  const cyclingToday = useMemo(() => cyclingSummary(cycling, selectedDate), [cycling, selectedDate])
  const combined = useMemo(
    () => combinedCardioSummary({ walking: walking ?? [], jumpRope, cycling, stepRecords: steps, stepGoal: goal }, selectedDate),
    [walking, jumpRope, cycling, steps, goal, selectedDate],
  )

  const headerProgress = stepSummary.goalProgress.available
    ? { completed: stepSummary.steps ?? 0, total: goal ?? 0, percent: stepSummary.goalProgress.percent, available: true }
    : unavailableProgress

  const dailyStepsPoints = useMemo(() => stepSeries(steps, 7), [steps])
  const weeklyStepsPoints = useMemo(() => weeklyMonthlySeries(stepSeries(steps, 28), 'week'), [steps])
  const monthlyStepsPoints = useMemo(() => weeklyMonthlySeries(stepSeries(steps, 180), 'month'), [steps])
  const walkingDaily = useMemo(() => walkingDistanceSeries(walking ?? [], 30), [walking])
  const walkingWeekly = useMemo(() => weeklyMonthlySeries(walkingDistanceSeries(walking ?? [], 180), 'week'), [walking])
  const walkingMonthly = useMemo(() => weeklyMonthlySeries(walkingDistanceSeries(walking ?? [], 365), 'month'), [walking])
  const jumpDaily = useMemo(() => jumpRopePerformanceSeries(jumpRope, 30), [jumpRope])
  const cyclingDaily = useMemo(() => cyclingTrendSeries(cycling, 30), [cycling])
  const hasAnalytics = [...dailyStepsPoints, ...walkingDaily, ...jumpDaily, ...cyclingDaily]
    .some((point) => point.steps !== null || point.distanceMeters !== null || point.durationSeconds !== null || point.jumps !== null || point.speedKmh !== null)

  const visibleSteps = useMemo(
    () => steps.filter((record) => record.localDate === selectedDate).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [steps, selectedDate],
  )
  const visibleWalking = useMemo(
    () => (walking ?? []).filter((session) => session.localDate === selectedDate).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [walking, selectedDate],
  )
  const visibleJumpRope = useMemo(
    () => jumpRope.filter((session) => session.localDate === selectedDate).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [jumpRope, selectedDate],
  )
  const visibleCycling = useMemo(
    () => cycling.filter((session) => session.localDate === selectedDate).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [cycling, selectedDate],
  )

  const addSteps = () => {
    if (!stepCountDraft.trim()) return
    const count = toNumber(stepCountDraft)
    setStepCountDraft('')
    void run(async () => {
      const saved = await addStepRecord({
        localDate: selectedDate,
        stepCount: count,
        source: 'manual',
        sourceEventId: `manual:${selectedDate}`,
      })
      if (!saved) throw new Error('in-use')
    }, 'cardioSaved', 'cardioInvalid')
  }

  const saveWalking = async (draft: WalkingDraft) => {
    const ok = await run(
      () => saveWalkingSession({
        id: draft.id || undefined,
        localDate: draft.localDate,
        startedAt: combineDateTime(draft.localDate, draft.startTime),
        endedAt: combineDateTime(draft.localDate, draft.endTime),
        stepCount: toNumber(draft.stepCount),
        durationSeconds: draft.durationSeconds,
        distanceMeters: optionalNumber(draft.distanceMeters),
        bodyWeightKg: optionalNumber(draft.bodyWeightKg),
        calories: optionalNumber(draft.calories),
        source: 'manual',
        notes: draft.notes,
      }),
      draft.id ? ('cardioUpdated') : ('cardioSaved'),
    )
    if (ok) setWalkingDialog(null)
  }

  const saveJumpRope = async (draft: JumpRopeDraft) => {
    const ok = await run(
      () => saveJumpRopeSession({
        id: draft.id || undefined,
        localDate: draft.localDate,
        startedAt: combineDateTime(draft.localDate, draft.startTime),
        endedAt: combineDateTime(draft.localDate, draft.endTime),
        durationSeconds: draft.durationSeconds,
        jumpCount: toNumber(draft.jumpCount),
        countSource: draft.countSource,
        rounds: toNumber(draft.rounds),
        restSeconds: draft.restSeconds,
        bodyWeightKg: optionalNumber(draft.bodyWeightKg),
        calories: optionalNumber(draft.calories),
        notes: draft.notes,
      }),
      draft.id ? ('cardioUpdated') : ('cardioSaved'),
    )
    if (ok) setJumpDialog(null)
  }

  const saveCycling = async (draft: CyclingDraft) => {
    const ok = await run(
      () => saveCyclingSession({
        id: draft.id || undefined,
        localDate: draft.localDate,
        startedAt: combineDateTime(draft.localDate, draft.startTime),
        endedAt: combineDateTime(draft.localDate, draft.endTime),
        durationSeconds: draft.durationSeconds,
        movingSeconds: Math.max(0, draft.durationSeconds - draft.pauseSeconds - toNumber(draft.stationarySeconds)),
        pauseSeconds: draft.pauseSeconds,
        stationarySeconds: toNumber(draft.stationarySeconds),
        distanceMeters: optionalNumber(draft.distanceMeters),
        sourceQuality: 'manual',
        notes: draft.notes,
      }),
      draft.id ? ('cardioUpdated') : ('cardioSaved'),
    )
    if (ok) setCyclingDialog(null)
  }

  const confirmDelete = () => {
    const target = deleteTarget
    setDeleteTarget(null)
    if (!target) return
    const copy = deleteCopy[target.kind]
    const action = () => {
      switch (target.kind) {
        case 'walking': return deleteWalkingSession(target.id)
        case 'jumpRope': return deleteJumpRopeSession(target.id)
        case 'cycling': return deleteCyclingSession(target.id)
      }
    }
    void run(action, copy.success)
  }

  if (problem) {
    return (
      <div className="space-y-6">
        <header><p className="eyebrow">{t('modulesLabel')}</p><h1>{t('navCardio')}</h1></header>
        <ErrorState title={t('errorTitle')} body={t('errorBody')} actionLabel={t('retryAction')} onRetry={() => void load()} />
      </div>
    )
  }

  if (!walking) {
    return (
      <div className="space-y-6">
        <header><p className="eyebrow">{t('modulesLabel')}</p><h1>{t('navCardio')}</h1></header>
        <LoadingSkeleton label={t('loadingLabel')} lines={4} />
      </div>
    )
  }

  return (
    <ModuleHeader
      route="cardio"
      eyebrow={t('modulesLabel')}
      title={t('navCardio')}
      subtitle={t('workspaceSubtitleCardio')}
      progress={
        <ModuleProgress
          snapshot={headerProgress}
          label={t('cardioStepGoalProgress')}
          completedLabel={t('progressCompletedOf')}
          unavailableLabel={t('cardioNoStepGoal')}
        />
      }
      filters={
        <ModuleFilterBar
          label={t('moduleFilters')}
          value={section}
          onChange={(value) => setSection(value as Section)}
          options={sections.map((item) => ({ value: item, label: t(sectionKeys[item]) }))}
        />
      }
      actions={
        <div className="flex flex-wrap gap-2">
          {section === 'walking' ? <Button onClick={() => setWalkingDialog(emptyWalkingDraft(selectedDate))}>{t('cardioNewWalkingSession')}</Button> : null}
          {section === 'jumpRope' ? <Button onClick={() => setJumpDialog(emptyJumpRopeDraft(selectedDate))}>{t('cardioNewJumpRopeSession')}</Button> : null}
          {section === 'cycling' ? <Button onClick={() => setCyclingDialog(emptyCyclingDraft(selectedDate))}>{t('cardioNewCyclingSession')}</Button> : null}
        </div>
      }
    >
      <section className="panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <DateField label={t('dateLabel')} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
      </section>

      {section === 'walking' ? (
        <div className="space-y-4" data-testid="cardio-walking">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              caption={t('cardioDailySteps')}
              value={stepSummary.steps === null ? t('notRecorded') : String(stepSummary.steps)}
              detail={stepSummary.goalProgress.available
                ? `${roundDisplay(stepSummary.goalProgress.percent ?? 0)}% ${stepSummary.goalProgress.overGoal ? t('foodOverGoal') : t('foodGoalMet')}`
                : t('noGoalYet')}
            />
            <StatCard caption={t('recordsCount')} value={String(stepSummary.sessionCount)} detail={t('cardioSectionWalking')} />
            <StatCard
              caption={t('cardioFieldDistance')}
              value={measured(stepSummary.distanceMeters, t)}
              detail={t('cardioFieldDuration')}
            />
            <StatCard
              caption={t('foodCalories')}
              value={measured(stepSummary.calories, t)}
              detail={t(stepSummary.calorieBasis === 'unavailable' ? ('notRecorded') : ('cardioCalorieAssumption'))}
            />
          </div>

          <section className="panel space-y-3 p-4">
            <p className="eyebrow">{t('cardioDailySteps')}</p>
            <div className="flex flex-wrap items-end gap-3">
              <TextField
                label={t('cardioFieldSteps')}
                type="number"
                min="0"
                step="1"
                value={stepCountDraft}
                onChange={(event) => setStepCountDraft(event.target.value)}
              />
              <Button onClick={addSteps} disabled={!stepCountDraft.trim()}>{t('cardioNewStepRecord')}</Button>
            </div>
            <p className="muted text-xs">{t('cardioManualFallback')}</p>
            <DataTable
              caption={t('cardioDailySteps')}
              columns={[
                { key: 'date', label: t('dateLabel') },
                { key: 'steps', label: t('cardioFieldSteps') },
                { key: 'source', label: t('foodSource') },
              ]}
              rows={visibleSteps.map((record) => ({
                date: record.localDate,
                steps: String(record.stepCount),
                source: t(record.source === 'manual' ? ('cardioSourceManual') : record.source === 'sensor' ? ('cardioSourceSensor') : ('cardioSectionWalking')),
              }))}
            />
            {visibleSteps.length === 0 ? <p className="muted text-sm">{t('cardioNoStepRecords')}</p> : null}
          </section>

          <section className="panel space-y-3 p-4">
            <p className="eyebrow">{t('cardioNewStepGoal')}</p>
            <div className="flex flex-wrap items-end gap-3">
              <TextField
                label={t('cardioNewStepGoal')}
                type="number"
                min="0"
                step="1"
                value={goalDraft}
                onChange={(event) => setGoalDraft(event.target.value)}
              />
              <Button
                onClick={() => void run(() => setStepGoal(selectedDate, toNumber(goalDraft)), 'cardioSaved')}
                disabled={!goalDraft.trim()}
              >
                {t('cardioNewStepGoal')}
              </Button>
            </div>
            <p className="muted text-xs">{goal === null ? t('cardioNoStepGoal') : `${roundDisplay(stepSummary.goalProgress.percent ?? 0)}%`}</p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <SessionTimer t={t} onChange={(durationSeconds) => setWalkingDialog((current) => current ? {
              ...current,
              durationSeconds,
              endTime: endTimeAfter(current.startTime, durationSeconds),
            } : current)} />
            <CardioChart
              title={t('cardioDailySteps')}
              description={t('cardioDailySteps')}
              points={dailyStepsPoints}
              field="steps"
              palette={palette}
              t={t}
            />
            <CardioChart
              title={t('cardioWeekSteps')}
              description={t('cardioWeekSteps')}
              points={weeklyStepsPoints}
              field="steps"
              palette={palette}
              t={t}
            />
            <CardioChart
              title={t('cardioMonthSteps')}
              description={t('cardioMonthSteps')}
              points={monthlyStepsPoints}
              field="steps"
              palette={palette}
              t={t}
            />
            <CardioChart
              title={t('cardioWeekDistance')}
              description={t('cardioWeekDistance')}
              points={walkingWeekly}
              field="distanceMeters"
              palette={palette}
              t={t}
            />
            <CardioChart
              title={t('cardioWeekDuration')}
              description={t('cardioWeekDuration')}
              points={walkingWeekly}
              field="durationSeconds"
              palette={palette}
              t={t}
            />
          </div>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow">{t('cardioSectionWalking')}</p>
              <Button variant="secondary" onClick={() => setWalkingDialog(emptyWalkingDraft(selectedDate))}>{t('cardioNewWalkingSession')}</Button>
            </div>
            {visibleWalking.length === 0 ? (
              <EmptyState title={t('cardioSectionWalking')} body={t('moduleEmptyCardio')} />
            ) : (
              visibleWalking.map((session) => (
                <div key={session.id} className="panel flex flex-wrap items-start justify-between gap-2 p-4" data-walking-session={session.id}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{timePart(session.startedAt)} – {timePart(session.endedAt)}</p>
                    <p className="muted text-xs">
                      {t('cardioFieldSteps')}: {session.stepCount} · {t('cardioFieldDistance')}: {measured(session.distanceMeters, t)} ·{' '}
                      {t('foodCalories')}: {measured(session.calories, t)}
                    </p>
                    {session.notes ? <p className="muted mt-1 text-xs">{session.notes}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    <IconButton label={t('editAction')} onClick={() => setWalkingDialog(walkingDraft(session))}>✎</IconButton>
                    <IconButton label={t('deleteAction')} onClick={() => setDeleteTarget({ kind: 'walking', id: session.id })}>×</IconButton>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      ) : null}

      {section === 'jumpRope' ? (
        <div className="space-y-4" data-testid="cardio-jump-rope">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard caption={t('cardioJumpRopeCount')} value={String(jumpSummary.jumpCount)} detail={t('cardioSectionJumpRope')} />
            <StatCard caption={t('cardioFieldDuration')} value={String(roundDisplay(jumpSummary.durationSeconds / 60))} detail={t('cardioFieldRounds')} />
            <StatCard caption={t('foodCalories')} value={measured(jumpSummary.calories, t)} detail={t('cardioCalorieAssumption')} />
            <StatCard
              caption={t('cardioFieldCountSource')}
              value={String(jumpSummary.sensorAssistedCount)}
              detail={t('cardioCountSourceSensorAssisted')}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SessionTimer t={t} onChange={(durationSeconds) => setJumpDialog((current) => current ? {
              ...current,
              durationSeconds,
              endTime: endTimeAfter(current.startTime, durationSeconds),
            } : current)} />
            <SessionTimer
              t={t}
              rest
              onChange={(restSeconds) => setJumpDialog((current) => current ? { ...current, restSeconds } : current)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CardioChart
              title={t('cardioJumpRopeCount')}
              description={t('cardioJumpRopeCount')}
              points={jumpDaily}
              field="jumps"
              palette={palette}
              t={t}
            />
            <CardioChart
              title={t('cardioWeekDuration')}
              description={t('cardioWeekDuration')}
              points={weeklyMonthlySeries(jumpDaily, 'week')}
              field="durationSeconds"
              palette={palette}
              t={t}
            />
          </div>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow">{t('cardioSectionJumpRope')}</p>
              <Button variant="secondary" onClick={() => setJumpDialog(emptyJumpRopeDraft(selectedDate))}>{t('cardioNewJumpRopeSession')}</Button>
            </div>
            {visibleJumpRope.length === 0 ? (
              <EmptyState title={t('cardioSectionJumpRope')} body={t('moduleEmptyCardio')} />
            ) : (
              visibleJumpRope.map((session) => (
                <div key={session.id} className="panel flex flex-wrap items-start justify-between gap-2 p-4" data-jump-session={session.id}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {session.jumpCount} {t('cardioJumpRopeCount')} · {roundDisplay(session.durationSeconds / 60)} {t('cardioFieldDuration')}
                    </p>
                    <p className="muted text-xs">
                      {t('cardioFieldRounds')}: {session.rounds} · {t('cardioFieldRest')}: {session.restSeconds} ·{' '}
                      {t('cardioFieldCountSource')}: {t(session.countSource === 'sensor_assisted' ? ('cardioCountSourceSensorAssisted') : ('cardioCountSourceManual'))}
                    </p>
                    {session.countSource === 'sensor_assisted' ? <p className="muted mt-1 text-xs">{t('cardioCountSourceSensorAssisted')}</p> : null}
                    {session.notes ? <p className="muted mt-1 text-xs">{session.notes}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    <IconButton label={t('editAction')} onClick={() => setJumpDialog(jumpRopeDraft(session))}>✎</IconButton>
                    <IconButton label={t('deleteAction')} onClick={() => setDeleteTarget({ kind: 'jumpRope', id: session.id })}>×</IconButton>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      ) : null}

      {section === 'cycling' ? (
        <div className="space-y-4" data-testid="cardio-cycling">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard caption={t('cardioFieldDistance')} value={measured(cyclingToday.distanceMeters, t)} detail={t('cardioSectionCycling')} />
            <StatCard caption={t('cardioFieldDuration')} value={String(roundDisplay(cyclingToday.durationSeconds / 60))} detail={t('cardioFieldDuration')} />
            <StatCard caption={t('cardioCyclingAvgSpeed')} value={measured(cyclingToday.averageSpeedKmh, t)} detail={t('cardioFieldPause')} />
            <StatCard caption={t('cardioCyclingMaxSpeed')} value={measured(cyclingToday.maxSpeedKmh, t)} detail={t('cardioManualFallback')} />
          </div>

          <CyclingTimer
            t={t}
            onChange={(durationSeconds, movingSeconds, pauseSeconds) => setCyclingDialog((current) => current ? {
              ...current,
              durationSeconds,
              movingSeconds,
              pauseSeconds,
              endTime: endTimeAfter(current.startTime, durationSeconds),
            } : current)}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <CardioChart
              title={t('cardioFieldDistance')}
              description={t('cardioFieldDistance')}
              points={cyclingDaily}
              field="distanceMeters"
              palette={palette}
              t={t}
            />
            <CardioChart
              title={t('cardioCyclingSpeedTrend')}
              description={t('cardioCyclingSpeedTrend')}
              points={cyclingDaily}
              field="speedKmh"
              palette={palette}
              t={t}
            />
          </div>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow">{t('cardioSectionCycling')}</p>
              <Button variant="secondary" onClick={() => setCyclingDialog(emptyCyclingDraft(selectedDate))}>{t('cardioNewCyclingSession')}</Button>
            </div>
            {visibleCycling.length === 0 ? (
              <EmptyState title={t('cardioSectionCycling')} body={t('moduleEmptyCardio')} />
            ) : (
              visibleCycling.map((session) => (
                <div key={session.id} className="panel flex flex-wrap items-start justify-between gap-2 p-4" data-cycling-session={session.id}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {t('cardioFieldDistance')}: {measured(session.distanceMeters, t)} ·{' '}
                      {t('cardioCyclingAvgSpeed')}: {measured(session.averageSpeedKmh, t)}
                    </p>
                    <p className="muted text-xs">
                      {t('cardioFieldDuration')}: {roundDisplay(session.durationSeconds / 60)} ·{' '}
                      {t('cardioCyclingMaxSpeed')}: {measured(session.maxSpeedKmh, t)} ·{' '}
                      {t('cardioFieldPause')}: {session.pauseSeconds}
                    </p>
                    {session.notes ? <p className="muted mt-1 text-xs">{session.notes}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    <IconButton label={t('editAction')} onClick={() => setCyclingDialog(cyclingDraft(session))}>✎</IconButton>
                    <IconButton label={t('deleteAction')} onClick={() => setDeleteTarget({ kind: 'cycling', id: session.id })}>×</IconButton>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      ) : null}

      {section === 'analytics' ? (
        <div className="space-y-4" data-testid="cardio-analytics">
          {!hasAnalytics ? (
            <EmptyState title={t('analyticsEmptyTitle')} body={t('cardioNoAnalytics')} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard caption={t('recordsCount')} value={String(combined.sessionCount)} detail={t('cardioSectionAnalytics')} />
                <StatCard caption={t('cardioFieldDuration')} value={String(roundDisplay(combined.durationSeconds / 60))} detail={t('cardioCombinedSummary')} />
                <StatCard caption={t('cardioFieldDistance')} value={measured(combined.distanceMeters, t)} detail={t('cardioCombinedSummary')} />
                <StatCard caption={t('foodCalories')} value={measured(combined.calories, t)} detail={t('cardioCalorieAssumption')} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <CardioChart title={t('cardioDailySteps')} description={t('cardioDailySteps')} points={dailyStepsPoints} field="steps" palette={palette} t={t} />
                <CardioChart title={t('cardioWeekSteps')} description={t('cardioWeekSteps')} points={weeklyStepsPoints} field="steps" palette={palette} t={t} />
                <CardioChart title={t('cardioMonthDistance')} description={t('cardioMonthDistance')} points={walkingMonthly} field="distanceMeters" palette={palette} t={t} />
                <CardioChart title={t('cardioMonthDuration')} description={t('cardioMonthDuration')} points={walkingMonthly} field="durationSeconds" palette={palette} t={t} />
                <CardioChart title={t('cardioCyclingSpeedTrend')} description={t('cardioCyclingSpeedTrend')} points={cyclingDaily} field="speedKmh" palette={palette} t={t} />
                <CardioChart title={t('cardioJumpRopePerformance')} description={t('cardioJumpRopePerformance')} points={jumpDaily} field="jumps" palette={palette} t={t} />
              </div>
              <p className="muted text-xs">{t('cardioAnalyticsNote')}</p>
            </>
          )}
        </div>
      ) : null}

      <Dialog
        open={walkingDialog !== null}
        onClose={() => setWalkingDialog(null)}
        title={walkingDialog?.id ? t('editAction') : t('cardioNewWalkingSession')}
        closeLabel={t('cancelAction')}
      >
        {walkingDialog ? (
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void saveWalking(walkingDialog) }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField label={t('dateLabel')} value={walkingDialog.localDate} onChange={(event) => setWalkingDialog({ ...walkingDialog, localDate: event.target.value })} />
              <TextField label={t('cardioFieldSteps')} type="number" min="0" step="1" value={walkingDialog.stepCount} onChange={(event) => setWalkingDialog({ ...walkingDialog, stepCount: event.target.value })} />
              <TimeField label={t('cardioFieldStartTime')} value={walkingDialog.startTime} onChange={(event) => setWalkingDialog({ ...walkingDialog, startTime: event.target.value })} />
              <TimeField label={t('cardioFieldEndTime')} value={walkingDialog.endTime} onChange={(event) => setWalkingDialog({ ...walkingDialog, endTime: event.target.value })} />
              <TextField label={t('cardioFieldDuration')} type="number" min="0" step="1" value={walkingDialog.durationSeconds} onChange={(event) => setWalkingDialog({ ...walkingDialog, durationSeconds: toNumber(event.target.value) })} />
              <TextField label={t('cardioFieldDistance')} type="number" min="0" step="0.1" value={walkingDialog.distanceMeters} hint={t('cardioQualityManual')} onChange={(event) => setWalkingDialog({ ...walkingDialog, distanceMeters: event.target.value })} />
              <TextField label={t('cardioFieldBodyWeight')} type="number" min="0" step="0.1" value={walkingDialog.bodyWeightKg} onChange={(event) => setWalkingDialog({ ...walkingDialog, bodyWeightKg: event.target.value })} />
              <TextField label={t('foodCalories')} type="number" min="0" step="0.1" value={walkingDialog.calories} hint={t('cardioCalorieAssumption')} onChange={(event) => setWalkingDialog({ ...walkingDialog, calories: event.target.value })} />
            </div>
            <p className="muted text-xs">{t('cardioManualFallback')}</p>
            <TextArea label={t('foodNotes')} value={walkingDialog.notes} onChange={(event) => setWalkingDialog({ ...walkingDialog, notes: event.target.value })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setWalkingDialog(null)}>{t('cancelAction')}</Button>
              <Button type="submit">{t('saveAction')}</Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={jumpDialog !== null}
        onClose={() => setJumpDialog(null)}
        title={jumpDialog?.id ? t('editAction') : t('cardioNewJumpRopeSession')}
        closeLabel={t('cancelAction')}
      >
        {jumpDialog ? (
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void saveJumpRope(jumpDialog) }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField label={t('dateLabel')} value={jumpDialog.localDate} onChange={(event) => setJumpDialog({ ...jumpDialog, localDate: event.target.value })} />
              <TextField label={t('cardioJumpRopeCount')} type="number" min="0" step="1" value={jumpDialog.jumpCount} onChange={(event) => setJumpDialog({ ...jumpDialog, jumpCount: event.target.value })} />
              <TimeField label={t('cardioFieldStartTime')} value={jumpDialog.startTime} onChange={(event) => setJumpDialog({ ...jumpDialog, startTime: event.target.value })} />
              <TimeField label={t('cardioFieldEndTime')} value={jumpDialog.endTime} onChange={(event) => setJumpDialog({ ...jumpDialog, endTime: event.target.value })} />
              <TextField label={t('cardioFieldDuration')} type="number" min="0" step="1" value={jumpDialog.durationSeconds} onChange={(event) => setJumpDialog({ ...jumpDialog, durationSeconds: toNumber(event.target.value) })} />
              <SelectField
                label={t('cardioFieldCountSource')}
                value={jumpDialog.countSource}
                options={[
                  { value: 'manual', label: t('cardioCountSourceManual') },
                  { value: 'sensor_assisted', label: t('cardioCountSourceSensorAssisted') },
                ]}
                onChange={(event) => setJumpDialog({ ...jumpDialog, countSource: event.target.value as JumpRopeDraft['countSource'] })}
              />
              <TextField label={t('cardioFieldRounds')} type="number" min="0" step="1" value={jumpDialog.rounds} onChange={(event) => setJumpDialog({ ...jumpDialog, rounds: event.target.value })} />
              <TextField label={t('cardioFieldRest')} type="number" min="0" step="1" value={jumpDialog.restSeconds} onChange={(event) => setJumpDialog({ ...jumpDialog, restSeconds: toNumber(event.target.value) })} />
              <TextField label={t('cardioFieldBodyWeight')} type="number" min="0" step="0.1" value={jumpDialog.bodyWeightKg} onChange={(event) => setJumpDialog({ ...jumpDialog, bodyWeightKg: event.target.value })} />
              <TextField label={t('foodCalories')} type="number" min="0" step="0.1" value={jumpDialog.calories} hint={t('cardioCalorieAssumption')} onChange={(event) => setJumpDialog({ ...jumpDialog, calories: event.target.value })} />
            </div>
            <p className="muted text-xs">{t('cardioCountSourceSensorAssisted')}</p>
            <TextArea label={t('foodNotes')} value={jumpDialog.notes} onChange={(event) => setJumpDialog({ ...jumpDialog, notes: event.target.value })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setJumpDialog(null)}>{t('cancelAction')}</Button>
              <Button type="submit">{t('saveAction')}</Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={cyclingDialog !== null}
        onClose={() => setCyclingDialog(null)}
        title={cyclingDialog?.id ? t('editAction') : t('cardioNewCyclingSession')}
        closeLabel={t('cancelAction')}
      >
        {cyclingDialog ? (
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void saveCycling(cyclingDialog) }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField label={t('dateLabel')} value={cyclingDialog.localDate} onChange={(event) => setCyclingDialog({ ...cyclingDialog, localDate: event.target.value })} />
              <TimeField label={t('cardioFieldStartTime')} value={cyclingDialog.startTime} onChange={(event) => setCyclingDialog({ ...cyclingDialog, startTime: event.target.value })} />
              <TimeField label={t('cardioFieldEndTime')} value={cyclingDialog.endTime} onChange={(event) => setCyclingDialog({ ...cyclingDialog, endTime: event.target.value })} />
              <TextField label={t('cardioFieldDuration')} type="number" min="0" step="1" value={cyclingDialog.durationSeconds} onChange={(event) => setCyclingDialog({ ...cyclingDialog, durationSeconds: toNumber(event.target.value) })} />
              <TextField label={t('cardioFieldPause')} type="number" min="0" step="1" value={cyclingDialog.pauseSeconds} onChange={(event) => setCyclingDialog({ ...cyclingDialog, pauseSeconds: toNumber(event.target.value) })} />
              <TextField label={t('cardioFieldStationary')} type="number" min="0" step="1" value={cyclingDialog.stationarySeconds} onChange={(event) => setCyclingDialog({ ...cyclingDialog, stationarySeconds: event.target.value })} />
              <TextField label={t('cardioFieldDistance')} type="number" min="0" step="0.1" value={cyclingDialog.distanceMeters} hint={t('cardioQualityManual')} onChange={(event) => setCyclingDialog({ ...cyclingDialog, distanceMeters: event.target.value })} />
            </div>
            <p className="muted text-xs">{t('cardioCyclingAvgSpeed')}: {measured(
              cyclingAverageSpeedKmh(
                optionalNumber(cyclingDialog.distanceMeters),
                Math.max(0, cyclingDialog.durationSeconds - cyclingDialog.pauseSeconds - toNumber(cyclingDialog.stationarySeconds)),
              ),
              t,
            )}</p>
            <p className="muted text-xs">{t('cardioCyclingMaxSpeed')}: {t('notRecorded')} · {t('cardioManualFallback')}</p>
            <TextArea label={t('foodNotes')} value={cyclingDialog.notes} onChange={(event) => setCyclingDialog({ ...cyclingDialog, notes: event.target.value })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCyclingDialog(null)}>{t('cancelAction')}</Button>
              <Button type="submit">{t('saveAction')}</Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? t(deleteCopy[deleteTarget.kind].title) : t('deleteAction')}
        body={deleteTarget ? t(deleteCopy[deleteTarget.kind].body) : t('dialogBody')}
        closeLabel={t('cancelAction')}
        confirmLabel={t('deleteAction')}
        cancelLabel={t('cancelAction')}
        onConfirm={confirmDelete}
      />

      <Toast message={toast ? t(toast) : ''} visible={toast !== null} />
    </ModuleHeader>
  )
}
