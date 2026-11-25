import type { TranslationKey } from '../i18n'
import type { WidgetConfig } from './db'

export const widgetIds = [
  'todoOverview',
  'habitOverview',
  'currentStreak',
  'mascotGrowth',
  'gymOverview',
  'walkingOverview',
  'jumpRopeOverview',
  'cyclingOverview',
  'foodOverview',
  'readingOverview',
  'journalQuickAccess',
  'calendarOverview',
  'financeOverview',
  'weeklyStatistics',
  'monthlyStatistics',
  'quickCapture',
] as const

export type WidgetId = (typeof widgetIds)[number]

export interface WidgetDefinition {
  id: WidgetId
  nameKey: TranslationKey
  noteKey: TranslationKey
  /** Whether a local repository can supply real records for this widget. */
  available: boolean
  columns: number
  rows: number
}

export const widgetRegistry: Record<WidgetId, WidgetDefinition> = {
  todoOverview: { id: 'todoOverview', nameKey: 'widgetTodo', noteKey: 'widgetNoteTodo', available: true, columns: 6, rows: 1 },
  habitOverview: { id: 'habitOverview', nameKey: 'widgetHabits', noteKey: 'widgetNoteHabits', available: true, columns: 4, rows: 1 },
  currentStreak: { id: 'currentStreak', nameKey: 'widgetStreak', noteKey: 'widgetNoteStreak', available: true, columns: 4, rows: 1 },
  mascotGrowth: { id: 'mascotGrowth', nameKey: 'widgetMascot', noteKey: 'widgetNoteMascot', available: true, columns: 4, rows: 1 },
  gymOverview: { id: 'gymOverview', nameKey: 'widgetGym', noteKey: 'widgetNoteGym', available: true, columns: 4, rows: 1 },
  walkingOverview: { id: 'walkingOverview', nameKey: 'widgetWalking', noteKey: 'widgetNoteWalking', available: true, columns: 4, rows: 1 },
  jumpRopeOverview: { id: 'jumpRopeOverview', nameKey: 'widgetJumpRope', noteKey: 'widgetNoteJumpRope', available: true, columns: 4, rows: 1 },
  cyclingOverview: { id: 'cyclingOverview', nameKey: 'widgetCycling', noteKey: 'widgetNoteCycling', available: true, columns: 4, rows: 1 },
  foodOverview: { id: 'foodOverview', nameKey: 'widgetFood', noteKey: 'widgetNoteFood', available: true, columns: 4, rows: 1 },
  readingOverview: { id: 'readingOverview', nameKey: 'widgetReading', noteKey: 'widgetNoteDeferred', available: false, columns: 4, rows: 1 },
  journalQuickAccess: { id: 'journalQuickAccess', nameKey: 'widgetJournal', noteKey: 'widgetNoteDeferred', available: false, columns: 4, rows: 1 },
  calendarOverview: { id: 'calendarOverview', nameKey: 'widgetCalendar', noteKey: 'widgetNoteDeferred', available: false, columns: 4, rows: 1 },
  financeOverview: { id: 'financeOverview', nameKey: 'widgetFinance', noteKey: 'widgetNoteFinance', available: false, columns: 4, rows: 1 },
  weeklyStatistics: { id: 'weeklyStatistics', nameKey: 'widgetWeekly', noteKey: 'widgetNoteWeekly', available: true, columns: 6, rows: 1 },
  monthlyStatistics: { id: 'monthlyStatistics', nameKey: 'widgetMonthly', noteKey: 'widgetNoteMonthly', available: true, columns: 6, rows: 1 },
  quickCapture: { id: 'quickCapture', nameKey: 'widgetQuickCapture', noteKey: 'widgetNoteQuickCapture', available: true, columns: 4, rows: 1 },
}

export const backgroundTokens = ['widgetBackground', 'panel', 'surface'] as const
export const accentTokens = ['primary', 'growth', 'highlight'] as const

export type BackgroundToken = (typeof backgroundTokens)[number]
export type AccentToken = (typeof accentTokens)[number]

export function isWidgetId(value: string): value is WidgetId {
  return (widgetIds as readonly string[]).includes(value)
}

export function createWidgetConfig(id: WidgetId): WidgetConfig {
  const definition = widgetRegistry[id]
  return {
    id,
    columns: definition.columns,
    rows: definition.rows,
    visible: true,
    background: 'widgetBackground',
    accent: 'primary',
  }
}

/** Clamps stored layout values so corrupted preferences cannot break the grid. */
export function normaliseWidgetConfig(
  value: (Partial<Omit<WidgetConfig, 'id'>> & { id?: string }) | null | undefined,
): WidgetConfig | null {
  if (!value || !isWidgetId(value.id ?? '')) return null
  const definition = widgetRegistry[value.id as WidgetId]
  return {
    id: value.id as WidgetId,
    columns: Math.min(12, Math.max(3, Math.round(value.columns ?? definition.columns))),
    rows: Math.min(2, Math.max(1, Math.round(value.rows ?? definition.rows))),
    visible: value.visible !== false,
    background: (backgroundTokens as readonly string[]).includes(value.background ?? '')
      ? (value.background as BackgroundToken)
      : 'widgetBackground',
    accent: (accentTokens as readonly string[]).includes(value.accent ?? '')
      ? (value.accent as AccentToken)
      : 'primary',
  }
}

export const seedWidgetIds: WidgetId[] = [
  'todoOverview',
  'habitOverview',
  'currentStreak',
  'mascotGrowth',
  'weeklyStatistics',
  'monthlyStatistics',
  'quickCapture',
]

export function seedWidgets(): WidgetConfig[] {
  return seedWidgetIds.map(createWidgetConfig)
}
