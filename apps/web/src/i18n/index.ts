import en from '../../../../contracts/i18n/en.json'
import ta from '../../../../contracts/i18n/ta.json'

export type Locale = 'en' | 'ta'
export type TranslationKey = keyof typeof en

const bundles: Record<Locale, Record<TranslationKey, string>> = { en, ta }

export function translate(locale: Locale, key: TranslationKey): string {
  return bundles[locale][key] ?? bundles.en[key]
}

export function readLocale(): Locale {
  return navigator.language.toLowerCase().startsWith('ta') ? 'ta' : 'en'
}
