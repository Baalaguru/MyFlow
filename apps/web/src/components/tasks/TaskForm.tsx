import { useState, type FormEvent } from 'react'
import type { TranslationKey } from '../../i18n'
import type { RecurrenceFrequency, SubtaskRecord, TaskRecord } from '../../lib/db'
import type { TaskInput } from '../../lib/modules/tasks'
import { priorities, type TaskPriority } from '../../lib/tasks'
import { Button, DateField, IconButton, SelectField, TextArea, TextField, TimeField } from '../ui'

type Translate = (key: TranslationKey) => string

const priorityKey: Record<TaskPriority, TranslationKey> = {
  veryHigh: 'priorityVeryHigh',
  high: 'priorityHigh',
  medium: 'priorityMedium',
  low: 'priorityLow',
}

const frequencyKey: Record<RecurrenceFrequency | 'none', TranslationKey> = {
  none: 'recurrenceNone',
  daily: 'recurrenceDaily',
  weekly: 'recurrenceWeekly',
  monthly: 'recurrenceMonthly',
}

interface TaskFormProps {
  t: Translate
  initial?: TaskRecord
  onSubmit: (input: TaskInput) => void
  onCancel: () => void
}

export function TaskForm({ t, initial, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'medium')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [startTime, setStartTime] = useState(initial?.startTime ?? '')
  const [endTime, setEndTime] = useState(initial?.endTime ?? '')
  const [frequency, setFrequency] = useState<RecurrenceFrequency | 'none'>(initial?.recurrence?.frequency ?? 'none')
  const [interval, setInterval] = useState(String(initial?.recurrence?.interval ?? 1))
  const [count, setCount] = useState(String(initial?.recurrence?.count ?? ''))
  const [until, setUntil] = useState(initial?.recurrence?.until ?? '')
  const [reminder, setReminder] = useState(String(initial?.reminderOffsetMinutes ?? ''))
  const [subtasks, setSubtasks] = useState<SubtaskRecord[]>(initial?.subtasks ?? [])
  const [draftSubtask, setDraftSubtask] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const parsedInterval = Math.max(1, Number(interval) || 1)
    const parsedCount = count.trim() ? Math.max(1, Number(count) || 1) : undefined
    const parsedReminder = reminder.trim() ? Math.max(0, Number(reminder) || 0) : undefined
    onSubmit({
      title: trimmed,
      description: description.trim() || undefined,
      priority,
      category: category.trim() || undefined,
      dueDate: dueDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      subtasks,
      recurrence: frequency === 'none'
        ? undefined
        : {
            frequency,
            interval: parsedInterval,
            count: parsedCount,
            until: until || undefined,
          },
      reminderOffsetMinutes: parsedReminder,
    })
  }

  return (
    <form className="space-y-4" onSubmit={submit} data-testid="task-form">
      <TextField
        label={t('taskFieldTitle')}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoFocus
      />
      <TextArea
        label={t('taskFieldDescription')}
        value={description}
        rows={2}
        onChange={(event) => setDescription(event.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label={t('taskFieldPriority')}
          value={priority}
          options={priorities.map((value) => ({ value, label: t(priorityKey[value]) }))}
          onChange={(event) => setPriority(event.target.value as TaskPriority)}
        />
        <TextField
          label={t('taskFieldCategory')}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
        <DateField label={t('taskFieldDueDate')} value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        <TimeField label={t('taskFieldStartTime')} value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        <TimeField label={t('taskFieldEndTime')} value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        <TextField
          label={t('reminderOffset')}
          type="number"
          min={0}
          value={reminder}
          onChange={(event) => setReminder(event.target.value)}
        />
      </div>
      <p className="muted text-xs">{t('reminderNote')}</p>

      <fieldset className="space-y-3 rounded-md border p-3" style={{ borderColor: 'var(--mf-border)' }}>
        <legend className="eyebrow">{t('taskFieldRecurrence')}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField
            label={t('taskFieldRecurrence')}
            value={frequency}
            options={(Object.keys(frequencyKey) as (RecurrenceFrequency | 'none')[]).map((value) => ({
              value,
              label: t(frequencyKey[value]),
            }))}
            onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency | 'none')}
          />
          <TextField
            label={t('recurrenceInterval')}
            type="number"
            min={1}
            disabled={frequency === 'none'}
            value={interval}
            onChange={(event) => setInterval(event.target.value)}
          />
          <TextField
            label={t('recurrenceCount')}
            type="number"
            min={1}
            disabled={frequency === 'none'}
            value={count}
            onChange={(event) => setCount(event.target.value)}
          />
        </div>
        <DateField
          label={t('recurrenceUntil')}
          disabled={frequency === 'none'}
          value={until}
          onChange={(event) => setUntil(event.target.value)}
        />
      </fieldset>

      <fieldset className="space-y-2 rounded-md border p-3" style={{ borderColor: 'var(--mf-border)' }}>
        <legend className="eyebrow">{t('taskFieldSubtasks')}</legend>
        {subtasks.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 break-words text-sm">{item.title}</span>
            <IconButton
              label={t('removeSubtask')}
              onClick={() => setSubtasks((current) => current.filter((row) => row.id !== item.id))}
            >
              ×
            </IconButton>
          </div>
        ))}
        <div className="flex gap-2">
          <TextField
            label={t('subtaskPlaceholder')}
            value={draftSubtask}
            onChange={(event) => setDraftSubtask(event.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!draftSubtask.trim()}
            onClick={() => {
              setSubtasks((current) => [
                ...current,
                { id: crypto.randomUUID(), title: draftSubtask.trim(), completed: false },
              ])
              setDraftSubtask('')
            }}
          >
            {t('addSubtask')}
          </Button>
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>{t('cancelAction')}</Button>
        <Button type="submit" disabled={!title.trim()}>{initial ? t('saveChanges') : t('saveAction')}</Button>
      </div>
    </form>
  )
}
