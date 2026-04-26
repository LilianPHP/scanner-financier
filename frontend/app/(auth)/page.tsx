'use client'
import Link from 'next/link'
import { SenzioMark } from '@/components/SenzioMark'

export default function WelcomePage() {
  return (
    <div
      className="min-h-dvh flex flex-col relative overflow-hidden"
      style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}
    >
      {/* Ambient blobs — subtle premium fintech feel */}
      <div aria-hidden className="absolute -top-48 -right-40 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(29,158,117,0.32), transparent 70%)', filter: 'blur(20px)' }} />
      <div aria-hidden className="absolute -bottom-56 -left-40 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(29,158,117,0.10), transparent 70%)', filter: 'blur(20px)' }} />

      <div className="flex-1 flex flex-col justify-between mx-auto w-full px-6 py-10 lg:py-16 relative z-10" style={{ maxWidth: 560 }}>
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
            style={{ fontSize: 'clamp(36px, 9vw, 52px)', letterSpacing: '-0.025em', lineHeight: 1.04 }}
          >
            Connecte ta banque.<br />
            <span style={{ color: 'var(--fg-2)' }}>Comprends ton argent.</span><br />
            Atteins tes objectifs.
          </h1>
          <p className="mt-5 text-base leading-relaxed" style={{ color: 'var(--fg-2)' }}>
            Senzio synchronise tes transactions via Powens, catégorise tes dépenses et t'aide à suivre tes objectifs financiers — sans friction.
          </p>

          {/* Trust strip */}
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[12px]" style={{ color: 'var(--fg-3)' }}>
            <span className="inline-flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/>
              </svg>
              Powens · agréé ACPR
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4M12 22a10 10 0 110-20 10 10 0 010 20z"/>
              </svg>
              Lecture seule
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              Aucun accès à tes identifiants
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 mt-10">
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
            Connecter ma banque
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
          <p className="text-center text-xs leading-relaxed mt-1" style={{ color: 'var(--fg-4)' }}>
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
