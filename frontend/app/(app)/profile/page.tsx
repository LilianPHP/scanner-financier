'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getBankConnections, type BankConnection } from '@/lib/api'
import { SenzioMark } from '@/components/SenzioMark'

function Row({
  icon, label, value, onPress, danger,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  onPress?: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onPress}
      disabled={!onPress}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all active:opacity-70"
      style={{
        background: 'none',
        border: 'none',
        cursor: onPress ? 'pointer' : 'default',
        fontFamily: 'inherit',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
        style={{ background: danger ? 'rgba(248,113,113,0.1)' : 'var(--bg-card-hi)' }}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium" style={{ color: danger ? '#F87171' : 'var(--fg)' }}>
        {label}
      </span>
      {value && (
        <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{value}</span>
      )}
      {onPress && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg-3)', flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-2" style={{ color: 'var(--fg-3)' }}>
        {title}
      </p>
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [loggingOut, setLoggingOut] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      setEmail(data.session.user.email ?? '')
    })
    getBankConnections().then(setConnections).catch(() => {})
    const stored = localStorage.getItem('theme')
    if (stored === 'light') setTheme('light')
  }, [router])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('light', next === 'light')
  }

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleResetPassword() {
    if (!email) return
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    alert('Email de réinitialisation envoyé !')
  }

  const initials = email ? email[0].toUpperCase() : '?'

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#1D9E75' }}>
          Mon compte
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>Profil</h1>
      </div>

      <div className="px-5 max-w-sm mx-auto w-full mt-4">

        {/* Avatar + email */}
        <div className="flex items-center gap-4 rounded-2xl px-4 py-4 mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.3)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{email}</p>
            <p className="text-xs mt-0.5" style={{ color: '#1D9E75' }}>Compte actif</p>
          </div>
          <SenzioMark size={28} />
        </div>

        {/* Banques */}
        <Section title="Open Banking">
          <Row
            icon={<span>🏦</span>}
            label="Mes banques"
            value={connections.length > 0 ? `${connections.length} connectée${connections.length > 1 ? 's' : ''}` : 'Aucune'}
            onPress={() => router.push('/accounts')}
          />
        </Section>

        {/* Sécurité */}
        <Section title="Sécurité">
          <Row
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            }
            label="Changer le mot de passe"
            onPress={handleResetPassword}
          />
          <Row
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            }
            label="Code PIN"
            value="4 chiffres"
            onPress={() => {}}
          />
        </Section>

        {/* Affichage */}
        <Section title="Affichage">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm" style={{ background: 'var(--bg-card-hi)' }}>
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg)' }}>
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg)' }}>
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              )}
            </span>
            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--fg)' }}>
              Thème
            </span>
            <div
              className="flex items-center rounded-full p-0.5 transition-all"
              style={{
                background: theme === 'dark' ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.1)',
                border: '1px solid var(--border)',
                width: 44,
              }}
            >
              <div
                className="w-5 h-5 rounded-full transition-all"
                style={{
                  background: theme === 'dark' ? '#1D9E75' : 'rgba(255,255,255,0.4)',
                  transform: theme === 'dark' ? 'translateX(18px)' : 'translateX(0)',
                  boxShadow: theme === 'dark' ? '0 0 8px rgba(29,158,117,0.5)' : 'none',
                }}
              />
            </div>
            <span className="text-xs ml-2" style={{ color: 'var(--fg-3)' }}>
              {theme === 'dark' ? 'Sombre' : 'Clair'}
            </span>
          </button>
        </Section>

        {/* Légal */}
        <Section title="À propos">
          <Row
            icon={<span>📜</span>}
            label="Mentions légales"
            onPress={() => router.push('/mentions-legales')}
          />
          <Row
            icon={<span>🔒</span>}
            label="Confidentialité"
            onPress={() => router.push('/confidentialite')}
          />
          <Row
            icon={<span style={{ fontSize: 12, color: 'var(--fg-3)' }}>v2</span>}
            label="Version"
            value="2.0.0"
          />
        </Section>

        {/* Déconnexion */}
        <Section title="">
          <Row
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            }
            label={loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
            onPress={loggingOut ? undefined : handleLogout}
            danger
          />
        </Section>

        <div className="h-8" />
      </div>
    </div>
  )
}
