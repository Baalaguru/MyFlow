interface FilterOption<T extends string> {
  value: T
  label: string
}

interface ModuleFilterBarProps<T extends string> {
  label: string
  options: FilterOption<T>[]
  value: T
  onChange: (value: T) => void
  note?: string
}

export function ModuleFilterBar<T extends string>({
  label,
  options,
  value,
  onChange,
  note,
}: ModuleFilterBarProps<T>) {
  return (
    <section className="space-y-2" aria-label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            disabled={options.length === 1 && !note}
            onClick={() => onChange(option.value)}
            className="min-h-[44px] rounded-pill border px-4 text-sm disabled:opacity-60"
            style={
              value === option.value
                ? { backgroundColor: 'var(--mf-module-accent)', color: 'var(--mf-onPrimary)', borderColor: 'var(--mf-module-accent)' }
                : { borderColor: 'var(--mf-border)', color: 'var(--mf-text)' }
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      {note ? <p className="text-xs muted">{note}</p> : null}
    </section>
  )
}
