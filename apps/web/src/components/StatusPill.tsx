interface StatusPillProps {
  online: boolean
  onlineLabel: string
  offlineLabel: string
}

export function StatusPill({ online, onlineLabel, offlineLabel }: StatusPillProps) {
  return (
    <span
      className="inline-flex min-h-[36px] items-center gap-2 rounded-pill border px-3 py-1 text-xs"
      style={{ borderColor: 'var(--mf-border)', color: 'var(--mf-muted)' }}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-pill"
        style={{ backgroundColor: online ? 'var(--mf-growth)' : 'var(--mf-highlight)' }}
      />
      {online ? onlineLabel : offlineLabel}
    </span>
  )
}
