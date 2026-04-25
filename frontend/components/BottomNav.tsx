'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/dashboard',
    label: 'Accueil',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/transactions',
    label: 'Tx',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    href: '/budgets',
    label: 'Budgets',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: '/goals',
    label: 'Objectifs',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profil',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1D9E75' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      style={{
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center mx-auto px-2" style={{ maxWidth: 520 }}>
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 flex-1 py-3 transition-opacity"
              style={{ opacity: active ? 1 : 0.5 }}
            >
              {tab.icon(active)}
              <span
                className="text-[10px] font-medium tracking-wide"
                style={{ color: active ? '#1D9E75' : 'rgba(255,255,255,0.4)' }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
