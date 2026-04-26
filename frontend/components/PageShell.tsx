'use client'
import { ReactNode } from 'react'

/**
 * PageShell — responsive content wrapper.
 *
 * Mobile (<lg): centered column at 520px (native banking app feel)
 * Desktop (>=lg): wider container up to 1080px (cockpit grid)
 *
 * Pass `wide={false}` for screens that should stay narrow on desktop too
 * (goal detail, wizards, focused single-purpose screens).
 */
export function PageShell({
  children,
  wide = true,
  className = '',
}: {
  children: ReactNode
  wide?: boolean
  className?: string
}) {
  const widthClass = wide
    ? 'max-w-[520px] lg:max-w-[1080px]'
    : 'max-w-[520px]'
  return (
    <div className={`mx-auto w-full relative ${widthClass} ${className}`} style={{ minHeight: '100dvh' }}>
      {children}
    </div>
  )
}

/**
 * NarrowColumn — for sections within a wide page that should keep
 * a comfortable reading width (e.g. paragraphs, forms).
 */
export function NarrowColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full" style={{ maxWidth: 520 }}>
      {children}
    </div>
  )
}
