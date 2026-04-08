import type { Theme } from './types.ts'

export const THEMES: ReadonlyArray<{ id: Theme; label: string }> = [
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'clean-dark', label: 'Clean Dark' },
  { id: 'light', label: 'Light' },
  { id: 'corporate', label: 'Corporate' },
]

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('uppies:theme', theme)
}

export function getSavedTheme(): Theme {
  const saved = localStorage.getItem('uppies:theme')
  const isValidTheme = (v: string): v is Theme =>
    THEMES.some((t) => t.id === v)
  if (saved !== null && isValidTheme(saved)) return saved
  return 'cyberpunk'
}
