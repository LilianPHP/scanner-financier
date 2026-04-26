'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SubHeader } from '@/components/SubHeader'

type Goal = {
  id: string
  kind: string
  name: string
  target: number
  current: number
  months: number
  icon: string
  status: 'active' | 'done' | 'paused'
  deadline?: string
  created_at: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

/** Number of full months between goal creation and now (min 1). */
function getMonthsElapsed(goal: Goal): number {
  const now = new Date()
  const created = new Date(goal.created_at)
  return Math.max(1,
    (now.getFullYear() - created.getFullYear()) * 12 + now.getMonth() - created.getMonth()
  )
}

/** Average monthly contribution since creation. 0 if nothing saved. */
function getMonthlyRhythm(goal: Goal): number {
  return Math.round(goal.current / getMonthsElapsed(goal))
}

/** Months left at the current rhythm. null when we can't extrapolate (no rhythm). */
function getMonthsToReach(goal: Goal): number | null {
  const rhythm = getMonthlyRhythm(goal)
  const remaining = goal.target - goal.current
  if (remaining <= 0) return 0
  if (rhythm <= 0) return null
  return Math.ceil(remaining / rhythm)
}

/** Projected reach date based on current rhythm. null if not extrapolable. */
function getDeadline(goal: Goal): string | null {
  const remaining = goal.target - goal.current
  if (remaining <= 0) return 'Objectif atteint !'
  const monthsLeft = getMonthsToReach(goal)
  if (monthsLeft == null) return null
  const date = new Date()
  date.setMonth(date.getMonth() + monthsLeft)
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

type Sheet = 'adjust' | 'amount' | null

function AdjustRhythmSheet({ goal, onClose, onSaved }: { goal: Goal; onClose: () => void; onSaved: () => void }) {
  const [months, setMonths] = useState(goal.months || 12)
  const [saving, setSaving] = useState(false)
  const remaining = goal.target - goal.current
  const rhythm = months > 0 ? Math.ceil(remaining / months) : 0
  const weeklyRhythm = Math.ceil(rhythm / 4.33)

  async function save() {
    setSaving(true)
    await supabase.from('goals').update({ months }).eq('id', goal.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-t-3xl px-5 pt-4 pb-10 flex flex-col gap-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--track-strong)' }} />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ letterSpacing: '-0.01em' }}>Ajuster le rythme</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', fontFamily: 'inherit' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={() => setMonths(m => Math.max(1, m - 1))}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all active:scale-95"
            style={{ background: 'var(--bg-card-hi)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            −
          </button>
          <div className="text-center">
            <p className="text-5xl font-semibold tabular" style={{ letterSpacing: '-0.03em' }}>{months}</p>
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
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card-hi)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>RYTHME RECOMMANDÉ</p>
          <p className="text-3xl font-semibold" style={{ color: '#1D9E75', letterSpacing: '-0.02em' }}>
            {fmt(rhythm)} € <span className="text-base font-normal" style={{ color: 'var(--fg-3)' }}>/mois</span>
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--fg-2)' }}>
            Soit environ{' '}
            <strong style={{ color: 'var(--fg)' }}>{fmt(weeklyRhythm)} €/semaine</strong>.
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl py-4 text-sm font-semibold transition-all active:scale-95"
          style={{ background: '#1D9E75', color: '#062A1E', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(29,158,117,0.3)' }}
        >
          {saving ? 'Sauvegarde…' : 'Confirmer'}
        </button>
      </div>
    </div>
  )
}

function EditAmountSheet({ goal, onClose, onSaved }: { goal: Goal; onClose: () => void; onSaved: () => void }) {
  const [current, setCurrent] = useState(String(goal.current))
  const [saving, setSaving] = useState(false)
  const [focus, setFocus] = useState(false)

  async function save() {
    const val = parseFloat(current)
    if (isNaN(val)) return
    setSaving(true)
    await supabase.from('goals').update({ current: val, status: val >= goal.target ? 'done' : 'active' }).eq('id', goal.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-t-3xl px-5 pt-4 pb-10 flex flex-col gap-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--track-strong)' }} />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ letterSpacing: '-0.01em' }}>Modifier le montant</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', fontFamily: 'inherit' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>Montant épargné (€)</p>
          <div
            className="flex items-center rounded-xl"
            style={{
              background: 'var(--bg-card-hi)',
              border: `1px solid ${focus ? '#1D9E75' : 'var(--border)'}`,
              boxShadow: focus ? '0 0 0 3px rgba(29,158,117,0.15)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <input
              type="number"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              className="flex-1 bg-transparent border-0 outline-none px-4 py-3.5 text-sm"
              style={{ color: 'var(--fg)', fontFamily: 'inherit' }}
            />
            <span className="pr-4 text-sm" style={{ color: 'var(--fg-3)' }}>€</span>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--fg-3)' }}>
            Objectif : {fmt(goal.target)} € · Reste : {fmt(Math.max(0, goal.target - parseFloat(current || '0')))} €
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl py-4 text-sm font-semibold transition-all active:scale-95"
          style={{ background: '#1D9E75', color: '#062A1E', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(29,158,117,0.3)' }}
        >
          {saving ? 'Sauvegarde…' : 'Mettre à jour'}
        </button>
      </div>
    </div>
  )
}

export default function GoalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [goal, setGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [deleting, setDeleting] = useState(false)
  const [userInit, setUserInit] = useState('J')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      setUserInit((data.session.user.email ?? 'J').charAt(0).toUpperCase())
      loadGoal(id)
    })
  }, [id, router])

  async function loadGoal(goalId: string) {
    setLoading(true)
    const { data } = await supabase.from('goals').select('*').eq('id', goalId).single()
    setGoal(data as Goal)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--track-strong)', borderTopColor: '#1D9E75' }} />
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}>
        <span className="text-4xl mb-4">🎯</span>
        <p className="text-base font-medium mb-2">Objectif introuvable</p>
        <button onClick={() => router.push('/goals')} style={{ color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
          Retour aux objectifs
        </button>
      </div>
    )
  }

  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100))
  const remaining = goal.target - goal.current
  const rhythm = getMonthlyRhythm(goal)
  const monthsToReach = getMonthsToReach(goal)
  const deadline = getDeadline(goal)

  // Milestones at 25/50/75/100
  const MILESTONES = [
    { pct: 25, label: 'Premier quart', amount: Math.round(goal.target * 0.25) },
    { pct: 50, label: 'Mi-parcours', amount: Math.round(goal.target * 0.50) },
    { pct: 75, label: 'Ligne droite', amount: Math.round(goal.target * 0.75) },
    { pct: 100, label: 'Objectif atteint', amount: goal.target },
  ]

  // Progress bar tick positions
  const tickPcts = [25, 50, 75]

  return (
    <>
      <SubHeader title="Objectif" onBack={() => router.push('/goals')} />

      <div className="px-5">
        {/* Hero section */}
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>
          OBJECTIF EN COURS · PROJET CIBLÉ
        </p>
        <h2 className="text-2xl font-semibold mb-4" style={{ letterSpacing: '-0.01em' }}>{goal.name}</h2>

        {/* Amount */}
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-semibold tabular" style={{ fontSize: 48, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {fmt(goal.current)}
          </span>
          <span className="text-xl" style={{ color: 'var(--fg-3)' }}>/ {fmt(goal.target)} €</span>
        </div>

        {/* Pct + deadline */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1"
            style={{ background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: '#1D9E75' }} />
            <span className="text-sm font-semibold" style={{ color: '#1D9E75' }}>{pct} %</span>
          </div>
          {monthsToReach != null && monthsToReach > 0 && deadline && (
            <span className="text-xs" style={{ color: 'var(--fg-3)' }}>
              {monthsToReach} mois pour atteindre · À ce rythme · {deadline}
            </span>
          )}
        </div>

        {/* Progress bar with milestone ticks */}
        <div className="relative h-2.5 rounded-full overflow-visible mb-3" style={{ background: 'var(--track)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: '#1D9E75',
              boxShadow: '0 0 16px rgba(29,158,117,0.5)',
            }}
          />
          {/* Milestone ticks — sit above the fill, blend into the page */}
          {tickPcts.map(tp => (
            <div
              key={tp}
              className="absolute top-0 h-full w-0.5"
              style={{
                left: `${tp}%`,
                background: 'var(--bg-page)',
                zIndex: 2,
              }}
            />
          ))}
        </div>

        {/* Monthly contribution chip */}
        {rhythm > 0 && (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 mb-5"
            style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 15l7-7 7 7"/>
            </svg>
            <span className="text-sm font-semibold" style={{ color: '#1D9E75' }}>+{fmt(rhythm)} €</span>
            <span className="text-xs" style={{ color: 'var(--fg-3)' }}>vers ce goal ce mois-ci</span>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>RYTHME ACTUEL</p>
            <p className="text-xl font-semibold tabular" style={{ color: '#1D9E75', letterSpacing: '-0.02em' }}>
              +{fmt(rhythm)} €
              <span className="text-sm font-normal ml-1" style={{ color: 'var(--fg-3)' }}>/mois</span>
            </p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--fg-3)' }}>
              {(() => {
                const m = getMonthsElapsed(goal)
                return m === 1 ? 'depuis 1 mois' : `depuis ${m} mois`
              })()}
            </p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>RESTE À ÉPARGNER</p>
            <p className="text-xl font-semibold tabular" style={{ letterSpacing: '-0.02em' }}>
              {remaining <= 0 ? '0' : fmt(remaining)} €
            </p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--fg-3)' }}>
              {remaining <= 0
                ? 'Objectif atteint 🎉'
                : deadline
                  ? `Projection · ${deadline}`
                  : 'Pas encore d’historique'}
            </p>
          </div>
        </div>

        {/* Milestones */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-1" style={{ letterSpacing: '-0.01em' }}>Jalons</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--fg-3)' }}>Des paliers pour garder le cap — pas de récompenses criardes.</p>

          <div className="flex flex-col gap-3">
            {MILESTONES.map((m) => {
              const reached = goal.current >= m.amount
              const soon = !reached && goal.current >= m.amount * 0.85

              return (
                <div key={m.pct} className="flex items-center gap-3">
                  {/* Badge */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                    style={{
                      background: reached ? '#1D9E75' : soon ? 'rgba(29,158,117,0.15)' : 'var(--bg-card-hi)',
                      border: `1.5px solid ${reached ? '#1D9E75' : soon ? 'rgba(29,158,117,0.4)' : 'var(--border)'}`,
                      color: reached ? '#062A1E' : soon ? '#1D9E75' : 'var(--fg-3)',
                    }}
                  >
                    {m.pct}
                  </div>
                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: reached ? 'var(--fg)' : 'var(--fg-2)' }}>
                      {m.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
                      {m.pct}% · {fmt(m.amount)} €
                    </p>
                  </div>
                  {/* Status */}
                  {reached && (
                    <span className="text-xs font-medium" style={{ color: '#1D9E75' }}>✓ atteint</span>
                  )}
                  {soon && !reached && (
                    <span className="text-xs font-medium" style={{ color: '#1D9E75' }}>bientôt</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ letterSpacing: '-0.01em' }}>Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSheet('adjust')}
              className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95"
              style={{ background: '#1D9E75', color: '#062A1E', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 16px rgba(29,158,117,0.25)' }}
            >
              Ajuster le rythme
            </button>
            <button
              onClick={() => setSheet('amount')}
              className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95"
              style={{ background: 'var(--bg-card-hi)', color: 'var(--fg)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Modifier le montant
            </button>
            <button
              onClick={() => router.push('/goals/new')}
              className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95"
              style={{ background: 'var(--bg-card-hi)', color: 'var(--fg)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Nouvel objectif
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Supprimer "${goal.name}" ?\n\nCette action est définitive.`)) return
                setDeleting(true)
                const { error: dbErr } = await supabase.from('goals').delete().eq('id', goal.id)
                setDeleting(false)
                if (dbErr) {
                  alert('Erreur lors de la suppression. Réessaie.')
                  return
                }
                router.push('/goals')
              }}
              disabled={deleting}
              className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ml-auto"
              style={{
                background: 'transparent',
                color: '#F87171',
                border: '1px solid rgba(248,113,113,0.25)',
                cursor: deleting ? 'default' : 'pointer',
                fontFamily: 'inherit',
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>

      {/* Sheets */}
      {sheet === 'adjust' && (
        <AdjustRhythmSheet
          goal={goal}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); loadGoal(id) }}
        />
      )}
      {sheet === 'amount' && (
        <EditAmountSheet
          goal={goal}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); loadGoal(id) }}
        />
      )}

      <div className="h-8" />
    </>
  )
}
