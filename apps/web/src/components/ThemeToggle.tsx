import type { ColorMode } from '../lib/appearance'

interface ThemeToggleProps {
  mode: ColorMode
  onChange: (mode: ColorMode) => void
  labels: { light: string; dark: string; system: string; theme: string }
}

const modes: ColorMode[] = ['light', 'dark', 'system']

export function ThemeToggle({ mode, onChange, labels }: ThemeToggleProps) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={labels.theme}>
      <span className="eyebrow hidden xl:inline">{labels.theme}</span>
      <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--mf-border)' }}>
        {modes.map((item) => (
          <button
            key={item}
            type="button"
            className="min-h-[36px] rounded-md px-2.5 py-1 text-xs"
            aria-pressed={mode === item}
            onClick={() => onChange(item)}
            style={
              mode === item
                ? { backgroundColor: 'var(--mf-primary)', color: 'var(--mf-onPrimary)' }
                : { color: 'var(--mf-text)' }
            }
          >
            {labels[item]}
          </button>
        ))}
      </div>
    </div>
  )
}
