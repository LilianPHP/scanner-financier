'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { TabHeader } from '@/components/TabHeader'

const BUILD_VERSION = 'v0.9.2 · Build 24.04.26'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest px-1 mb-1.5" style={{ color: 'var(--fg-3)' }}>
        {title}
      </p>
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({
  icon, label, value, onPress, danger, chevron = true, badge,
}: {
  icon: string
  label: string
  value?: string
  onPress?: () => void
  danger?: boolean
  chevron?: boolean
  badge?: React.ReactNode
}) {
  const el = (
    <div
      className="flex items-center gap-3 px-4 py-3.5 transition-all active:opacity-70"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-base flex-shrink-0 w-6 text-center">{icon}</span>
      <span
        className="flex-1 text-sm font-medium"
        style={{ color: danger ? '#F87171' : 'var(--fg)' }}
      >
        {label}
      </span>
      {badge}
      {value && (
        <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{value}</span>
      )}
      {onPress && chevron && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg-3)', flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </div>
  )

  if (onPress) {
    return (
      <button
        onClick={onPress}
        className="w-full text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {el}
      </button>
    )
  }
  return el
}

// Last row has no bottom border
function LastRow({ icon, label, value, onPress, danger, chevron = true, badge }: Parameters<typeof Row>[0]) {
  const el = (
    <div className="flex items-center gap-3 px-4 py-3.5 transition-all active:opacity-70">
      <span className="text-base flex-shrink-0 w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium" style={{ color: danger ? '#F87171' : 'var(--fg)' }}>
        {label}
      </span>
      {badge}
      {value && <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{value}</span>}
      {onPress && chevron && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg-3)', flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </div>
  )
  if (onPress) {
    return (
      <button onClick={onPress} className="w-full text-left" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        {el}
      </button>
    )
  }
  return el
}

export default function ProfilePage() {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [email, setEmail] = useState('')
  const [initial, setInitial] = useState('J')
  const [memberSince, setMemberSince] = useState('')
  const [bankCount, setBankCount] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      const user = data.session.user
      const em = user.email ?? ''
      setEmail(em)
      setInitial(em.charAt(0).toUpperCase())
      const created = new Date(user.created_at)
      setMemberSince(created.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
    })
    // Try fetching bank connections count
    try {
      const raw = sessionStorage.getItem('analysis')
      if (raw) setBankCount(1)
    } catch {}
  }, [router])

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      <TabHeader eyebrow="Mon compte" title="Profil" />

      <div className="px-5 flex flex-col gap-4">
        {/* Avatar card */}
        <div
          className="rounded-2xl px-4 py-4 flex items-center gap-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1D9E75, #28c48f)', color: '#062A1E' }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold" style={{ letterSpacing: '-0.01em' }}>
              {email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) || 'Utilisateur'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
              Membre depuis {memberSince}
            </p>
          </div>
          <button
            className="rounded-xl px-3 py-1.5 text-xs font-medium"
            style={{ background: 'var(--bg-card-hi)', color: 'var(--fg-2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Modifier
          </button>
        </div>

        {/* Compte */}
        <Section title="COMPTE">
          <Row icon="✉️" label="Email" value={email} chevron={false} />
          <Row icon="🔐" label="Sécurité & code" onPress={() => {}} />
          <LastRow
            icon="⭐"
            label="Plan"
            chevron={false}
            badge={
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.3)' }}
              >
                Senzio Libre
              </span>
            }
          />
        </Section>

        {/* Connexions bancaires */}
        <Section title="CONNEXIONS BANCAIRES">
          <Row
            icon="🏦"
            label="Banques connectées"
            value={bankCount > 0 ? `${bankCount} banque${bankCount > 1 ? 's' : ''}` : undefined}
            onPress={() => router.push('/accounts')}
          />
          <LastRow
            icon="➕"
            label="Ajouter une banque"
            onPress={() => router.push('/accounts')}
          />
        </Section>

        {/* Préférences */}
        <Section title="PRÉFÉRENCES">
          <Row icon="🔔" label="Notifications" onPress={() => {}} />
          <Row icon="🌍" label="Langue" value="Français" chevron={false} />
          {/* Theme toggle row */}
          <Row
            icon={theme === 'dark' ? '🌙' : '☀️'}
            label="Apparence"
            value={theme === 'dark' ? 'Sombre' : 'Clair'}
            onPress={toggle}
            chevron={false}
          />
          <LastRow icon="💱" label="Devise" value="EUR · €" chevron={false} />
        </Section>

        {/* Données */}
        <Section title="DONNÉES">
          <Row icon="📤" label="Exporter mes données" onPress={() => {}} />
          <LastRow icon="🗑️" label="Tout effacer" onPress={() => {}} danger />
        </Section>

        {/* Aide & infos */}
        <Section title="AIDE & INFOS">
          <Row icon="💬" label="Aide & FAQ" onPress={() => {}} />
          <Row icon="📄" label="CGU" onPress={() => router.push('/mentions-legales')} />
          <LastRow icon="🔒" label="Politique de confidentialité" onPress={() => router.push('/confidentialite')} />
        </Section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full rounded-2xl py-4 text-sm font-medium transition-all active:scale-[0.98]"
          style={{
            background: 'var(--bg-card)',
            color: loggingOut ? 'var(--fg-3)' : '#F87171',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </button>

        {/* Footer */}
        <p className="text-center text-xs pb-4" style={{ color: 'var(--fg-4)' }}>
          Senzio · {BUILD_VERSION}
        </p>
      </div>
    </>
  )
}
