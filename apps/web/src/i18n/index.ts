import en from '../../../../contracts/i18n/en.json'
import ta from '../../../../contracts/i18n/ta.json'

export type Locale = 'en' | 'ta'
export type TranslationKey = keyof typeof en

const STORAGE_KEY = 'myflow.locale'
const bundles: Record<Locale, Record<TranslationKey, string>> = { en, ta }

export function translate(locale: Locale, key: TranslationKey): string {
  return bundles[locale][key] ?? bundles.en[key]
}

export function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'ta') return stored
  } catch {
    // Storage may be unavailable; fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('ta') ? 'ta' : 'en'
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale)
}
