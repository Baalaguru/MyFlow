interface StatusPillProps {
  online: boolean
  onlineLabel: string
  offlineLabel: string
}

export function StatusPill({ online, onlineLabel, offlineLabel }: StatusPillProps) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: online ? 'var(--growth)' : 'var(--highlight)' }}
      />
      {online ? onlineLabel : offlineLabel}
    </span>
  )
}
