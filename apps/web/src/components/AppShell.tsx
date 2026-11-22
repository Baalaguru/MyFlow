import type { ReactNode } from 'react'
import type { Locale, TranslationKey } from '../i18n'
import type { ThemeMode } from '../lib/theme'
import { StatusPill } from './StatusPill'
import { ThemeToggle } from './ThemeToggle'

export const sectionKeys: TranslationKey[] = [
  'navDashboard',
  'navTasks',
  'navHabits',
  'navGym',
  'navFood',
  'navCardio',
  'navFinance',
]

interface AppShellProps {
  t: (key: TranslationKey) => string
  active: number
  onSelect: (index: number) => void
  online: boolean
  themeMode: ThemeMode
  onThemeChange: (mode: ThemeMode) => void
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  children: ReactNode
}

export function AppShell({
  t,
  active,
  onSelect,
  online,
  themeMode,
  onThemeChange,
  locale,
  onLocaleChange,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r px-5 py-7 md:block" style={{ borderColor: 'var(--border)' }}>
        <p className="font-display text-3xl leading-none">{t('appTitle')}</p>
        <p className="muted mt-2 text-xs italic leading-relaxed">{t('tagline')}</p>

        <nav className="mt-10 space-y-1" aria-label="Modules">
          {sectionKeys.map((key, index) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(index)}
              aria-current={active === index ? 'page' : undefined}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm"
              style={
                active === index
                  ? { backgroundColor: 'var(--accent)', color: '#FBF5E9' }
                  : { color: 'var(--text)' }
              }
            >
              {t(key)}
            </button>
          ))}
        </nav>

        <p className="eyebrow mt-10">v0.1.0 · Phase 2</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 md:px-9"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="md:hidden">
            <p className="font-display text-2xl">{t('appTitle')}</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <StatusPill online={online} onlineLabel={t('online')} offlineLabel={t('offline')} />
            <ThemeToggle
              mode={themeMode}
              onChange={onThemeChange}
              labels={{ light: t('light'), dark: t('dark'), system: t('system'), theme: t('theme') }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onLocaleChange(locale === 'en' ? 'ta' : 'en')}
              aria-label={t('language')}
            >
              {locale === 'en' ? 'தமிழ்' : 'English'}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 md:px-9">{children}</main>

        <footer className="border-t px-5 py-4 text-xs md:px-9" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          My Flow · offline-first · self-hosted
        </footer>
      </div>
    </div>
  )
}
