'use client'
import { ReactNode } from 'react'

/**
 * PageShell — wraps every (app) page in a 520px-wide centered column.
 * Gives the "iPhone app on infinite background" feel on desktop.
 */
export function PageShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        maxWidth: 520,
        margin: '0 auto',
        minHeight: '100dvh',
        position: 'relative',
      }}
    >
      {children}
    </div>
  )
}
