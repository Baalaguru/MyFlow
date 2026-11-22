export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'myflow.theme'

let darkQuery: MediaQueryList | null = null

export function readTheme(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'dark' || stored === 'system' ? stored : 'light'
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement

  const paint = () => {
    const dark = mode === 'dark' || (mode === 'system' && darkQuery?.matches === true)
    root.dataset.theme = dark ? 'dark' : 'light'
  }

  if (mode === 'system' && darkQuery === null) {
    darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkQuery.addEventListener('change', paint)
  }

  paint()
  localStorage.setItem(STORAGE_KEY, mode)
}
