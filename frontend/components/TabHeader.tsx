'use client'
import { ReactNode } from 'react'
import { Avatar } from './Avatar'

/**
 * Header for tab pages (Tx, Budgets, Objectifs, Profil).
 *
 * Mobile: green eyebrow + H1 + optional action + avatar
 * Desktop: larger H1 + optional action (avatar lives in the sidebar)
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
    <>
      {/* Mobile */}
      <div className="lg:hidden px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#1D9E75' }}>
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>{title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {action}
          <Avatar size={36} />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex items-end justify-between gap-4 px-8 pt-10 pb-7">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#1D9E75' }}>
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-semibold" style={{ letterSpacing: '-0.025em' }}>{title}</h1>
        </div>
        {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
      </div>
    </>
  )
}
