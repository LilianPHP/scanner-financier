'use client'
import Link from 'next/link'
import { SenzioMark } from '@/components/SenzioMark'

export default function WelcomePage() {
  return (
    <div
      className="min-h-dvh flex flex-col relative overflow-hidden"
      style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}
    >
      {/* Ambient blobs */}
      <div aria-hidden className="absolute -top-48 -right-40 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(29,158,117,0.35), transparent 70%)', filter: 'blur(20px)' }} />
      <div aria-hidden className="absolute -bottom-56 -left-40 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(96,165,250,0.18), transparent 70%)', filter: 'blur(20px)' }} />

      <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full px-6 py-12 relative z-10">
        {/* Logo */}
        <div>
          <SenzioMark size={48} />
          <div className="mt-3 text-lg font-bold tracking-tight" style={{ color: '#1D9E75', letterSpacing: '-0.02em' }}>
            senzio
          </div>
        </div>

        {/* Hero copy */}
        <div>
          <h1
            className="font-semibold leading-none"
            style={{ fontSize: 'clamp(38px, 10vw, 52px)', letterSpacing: '-0.025em', lineHeight: 1.02 }}
          >
            Tes finances,<br />sans friction,<br />sans trackers.
          </h1>
          <p className="mt-5 text-base leading-relaxed max-w-sm" style={{ color: 'var(--fg-2)' }}>
            Connecte ta banque, fixe un objectif, regarde-le avancer.
            Connexion sécurisée via Powens, agréé ACPR.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/signup"
            className="flex items-center justify-center text-base font-medium rounded-2xl transition-all active:scale-95"
            style={{
              padding: '16px',
              background: '#1D9E75',
              color: '#062A1E',
              boxShadow: '0 0 32px rgba(29,158,117,0.35)',
            }}
          >
            Créer un compte
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center text-sm font-medium rounded-2xl transition-all"
            style={{
              padding: '14px',
              background: 'transparent',
              color: 'var(--fg-2)',
              border: '1px solid var(--border)',
            }}
          >
            J'ai déjà un compte
          </Link>
          <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--fg-4)' }}>
            En continuant, tu acceptes nos{' '}
            <Link href="/mentions-legales" className="underline" style={{ color: 'var(--fg-3)' }}>CGU</Link>
            {' '}et notre{' '}
            <Link href="/confidentialite" className="underline" style={{ color: 'var(--fg-3)' }}>politique de confidentialité</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
