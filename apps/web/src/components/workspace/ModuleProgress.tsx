import type { ProgressSnapshot } from '../../lib/progress'
import { ProgressBar } from '../ui'

interface ModuleProgressProps {
  snapshot: ProgressSnapshot
  label: string
  completedLabel: string
  unavailableLabel: string
}

export function ModuleProgress({ snapshot, label, completedLabel, unavailableLabel }: ModuleProgressProps) {
  if (!snapshot.available) {
    return (
      <p className="panel mx-auto w-full max-w-xl px-4 py-3 text-center text-sm" style={{ color: 'var(--mf-muted)' }}>
        {unavailableLabel}
      </p>
    )
  }

  return (
    <section className="panel mx-auto w-full max-w-xl px-5 py-4" aria-label={label}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--mf-muted)' }}>
        <span>{label}</span>
        <span>
          {snapshot.completed} {completedLabel} {snapshot.total}
        </span>
      </div>
      <ProgressBar value={snapshot.percent ?? 0} label={label} />
    </section>
  )
}
