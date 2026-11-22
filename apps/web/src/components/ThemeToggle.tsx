import type { ThemeMode } from '../lib/theme'

interface ThemeToggleProps {
  mode: ThemeMode
  onChange: (mode: ThemeMode) => void
  labels: { light: string; dark: string; system: string; theme: string }
}

const modes: ThemeMode[] = ['light', 'dark', 'system']

export function ThemeToggle({ mode, onChange, labels }: ThemeToggleProps) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={labels.theme}>
      <span className="eyebrow hidden sm:inline">{labels.theme}</span>
      <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--border)' }}>
        {modes.map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-md px-2.5 py-1 text-xs"
            aria-pressed={mode === item}
            onClick={() => onChange(item)}
            style={
              mode === item
                ? { backgroundColor: 'var(--accent)', color: '#FBF5E9' }
                : { color: 'var(--text)' }
            }
          >
            {labels[item]}
          </button>
        ))}
      </div>
    </div>
  )
}
