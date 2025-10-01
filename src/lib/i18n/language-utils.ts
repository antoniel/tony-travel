import { DEFAULT_LANGUAGE, LANGUAGES, type Language } from "./types"

const LANGUAGE_STORAGE_KEY = "tony-travel-language"

/**
 * Detects the user's preferred language from browser settings
 */
export function detectBrowserLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE

  const browserLang = navigator.language

  // Check exact match first
  if (LANGUAGES.includes(browserLang as Language)) {
    return browserLang as Language
  }

  // Check language prefix (e.g., "en-US" -> "en")
  const langPrefix = browserLang.split("-")[0]
  const matchedLang = LANGUAGES.find((lang) => lang.startsWith(langPrefix))

  return matchedLang || DEFAULT_LANGUAGE
}

/**
 * Gets the saved language from localStorage
 */
export function getSavedLanguage(): Language | null {
  if (typeof window === "undefined") return null

  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (saved && LANGUAGES.includes(saved as Language)) {
    return saved as Language
  }

  return null
}

/**
 * Saves the language preference to localStorage
 */
export function saveLanguage(language: Language): void {
  if (typeof window === "undefined") return
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
}

/**
 * Gets the current language considering: URL > localStorage > browser > default
 */
export function getCurrentLanguage(urlLang?: string | null): Language {
  // Priority 1: URL parameter
  if (urlLang && LANGUAGES.includes(urlLang as Language)) {
    return urlLang as Language
  }

  // Priority 2: Saved preference
  const saved = getSavedLanguage()
  if (saved) return saved

  // Priority 3: Browser language
  const browser = detectBrowserLanguage()
  if (browser) return browser

  // Priority 4: Default
  return DEFAULT_LANGUAGE
}

/**
 * Extracts language from URL pathname
 * Returns null for default language (no prefix)
 */
export function getLanguageFromPath(pathname: string): Language | null {
  const parts = pathname.split("/").filter(Boolean)
  const potentialLang = parts[0]

  if (LANGUAGES.includes(potentialLang as Language)) {
    return potentialLang as Language
  }

  return null
}
