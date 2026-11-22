import { useCallback, useState } from 'react'
import { AppShell, sectionKeys } from './components/AppShell'
import { useOnline } from './hooks/useOnline'
import { readLocale, translate, type Locale, type TranslationKey } from './i18n'
import { applyTheme, readTheme, type ThemeMode } from './lib/theme'
import { DashboardPage } from './pages/DashboardPage'

export default function App() {
  const [active, setActive] = useState(0)
  const [locale, setLocale] = useState<Locale>(readLocale)
  const [themeMode, setThemeMode] = useState<ThemeMode>(readTheme)
  const online = useOnline()

  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale])

  const changeTheme = (mode: ThemeMode) => {
    applyTheme(mode)
    setThemeMode(mode)
  }

  return (
    <AppShell
      t={t}
      active={active}
      onSelect={setActive}
      online={online}
      themeMode={themeMode}
      onThemeChange={changeTheme}
      locale={locale}
      onLocaleChange={setLocale}
    >
      {active === 0 ? (
        <DashboardPage t={t} />
      ) : (
        <div className="panel p-8">
          <h1 className="font-display text-3xl">{t(sectionKeys[active])}</h1>
          <p className="muted mt-3">{t('plannedTitle')}</p>
          <p className="muted mt-1 text-sm">{t('plannedNote')}</p>
        </div>
      )}
    </AppShell>
  )
}
