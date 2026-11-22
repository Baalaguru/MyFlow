import { useState, type CSSProperties, type DragEvent } from 'react'
import type { TranslationKey } from '../../i18n'
import type { Appearance } from '../../lib/appearance'
import type { TaskRecord, WidgetConfig } from '../../lib/db'
import { widgetRegistry } from '../../lib/widgets'
import { IconButton } from '../ui'
import { WidgetBody } from './WidgetBody'

type Translate = (key: TranslationKey) => string

const widthOptions = [3, 4, 6, 8, 12]

export interface WidgetGridProps {
  widgets: WidgetConfig[]
  t: Translate
  tasks: TaskRecord[]
  appearance: Appearance
  onToggleTask: (id: string) => void
  onSaved: () => void
  onMove: (id: string, direction: -1 | 1) => void
  onReorder: (fromId: string, toId: string) => void
  onResize: (id: string, columns: number, rows: number) => void
  onToggleVisible: (id: string) => void
  onRemove: (id: string) => void
  onConfigure: (id: string) => void
  onAdd: () => void
}

export function WidgetGrid({
  widgets,
  t,
  tasks,
  appearance,
  onToggleTask,
  onSaved,
  onMove,
  onReorder,
  onResize,
  onToggleVisible,
  onRemove,
  onConfigure,
  onAdd,
}: WidgetGridProps) {
  const [dragging, setDragging] = useState<string | null>(null)
  const visible = widgets.filter((widget) => widget.visible)
  const hidden = widgets.filter((widget) => !widget.visible)

  const handleDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault()
    const fromId = event.dataTransfer.getData('text/plain') || dragging
    setDragging(null)
    if (fromId && fromId !== targetId) onReorder(fromId, targetId)
  }

  const cardStyle = (widget: WidgetConfig): CSSProperties => ({
    gridColumn: `span ${widget.columns}`,
    gridRow: `span ${widget.rows}`,
    backgroundColor: `var(--mf-${widget.background})`,
    borderTopColor: `var(--mf-${widget.accent})`,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="muted text-xs">{t('dragHint')}</p>
        <div className="flex flex-wrap gap-2">
          <IconButton label={t('addWidget')} onClick={onAdd}>＋</IconButton>
        </div>
      </div>

      <div className="widget-grid" data-testid="widget-grid">
        {visible.map((widget, index) => {
          const definition = widgetRegistry[widget.id]
          return (
            <section
              key={widget.id}
              className="widget-card flex min-w-0 flex-col p-4"
              style={cardStyle(widget)}
              data-widget={widget.id}
              data-dragging={dragging === widget.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', widget.id)
                event.dataTransfer.effectAllowed = 'move'
                setDragging(widget.id)
              }}
              onDragEnd={() => setDragging(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, widget.id)}
            >
              <header className="mb-3 flex items-start justify-between gap-2 border-t-2 pt-2">
                <div className="min-w-0">
                  <p className="eyebrow">{definition.nameKey ? t(definition.nameKey) : widget.id}</p>
                  <p className="muted mt-1 text-xs">{t(definition.noteKey)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <IconButton label={t('moveUp')} disabled={index === 0} onClick={() => onMove(widget.id, -1)}>↑</IconButton>
                  <IconButton label={t('moveDown')} disabled={index === visible.length - 1} onClick={() => onMove(widget.id, 1)}>↓</IconButton>
                  <IconButton label={t('widgetSettings')} onClick={() => onConfigure(widget.id)}>⚙</IconButton>
                  <IconButton label={t('hideWidget')} onClick={() => onToggleVisible(widget.id)}>◌</IconButton>
                  <IconButton label={t('removeWidget')} onClick={() => onRemove(widget.id)}>×</IconButton>
                </div>
              </header>

              <div className="min-h-[72px] flex-1">
                <WidgetBody
                  widget={widget}
                  t={t}
                  tasks={tasks}
                  appearance={appearance}
                  onToggleTask={onToggleTask}
                  onSaved={onSaved}
                />
              </div>

              <footer className="mt-3 flex flex-wrap items-center gap-2 border-t pt-2" style={{ borderColor: 'var(--mf-border)' }}>
                <span className="muted text-xs">{t('resizeHint')}</span>
                <label className="ml-auto flex items-center gap-1 text-xs">
                  {t('widgetWidth')}
                  <select
                    className="field min-h-[36px] px-2 py-1 text-xs"
                    value={widget.columns}
                    aria-label={`${t('widgetWidth')} ${t(definition.nameKey)}`}
                    onChange={(event) => onResize(widget.id, Number(event.target.value), widget.rows)}
                  >
                    {widthOptions.map((width) => (
                      <option key={width} value={width}>{width}/12</option>
                    ))}
                  </select>
                </label>
                <IconButton
                  label={t('resizeHint')}
                  onClick={() => onResize(widget.id, widget.columns, widget.rows === 1 ? 2 : 1)}
                >
                  {widget.rows === 1 ? '↕' : '↨'}
                </IconButton>
              </footer>
            </section>
          )
        })}
      </div>

      {hidden.length > 0 ? (
        <div className="panel flex flex-wrap items-center gap-2 p-4">
          <span className="eyebrow">{t('widgetVisibility')}</span>
          {hidden.map((widget) => (
            <button
              key={widget.id}
              type="button"
              className="btn btn-secondary min-h-[36px] px-3 py-1 text-xs"
              onClick={() => onToggleVisible(widget.id)}
            >
              {t(widgetRegistry[widget.id].nameKey)} · {t('showWidget')}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
