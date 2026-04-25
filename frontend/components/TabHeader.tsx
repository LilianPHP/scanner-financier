'use client'
import { ReactNode } from 'react'
import { Avatar } from './Avatar'

/**
 * Header for tab pages (Accueil, Tx, Budgets, Objectifs, Profil).
 * Big H1 top-left + green eyebrow + avatar right. No back button.
 */
export function TabHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: '#1D9E75' }}
          >
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {action}
        <Avatar size={36} />
      </div>
    </div>
  )
}
