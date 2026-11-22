import { describe, expect, it } from 'vitest'
import { defaultRoute, hashForRoute, isRouteId, routeFromHash } from './routes'

describe('hash routes', () => {
  it('maps every known route to a stable deep link', () => {
    for (const route of ['dashboard', 'tasks', 'habits', 'mascot', 'gym', 'food', 'cardio', 'finance', 'appearance', 'design-system', 'profile'] as const) {
      expect(isRouteId(route)).toBe(true)
      expect(hashForRoute(route)).toBe(`#/${route}`)
      expect(routeFromHash(hashForRoute(route))).toBe(route)
    }
  })

  it('accepts query strings and trailing slashes', () => {
    expect(routeFromHash('#/tasks?filter=open')).toBe('tasks')
    expect(routeFromHash('#/gym/')).toBe('gym')
    expect(routeFromHash('habits')).toBe('habits')
  })

  it('falls back safely for empty or unknown fragments', () => {
    expect(routeFromHash('')).toBe(defaultRoute)
    expect(routeFromHash('#/unknown')).toBe(defaultRoute)
    expect(isRouteId('unknown')).toBe(false)
  })
})
