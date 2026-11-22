import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AppShell, sectionKeys } from './components/AppShell'
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
import { DashboardPage } from './pages/DashboardPage'

const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)
const DesignSystemPage = lazy(() =>
  import('./pages/DesignSystemPage').then((module) => ({ default: module.DesignSystemPage })),
)

const plannedStart = 1
const plannedEnd = 6
const settingsIndex = 7
const designSystemIndex = 8

export default function App() {
  const [active, setActive] = useState(0)
  const [locale, setLocale] = useState<Locale>(readLocale)
  const [appearance, setAppearance] = useState<Appearance>(readAppearance)
  const [search, setSearch] = useState('')
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

  return (
    <AppShell
      t={t}
      active={active}
      onSelect={setActive}
      online={online}
      appearance={appearance}
      onModeChange={changeMode}
      locale={locale}
      onLocaleChange={changeLocale}
      search={search}
      onSearchChange={setSearch}
      onQuickCaptureSaved={() => setCaptureRevision((value) => value + 1)}
    >
      <Suspense fallback={<div className="panel p-6">{t('loadingLabel')}</div>}>
        {active === 0 ? (
          <DashboardPage t={t} revision={captureRevision} />
        ) : active >= plannedStart && active <= plannedEnd ? (
          <div className="panel p-8">
            <h1>{t(sectionKeys[active])}</h1>
            <p className="muted mt-3">{t('plannedTitle')}</p>
            <p className="muted mt-1 text-sm">{t('plannedNote')}</p>
          </div>
        ) : active === settingsIndex ? (
          <SettingsPage
            appearance={appearance}
            onChange={setAppearance}
            onReset={resetAppearance}
            t={t}
          />
        ) : active === designSystemIndex ? (
          <DesignSystemPage t={t} appearance={appearance} />
        ) : null}
      </Suspense>
    </AppShell>
  )
}
