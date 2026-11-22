import type { TranslationKey } from '../i18n'

export const routeIds = [
  'dashboard',
  'tasks',
  'habits',
  'mascot',
  'gym',
  'food',
  'cardio',
  'finance',
  'appearance',
  'design-system',
  'profile',
] as const

export type RouteId = (typeof routeIds)[number]

export const defaultRoute: RouteId = 'dashboard'

export const moduleRouteIds: RouteId[] = ['tasks', 'habits', 'mascot', 'gym', 'food', 'cardio', 'finance']

export const navRouteIds: RouteId[] = [
  'dashboard',
  ...moduleRouteIds,
  'appearance',
  'design-system',
]

export const routeLabelKeys: Record<RouteId, TranslationKey> = {
  dashboard: 'navDashboard',
  tasks: 'navTasks',
  habits: 'navHabits',
  mascot: 'navMascot',
  gym: 'navGym',
  food: 'navFood',
  cardio: 'navCardio',
  finance: 'navFinance',
  appearance: 'navSettings',
  'design-system': 'navDesignSystem',
  profile: 'navProfile',
}

export function isRouteId(value: string): value is RouteId {
  return (routeIds as readonly string[]).includes(value)
}

/** Accepts `#/tasks`, `#/tasks?x=1`, `/tasks`, or `tasks`; unknown values fall back safely. */
export function routeFromHash(hash: string): RouteId {
  const value = hash.replace(/^#/, '').replace(/^\//, '').split(/[?/]/)[0] ?? ''
  return isRouteId(value) ? value : defaultRoute
}

export function hashForRoute(route: RouteId): string {
  return `#/${route}`
}
