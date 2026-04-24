'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SenzioMark } from '@/components/SenzioMark'
import { saveProfile } from '@/lib/api'

const SLIDES = [
  {
    illus: 'import',
    title: 'Connecte ta banque, on s\'occupe du reste.',
    body: 'Agrégation sécurisée via Powens. Plus de 250 banques supportées. Catégorisation automatique.',
  },
  {
    illus: 'goal',
    title: 'Fixe un objectif qui compte.',
    body: 'Voyage, épargne de sécurité, investir… Un seul cap à la fois. La barre avance à chaque virement.',
  },
  {
    illus: 'privacy',
    title: 'Tes identifiants restent chez toi.',
    body: 'Powens ne communique jamais tes identifiants à Senzio. Chiffrement DSP2, révocable à tout moment.',
  },
]

function ImportIllus() {
  return (
    <div className="h-44 flex items-center justify-center gap-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold text-white" style={{ background: '#00915A', boxShadow: '0 12px 32px -12px rgba(0,0,0,0.6)' }}>BNP</div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: '#1D9E75', boxShadow: '0 0 8px #1D9E75' }}/>
        <span className="w-8 h-0.5" style={{ background: 'linear-gradient(90deg, #1D9E75, rgba(255,255,255,0.1))' }}/>
        <span className="text-[10px] px-2 py-1 rounded-md font-medium" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>powens</span>
        <span className="w-8 h-0.5" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.1), #1D9E75)' }}/>
        <span className="w-2 h-2 rounded-full" style={{ background: '#1D9E75', boxShadow: '0 0 8px #1D9E75' }}/>
      </div>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#1D9E75', boxShadow: '0 0 32px rgba(29,158,117,0.35)' }}>
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="3" y="17" width="5" height="10" rx="1" fill="white" opacity="0.9"/>
          <rect x="12" y="10" width="5" height="17" rx="1" fill="white"/>
          <rect x="21" y="4" width="5" height="23" rx="1" fill="white" opacity="0.7"/>
        </svg>
      </div>
    </div>
  )
}

function GoalIllus() {
  return (
    <div className="h-44 flex flex-col justify-center px-6 gap-4">
      <div className="text-xs font-medium uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Voyage Japon</div>
      <div className="text-4xl font-semibold tabular" style={{ letterSpacing: '-0.02em' }}>
        2 340 <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: 500 }}>/ 5 000 €</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full" style={{ width: '47%', background: '#1D9E75', boxShadow: '0 0 24px rgba(29,158,117,0.5)' }} />
      </div>
      <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>47% · 8 mois restants</div>
    </div>
  )
}

function PrivacyIllus() {
  return (
    <div className="h-44 flex items-center justify-center">
      <div className="w-28 h-28 rounded-full flex items-center justify-center"
        style={{ border: '1.5px solid #1D9E75', background: 'rgba(29,158,117,0.12)', boxShadow: '0 0 40px rgba(29,158,117,0.35)' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </div>
    </div>
  )
}

const ILLUS = { import: ImportIllus, goal: GoalIllus, privacy: PrivacyIllus }

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const isLast = step === SLIDES.length - 1
  const Illus = ILLUS[SLIDES[step].illus as keyof typeof ILLUS]

  async function finish() {
    setSaving(true)
    try {
      await saveProfile({ is_student: false, travels_often: false, has_children: false, has_pet: false })
    } catch {}
    router.push('/accounts')
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}>
      <div className="flex items-center justify-between px-5 pt-5">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
          className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Retour
        </button>
        <span className="text-xs tabular" style={{ color: 'var(--fg-3)' }}>{step + 1} / {SLIDES.length}</span>
      </div>

      <div className="flex-1 flex flex-col px-6 max-w-sm mx-auto w-full">
        <div className="flex-1 flex flex-col justify-center">
          <Illus />
          <div className="mt-8">
            <h1 className="text-2xl font-semibold leading-snug" style={{ letterSpacing: '-0.02em' }}>
              {SLIDES[step].title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--fg-2)' }}>
              {SLIDES[step].body}
            </p>
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-200"
              style={{ width: i === step ? 22 : 6, background: i === step ? '#1D9E75' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>

        <div className="flex flex-col gap-3 pb-8">
          <button
            onClick={() => isLast ? finish() : setStep(s => s + 1)}
            disabled={saving}
            className="rounded-xl py-4 text-sm font-medium transition-all active:scale-95"
            style={{ background: '#1D9E75', color: '#062A1E', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(29,158,117,0.3)' }}
          >
            {saving ? 'Chargement…' : isLast ? 'Commencer' : 'Continuer'}
          </button>
          {!isLast && (
            <button onClick={finish}
              className="py-2 text-sm transition-all"
              style={{ color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Passer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
