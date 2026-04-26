'use client'
import Link from 'next/link'
import { SenzioMark } from '@/components/SenzioMark'

export default function WelcomePage() {
  return (
    <div
      className="min-h-dvh relative overflow-hidden"
      style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}
    >
      {/* Ambient blobs — subtle premium fintech feel */}
      <div aria-hidden className="absolute -top-48 -right-40 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(29,158,117,0.32), transparent 70%)', filter: 'blur(40px)' }} />
      <div aria-hidden className="absolute -bottom-72 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(29,158,117,0.10), transparent 70%)', filter: 'blur(40px)' }} />

      {/* Mobile layout (single column) */}
      <div className="lg:hidden flex-1 flex flex-col justify-between mx-auto w-full px-6 py-10 relative z-10" style={{ minHeight: '100dvh', maxWidth: 560 }}>
        <div>
          <SenzioMark size={48} />
          <div className="mt-3 text-lg font-bold tracking-tight" style={{ color: '#1D9E75', letterSpacing: '-0.02em' }}>
            senzio
          </div>
        </div>

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

          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[12px]" style={{ color: 'var(--fg-3)' }}>
            <TrustItem icon="shield">Powens · agréé ACPR</TrustItem>
            <TrustItem icon="check">Lecture seule</TrustItem>
            <TrustItem icon="lock">Aucun accès à tes identifiants</TrustItem>
          </div>
        </div>

        <CTAButtons />
      </div>

      {/* Desktop layout (split: hero left, CTAs right) */}
      <div className="hidden lg:grid grid-cols-12 gap-12 mx-auto px-12 relative z-10" style={{ maxWidth: 1280, minHeight: '100dvh', alignItems: 'center' }}>
        {/* Left — branding + hero */}
        <div className="col-span-7">
          <div className="flex items-center gap-2.5">
            <SenzioMark size={44} />
            <span className="text-2xl font-bold tracking-tight" style={{ color: '#1D9E75', letterSpacing: '-0.02em' }}>
              senzio
            </span>
          </div>

          <h1
            className="font-semibold mt-12"
            style={{ fontSize: 'clamp(56px, 6.5vw, 88px)', letterSpacing: '-0.03em', lineHeight: 1.02 }}
          >
            Connecte ta banque.<br />
            <span style={{ color: 'var(--fg-2)' }}>Comprends ton argent.</span><br />
            Atteins tes objectifs.
          </h1>

          <p className="mt-8 text-lg leading-relaxed max-w-2xl" style={{ color: 'var(--fg-2)' }}>
            Senzio synchronise tes transactions via Powens, catégorise tes dépenses et t'aide à suivre tes objectifs financiers — sans friction.
          </p>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm" style={{ color: 'var(--fg-3)' }}>
            <TrustItem icon="shield">Powens · agréé ACPR</TrustItem>
            <TrustItem icon="check">Lecture seule</TrustItem>
            <TrustItem icon="lock">Aucun accès à tes identifiants</TrustItem>
          </div>
        </div>

        {/* Right — CTAs panel */}
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
              Démarrer
            </p>
            <h2 className="text-2xl font-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>
              Prêt en 2 minutes
            </h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--fg-3)' }}>
              Crée ton compte, connecte ta banque, et obtiens ta première analyse instantanément.
            </p>
            <CTAButtons />
          </div>
        </div>
      </div>
    </div>
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

function CTAButtons() {
  return (
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
  )
}
