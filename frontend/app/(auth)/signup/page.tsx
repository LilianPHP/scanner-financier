'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SenzioMark } from '@/components/SenzioMark'
import { track } from '@/lib/analytics'

function getStrength(pwd: string): { score: 0|1|2|3; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' }
  let s = 0
  if (pwd.length >= 8) s++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++
  if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s++
  if (s === 0) return { score: 1, label: 'Faible', color: '#F87171' }
  if (s === 1) return { score: 2, label: 'Moyen', color: '#F59E0B' }
  return { score: 3, label: 'Fort', color: '#1D9E75' }
}

function Field({
  label, type = 'text', value, onChange, placeholder, right,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; right?: React.ReactNode
}) {
  const [focus, setFocus] = useState(false)
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--fg-3)' }}>{label}</span>
      <div
        className="flex items-center rounded-xl transition-all"
        style={{
          background: 'var(--bg-card-hi)',
          border: `1px solid ${focus ? '#1D9E75' : 'var(--border)'}`,
          boxShadow: focus ? '0 0 0 3px rgba(29,158,117,0.2)' : 'none',
        }}
      >
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          className="flex-1 bg-transparent border-0 outline-none px-4 py-3.5 text-sm"
          style={{ color: 'var(--fg)', fontFamily: 'inherit' }}
        />
        {right}
      </div>
    </label>
  )
}

function TrustItem({ icon, children }: { icon: 'shield' | 'check' | 'lock'; children: React.ReactNode }) {
  const paths: Record<string, React.ReactNode> = {
    shield: <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/>,
    check:  <path d="M9 12l2 2 4-4M12 22a10 10 0 110-20 10 10 0 010 20z"/>,
    lock:   <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths[icon]}
      </svg>
      {children}
    </span>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'form' | 'done'>('form')

  const strength = getStrength(password)
  const valid = email.includes('@') && password.length >= 6

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      track('Signup', { method: 'email', confirmed: !!data.session })
      if (data.session) {
        router.push('/onboarding')
        return
      }
      setPhase('done')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    })
  }

  if (phase === 'done') {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}>
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center text-3xl"
            style={{ background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)' }}>
            📬
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ letterSpacing: '-0.01em' }}>Vérifie ta boîte mail</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-2)' }}>
            Un email de confirmation a été envoyé à <strong style={{ color: 'var(--fg)' }}>{email}</strong>.
          </p>
        </div>
      </div>
    )
  }

  const formNode = (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="julia@senzio.app" />

        <div>
          <Field
            label="Mot de passe"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="Minimum 6 caractères"
            right={
              <button type="button" onClick={() => setShowPwd(s => !s)}
                className="px-3" style={{ color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showPwd ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            }
          />
          {password.length > 0 && (
            <div className="mt-2 px-1">
              <div className="flex gap-1 mb-1">
                {[1,2,3].map(i => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{ background: i <= strength.score ? strength.color : 'var(--track)' }} />
                ))}
              </div>
              <p className="text-xs" style={{ color: strength.color }}>
                {strength.label}
                {strength.score === 1 && ' — ajoute des chiffres et majuscules'}
                {strength.score === 2 && ' — ajoute un caractère spécial'}
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm rounded-xl px-4 py-3" style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!valid || loading}
          className="rounded-xl py-4 text-sm font-medium transition-all active:scale-95 mt-2"
          style={{
            background: valid ? '#1D9E75' : 'var(--bg-card-hi)',
            color: valid ? '#062A1E' : 'var(--fg-4)',
            border: 'none', cursor: valid ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            boxShadow: valid ? '0 0 24px rgba(29,158,117,0.3)' : 'none',
          }}
        >
          {loading ? 'Création…' : 'Continuer'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs" style={{ color: 'var(--fg-3)' }}>ou</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <button onClick={() => handleOAuth()}
        className="flex items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-medium transition-all active:scale-95 w-full"
        style={{ background: 'var(--bg-card-hi)', color: 'var(--fg)', border: '1px solid var(--border)', fontFamily: 'inherit', cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2c-2 1.5-4.6 2.5-7.4 2.5-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.2C40 35 44 30 44 24c0-1.2-.1-2.4-.4-3.5z"/>
        </svg>
        Continuer avec Google
      </button>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--fg-3)' }}>
        Déjà un compte ?{' '}
        <Link href="/login" style={{ color: '#1D9E75' }}>Se connecter</Link>
      </p>
    </>
  )

  return (
    <div
      className="min-h-dvh relative overflow-hidden"
      style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}
    >
      {/* Ambient blobs — same as welcome */}
      <div aria-hidden className="absolute -top-48 -right-40 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(29,158,117,0.32), transparent 70%)', filter: 'blur(40px)' }} />
      <div aria-hidden className="absolute -bottom-72 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(29,158,117,0.10), transparent 70%)', filter: 'blur(40px)' }} />

      {/* Back link — absolute on all sizes */}
      <div className="absolute top-5 left-5 lg:top-8 lg:left-8 z-20">
        <Link href="/" className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-2)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Retour
        </Link>
      </div>

      {/* Mobile layout (single column) */}
      <div className="lg:hidden flex flex-col px-6 pt-20 pb-8 max-w-sm mx-auto w-full relative z-10">
        <SenzioMark size={40} />
        <h1 className="mt-5 text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>Crée ton compte.</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--fg-2)' }}>Email + mot de passe. On ne stocke rien d'autre.</p>
        <div className="mt-8">{formNode}</div>
      </div>

      {/* Desktop layout (split: hero left, form card right) */}
      <div className="hidden lg:grid grid-cols-12 gap-12 mx-auto px-12 relative z-10"
        style={{ maxWidth: 1280, minHeight: '100dvh', alignItems: 'center' }}>
        {/* Left — branding + hero */}
        <div className="col-span-7">
          <div className="flex items-center gap-2.5">
            <SenzioMark size={44} />
            <span className="text-2xl font-bold tracking-tight" style={{ color: '#1D9E75', letterSpacing: '-0.02em' }}>
              senzio
            </span>
          </div>

          <h1 className="font-semibold mt-12"
            style={{ fontSize: 'clamp(56px, 6.5vw, 88px)', letterSpacing: '-0.03em', lineHeight: 1.02 }}>
            Crée ton compte.<br />
            <span style={{ color: 'var(--fg-2)' }}>Connecte ta banque.</span><br />
            C'est parti.
          </h1>

          <p className="mt-8 text-lg leading-relaxed max-w-2xl" style={{ color: 'var(--fg-2)' }}>
            On crée ton accès en moins d'une minute. Tu connectes ta banque ensuite — via Powens, en lecture seule.
          </p>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm" style={{ color: 'var(--fg-3)' }}>
            <TrustItem icon="shield">Powens · agréé ACPR</TrustItem>
            <TrustItem icon="check">Lecture seule</TrustItem>
            <TrustItem icon="lock">Aucun accès à tes identifiants</TrustItem>
          </div>
        </div>

        {/* Right — auth card */}
        <div className="col-span-5">
          <div
            className="rounded-3xl p-8"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#1D9E75' }}>
              Inscription
            </p>
            <h2 className="text-2xl font-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>
              Crée ton compte
            </h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--fg-3)' }}>
              Email + mot de passe. On ne stocke rien d'autre.
            </p>
            {formNode}
          </div>
        </div>
      </div>
    </div>
  )
}
