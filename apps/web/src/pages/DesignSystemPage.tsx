import { useState } from 'react'
import {
  chartPalettes,
  presetLabelKeys,
  primitiveColors,
  themeRoles,
  type PresetId,
} from '../generated/tokens'
import type { TranslationKey } from '../i18n'
import type { Appearance } from '../lib/appearance'
import { resolveColorMode } from '../lib/appearance'
import {
  BarGraph,
  BottomSheet,
  Breadcrumbs,
  Button,
  ConfirmDialog,
  DataTable,
  DateField,
  Dialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  MobileNav,
  ProgressBar,
  ProgressRing,
  ResponsiveCard,
  SearchField,
  SelectField,
  StatCard,
  SyncIndicator,
  TextArea,
  TextField,
  TimeField,
  Toast,
  Tooltip,
} from '../components/ui'

type Translate = (key: TranslationKey) => string

export function DesignSystemPage({ t, appearance }: { t: Translate; appearance: Appearance }) {
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [toast, setToast] = useState(false)
  const [mobileTab, setMobileTab] = useState(0)

  const palette = chartPalettes[appearance.preset as PresetId][resolveColorMode(appearance.mode)]
  const navItems = [
    { key: 'dashboard', label: t('navDashboard') },
    { key: 'tasks', label: t('navTasks') },
    { key: 'habits', label: t('navHabits') },
  ]

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">{t('appTitle')}</p>
        <h1>{t('designSystemTitle')}</h1>
        <p className="muted mt-2 text-sm">{t('designSystemSubtitle')}</p>
      </header>

      <Breadcrumbs
        label={t('navigationSection')}
        items={[t('breadcrumbHome'), t('breadcrumbSection'), t('breadcrumbCurrent')]}
      />

      <section className="space-y-4">
        <h2 className="text-xl">{t('paletteSection')}</h2>
        <div className="panel grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
          {themeRoles.map((role) => (
            <div key={role} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="h-8 w-8 shrink-0 rounded-md border"
                style={{ backgroundColor: `var(--mf-${role})`, borderColor: 'var(--mf-border)' }}
              />
              <code>{role}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">{t('primitiveColorsSection')}</h2>
        <div className="panel grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(primitiveColors).map(([name, value]) => (
            <div key={name} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="h-8 w-8 shrink-0 rounded-md border"
                style={{ backgroundColor: value, borderColor: 'var(--mf-border)' }}
              />
              <code>{name}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl">{t('typographySection')}</h2>
        <div className="panel space-y-3 p-6">
          <p className="eyebrow">{t('sampleEyebrow')}</p>
          <h2>{t('sampleHeading')}</h2>
          <p className="text-sm">{t('sampleBody')}</p>
          <p className="serif-quote">“{t('sampleQuote')}”</p>
          <p className="stat-number">{t('statCaption')}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">{t('componentsSection')}</h2>
        <div className="panel grid gap-5 p-6 sm:grid-cols-2">
          <div className="flex flex-wrap gap-2">
            <Button>{t('primaryAction')}</Button>
            <Button variant="secondary">{t('secondaryAction')}</Button>
            <Button variant="ghost">{t('cancelAction')}</Button>
            <Tooltip label={t('tooltipSample')}>
              <IconButton label={t('iconButtonLabel')}>+</IconButton>
            </Tooltip>
          </div>
          <TextField label={t('tableColumn')} placeholder={t('searchPlaceholder')} />
          <TextArea label={t('textAreaLabel')} rows={2} />
          <SelectField
            label={t('selectLabel')}
            options={[
              { value: 'one', label: t('sizeSmall') },
              { value: 'two', label: t('sizeLarge') },
            ]}
          />
          <DateField label={t('dateLabel')} />
          <TimeField label={t('timeLabel')} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">{t('statesSection')}</h2>
        <div className="panel flex flex-wrap items-center gap-4 p-6">
          <Button aria-pressed="true">{t('selectedState')}</Button>
          <Button variant="ghost" className="hover:bg-[var(--mf-surfaceAlt)]">
            {t('hoverState')}
          </Button>
          <Button variant="ghost">{t('focusState')}</Button>
          <Button disabled>{t('disabledState')}</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">{t('feedbackSection')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />
          <ErrorState title={t('errorTitle')} body={t('errorBody')} actionLabel={t('retryAction')} onRetry={() => setToast(true)} />
          <LoadingSkeleton label={t('loadingLabel')} />
          <div className="panel space-y-4 p-5">
            <ProgressBar value={62} label={t('progressLabel')} />
            <div className="flex items-center gap-3">
              <ProgressRing value={62} label={t('progressLabel')} />
              <span className="text-sm">{t('progressLabel')}</span>
            </div>
            <Button onClick={() => setToast(true)}>{t('toastSample')}</Button>
          </div>
        </div>
        <div className="panel flex flex-wrap items-center gap-3 p-5">
          <SyncIndicator status="syncing" label={t('syncing')} />
          <SyncIndicator status="synced" label={t('synced')} />
          <SyncIndicator status="unavailable" label={t('syncUnavailable')} />
          <p className="muted w-full text-xs">{t('syncSampleNote')}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">{t('dataSection')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard caption={t('statCaption')} value="—" detail={t('statChange')} />
          <DataTable
            caption={t('dataSection')}
            columns={[
              { key: 'field', label: t('tableColumn') },
              { key: 'value', label: t('tableValue') },
            ]}
            rows={[
              {
                field: t('themePresetLabel'),
                value: t(presetLabelKeys[appearance.preset] as TranslationKey),
              },
            ]}
          />
          <ResponsiveCard title={t('sampleHeading')} span="wide">
            {t('sampleBody')}
          </ResponsiveCard>
        </div>
        <div className="panel p-5">
          <h3 className="mb-3 text-base">{t('chartTitle')}</h3>
          <BarGraph
            labels={palette.map((_, index) => String(index + 1))}
            values={palette.map(() => 6)}
            colors={palette}
            description={t('chartDescription')}
          />
          <p className="muted mt-2 text-xs">{t('chartSeries')}: {palette.length}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">{t('navigationSection')}</h2>
        <div className="panel space-y-4 p-6">
          <SearchField
            label={t('searchPlaceholder')}
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={setSearch}
          />
          <MobileNav items={navItems} active={mobileTab} onSelect={setMobileTab} label={t('navigationSection')} />
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setDialog(true)}>{t('dialogTitle')}</Button>
            <Button variant="ghost" onClick={() => setConfirm(true)}>{t('confirmAction')}</Button>
            <Button variant="ghost" onClick={() => setSheet(true)}>{t('bottomSheetTitle')}</Button>
          </div>
        </div>
      </section>

      <Toast message={t('toastSample')} visible={toast} />

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title={t('dialogTitle')}
        closeLabel={t('cancelAction')}
      >
        <p>{t('dialogBody')}</p>
      </Dialog>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('dialogTitle')}
        body={t('dialogBody')}
        closeLabel={t('cancelAction')}
        confirmLabel={t('confirmAction')}
        cancelLabel={t('cancelAction')}
        onConfirm={() => setToast(true)}
      />
      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={t('bottomSheetTitle')}
        closeLabel={t('cancelAction')}
      >
        <p>{t('dialogBody')}</p>
      </BottomSheet>
    </div>
  )
}
