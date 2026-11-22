import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

interface FieldFrameProps {
  label: string
  hint?: string
  children: (id: string) => ReactNode
}

function FieldFrame({ label, hint, children }: FieldFrameProps) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm">
        {label}
      </label>
      {children(id)}
      {hint ? (
        <p id={`${id}-hint`} className="muted text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
}

export function TextField({ label, hint, ...props }: TextFieldProps) {
  return (
    <FieldFrame label={label} hint={hint}>
      {(id) => (
        <input
          id={id}
          className="field"
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...props}
        />
      )}
    </FieldFrame>
  )
}

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string
  hint?: string
}

export function TextArea({ label, hint, ...props }: TextAreaProps) {
  return (
    <FieldFrame label={label} hint={hint}>
      {(id) => (
        <textarea
          id={id}
          className="field min-h-[96px] resize-y"
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...props}
        />
      )}
    </FieldFrame>
  )
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  hint?: string
  options: { value: string; label: string }[]
}

export function SelectField({ label, hint, options, ...props }: SelectFieldProps) {
  return (
    <FieldFrame label={label} hint={hint}>
      {(id) => (
        <select id={id} className="field" aria-describedby={hint ? `${id}-hint` : undefined} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldFrame>
  )
}

export function DateField({ label, ...props }: Omit<TextFieldProps, 'type'>) {
  return <TextField label={label} type="date" {...props} />
}

export function TimeField({ label, ...props }: Omit<TextFieldProps, 'type'>) {
  return <TextField label={label} type="time" {...props} />
}
