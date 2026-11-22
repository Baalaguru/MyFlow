import { useEffect, useState } from 'react'
import {
  presetIds,
  presetLabelKeys,
  fontPreferenceIds,
  fontPreferenceLabelKeys,
  type PresetId,
} from '../generated/tokens'
import type { TranslationKey } from '../i18n'
import {
  validateCustomColour,
  type Appearance,
  type ColorMode,
  type HeadingPreference,
  type SizePreference,
  type SpacingPreference,
} from '../lib/appearance'
import { Button, ConfirmDialog, SelectField, TextField, Toast } from '../components/ui'

type Translate = (key: TranslationKey) => string
const asKey = (key: string) => key as TranslationKey

const modes: ColorMode[] = ['light', 'dark', 'system']
const sizes: { value: SizePreference; label: TranslationKey }[] = [
  { value: 'small', label: 'sizeSmall' },
  { value: 'default', label: 'sizeDefault' },
  { value: 'large', label: 'sizeLarge' },
]
const spacings: { value: SpacingPreference; label: TranslationKey }[] = [
  { value: 'compact', label: 'spacingCompact' },
  { value: 'normal', label: 'spacingNormal' },
  { value: 'relaxed', label: 'spacingRelaxed' },
]
const headings: { value: HeadingPreference; label: TranslationKey }[] = [
  { value: 'compact', label: 'headingCompact' },
  { value: 'default', label: 'headingDefault' },
  { value: 'large', label: 'headingLarge' },
]
const customRoles = ['primary', 'widgetBackground', 'panel'] as const

interface SettingsPageProps {
  appearance: Appearance
  onChange: (appearance: Appearance) => void
  onReset: () => void
  t: Translate
}

export function SettingsPage({ appearance, onChange, onReset, t }: SettingsPageProps) {
  const [draft, setDraft] = useState<Record<(typeof customRoles)[number], string>>({
    primary: '',
    widgetBackground: '',
    panel: '',
  })
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setDraft({
      primary: appearance.custom.primary ?? '',
      widgetBackground: appearance.custom.widgetBackground ?? '',
      panel: appearance.custom.panel ?? '',
    })
  }, [appearance.custom])

  useEffect(() => {
    if (!toastVisible) return
    const timer = window.setTimeout(() => setToastVisible(false), 2600)
    return () => window.clearTimeout(timer)
  }, [toastVisible])

  const commit = (next: Appearance) => {
    onChange(next)
    setToastVisible(true)
  }

  const commitColour = (role: (typeof customRoles)[number], value: string) => {
    const problem = validateCustomColour(role, value)
    if (problem) {
      setErrorKey(asKey(problem))
      return
    }
    setErrorKey(null)
    commit({
      ...appearance,
      preset: 'custom' as PresetId,
      custom: { ...appearance.custom, [role]: value.toLowerCase() },
    })
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{t('appTitle')}</p>
        <h1>{t('settingsTitle')}</h1>
        <p className="muted mt-2 text-sm">{t('settingsSubtitle')}</p>
      </header>

      <section className="panel space-y-5 p-6" aria-label={t('appearanceSection')}>
        <h2 className="text-xl">{t('appearanceSection')}</h2>

        <fieldset className="space-y-2">
          <legend className="eyebrow mb-2">{t('colorModeLabel')}</legend>
          <div className="flex flex-wrap gap-2">
            {modes.map((mode) => (
              <Button
                key={mode}
                variant={appearance.mode === mode ? 'primary' : 'ghost'}
                aria-pressed={appearance.mode === mode}
                onClick={() => commit({ ...appearance, mode })}
              >
                {t(mode)}
              </Button>
            ))}
          </div>
        </fieldset>

        <SelectField
          label={t('themePresetLabel')}
          value={appearance.preset}
          onChange={(event) => commit({ ...appearance, preset: event.target.value as PresetId })}
          options={presetIds.map((id) => ({ value: id, label: t(asKey(presetLabelKeys[id])) }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={t('fontFamilyLabel')}
            value={appearance.fontPreference}
            onChange={(event) =>
              commit({ ...appearance, fontPreference: event.target.value as Appearance['fontPreference'] })
            }
            options={fontPreferenceIds.map((id) => ({
              value: id,
              label: t(asKey(fontPreferenceLabelKeys[id])),
            }))}
          />
          <SelectField
            label={t('fontSizeLabel')}
            value={appearance.size}
            onChange={(event) => commit({ ...appearance, size: event.target.value as SizePreference })}
            options={sizes.map((size) => ({ value: size.value, label: t(size.label) }))}
          />
          <SelectField
            label={t('lineSpacingLabel')}
            value={appearance.spacing}
            onChange={(event) => commit({ ...appearance, spacing: event.target.value as SpacingPreference })}
            options={spacings.map((spacing) => ({
              value: spacing.value,
              label: t(spacing.label),
            }))}
          />
          <SelectField
            label={t('headingSizeLabel')}
            value={appearance.heading}
            onChange={(event) => commit({ ...appearance, heading: event.target.value as HeadingPreference })}
            options={headings.map((heading) => ({
              value: heading.value,
              label: t(heading.label),
            }))}
          />
        </div>
      </section>

      <section className="panel space-y-5 p-6" aria-label={t('customColorsSection')}>
        <h2 className="text-xl">{t('customColorsSection')}</h2>
        <p className="muted text-sm">{t('customPaletteNote')}</p>
        <p className="muted text-sm">{t('moduleAccentLabel')}</p>
        <p className="muted text-sm">{t('chartPaletteNote')}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          {customRoles.map((role) => (
            <div key={role} className="space-y-2">
              <TextField
                label={t(asKey(role === 'primary' ? 'accentColorLabel' : role === 'panel' ? 'panelColorLabel' : 'widgetBackgroundLabel'))}
                value={draft[role]}
                placeholder="#70563B"
                onChange={(event) => setDraft({ ...draft, [role]: event.target.value })}
                onBlur={(event) => commitColour(role, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
              />
              <input
                type="color"
                aria-label={t(asKey(role === 'primary' ? 'accentColorLabel' : role === 'panel' ? 'panelColorLabel' : 'widgetBackgroundLabel'))}
                value={/^#[0-9A-Fa-f]{6}$/.test(draft[role]) ? draft[role] : '#70563B'}
                onChange={(event) => {
                  setDraft({ ...draft, [role]: event.target.value })
                  commitColour(role, event.target.value)
                }}
                className="h-11 w-full cursor-pointer rounded-lg border"
                style={{ borderColor: 'var(--mf-border)', backgroundColor: 'var(--mf-surface)' }}
              />
            </div>
          ))}
        </div>
        {errorKey ? <p role="alert" className="text-sm" style={{ color: 'var(--mf-danger)' }}>{t(errorKey)}</p> : null}

        <Button variant="ghost" onClick={() => setConfirmReset(true)}>
          {t('resetDefaults')}
        </Button>
      </section>

      <Toast message={t('appearanceSaved')} visible={toastVisible} />

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t('resetConfirmTitle')}
        body={t('resetConfirmBody')}
        closeLabel={t('cancelAction')}
        confirmLabel={t('confirmAction')}
        cancelLabel={t('cancelAction')}
        onConfirm={onReset}
      />
    </div>
  )
}
