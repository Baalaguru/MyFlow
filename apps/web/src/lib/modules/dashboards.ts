import { db, type DashboardRecord, type WidgetConfig } from '../db'
import { createWidgetConfig, isWidgetId, normaliseWidgetConfig, seedWidgets } from '../widgets'

const DEFAULT_NAME_KEY = 'defaultDashboardName'
/** Stable primary key so concurrent first-run seeds cannot create duplicate defaults. */
const DEFAULT_DASHBOARD_ID = 'default-dashboard'

function newId(): string {
  return crypto.randomUUID()
}

function normaliseDashboard(record: DashboardRecord): DashboardRecord {
  const seen = new Set<string>()
  const widgets: WidgetConfig[] = []
  for (const candidate of record.widgets ?? []) {
    const widget = normaliseWidgetConfig(candidate)
    if (!widget || seen.has(widget.id)) continue
    seen.add(widget.id)
    widgets.push(widget)
  }
  return {
    id: record.id,
    name: record.name || 'defaultDashboardName',
    order: Number.isFinite(record.order) ? record.order : 0,
    isDefault: record.isDefault === true,
    widgets,
    createdAt: record.createdAt || new Date().toISOString(),
  }
}

/** Pure helper used by tests and by the seed path. */
export function makeDefaultDashboard(now = new Date().toISOString()): DashboardRecord {
  return {
    id: newId(),
    name: DEFAULT_NAME_KEY,
    order: 0,
    isDefault: true,
    widgets: seedWidgets(),
    createdAt: now,
  }
}

/** Idempotent seed: the same primary key is reused on concurrent first runs. */
function defaultSeed(): DashboardRecord {
  return { ...makeDefaultDashboard(), id: DEFAULT_DASHBOARD_ID }
}

export async function ensureDefaultDashboard(): Promise<DashboardRecord[]> {
  const existing = await db.dashboards.toArray()
  if (existing.length === 0) {
    const seed = defaultSeed()
    await db.dashboards.put(seed)
    return [normaliseDashboard(seed)]
  }

  const normalised = existing
    .map(normaliseDashboard)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
  if (!normalised.some((dashboard) => dashboard.isDefault)) {
    const first = normalised[0]
    if (first) {
      await db.dashboards.update(first.id, { isDefault: true })
      first.isDefault = true
    }
  }
  return normalised
}

export async function listDashboards(): Promise<DashboardRecord[]> {
  const rows = await db.dashboards.toArray()
  return rows
    .map(normaliseDashboard)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
}

export async function createDashboard(name: string): Promise<DashboardRecord> {
  const rows = await listDashboards()
  const record: DashboardRecord = {
    id: newId(),
    name: name.trim() || 'newDashboardName',
    order: rows.length,
    isDefault: rows.length === 0,
    widgets: seedWidgets(),
    createdAt: new Date().toISOString(),
  }
  await db.dashboards.add(record)
  return record
}

export async function renameDashboard(id: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return
  await db.dashboards.update(id, { name: trimmed })
}

export async function duplicateDashboard(id: string, copyLabel: string): Promise<DashboardRecord | null> {
  const source = await db.dashboards.get(id)
  if (!source) return null
  const rows = await listDashboards()
  const copy: DashboardRecord = {
    id: newId(),
    name: `${source.name} — ${copyLabel}`,
    order: rows.length,
    isDefault: false,
    widgets: source.widgets.map((widget) => ({ ...widget })),
    createdAt: new Date().toISOString(),
  }
  await db.dashboards.add(copy)
  return copy
}

export async function deleteDashboard(id: string): Promise<DashboardRecord[]> {
  await db.dashboards.delete(id)
  const remaining = await listDashboards()
  if (remaining.length === 0) {
    await db.dashboards.put(defaultSeed())
    return ensureDefaultDashboard()
  }
  if (!remaining.some((dashboard) => dashboard.isDefault)) {
    const first = remaining[0]
    if (first) {
      await db.dashboards.update(first.id, { isDefault: true })
      first.isDefault = true
    }
  }
  return reindex(remaining)
}

async function reindex(rows: DashboardRecord[]): Promise<DashboardRecord[]> {
  await Promise.all(rows.map((row, index) => db.dashboards.update(row.id, { order: index })))
  return rows.map((row, index) => ({ ...row, order: index }))
}

export async function reorderDashboards(ids: string[]): Promise<DashboardRecord[]> {
  const rows = await listDashboards()
  const byId = new Map(rows.map((row) => [row.id, row]))
  const ordered = ids.map((id) => byId.get(id)).filter((row): row is DashboardRecord => Boolean(row))
  for (const row of rows) {
    if (!ordered.some((item) => item.id === row.id)) ordered.push(row)
  }
  return reindex(ordered)
}

export async function setDefaultDashboard(id: string): Promise<void> {
  const rows = await listDashboards()
  await Promise.all(
    rows.map((row) => db.dashboards.update(row.id, { isDefault: row.id === id })),
  )
}

export async function saveWidgetLayout(id: string, widgets: WidgetConfig[]): Promise<void> {
  const clean = widgets
    .map((widget) => normaliseWidgetConfig(widget))
    .filter((widget): widget is WidgetConfig => widget !== null)
  const seen = new Set<string>()
  const unique = clean.filter((widget) => {
    if (seen.has(widget.id)) return false
    seen.add(widget.id)
    return true
  })
  await db.dashboards.update(id, { widgets: unique })
}

export async function addWidget(id: string, widgetId: string): Promise<void> {
  if (!isWidgetId(widgetId)) return
  const dashboard = await db.dashboards.get(id)
  if (!dashboard || dashboard.widgets.some((widget) => widget.id === widgetId)) return
  await db.dashboards.update(id, { widgets: [...dashboard.widgets, createWidgetConfig(widgetId)] })
}

export async function resetWidgetLayout(id: string): Promise<void> {
  await db.dashboards.update(id, { widgets: seedWidgets() })
}

/** Pure reorder helper used by drag-and-drop and the keyboard fallback. */
export function reorderWidgets(widgets: WidgetConfig[], fromId: string, toId: string): WidgetConfig[] {
  const from = widgets.findIndex((widget) => widget.id === fromId)
  const to = widgets.findIndex((widget) => widget.id === toId)
  if (from < 0 || to < 0 || from === to) return widgets
  const next = [...widgets]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function removeWidget(widgets: WidgetConfig[], widgetId: string): WidgetConfig[] {
  return widgets.filter((widget) => widget.id !== widgetId)
}
