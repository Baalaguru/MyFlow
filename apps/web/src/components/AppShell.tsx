import { useState, type ReactNode } from 'react'
import type { Locale, TranslationKey } from '../i18n'
import type { Appearance, ColorMode } from '../lib/appearance'
import { navRouteIds, routeLabelKeys, type RouteId } from '../lib/routes'
import { GlobalSearch } from './GlobalSearch'
import { QuickCapture } from './QuickCapture'
import { StatusPill } from './StatusPill'
import { ThemeToggle } from './ThemeToggle'
import { Breadcrumbs, IconButton, MobileNav, type NavItem } from './ui'

interface AppShellProps {
  t: (key: TranslationKey) => string
  route: RouteId
  onNavigate: (route: RouteId) => void
  onBack: () => void
  onForward: () => void
  canBack: boolean
  canForward: boolean
  online: boolean
  appearance: Appearance
  onModeChange: (mode: ColorMode) => void
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  onQuickCaptureSaved: () => void
  children: ReactNode
}

export function AppShell({
  t,
  route,
  onNavigate,
  onBack,
  onForward,
  canBack,
  canForward,
  online,
  appearance,
  onModeChange,
  locale,
  onLocaleChange,
  onQuickCaptureSaved,
  children,
}: AppShellProps) {
  const [captureOpen, setCaptureOpen] = useState(false)
  const navItems: NavItem[] = navRouteIds.map((id) => ({ key: id, label: t(routeLabelKeys[id]) }))
  const activeIndex = navRouteIds.indexOf(route)

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
              onClick={() => onNavigate(navRouteIds[index])}
              aria-current={activeIndex === index ? 'page' : undefined}
              className="min-h-[44px] w-full rounded-lg px-3 py-2 text-left text-sm"
              style={
                activeIndex === index
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
          className="flex flex-wrap items-center gap-3 border-b px-5 py-4 md:px-9"
          style={{ borderColor: 'var(--mf-border)' }}
        >
          <div className="flex items-center gap-1">
            <IconButton label={t('back')} onClick={onBack} disabled={!canBack}>
              <span aria-hidden="true">←</span>
            </IconButton>
            <IconButton label={t('forward')} onClick={onForward} disabled={!canForward}>
              <span aria-hidden="true">→</span>
            </IconButton>
          </div>

          <div className="md:hidden">
            <p className="font-display text-2xl" style={{ fontFamily: 'var(--mf-active-font-appTitle)' }}>
              {t('appTitle')}
            </p>
          </div>

          <div className="order-last w-full min-w-0 lg:order-none lg:ml-auto lg:w-auto lg:flex-1">
            <GlobalSearch t={t} onNavigate={onNavigate} />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3 lg:ml-0">
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
            <IconButton label={t('navProfile')} onClick={() => onNavigate('profile')}>
              <span aria-hidden="true">◎</span>
            </IconButton>
          </div>
        </header>

        <MobileNav items={navItems} active={activeIndex} onSelect={(index) => onNavigate(navRouteIds[index])} label={t('modulesLabel')} />

        <main data-module={route} className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 md:px-9">
          <div className="mb-6">
            <Breadcrumbs
              label={t('navigationSection')}
              items={[t('breadcrumbHome'), t(routeLabelKeys[route])]}
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
