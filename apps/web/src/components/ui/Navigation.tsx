export interface NavItem {
  key: string
  label: string
}

export function Breadcrumbs({ items, label }: { items: string[]; label: string }) {
  return (
    <nav aria-label={label} className="muted text-xs">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {index === items.length - 1 ? (
              <span aria-current="page">{item}</span>
            ) : (
              <span>{item}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="sr-only" htmlFor="mf-global-search">
        {label}
      </label>
      <input
        id="mf-global-search"
        type="search"
        className="field"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export function MobileNav({
  items,
  active,
  onSelect,
  label,
}: {
  items: NavItem[]
  active: number
  onSelect: (index: number) => void
  label: string
}) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b px-3 py-2 md:hidden" style={{ borderColor: 'var(--mf-border)' }}>
      {items.map((item, index) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(index)}
          aria-current={active === index ? 'page' : undefined}
          className="min-h-[44px] shrink-0 rounded-lg px-3 text-sm"
          style={
            active === index
              ? { backgroundColor: 'var(--mf-primary)', color: 'var(--mf-onPrimary)' }
              : { color: 'var(--mf-text)' }
          }
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
