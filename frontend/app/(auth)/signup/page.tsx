'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SenzioMark } from '@/components/SenzioMark'
import { PinScreen } from '@/components/PinScreen'

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

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'form' | 'pin' | 'done'>('form')

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
      if (data.session) {
        setPhase('pin')
      } else {
        setPhase('done')
      }
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

  if (phase === 'pin') {
    return (
      <PinScreen
        title="Crée un code à 4 chiffres"
        subtitle="Il déverrouillera l'app à chaque ouverture."
        onBack={() => setPhase('form')}
        onComplete={() => router.push('/onboarding')}
      />
    )
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

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}>
      <div className="px-5 pt-5">
        <Link href="/" className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-2)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Retour
        </Link>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 max-w-sm mx-auto w-full">
        <SenzioMark size={40} />
        <h1 className="mt-5 text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>Crée ton compte.</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--fg-2)' }}>Email + mot de passe. On ne stocke rien d'autre.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
                      style={{ background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)' }} />
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

        <div className="flex flex-col gap-3 pb-8">
          <button onClick={() => handleOAuth()}
            className="flex items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-medium transition-all active:scale-95"
            style={{ background: 'var(--bg-card-hi)', color: 'var(--fg)', border: '1px solid var(--border)', fontFamily: 'inherit', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2c-2 1.5-4.6 2.5-7.4 2.5-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.2C40 35 44 30 44 24c0-1.2-.1-2.4-.4-3.5z"/>
            </svg>
            Continuer avec Google
          </button>
          <p className="text-center text-sm pt-2" style={{ color: 'var(--fg-3)' }}>
            Déjà un compte ?{' '}
            <Link href="/login" style={{ color: '#1D9E75' }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
