import { describe, expect, it } from 'vitest'
import { makeDefaultDashboard } from './modules/dashboards'
import { createWidgetConfig, normaliseWidgetConfig, seedWidgets, widgetIds, widgetRegistry } from './widgets'

describe('widget contract', () => {
  it('defines every widget id exactly once with translated names', () => {
    for (const id of widgetIds) {
      expect(widgetRegistry[id].id).toBe(id)
      expect(widgetRegistry[id].nameKey).toBeTruthy()
      expect(widgetRegistry[id].noteKey).toBeTruthy()
    }
  })

  it('seeds only widgets backed by real local data', () => {
    expect(seedWidgets().map((widget) => widget.id)).toEqual([
      'todoOverview',
      'habitOverview',
      'currentStreak',
      'mascotGrowth',
      'weeklyStatistics',
      'monthlyStatistics',
      'quickCapture',
    ])
    expect(seedWidgets().every((widget) => widgetRegistry[widget.id].available)).toBe(true)
  })

  it('marks cardio widgets available without seeding them', () => {
    expect(widgetRegistry.walkingOverview.available).toBe(true)
    expect(widgetRegistry.jumpRopeOverview.available).toBe(true)
    expect(widgetRegistry.cyclingOverview.available).toBe(true)
  })

  it('rejects unknown widgets and clamps corrupt layout values', () => {
    expect(normaliseWidgetConfig({ id: 'notAWidget' })).toBeNull()
    expect(normaliseWidgetConfig(null)).toBeNull()
    expect(normaliseWidgetConfig({ id: 'todoOverview', columns: 99, rows: -4, background: 'bad', accent: 'bad' })).toEqual({
      id: 'todoOverview',
      columns: 12,
      rows: 1,
      visible: true,
      background: 'widgetBackground',
      accent: 'primary',
    })
  })

  it('creates an independent default dashboard layout', () => {
    const first = makeDefaultDashboard('2026-11-22T00:00:00.000Z')
    const second = makeDefaultDashboard('2026-11-22T00:00:00.000Z')
    expect(first.id).not.toBe(second.id)
    expect(first.widgets).toEqual(second.widgets)
    first.widgets[0].columns = 12
    expect(second.widgets[0].columns).toBe(widgetRegistry.todoOverview.columns)
    expect(createWidgetConfig('todoOverview').id).toBe('todoOverview')
  })
})
