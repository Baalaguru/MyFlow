import { useCallback, useEffect, useRef, useState } from 'react'
import {
  defaultRoute,
  hashForRoute,
  routeFromHash,
  type RouteId,
} from '../lib/routes'

const STATE_KEY = 'myflowRouteIndex'

function currentIndex(): number {
  const value = window.history.state?.[STATE_KEY]
  return typeof value === 'number' ? value : 0
}

/** Hash routing with real browser history and deep-link support. */
export function useHashRoute() {
  const initial = routeFromHash(window.location.hash)
  const [route, setRoute] = useState<RouteId>(initial)
  const [index, setIndex] = useState(currentIndex)
  const indexRef = useRef(index)

  useEffect(() => {
    const state = { ...window.history.state, [STATE_KEY]: currentIndex() }
    if (!window.location.hash) {
      window.history.replaceState(state, '', hashForRoute(initial))
    } else if (window.history.state?.[STATE_KEY] === undefined) {
      window.history.replaceState(state, '')
    }

    const onNavigation = () => {
      const next = routeFromHash(window.location.hash)
      const nextIndex = currentIndex()
      indexRef.current = nextIndex
      setIndex(nextIndex)
      setRoute(next)
    }

    window.addEventListener('popstate', onNavigation)
    window.addEventListener('hashchange', onNavigation)
    return () => {
      window.removeEventListener('popstate', onNavigation)
      window.removeEventListener('hashchange', onNavigation)
    }
  }, [initial])

  const navigate = useCallback(
    (next: RouteId) => {
      if (next === route) return
      const nextIndex = indexRef.current + 1
      window.history.pushState(
        { ...window.history.state, [STATE_KEY]: nextIndex },
        '',
        hashForRoute(next),
      )
      indexRef.current = nextIndex
      setIndex(nextIndex)
      setRoute(next)
    },
    [route],
  )

  return {
    route,
    navigate,
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    canBack: index > 0,
    canForward: index < window.history.length - 1,
    defaultRoute,
  }
}
