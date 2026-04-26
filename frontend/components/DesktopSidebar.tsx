'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/transactions',
    label: 'Transactions',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    href: '/budgets',
    label: 'Budgets',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: '/goals',
    label: 'Objectifs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    href: '/accounts',
    label: 'Comptes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profil',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [initial, setInitial] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const em = data.session?.user?.email ?? ''
      setEmail(em)
      setInitial((em.charAt(0) || 'S').toUpperCase())
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40"
      style={{
        width: 240,
        background: 'var(--bg-page)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="px-6 pt-7 pb-8 flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: '#1D9E75' }}
        >
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <rect x="3" y="17" width="5" height="10" rx="1" fill="white" opacity="0.9"/>
            <rect x="12" y="10" width="5" height="17" rx="1" fill="white"/>
            <rect x="21" y="4" width="5" height="23" rx="1" fill="white" opacity="0.7"/>
          </svg>
        </div>
        <span className="text-base font-bold tracking-tight" style={{ color: '#1D9E75', letterSpacing: '-0.02em' }}>
          senzio
        </span>
      </div>

      {/* Navigation */}
      <nav className="px-3 flex-1 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{
                background: active ? 'rgba(29,158,117,0.12)' : 'transparent',
                color: active ? '#1D9E75' : 'var(--fg-2)',
                border: active ? '1px solid rgba(29,158,117,0.18)' : '1px solid transparent',
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Secure connection card */}
      <div className="px-3 mb-3">
        <div
          className="rounded-xl p-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/>
            </svg>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#1D9E75' }}>
              Connexion sécurisée
            </p>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
            Senzio utilise Powens (agréé ACPR) pour connecter ta banque. Accès en lecture seule. Aucun accès à tes identifiants.
          </p>
        </div>
      </div>

      {/* User profile */}
      <div className="px-3 pb-4 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5 mt-3 px-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1D9E75, #28c48f)', color: '#062A1E' }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--fg)' }}>
              {email.split('@')[0] || 'Utilisateur'}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--fg-4)' }}>{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--fg-3)' }}
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
