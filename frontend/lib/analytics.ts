// Plausible custom events — see https://plausible.io/docs/custom-event-goals
// Plausible script is loaded in app/layout.tsx; this helper just calls window.plausible.

type Props = Record<string, string | number | boolean>

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props; callback?: () => void }) => void
  }
}

export function track(event: string, props?: Props) {
  if (typeof window === 'undefined') return
  try {
    window.plausible?.(event, props ? { props } : undefined)
  } catch {
    // never let analytics break the app
  }
}
