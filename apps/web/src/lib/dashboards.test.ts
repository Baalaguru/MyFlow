import { describe, expect, it } from 'vitest'
import { makeDefaultDashboard, removeWidget, reorderWidgets } from './modules/dashboards'
import { seedWidgets } from './widgets'

describe('dashboard layout helpers', () => {
  it('creates independent default dashboards with the same seed layout', () => {
    const first = makeDefaultDashboard('2026-11-22T00:00:00.000Z')
    const second = makeDefaultDashboard('2026-11-22T00:00:00.000Z')
    expect(first.id).not.toBe(second.id)
    expect(first.isDefault).toBe(true)
    expect(first.widgets.map((widget) => widget.id)).toEqual(seedWidgets().map((widget) => widget.id))
  })

  it('reorders widgets by id without losing entries', () => {
    const widgets = seedWidgets()
    const moved = reorderWidgets(widgets, widgets[0].id, widgets[2].id)
    expect(moved.map((widget) => widget.id)).toEqual([
      widgets[1].id,
      widgets[2].id,
      widgets[0].id,
      widgets[3].id,
    ])
    expect(widgets.map((widget) => widget.id)).toEqual(seedWidgets().map((widget) => widget.id))
  })

  it('ignores reorder requests with unknown ids', () => {
    const widgets = seedWidgets()
    expect(reorderWidgets(widgets, 'missing', widgets[1].id)).toBe(widgets)
    expect(reorderWidgets(widgets, widgets[0].id, widgets[0].id)).toBe(widgets)
  })

  it('removes a widget without touching the others', () => {
    const widgets = seedWidgets()
    const remaining = removeWidget(widgets, widgets[1].id)
    expect(remaining).toHaveLength(widgets.length - 1)
    expect(remaining.some((widget) => widget.id === widgets[1].id)).toBe(false)
  })
})
