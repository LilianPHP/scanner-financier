'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2 style={{ color: '#E24B4A' }}>Une erreur inattendue s'est produite</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>L'équipe a été notifiée automatiquement.</p>
          <button
            onClick={reset}
            style={{ background: '#1D9E75', color: '#fff', border: 'none', padding: '0.6rem 1.4rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
