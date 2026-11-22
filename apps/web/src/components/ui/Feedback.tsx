import { useId, type ReactNode } from 'react'
import { Button } from './Button'

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-10 text-center">
      <span aria-hidden="true" className="mb-3 text-3xl" style={{ color: 'var(--mf-growth)' }}>
        ❧
      </span>
      <h3>{title}</h3>
      <p className="muted mt-2 text-sm">{body}</p>
    </div>
  )
}

export function ErrorState({
  title,
  body,
  actionLabel,
  onRetry,
}: {
  title: string
  body: string
  actionLabel: string
  onRetry: () => void
}) {
  return (
    <div className="panel border-l-4 px-5 py-4" style={{ borderLeftColor: 'var(--mf-danger)' }} role="alert">
      <h3>{title}</h3>
      <p className="muted mt-1 text-sm">{body}</p>
      <Button className="mt-3" onClick={onRetry}>
        {actionLabel}
      </Button>
    </div>
  )
}

export function LoadingSkeleton({ label, lines = 3 }: { label: string; lines?: number }) {
  return (
    <div className="panel space-y-3 p-5" role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="h-3 animate-pulse rounded"
          style={{ backgroundColor: 'var(--mf-surfaceAlt)', width: `${90 - index * 14}%` }}
        />
      ))}
    </div>
  )
}

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null
  return (
    <div
      className="panel fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-5 py-3 text-sm shadow-raised"
      style={{ backgroundColor: 'var(--mf-primary)', color: 'var(--mf-onPrimary)' }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}

export type SyncStatus = 'syncing' | 'synced' | 'unavailable'

export function SyncIndicator({
  status,
  label,
}: {
  status: SyncStatus
  label: string
}) {
  const color =
    status === 'syncing' ? 'var(--mf-highlight)' : status === 'synced' ? 'var(--mf-growth)' : 'var(--mf-muted)'
  return (
    <span
      className="inline-flex min-h-[36px] items-center gap-2 rounded-pill border px-3 py-1 text-xs"
      style={{ borderColor: 'var(--mf-border)', color: 'var(--mf-muted)' }}
      role="status"
      data-sync={status}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-pill" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className="panel pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 whitespace-nowrap px-3 py-1.5 text-xs group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  )
}

export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const percent = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs" style={{ color: 'var(--mf-muted)' }}>
        <span>{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-pill"
        style={{ backgroundColor: 'var(--mf-surfaceAlt)' }}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className="h-full rounded-pill transition-all"
          style={{ width: `${percent}%`, backgroundColor: 'var(--mf-growth)' }}
        />
      </div>
    </div>
  )
}

export function ProgressRing({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const percent = max === 0 ? 0 : Math.min(1, Math.max(0, value / max))
  const radius = 18
  const circumference = 2 * Math.PI * radius
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      role="img"
      aria-label={`${label}: ${Math.round(percent * 100)}%`}
    >
      <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--mf-surfaceAlt)" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="var(--mf-growth)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - percent)}
        transform="rotate(-90 22 22)"
      />
    </svg>
  )
}
