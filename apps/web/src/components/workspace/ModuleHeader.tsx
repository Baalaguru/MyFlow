import type { ReactNode } from 'react'
import type { RouteId } from '../../lib/routes'

interface ModuleHeaderProps {
  route: RouteId
  eyebrow: string
  title: string
  subtitle: string
  progress: ReactNode
  filters?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function ModuleHeader({
  route,
  eyebrow,
  title,
  subtitle,
  progress,
  filters,
  actions,
  children,
}: ModuleHeaderProps) {
  return (
    <div data-module={route} className="space-y-7">
      <header className="space-y-3">
        <p className="eyebrow" style={{ color: 'var(--mf-module-accent)' }}>
          {eyebrow}
        </p>
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        <p className="muted text-sm italic md:text-base">{subtitle}</p>
      </header>

      <div className="flex justify-center">{progress}</div>

      {filters ? <div className="border-y py-4" style={{ borderColor: 'var(--mf-border)' }}>{filters}</div> : null}
      {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}

      {children}
    </div>
  )
}
