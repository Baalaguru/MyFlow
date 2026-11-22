import { useState, type ReactNode } from 'react'
import { db } from '../lib/db'
import { BottomSheet, Button, TextArea, Toast } from './ui'

interface QuickCaptureProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  labels: {
    open: string
    title: string
    field: string
    placeholder: string
    save: string
    close: string
    saved: string
    error: string
  }
  trigger?: ReactNode
}

export function QuickCapture({ open, onClose, onSaved, labels, trigger }: QuickCaptureProps) {
  const [value, setValue] = useState('')
  const [problem, setProblem] = useState(false)
  const [toast, setToast] = useState(false)

  const save = async () => {
    const title = value.trim()
    if (!title) return
    try {
      await db.tasks.add({
        id: crypto.randomUUID(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
      })
      setValue('')
      setProblem(false)
      setToast(true)
      onSaved()
      onClose()
      window.setTimeout(() => setToast(false), 2600)
    } catch {
      setProblem(true)
    }
  }

  return (
    <>
      {trigger}
      <BottomSheet open={open} onClose={onClose} title={labels.title} closeLabel={labels.close}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <TextArea
            label={labels.field}
            placeholder={labels.placeholder}
            value={value}
            rows={3}
            onChange={(event) => setValue(event.target.value)}
          />
          {problem ? (
            <p role="alert" className="text-sm" style={{ color: 'var(--mf-danger)' }}>
              {labels.error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={value.trim().length === 0}>
              {labels.save}
            </Button>
          </div>
        </form>
      </BottomSheet>
      <Toast message={labels.saved} visible={toast} />
    </>
  )
}
