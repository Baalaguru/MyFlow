import {
  presetIds,
  type FontPreference,
  type PresetId,
  type ThemeRole,
  fontPreferenceIds,
} from '../generated/tokens'

export type ColorMode = 'light' | 'dark' | 'system'
export type SizePreference = 'small' | 'default' | 'large'
export type SpacingPreference = 'compact' | 'normal' | 'relaxed'
export type HeadingPreference = 'compact' | 'default' | 'large'

export const APPEARANCE_VERSION = 1

export interface Appearance {
  version: number
  mode: ColorMode
  preset: PresetId
  fontPreference: FontPreference
  size: SizePreference
  spacing: SpacingPreference
  heading: HeadingPreference
  custom: Partial<Record<ThemeRole, string>>
}

const STORAGE_KEY = 'myflow.appearance'
const CUSTOM_ROLES: ThemeRole[] = ['primary', 'growth', 'highlight', 'widgetBackground', 'panel']
const DARK_FOREGROUND = '#241E1A'
const LIGHT_FOREGROUND = '#FBF5E9'

export const DEFAULT_APPEARANCE: Appearance = {
  version: APPEARANCE_VERSION,
  mode: 'light',
  preset: 'vintageLibrary',
  fontPreference: 'vintage',
  size: 'default',
  spacing: 'normal',
  heading: 'default',
  custom: {},
}

const isOneOf = <T extends string>(value: unknown, values: readonly T[]): value is T =>
  typeof value === 'string' && values.includes(value as T)

const HEX = /^#[0-9A-Fa-f]{6}$/

const channel = (hex: string, start: number): number => {
  const value = parseInt(hex.slice(start, start + 2), 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  if (!HEX.test(hex)) throw new Error(`Invalid hex colour: ${hex}`)
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5)
}

export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Picks the foreground with the best contrast, never inventing an unreadable pair. */
export function readableForeground(background: string): string {
  const darkRatio = contrastRatio(background, DARK_FOREGROUND)
  const lightRatio = contrastRatio(background, LIGHT_FOREGROUND)
  return darkRatio >= lightRatio ? DARK_FOREGROUND : LIGHT_FOREGROUND
}

export function isReadablePair(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= 4.5
}

export function isHexColour(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value)
}

export function readAppearance(): Appearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_APPEARANCE, custom: {} }
    const parsed = JSON.parse(raw) as Partial<Appearance>
    if (parsed.version !== APPEARANCE_VERSION) return { ...DEFAULT_APPEARANCE, custom: {} }
    const custom: Partial<Record<ThemeRole, string>> = {}
    if (parsed.custom && typeof parsed.custom === 'object') {
      for (const role of CUSTOM_ROLES) {
        const value = parsed.custom[role]
        if (!isHexColour(value)) continue
        const foreground = readableForeground(value)
        if (isReadablePair(foreground, value)) custom[role] = value
      }
    }
    return {
      version: APPEARANCE_VERSION,
      mode: isOneOf(parsed.mode, ['light', 'dark', 'system'] as const) ? parsed.mode : DEFAULT_APPEARANCE.mode,
      preset: isOneOf(parsed.preset, presetIds) ? parsed.preset : DEFAULT_APPEARANCE.preset,
      fontPreference: isOneOf(parsed.fontPreference, fontPreferenceIds)
        ? parsed.fontPreference
        : DEFAULT_APPEARANCE.fontPreference,
      size: isOneOf(parsed.size, ['small', 'default', 'large'] as const) ? parsed.size : DEFAULT_APPEARANCE.size,
      spacing: isOneOf(parsed.spacing, ['compact', 'normal', 'relaxed'] as const)
        ? parsed.spacing
        : DEFAULT_APPEARANCE.spacing,
      heading: isOneOf(parsed.heading, ['compact', 'default', 'large'] as const)
        ? parsed.heading
        : DEFAULT_APPEARANCE.heading,
      custom,
    }
  } catch {
    return { ...DEFAULT_APPEARANCE, custom: {} }
  }
}

export function saveAppearance(appearance: Appearance): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
}

export function resolveColorMode(mode: ColorMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

const customVarNames = new Set<string>()

export function applyAppearance(appearance: Appearance): void {
  const root = document.documentElement
  const mode = resolveColorMode(appearance.mode)

  root.dataset.preset = appearance.preset
  root.dataset.mode = mode
  root.dataset.fonts = appearance.fontPreference
  root.dataset.size = appearance.size
  root.dataset.spacing = appearance.spacing
  root.dataset.heading = appearance.heading
  root.dataset.theme = mode

  for (const name of customVarNames) root.style.removeProperty(name)
  customVarNames.clear()

  for (const role of CUSTOM_ROLES) {
    const value = appearance.custom[role]
    if (!isHexColour(value)) continue
    const foreground = readableForeground(value)
    if (!isReadablePair(foreground, value)) continue

    const name = `--mf-${role}`
    root.style.setProperty(name, value)
    customVarNames.add(name)

    if (role === 'primary' || role === 'growth' || role === 'highlight') {
      const onName = `--mf-on${role[0].toUpperCase()}${role.slice(1)}`
      root.style.setProperty(onName, foreground)
      customVarNames.add(onName)
    }
    if (role === 'widgetBackground') {
      root.style.setProperty('--mf-onWidget', foreground)
      customVarNames.add('--mf-onWidget')
    }
    if (role === 'panel') {
      root.style.setProperty('--mf-onPanel', foreground)
      customVarNames.add('--mf-onPanel')
    }
  }
}

export function validateCustomColour(role: ThemeRole, value: string): string | null {
  if (!CUSTOM_ROLES.includes(role)) return 'invalidColor'
  if (!isHexColour(value)) return 'invalidColor'
  return isReadablePair(readableForeground(value), value) ? null : 'contrastWarning'
}

export { CUSTOM_ROLES }
