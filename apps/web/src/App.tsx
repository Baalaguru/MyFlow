import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { useHashRoute } from './hooks/useHashRoute'
import { useOnline } from './hooks/useOnline'
import { readLocale, saveLocale, translate, type Locale, type TranslationKey } from './i18n'
import {
  applyAppearance,
  DEFAULT_APPEARANCE,
  readAppearance,
  saveAppearance,
  type Appearance,
  type ColorMode,
} from './lib/appearance'
import { moduleRouteIds, type RouteId } from './lib/routes'
import { CardioWorkspace } from './pages/CardioWorkspace'
import { DashboardPage } from './pages/DashboardPage'
import { FoodWorkspace } from './pages/FoodWorkspace'
import { EmptyModuleWorkspace, type EmptyModuleRoute } from './pages/ModuleWorkspaces'
import { GymWorkspace } from './pages/GymWorkspace'
import { HabitsWorkspace } from './pages/HabitsWorkspace'
import { MascotWorkspace } from './pages/MascotWorkspace'
import { ProfilePage } from './pages/ProfilePage'
import { TasksWorkspace } from './pages/TasksWorkspace'

const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)
const DesignSystemPage = lazy(() =>
  import('./pages/DesignSystemPage').then((module) => ({ default: module.DesignSystemPage })),
)

const emptyModuleRoutes = moduleRouteIds.filter(
  (route) => route !== 'tasks' && route !== 'habits' && route !== 'mascot' && route !== 'gym' && route !== 'food' && route !== 'cardio',
) as EmptyModuleRoute[]

function isEmptyModuleRoute(route: RouteId): route is EmptyModuleRoute {
  return (emptyModuleRoutes as readonly RouteId[]).includes(route)
}

export default function App() {
  const { route, navigate, back, forward, canBack, canForward } = useHashRoute()
  const [locale, setLocale] = useState<Locale>(readLocale)
  const [appearance, setAppearance] = useState<Appearance>(readAppearance)
  const [captureRevision, setCaptureRevision] = useState(0)
  const online = useOnline()

  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale])

  useEffect(() => {
    applyAppearance(appearance)
    saveAppearance(appearance)
  }, [appearance])

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      if (appearance.mode === 'system') applyAppearance(appearance)
    }
    query.addEventListener('change', onSystemChange)
    return () => query.removeEventListener('change', onSystemChange)
  }, [appearance])

  const changeLocale = (next: Locale) => {
    saveLocale(next)
    setLocale(next)
  }

  const changeMode = (mode: ColorMode) => setAppearance((current) => ({ ...current, mode }))

  const resetAppearance = () => setAppearance({ ...DEFAULT_APPEARANCE, custom: {} })

  const page = () => {
    if (route === 'dashboard') {
      return (
        <DashboardPage
          t={t}
          revision={captureRevision}
          appearance={appearance}
          onSaved={() => setCaptureRevision((value) => value + 1)}
        />
      )
    }
    if (route === 'tasks') {
      return (
        <TasksWorkspace
          t={t}
          appearance={appearance}
          revision={captureRevision}
          onSaved={() => setCaptureRevision((value) => value + 1)}
        />
      )
    }
    if (route === 'habits') {
      return (
        <HabitsWorkspace
          t={t}
          appearance={appearance}
          revision={captureRevision}
          onSaved={() => setCaptureRevision((value) => value + 1)}
        />
      )
    }
    if (route === 'mascot') {
      return <MascotWorkspace t={t} revision={captureRevision} />
    }
    if (route === 'gym') {
      return (
        <GymWorkspace
          t={t}
          appearance={appearance}
          revision={captureRevision}
          onSaved={() => setCaptureRevision((value) => value + 1)}
        />
      )
    }
    if (route === 'food') {
      return (
        <FoodWorkspace
          t={t}
          appearance={appearance}
          revision={captureRevision}
          onSaved={() => setCaptureRevision((value) => value + 1)}
        />
      )
    }
    if (route === 'cardio') {
      return (
        <CardioWorkspace
          t={t}
          appearance={appearance}
          revision={captureRevision}
          onSaved={() => setCaptureRevision((value) => value + 1)}
        />
      )
    }
    if (isEmptyModuleRoute(route)) return <EmptyModuleWorkspace route={route} t={t} />
    if (route === 'profile') return <ProfilePage t={t} onNavigate={navigate} />
    if (route === 'appearance') {
      return <SettingsPage appearance={appearance} onChange={setAppearance} onReset={resetAppearance} t={t} />
    }
    if (route === 'design-system') return <DesignSystemPage t={t} appearance={appearance} />
    return null
  }

  return (
    <AppShell
      t={t}
      route={route}
      onNavigate={navigate}
      onBack={back}
      onForward={forward}
      canBack={canBack}
      canForward={canForward}
      online={online}
      appearance={appearance}
      onModeChange={changeMode}
      locale={locale}
      onLocaleChange={changeLocale}
      onQuickCaptureSaved={() => setCaptureRevision((value) => value + 1)}
    >
      <Suspense fallback={<div className="panel p-6">{t('loadingLabel')}</div>}>{page()}</Suspense>
    </AppShell>
  )
}
