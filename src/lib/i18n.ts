import type { AppLanguage } from './types'
import { en } from './translations/en'
import { ptBr } from './translations/pt-br'
import { es } from './translations/es'
import { ja } from './translations/ja'
import { ko } from './translations/ko'
import { zh } from './translations/zh'

export type { AppLanguage } from './types'
export type TranslationKeys = typeof en

const translations: Record<AppLanguage, TranslationKeys> = {
  en,
  'pt-br': ptBr,
  es,
  ja,
  ko,
  zh,
}

export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  'pt-br': 'Português (BR)',
  es: 'Español',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
}

export function t(language: AppLanguage, key: keyof TranslationKeys): string {
  return translations[language]?.[key] || translations.en[key] || key
}

export function getTranslations(language: AppLanguage): TranslationKeys {
  return translations[language] || translations.en
}
