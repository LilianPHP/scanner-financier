'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GOAL_TYPES = [
  { value: 'urgence', label: 'Épargner', subtitle: '3 à 6 mois de dépenses', icon: '🛡️' },
  { value: 'voyage', label: 'Voyager', subtitle: 'Japon, Lisbonne, Lac de Côme...', icon: '✈️' },
  { value: 'achat', label: 'Acheter', subtitle: 'Vélo, ordi, déménagement', icon: '💳' },
  { value: 'investissement', label: 'Investir', subtitle: 'PEA, crypto, livret', icon: '📈' },
  { value: 'autre', label: 'Autre', subtitle: 'À toi de définir', icon: '✨' },
]

const AMOUNT_CHIPS = [500, 1000, 2500, 5000, 10000]

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

export default function NewGoalPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [kind, setKind] = useState('')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [months, setMonths] = useState(8)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nameFocus, setNameFocus] = useState(false)
  const [amtFocus, setAmtFocus] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login')
    })
  }, [router])

  const targetNum = parseFloat(target) || 0
  const rhythmPerMonth = months > 0 && targetNum > 0 ? Math.ceil(targetNum / months) : 0
  const weeklyRhythm = Math.ceil(rhythmPerMonth / 4.33)

  async function finish() {
    if (!kind || !name || targetNum <= 0) {
      setError('Remplis tous les champs.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non authentifié')
      const opt = GOAL_TYPES.find(t => t.value === kind)
      const { error: dbErr } = await supabase.from('goals').insert({
        user_id: session.user.id,
        kind,
        name,
        icon: opt?.icon ?? '✨',
        target: targetNum,
        current: 0,
        months,
        status: 'active',
      })
      if (dbErr) throw dbErr
      router.push('/goals')
    } catch (e: any) {
      setError(e.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ color: 'var(--fg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-6">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/goals')}
          className="flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--fg-2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Retour
        </button>
        <span className="text-xs tabular" style={{ color: 'var(--fg-3)' }}>{step} / 3</span>
      </div>

      <div className="flex-1 flex flex-col px-5 w-full">

        {/* ── STEP 1 : Type picker ── */}
        {step === 1 && (
          <>
            <h1 className="text-3xl font-semibold mb-1.5" style={{ letterSpacing: '-0.02em' }}>
              Quel est ton projet ?
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--fg-3)' }}>
              Un seul cap à la fois — tu pourras en ajouter plus tard.
            </p>
            <div className="flex flex-col gap-2">
              {GOAL_TYPES.map(t => {
                const active = kind === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => setKind(t.value)}
                    className="flex items-center gap-4 rounded-2xl px-4 py-4 text-left transition-all active:scale-[0.98]"
                    style={{
                      background: active ? 'rgba(29,158,117,0.12)' : 'var(--bg-card)',
                      border: `1px solid ${active ? '#1D9E75' : 'var(--border)'}`,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{
                        background: active ? 'rgba(29,158,117,0.2)' : 'var(--bg-card-hi)',
                        border: `1px solid ${active ? 'rgba(29,158,117,0.4)' : 'var(--border)'}`,
                      }}
                    >
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: active ? '#1D9E75' : 'var(--fg)' }}>{t.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{t.subtitle}</p>
                    </div>
                    {active && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ── STEP 2 : Name + amount ── */}
        {step === 2 && (
          <>
            <h1 className="text-3xl font-semibold leading-tight mb-1.5" style={{ letterSpacing: '-0.02em' }}>
              Donne-lui un nom<br />et un montant.
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--fg-3)' }}>
              Les détails concrets rendent l&apos;objectif plus tenace.
            </p>

            <div className="flex flex-col gap-4">
              {/* Name */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>NOM</p>
                <div
                  className="rounded-xl"
                  style={{
                    border: `1px solid ${nameFocus ? '#1D9E75' : 'var(--border)'}`,
                    boxShadow: nameFocus ? '0 0 0 3px rgba(29,158,117,0.15)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onFocus={() => setNameFocus(true)}
                    onBlur={() => setNameFocus(false)}
                    placeholder="Voyage Japon"
                    className="w-full bg-transparent border-0 outline-none px-4 py-3.5 text-sm rounded-xl"
                    style={{ background: 'var(--bg-card-hi)', color: 'var(--fg)', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>MONTANT CIBLE</p>
                <div
                  className="flex items-center rounded-xl"
                  style={{
                    background: 'var(--bg-card-hi)',
                    border: `1px solid ${amtFocus ? '#1D9E75' : 'var(--border)'}`,
                    boxShadow: amtFocus ? '0 0 0 3px rgba(29,158,117,0.15)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="number"
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    onFocus={() => setAmtFocus(true)}
                    onBlur={() => setAmtFocus(false)}
                    placeholder="5000"
                    className="flex-1 bg-transparent border-0 outline-none px-4 py-3.5 text-sm"
                    style={{ color: 'var(--fg)', fontFamily: 'inherit' }}
                  />
                  <span className="pr-4 text-sm font-medium" style={{ color: 'var(--fg-3)' }}>€</span>
                </div>

                {/* Quick chips */}
                <div className="flex gap-2 mt-2.5 flex-wrap">
                  {AMOUNT_CHIPS.map(chip => {
                    const active = target === String(chip)
                    return (
                      <button
                        key={chip}
                        onClick={() => setTarget(String(chip))}
                        className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                        style={{
                          background: active ? 'rgba(29,158,117,0.15)' : 'var(--bg-card)',
                          color: active ? '#1D9E75' : 'var(--fg-2)',
                          border: `1px solid ${active ? 'rgba(29,158,117,0.4)' : 'var(--border)'}`,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {fmt(chip)} €
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3 : Duration + rhythm ── */}
        {step === 3 && (
          <>
            <h1 className="text-3xl font-semibold leading-tight mb-1.5" style={{ letterSpacing: '-0.02em' }}>
              Tu veux y être en<br />combien de temps ?
            </h1>
            <p className="text-sm mb-10" style={{ color: 'var(--fg-3)' }}>
              On calcule ton rythme. Tu peux l&apos;ajuster à tout moment.
            </p>

            {/* Stepper */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <button
                onClick={() => setMonths(m => Math.max(1, m - 1))}
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all active:scale-95"
                style={{ background: 'var(--bg-card-hi)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                −
              </button>
              <div className="text-center">
                <p className="text-6xl font-semibold tabular" style={{ letterSpacing: '-0.03em' }}>{months}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>mois</p>
              </div>
              <button
                onClick={() => setMonths(m => m + 1)}
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all active:scale-95"
                style={{ background: 'var(--bg-card-hi)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                +
              </button>
            </div>

            {/* Rhythm card */}
            {rhythmPerMonth > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-3)' }}>
                  RYTHME RECOMMANDÉ
                </p>
                <p className="text-3xl font-semibold mb-2" style={{ color: '#1D9E75', letterSpacing: '-0.02em' }}>
                  {fmt(rhythmPerMonth)} €{' '}
                  <span className="text-base font-normal" style={{ color: 'var(--fg-3)' }}>/mois</span>
                </p>
                <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
                  Soit environ{' '}
                  <strong style={{ color: 'var(--fg)' }}>{fmt(weeklyRhythm)} €/semaine</strong>
                  {' '}— c&apos;est atteignable.
                </p>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm rounded-xl px-4 py-3" style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                {error}
              </p>
            )}
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        <div className="pb-8 pt-6">
          <button
            onClick={() => {
              if (step < 3) {
                if (step === 1 && !kind) return
                if (step === 2 && (!name || !target)) return
                setStep(s => s + 1)
              } else {
                finish()
              }
            }}
            disabled={
              saving ||
              (step === 1 && !kind) ||
              (step === 2 && (!name || targetNum <= 0))
            }
            className="w-full rounded-xl py-4 text-sm font-semibold transition-all active:scale-95"
            style={{
              background: (
                (step === 1 && !kind) ||
                (step === 2 && (!name || targetNum <= 0))
              ) ? 'var(--bg-card-hi)' : '#1D9E75',
              color: (
                (step === 1 && !kind) ||
                (step === 2 && (!name || targetNum <= 0))
              ) ? 'var(--fg-4)' : '#062A1E',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: (
                (step === 1 && !kind) ||
                (step === 2 && (!name || targetNum <= 0))
              ) ? 'none' : '0 0 24px rgba(29,158,117,0.3)',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Création…' : step === 3 ? 'Créer l\'objectif' : 'Continuer'}
          </button>
        </div>
      </div>
    </div>
  )
}
