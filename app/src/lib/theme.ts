import type { Theme } from './types.ts'

export const THEME_LABELS: Record<Theme, string> = {
  cyberpunk: 'Cyberpunk',
  terminal: 'Terminal',
  'clean-dark': 'Clean Dark',
  light: 'Light',
  corporate: 'Corporate',
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('uppies:theme', theme)
}

export function getSavedTheme(allowed: ReadonlyArray<string>, fallback: Theme): Theme {
  const saved = localStorage.getItem('uppies:theme')
  if (saved !== null && allowed.includes(saved)) return saved as Theme
  return fallback
}
