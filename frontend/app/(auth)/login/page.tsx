'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SenzioMark } from '@/components/SenzioMark'
import { PinScreen } from '@/components/PinScreen'

function translateAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (msg.includes('Email not confirmed')) return 'Confirme ton email avant de te connecter.'
  if (msg.includes('Too many requests')) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  return 'Erreur de connexion. Réessaie.'
}

function Field({
  label, type = 'text', value, onChange, placeholder,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string
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
      </div>
    </label>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const valid = email.includes('@') && password.length >= 6

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setShowPin(true)
    } catch (err: any) {
      setError(translateAuthError(err.message || ''))
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  async function handleForgotPassword() {
    if (!email) { setError('Entre ton email pour réinitialiser.'); return }
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
    setResetSent(true)
  }

  if (showPin) {
    return (
      <PinScreen
        title="Re-bonjour."
        subtitle="Tape ton code pour déverrouiller."
        onBack={() => setShowPin(false)}
        onComplete={() => router.push('/dashboard')}
      />
    )
  }

  return (
    <div className="min-h-dvh flex flex-col lg:items-center lg:justify-center" style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}>
      <div className="px-5 pt-5 lg:absolute lg:top-0 lg:left-0 lg:p-8">
        <Link href="/" className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-2)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Retour
        </Link>
      </div>

      <div className="flex-1 lg:flex-none flex flex-col px-6 pt-8 lg:pt-0 lg:p-10 max-w-sm lg:max-w-md mx-auto w-full lg:rounded-3xl" style={{ background: 'transparent' }}>
        <SenzioMark size={40} />
        <h1 className="mt-5 text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>Bon retour.</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--fg-2)' }}>Connecte-toi pour retrouver tes finances.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="julia@senzio.app" />
          <Field label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

          {error && (
            <p className="text-sm rounded-xl px-4 py-3" style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
              {error}
            </p>
          )}
          {resetSent && (
            <p className="text-sm rounded-xl px-4 py-3" style={{ color: '#1D9E75', background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)' }}>
              Email envoyé ! Vérifie ta boîte mail.
            </p>
          )}

          <button
            type="button"
            onClick={handleForgotPassword}
            className="self-end text-xs"
            style={{ color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Mot de passe oublié ?
          </button>

          <button
            type="submit"
            disabled={!valid || loading}
            className="rounded-xl py-4 text-sm font-medium transition-all active:scale-95"
            style={{
              background: valid ? '#1D9E75' : 'var(--bg-card-hi)',
              color: valid ? '#062A1E' : 'var(--fg-4)',
              border: 'none', cursor: valid ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              boxShadow: valid ? '0 0 24px rgba(29,158,117,0.3)' : 'none',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--fg-3)' }}>ou</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* OAuth */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleOAuth()}
            className="flex items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-medium transition-all active:scale-95"
            style={{ background: 'var(--bg-card-hi)', color: 'var(--fg)', border: '1px solid var(--border)', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.2c-2 1.5-4.6 2.5-7.4 2.5-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.2C40 35 44 30 44 24c0-1.2-.1-2.4-.4-3.5z"/>
            </svg>
            Continuer avec Google
          </button>
        </div>

        <p className="text-center text-sm mt-8 pb-8" style={{ color: 'var(--fg-3)' }}>
          Pas encore de compte ?{' '}
          <Link href="/signup" style={{ color: '#1D9E75' }}>Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}
