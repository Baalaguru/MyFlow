import { useState, type ReactNode } from 'react'
import type { Locale, TranslationKey } from '../i18n'
import type { Appearance, ColorMode } from '../lib/appearance'
import { QuickCapture } from './QuickCapture'
import { StatusPill } from './StatusPill'
import { ThemeToggle } from './ThemeToggle'
import { Breadcrumbs, IconButton, MobileNav, SearchField, type NavItem } from './ui'

export const sectionKeys: TranslationKey[] = [
  'navDashboard',
  'navTasks',
  'navHabits',
  'navGym',
  'navFood',
  'navCardio',
  'navFinance',
  'navSettings',
  'navDesignSystem',
]

interface AppShellProps {
  t: (key: TranslationKey) => string
  active: number
  onSelect: (index: number) => void
  online: boolean
  appearance: Appearance
  onModeChange: (mode: ColorMode) => void
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  search: string
  onSearchChange: (value: string) => void
  onQuickCaptureSaved: () => void
  children: ReactNode
}

export function AppShell({
  t,
  active,
  onSelect,
  online,
  appearance,
  onModeChange,
  locale,
  onLocaleChange,
  search,
  onSearchChange,
  onQuickCaptureSaved,
  children,
}: AppShellProps) {
  const [captureOpen, setCaptureOpen] = useState(false)
  const navItems: NavItem[] = sectionKeys.map((key, index) => ({ key: String(index), label: t(key) }))

  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden w-64 shrink-0 border-r px-5 py-7 md:block"
        style={{ borderColor: 'var(--mf-border)', backgroundColor: 'var(--mf-surface)' }}
      >
        <p className="font-display text-3xl leading-none" style={{ fontFamily: 'var(--mf-active-font-appTitle)' }}>
          {t('appTitle')}
        </p>
        <p className="muted mt-2 text-xs italic leading-relaxed">{t('tagline')}</p>

        <nav className="mt-10 space-y-1" aria-label={t('modulesLabel')}>
          {navItems.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(index)}
              aria-current={active === index ? 'page' : undefined}
              className="min-h-[44px] w-full rounded-lg px-3 py-2 text-left text-sm"
              style={
                active === index
                  ? { backgroundColor: 'var(--mf-primary)', color: 'var(--mf-onPrimary)' }
                  : { color: 'var(--mf-text)' }
              }
            >
              {item.label}
            </button>
          ))}
        </nav>

        <p className="eyebrow mt-10">{t('versionNote')}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 md:px-9"
          style={{ borderColor: 'var(--mf-border)' }}
        >
          <div className="md:hidden">
            <p className="font-display text-2xl" style={{ fontFamily: 'var(--mf-active-font-appTitle)' }}>
              {t('appTitle')}
            </p>
          </div>
          <div className="ml-auto flex w-full flex-wrap items-center gap-3 md:w-auto">
            <div className="hidden min-w-[200px] flex-1 lg:block">
              <SearchField
                label={t('searchPlaceholder')}
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={onSearchChange}
              />
            </div>
            <QuickCapture
              open={captureOpen}
              onClose={() => setCaptureOpen(false)}
              onSaved={onQuickCaptureSaved}
              labels={{
                open: t('quickCaptureLabel'),
                title: t('quickCaptureTitle'),
                field: t('quickCapturePlaceholder'),
                placeholder: t('quickCapturePlaceholder'),
                save: t('saveAction'),
                close: t('cancelAction'),
                saved: t('capturedToast'),
                error: t('captureError'),
              }}
              trigger={
                <IconButton label={t('quickCaptureLabel')} onClick={() => setCaptureOpen(true)}>
                  <span aria-hidden="true" className="text-lg leading-none">
                    +
                  </span>
                </IconButton>
              }
            />
            <StatusPill online={online} onlineLabel={t('online')} offlineLabel={t('offline')} />
            <ThemeToggle
              mode={appearance.mode}
              onChange={onModeChange}
              labels={{ light: t('light'), dark: t('dark'), system: t('system'), theme: t('theme') }}
            />
            <button
              type="button"
              className="btn btn-ghost min-h-[44px]"
              onClick={() => onLocaleChange(locale === 'en' ? 'ta' : 'en')}
              aria-label={t('language')}
            >
              {locale === 'en' ? t('languageTamil') : t('languageEnglish')}
            </button>
          </div>
        </header>

        <MobileNav items={navItems} active={active} onSelect={onSelect} label={t('modulesLabel')} />

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 md:px-9">
          <div className="mb-6">
            <Breadcrumbs
              label={t('navigationSection')}
              items={[t('breadcrumbHome'), t(sectionKeys[active])]}
            />
          </div>
          {children}
        </main>

        <footer
          className="border-t px-5 py-4 text-xs md:px-9"
          style={{ borderColor: 'var(--mf-border)', color: 'var(--mf-muted)' }}
        >
          {t('footerNote')}
        </footer>
      </div>
    </div>
  )
}
