import { useEffect, useState } from 'react'

const HEALTH_URL = '/healthz'
const PROBE_INTERVAL_MS = 15_000
const PROBE_TIMEOUT_MS = 1_500

/**
 * Reports whether the self-hosted server is reachable. Browser connectivity alone
 * is not enough: "Offline" must also mean "cannot sync with the server".
 */
export function useOnline(): boolean {
  const [reachable, setReachable] = useState(false)

  useEffect(() => {
    let active = true

    const probe = async () => {
      if (!navigator.onLine) {
        if (active) setReachable(false)
        return
      }
      try {
        const response = await fetch(HEALTH_URL, {
          cache: 'no-store',
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        })
        if (active) setReachable(response.ok)
      } catch {
        if (active) setReachable(false)
      }
    }

    const onOnline = () => void probe()
    const onOffline = () => {
      if (active) setReachable(false)
    }

    void probe()
    const timer = window.setInterval(() => void probe(), PROBE_INTERVAL_MS)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return reachable
}
