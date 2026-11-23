import { useCallback, useEffect, useState } from 'react'
import { WidgetGrid } from '../components/dashboard/WidgetGrid'
import { Button, ConfirmDialog, Dialog, ErrorState, IconButton, LoadingSkeleton, TextField, Toast } from '../components/ui'
import type { TranslationKey } from '../i18n'
import type { Appearance } from '../lib/appearance'
import { getSetting, setSetting, type DashboardRecord, type HabitLogRecord, type HabitRecord, type TaskRecord, type WidgetConfig, type WorkoutRecord } from '../lib/db'
import {
  addWidget,
  createDashboard,
  deleteDashboard,
  duplicateDashboard,
  ensureDefaultDashboard,
  listDashboards,
  removeWidget,
  renameDashboard,
  reorderDashboards,
  reorderWidgets,
  resetWidgetLayout,
  saveWidgetLayout,
  setDefaultDashboard,
} from '../lib/modules/dashboards'
import { listWorkouts } from '../lib/modules/gym'
import { listHabitLogs, listHabits } from '../lib/modules/habits'
import { listTasks, toggleTask } from '../lib/modules/tasks'
import { accentTokens, backgroundTokens, widgetRegistry, widgetIds, type AccentToken, type BackgroundToken } from '../lib/widgets'

type Translate = (key: TranslationKey) => string

const ACTIVE_KEY = 'myflow.activeDashboard'
const systemNameKeys = new Set<string>(['defaultDashboardName', 'newDashboardName', 'dashboardCopyName'])

function dashboardLabel(name: string, t: Translate): string {
  return name
    .split(' — ')
    .map((part) => (systemNameKeys.has(part) ? t(part as TranslationKey) : part))
    .join(' — ')
}

interface DashboardPageProps {
  t: Translate
  revision: number
  appearance: Appearance
  onSaved: () => void
}

export function DashboardPage({ t, revision, appearance, onSaved }: DashboardPageProps) {
  const [dashboards, setDashboards] = useState<DashboardRecord[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [habits, setHabits] = useState<HabitRecord[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLogRecord[]>([])
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([])
  const [problem, setProblem] = useState(false)
  const [toast, setToast] = useState<TranslationKey | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [configureId, setConfigureId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setProblem(false)
    try {
      const [rows, storedId, localTasks, localHabits, localLogs] = await Promise.all([
        ensureDefaultDashboard(),
        getSetting<string | null>(ACTIVE_KEY, null),
        listTasks(),
        listHabits(),
        listHabitLogs(),
      ])
      const active = rows.find((row) => row.id === storedId) ?? rows.find((row) => row.isDefault) ?? rows[0]
      setDashboards(rows)
      setActiveId(active?.id ?? null)
      setTasks(localTasks)
      setHabits(localHabits)
      setHabitLogs(localLogs)
    } catch {
      setProblem(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, revision])

  useEffect(() => {
    if (activeId) void setSetting(ACTIVE_KEY, activeId)
  }, [activeId])

  const active = dashboards?.find((row) => row.id === activeId) ?? null

  const refreshTasks = async () => {
    const [localTasks, localHabits, localLogs, localWorkouts] = await Promise.all([listTasks(), listHabits(), listHabitLogs(), listWorkouts()])
    setTasks(localTasks)
    setHabits(localHabits)
    setHabitLogs(localLogs)
    setWorkouts(localWorkouts)
    onSaved()
  }

  const notify = (key: TranslationKey) => {
    setToast(key)
    window.setTimeout(() => setToast(null), 2600)
  }

  const replaceDashboards = (rows: DashboardRecord[], focusId?: string) => {
    setDashboards(rows)
    if (focusId) setActiveId(focusId)
  }

  const commitWidgets = async (widgets: WidgetConfig[]) => {
    if (!active) return
    const next = [...dashboards ?? []].map((row) => (row.id === active.id ? { ...row, widgets } : row))
    setDashboards(next)
    await saveWidgetLayout(active.id, widgets)
  }

  const handleToggleTask = async (id: string) => {
    await toggleTask(id)
    await refreshTasks()
  }

  const handleCreate = async () => {
    const name = newName.trim() || t('newDashboardName')
    const created = await createDashboard(name)
    replaceDashboards(await listDashboards(), created.id)
    setCreateOpen(false)
    setNewName('')
    notify('dashboardCreated')
  }

  const handleRename = async () => {
    if (!renameId) return
    await renameDashboard(renameId, renameValue)
    replaceDashboards(await listDashboards())
    setRenameId(null)
    notify('dashboardRenamed')
  }

  const handleDuplicate = async (id: string) => {
    const copy = await duplicateDashboard(id, 'dashboardCopyName')
    if (!copy) return
    replaceDashboards(await listDashboards(), copy.id)
    notify('dashboardDuplicated')
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const rows = await deleteDashboard(deleteId)
    const focus = rows.find((row) => row.isDefault) ?? rows[0]
    replaceDashboards(rows, focus?.id)
    setDeleteId(null)
    notify('dashboardDeleted')
  }

  const handleMoveDashboard = async (id: string, direction: -1 | 1) => {
    const rows = dashboards ?? []
    const index = rows.findIndex((row) => row.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= rows.length) return
    const next = [...rows]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    replaceDashboards(await reorderDashboards(next.map((row) => row.id)))
  }

  const handleSetDefault = async (id: string) => {
    await setDefaultDashboard(id)
    replaceDashboards(await listDashboards())
  }

  const handleMoveWidget = (id: string, direction: -1 | 1) => {
    if (!active) return
    const widgets = [...active.widgets]
    const index = widgets.findIndex((widget) => widget.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= widgets.length) return
    const [moved] = widgets.splice(index, 1)
    widgets.splice(target, 0, moved)
    void commitWidgets(widgets)
  }

  const handleReorderWidget = (fromId: string, toId: string) => {
    if (!active) return
    void commitWidgets(reorderWidgets(active.widgets, fromId, toId))
  }

  const handleResize = (id: string, columns: number, rows: number) => {
    if (!active) return
    void commitWidgets(
      active.widgets.map((widget) => (widget.id === id ? { ...widget, columns, rows } : widget)),
    )
  }

  const handleToggleVisible = (id: string) => {
    if (!active) return
    void commitWidgets(
      active.widgets.map((widget) => (widget.id === id ? { ...widget, visible: !widget.visible } : widget)),
    )
  }

  const handleRemove = (id: string) => {
    if (!active) return
    void commitWidgets(removeWidget(active.widgets, id))
  }

  const handleAddWidget = async (id: string) => {
    if (!active) return
    if (active.widgets.some((widget) => widget.id === id)) {
      setPickerOpen(false)
      return
    }
    await addWidget(active.id, id)
    replaceDashboards(await listDashboards())
    setPickerOpen(false)
  }

  const handleConfigure = (id: string, patch: Partial<WidgetConfig>) => {
    if (!active) return
    void commitWidgets(
      active.widgets.map((widget) => (widget.id === id ? { ...widget, ...patch } : widget)),
    )
  }

  const handleReset = async () => {
    if (!active) return
    await resetWidgetLayout(active.id)
    replaceDashboards(await listDashboards())
    setResetOpen(false)
  }

  if (problem) {
    return (
      <div className="space-y-6">
        <header><p className="eyebrow">{t('appTitle')}</p><h1>{t('dashboardTitle')}</h1></header>
        <ErrorState
          title={t('errorTitle')}
          body={t('errorBody')}
          actionLabel={t('retryAction')}
          onRetry={() => void load()}
        />
      </div>
    )
  }

  if (!dashboards || !active) {
    return (
      <div className="space-y-6">
        <header><p className="eyebrow">{t('appTitle')}</p><h1>{t('dashboardTitle')}</h1></header>
        <LoadingSkeleton label={t('loadingLabel')} lines={4} />
      </div>
    )
  }

  const configured = active.widgets.find((widget) => widget.id === configureId) ?? null

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{t('appTitle')}</p>
          <h1>{dashboardLabel(active.name, t)}</h1>
          <p className="muted mt-2 text-sm italic">{t('dashboardSubtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPickerOpen(true)}>{t('addWidget')}</Button>
          <Button variant="ghost" onClick={() => setResetOpen(true)}>{t('resetLayout')}</Button>
        </div>
      </header>

      <div className="panel flex items-center gap-3 px-4 py-3 text-sm">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-pill"
          style={{ backgroundColor: 'var(--mf-growth)' }}
        />
        <span>{t('localFirst')}</span>
      </div>

      <section className="panel p-4" data-testid="dashboard-selector">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-[200px] flex-1 items-center gap-2 text-sm">
            <span className="eyebrow">{t('dashboardSelector')}</span>
            <select
              className="field"
              aria-label={t('dashboardSelector')}
              value={active.id}
              onChange={(event) => setActiveId(event.target.value)}
            >
              {dashboards.map((row) => (
                <option key={row.id} value={row.id}>
                  {dashboardLabel(row.name, t)}{row.isDefault ? ` · ${t('defaultBadge')}` : ''}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={() => setCreateOpen(true)}>{t('newDashboard')}</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--mf-border)' }}>
          <IconButton label={t('moveUp')} onClick={() => void handleMoveDashboard(active.id, -1)}>↑</IconButton>
          <IconButton label={t('moveDown')} onClick={() => void handleMoveDashboard(active.id, 1)}>↓</IconButton>
          <Button variant="secondary" onClick={() => setRenameId(active.id)}>{t('renameDashboard')}</Button>
          <Button variant="secondary" onClick={() => void handleDuplicate(active.id)}>{t('duplicateDashboard')}</Button>
          <Button variant="secondary" disabled={active.isDefault} onClick={() => void handleSetDefault(active.id)}>
            {t('setDefault')}
          </Button>
          <Button variant="ghost" onClick={() => setDeleteId(active.id)}>{t('deleteDashboard')}</Button>
        </div>
        <p className="muted mt-3 text-xs">{t('layoutNote')}</p>
      </section>

      <WidgetGrid
        widgets={active.widgets}
        t={t}
        tasks={tasks}
        habits={habits}
        habitLogs={habitLogs}
        workouts={workouts}
        appearance={appearance}
        onToggleTask={(id) => void handleToggleTask(id)}
        onSaved={() => void refreshTasks()}
        onMove={handleMoveWidget}
        onReorder={handleReorderWidget}
        onResize={handleResize}
        onToggleVisible={handleToggleVisible}
        onRemove={handleRemove}
        onConfigure={setConfigureId}
        onAdd={() => setPickerOpen(true)}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={t('newDashboard')} closeLabel={t('cancelAction')}>
        <form
          className="space-y-4"
          onSubmit={(event) => { event.preventDefault(); void handleCreate() }}
        >
          <TextField
            label={t('dashboardNamePlaceholder')}
            placeholder={t('newDashboardName')}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>{t('cancelAction')}</Button>
            <Button type="submit">{t('saveAction')}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={renameId !== null}
        onClose={() => setRenameId(null)}
        title={t('renameDashboard')}
        closeLabel={t('cancelAction')}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => { event.preventDefault(); void handleRename() }}
        >
          <TextField
            label={t('dashboardNamePlaceholder')}
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRenameId(null)}>{t('cancelAction')}</Button>
            <Button type="submit">{t('saveAction')}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title={t('deleteDashboard')}
        closeLabel={t('cancelAction')}
        body={t('deleteDashboardConfirm')}
        confirmLabel={t('deleteDashboard')}
        cancelLabel={t('cancelAction')}
        onConfirm={() => void handleDelete()}
      />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t('resetLayout')}
        closeLabel={t('cancelAction')}
        body={t('layoutNote')}
        confirmLabel={t('resetLayout')}
        cancelLabel={t('cancelAction')}
        onConfirm={() => void handleReset()}
      />

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} title={t('addWidget')} closeLabel={t('cancelAction')}>
        <div className="grid gap-2 sm:grid-cols-2" data-testid="widget-picker">
          {widgetIds.map((id) => {
            const definition = widgetRegistry[id]
            const present = active.widgets.some((widget) => widget.id === id)
            return (
              <button
                key={id}
                type="button"
                disabled={present}
                onClick={() => void handleAddWidget(id)}
                className="panel flex flex-col items-start gap-1 p-3 text-left disabled:opacity-50"
                data-widget-option={id}
              >
                <span className="font-semibold">{t(definition.nameKey)}</span>
                <span className="muted text-xs">{t(definition.noteKey)}</span>
                {present ? <span className="eyebrow">{t('widgetVisibility')}</span> : null}
              </button>
            )
          })}
        </div>
      </Dialog>

      <Dialog
        open={configured !== null}
        onClose={() => setConfigureId(null)}
        title={t('widgetSettings')}
        closeLabel={t('cancelAction')}
      >
        {configured ? (
          <div className="space-y-4" data-testid="widget-settings">
            <p className="muted text-sm">{t(widgetRegistry[configured.id].noteKey)}</p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="eyebrow">{t('widgetBackground')}</span>
              <select
                className="field"
                aria-label={t('widgetBackground')}
                value={configured.background}
                onChange={(event) => handleConfigure(configured.id, { background: event.target.value as BackgroundToken })}
              >
                {backgroundTokens.map((token) => <option key={token} value={token}>{token}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="eyebrow">{t('widgetAccent')}</span>
              <select
                className="field"
                aria-label={t('widgetAccent')}
                value={configured.accent}
                onChange={(event) => handleConfigure(configured.id, { accent: event.target.value as AccentToken })}
              >
                {accentTokens.map((token) => <option key={token} value={token}>{token}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="eyebrow">{t('widgetWidth')}</span>
              <select
                className="field"
                aria-label={t('widgetWidth')}
                value={configured.columns}
                onChange={(event) => handleConfigure(configured.id, { columns: Number(event.target.value) })}
              >
                {[3, 4, 6, 8, 12].map((width) => <option key={width} value={width}>{width}/12</option>)}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfigureId(null)}>{t('cancelAction')}</Button>
              <Button variant="secondary" onClick={() => { handleToggleVisible(configured.id); setConfigureId(null) }}>
                {configured.visible ? t('hideWidget') : t('showWidget')}
              </Button>
              <Button onClick={() => { handleRemove(configured.id); setConfigureId(null) }}>{t('removeWidget')}</Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Toast message={toast ? t(toast) : ''} visible={toast !== null} />
    </div>
  )
}
