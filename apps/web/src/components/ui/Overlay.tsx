import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'

function useDialogBehaviour(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])
  return ref
}

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  closeLabel: string
  children: ReactNode
}

export function Dialog({ open, onClose, title, closeLabel, children }: DialogProps) {
  const ref = useDialogBehaviour(open, onClose)
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(59, 51, 43, 0.45)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel w-full max-w-lg p-6 shadow-raised"
      >
        <div className="flex items-start justify-between gap-4">
          <h2>{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label={closeLabel}>
            ×
          </Button>
        </div>
        <div className="mt-4 text-sm">{children}</div>
      </div>
    </div>
  )
}

export interface ConfirmDialogProps extends Omit<DialogProps, 'children'> {
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
}

export function ConfirmDialog({
  confirmLabel,
  cancelLabel,
  onConfirm,
  body,
  ...dialogProps
}: ConfirmDialogProps) {
  return (
    <Dialog {...dialogProps}>
      <p>{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={dialogProps.onClose}>
          {cancelLabel}
        </Button>
        <Button
          onClick={() => {
            onConfirm()
            dialogProps.onClose()
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}

export function BottomSheet({ open, onClose, title, closeLabel, children }: DialogProps) {
  const ref = useDialogBehaviour(open, onClose)
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(59, 51, 43, 0.45)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel w-full max-w-2xl rounded-b-none p-6 shadow-raised"
      >
        <div className="flex items-center justify-between gap-4">
          <h3>{title}</h3>
          <Button variant="ghost" onClick={onClose} aria-label={closeLabel}>
            ×
          </Button>
        </div>
        <div className="mt-4 text-sm">{children}</div>
      </div>
    </div>
  )
}
