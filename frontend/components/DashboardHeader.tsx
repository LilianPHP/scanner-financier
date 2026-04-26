'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Avatar } from './Avatar'

/**
 * Dashboard header — adapts to viewport.
 *
 * Mobile (<lg): green eyebrow + H1 + avatar (matches TabHeader pattern)
 * Desktop (>=lg): "Bonjour, [Name]" greeting + last-sync line + Synchroniser CTA
 */
export function DashboardHeader({ onSync, lastSyncAt }: { onSync?: () => void; lastSyncAt?: string | null }) {
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const em = data.session?.user?.email ?? ''
      // Best-effort first name: capitalize email local-part
      const local = em.split('@')[0]
      setFirstName(local.charAt(0).toUpperCase() + local.slice(1))
    })
  }, [])

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#1D9E75' }}>
            Vue d'ensemble
          </p>
          <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>Accueil</h1>
        </div>
        <Avatar size={36} />
      </div>

      {/* Desktop header */}
      <div className="hidden lg:flex items-end justify-between gap-4 px-8 pt-10 pb-7">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold" style={{ letterSpacing: '-0.025em' }}>
            Bonjour, {firstName || 'toi'} 👋
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--fg-3)' }}>
            Voici un résumé de tes finances.
            {lastSyncAt && (
              <span className="ml-2" style={{ color: 'var(--fg-4)' }}>
                · Dernière synchronisation {lastSyncAt}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onSync && (
            <button
              onClick={onSync}
              className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all active:scale-95"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--fg-2)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Synchroniser
            </button>
          )}
        </div>
      </div>
    </>
  )
}
