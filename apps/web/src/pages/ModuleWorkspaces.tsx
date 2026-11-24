import { ModuleFilterBar } from '../components/workspace/ModuleFilterBar'
import { ModuleHeader } from '../components/workspace/ModuleHeader'
import { ModuleProgress } from '../components/workspace/ModuleProgress'
import { EmptyState, StatCard, DataTable } from '../components/ui'
import type { TranslationKey } from '../i18n'
import { routeLabelKeys, type RouteId } from '../lib/routes'
import { unavailableProgress } from '../lib/progress'

export type EmptyModuleRoute = Extract<RouteId, 'habits' | 'mascot' | 'cardio' | 'finance'>

interface EmptyModuleWorkspaceProps {
  route: EmptyModuleRoute
  t: (key: TranslationKey) => string
}

const subtitles: Record<EmptyModuleRoute, TranslationKey> = {
  habits: 'workspaceSubtitleHabits',
  mascot: 'workspaceSubtitleMascot',
  cardio: 'workspaceSubtitleCardio',
  finance: 'workspaceSubtitleFinance',
}

const emptyMessages: Record<EmptyModuleRoute, TranslationKey> = {
  habits: 'moduleEmptyHabits',
  mascot: 'moduleEmptyMascot',
  cardio: 'moduleEmptyCardio',
  finance: 'moduleEmptyFinance',
}

function WorkspaceBody({ route, t }: EmptyModuleWorkspaceProps) {
  const empty = <EmptyState title={t('emptyTitle')} body={t(emptyMessages[route])} />

  switch (route) {
    case 'habits':
      return (
        <div className="space-y-4">
          <div className="panel grid grid-cols-7 gap-2 p-5" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} className="h-12 rounded-lg border" style={{ borderColor: 'var(--mf-border)' }} />
            ))}
          </div>
          {empty}
        </div>
      )
    case 'mascot':
      return (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="panel flex min-h-56 items-center justify-center" aria-hidden="true">
            <span className="h-20 w-20 rounded-pill border-4" style={{ borderColor: 'var(--mf-module-accent)' }} />
          </div>
          {empty}
        </div>
      )

    case 'cardio':
      return (
        <div className="space-y-4">
          <div className="panel p-6">
            <div className="flex items-center justify-between" aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} className="h-3 w-3 rounded-pill" style={{ backgroundColor: 'var(--mf-border)' }} />
              ))}
            </div>
            <div className="mt-5 h-2 rounded-pill" style={{ backgroundColor: 'var(--mf-surfaceAlt)' }} />
          </div>
          {empty}
        </div>
      )
    case 'finance':
      return (
        <div className="space-y-4">
          <DataTable
            caption={t('moduleStats')}
            columns={[
              { key: 'record', label: t('recordsCount') },
              { key: 'value', label: t('notRecorded') },
            ]}
            rows={[{ record: t('moduleStats'), value: '—' }]}
          />
          {empty}
        </div>
      )
  }
}

export function EmptyModuleWorkspace({ route, t }: EmptyModuleWorkspaceProps) {
  return (
    <ModuleHeader
      route={route}
      eyebrow={t('modulesLabel')}
      title={t(routeLabelKeys[route])}
      subtitle={t(subtitles[route])}
      progress={
        <ModuleProgress
          snapshot={unavailableProgress}
          label={t('progressLabel')}
          completedLabel={t('progressCompletedOf')}
          unavailableLabel={t('progressUnavailable')}
        />
      }
      filters={
        <ModuleFilterBar
          label={t('moduleFilters')}
          value="all"
          onChange={() => undefined}
          options={[{ value: 'all', label: t('filterAll') }]}
          note={t('filtersAvailableLater')}
        />
      }
      actions={<p className="muted text-xs">{t('actionsAvailableLater')}</p>}
    >
      <StatCard caption={t('moduleStats')} value="—" detail={t('noGoalYet')} />
      <WorkspaceBody route={route} t={t} />
    </ModuleHeader>
  )
}
