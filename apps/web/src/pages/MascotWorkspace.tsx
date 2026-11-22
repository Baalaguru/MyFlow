import { useCallback, useEffect, useMemo, useState } from 'react'
import { ModuleHeader } from '../components/workspace/ModuleHeader'
import { ModuleProgress } from '../components/workspace/ModuleProgress'
import { Button, EmptyState, SelectField, StatCard, Toast } from '../components/ui'
import type { TranslationKey } from '../i18n'
import { listHabitLogs, listHabits, getMascotState, saveMascotState } from '../lib/modules/habits'
import { mascotProgress } from '../lib/habits'
import { calculateProgress } from '../lib/progress'
import type { HabitLogRecord, HabitRecord, MascotStateRecord } from '../lib/db'

type Translate = (key: TranslationKey) => string

interface Props {
  t: Translate
  revision: number
}

export function MascotWorkspace({ t, revision }: Props) {
  const [habits, setHabits] = useState<HabitRecord[]>([])
  const [logs, setLogs] = useState<HabitLogRecord[]>([])
  const [state, setState] = useState<MascotStateRecord | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [h, l, m] = await Promise.all([listHabits(), listHabitLogs(), getMascotState()])
    setHabits(h)
    setLogs(l)
    setState(m)
  }, [])

  useEffect(() => { void load() }, [load, revision])

  const progress = useMemo(() => mascotProgress(habits, logs), [habits, logs])
  const active = habits.filter((h) => !h.archived)

  const updateState = async (patch: Partial<MascotStateRecord>) => {
    await saveMascotState(patch)
    setState(await getMascotState())
    setToast(t('savedAction'))
    window.setTimeout(() => setToast(null), 1800)
  }

  const stageLabel = t(`mascotStage${progress.stage[0].toUpperCase()}${progress.stage.slice(1)}` as TranslationKey)
  const progressSnapshot = active.length === 0 ? { completed: 0, total: 0, percent: null, available: false } : calculateProgress(progress.completedDays, progress.nextThreshold)

  return (
    <ModuleHeader
      route="mascot"
      eyebrow={t('navMascot')}
      title={t('mascotTitle')}
      subtitle={t('mascotSubtitle')}
      progress={<ModuleProgress snapshot={progressSnapshot} label={t('mascotStage')} completedLabel={t('progressCompletedOf')} unavailableLabel={t('mascotNoHabits')} />}
    >
      {active.length === 0 ? <EmptyState title={t('mascotTitle')} body={t('mascotNoHabits')} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="panel p-5 space-y-4">
            <div className="text-6xl" aria-hidden="true" style={{ filter: state?.animationsEnabled ? undefined : 'none' }}>
              {progress.stage === 'seed' ? '🌰' : progress.stage === 'sprout' ? '🌱' : progress.stage === 'bloom' ? '🌼' : '🌳'}
            </div>
            <p className="eyebrow" style={{ color: 'var(--mf-module-accent)' }}>{stageLabel}</p>
            <p className="muted text-sm">{t('mascotProgressNote')}</p>
            <p className="muted text-sm">{t('mascotNeutralMissed')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard caption={t('progressCompletedOf')} value={`${progress.completedDays}`} detail={t('mascotProgressNote')} />
              <StatCard caption={t('mascotStage')} value={stageLabel} detail={t('mascotCompanion')} />
            </div>
          </section>

          <section className="panel p-5 space-y-4">
            <SelectField
              label={t('mascotCompanion')}
              value={state?.companion ?? 'sprout'}
              onChange={(e) => void updateState({ companion: e.target.value })}
              options={[
                { value: 'sprout', label: t('mascotStageSprout') },
                { value: 'pixel', label: t('mascotPixel') },
              ]}
            />
            <SelectField
              label={t('mascotPlant')}
              value={state?.plantStyle ?? 'fern'}
              onChange={(e) => void updateState({ plantStyle: e.target.value })}
              options={[
                { value: 'fern', label: 'Fern' },
                { value: 'bonsai', label: 'Bonsai' },
                { value: 'flower', label: 'Flower' },
              ]}
            />
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => void updateState({ animationsEnabled: !state?.animationsEnabled })}>
                {state?.animationsEnabled ? t('mascotAnimationsOff') : t('mascotAnimationsOn')}
              </Button>
              <span className="muted text-sm">{t('mascotAnimations')}</span>
            </div>
          </section>
        </div>
      )}
      <Toast message={toast ?? ''} visible={!!toast} />
    </ModuleHeader>
  )
}