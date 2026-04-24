'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

const KIND_OPTIONS = [
  { value: 'voyage', label: 'Voyage', icon: '✈️' },
  { value: 'urgence', label: 'Fonds d\'urgence', icon: '🛡️' },
  { value: 'investissement', label: 'Investissement', icon: '📈' },
  { value: 'achat', label: 'Achat', icon: '🛍️' },
  { value: 'immo', label: 'Immobilier', icon: '🏡' },
  { value: 'autre', label: 'Autre', icon: '✨' },
]

function formatAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

function GoalCard({ goal, onTap }: { goal: Goal; onTap: () => void }) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100))
  const remaining = goal.target - goal.current
  const monthlyNeed = goal.months > 0 ? Math.ceil(remaining / goal.months) : 0

  return (
    <button
      onClick={onTap}
      className="w-full text-left rounded-2xl p-5 transition-all active:scale-[0.98]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{goal.icon}</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{goal.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
              {KIND_OPTIONS.find(k => k.value === goal.kind)?.label ?? goal.kind}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular" style={{ color: 'var(--fg)' }}>
            {formatAmount(goal.current)} €
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
            / {formatAmount(goal.target)} €
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? '#1D9E75' : 'linear-gradient(90deg, #1D9E75, #28c48f)',
            boxShadow: pct > 0 ? '0 0 12px rgba(29,158,117,0.4)' : 'none',
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: '#1D9E75' }}>{pct}%</span>
        {pct < 100 && monthlyNeed > 0 && (
          <span className="text-xs" style={{ color: 'var(--fg-3)' }}>
            ~{formatAmount(monthlyNeed)} €/mois · {goal.months} mois restants
          </span>
        )}
        {pct >= 100 && (
          <span className="text-xs font-medium" style={{ color: '#1D9E75' }}>Objectif atteint 🎉</span>
        )}
      </div>
    </button>
  )
}

type FormState = {
  kind: string
  name: string
  icon: string
  target: string
  current: string
  months: string
}

function CreateGoalSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<FormState>({
    kind: 'autre', name: '', icon: '✨', target: '', current: '0', months: '12',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function pickKind(value: string) {
    const opt = KIND_OPTIONS.find(k => k.value === value)
    setForm(f => ({ ...f, kind: value, icon: opt?.icon ?? '✨', name: f.name || (opt?.label ?? '') }))
  }

  async function handleSubmit() {
    if (!form.name || !form.target) { setError('Remplis tous les champs requis.'); return }
    const target = parseFloat(form.target)
    const current = parseFloat(form.current || '0')
    const months = parseInt(form.months || '12')
    if (isNaN(target) || target <= 0) { setError('Montant objectif invalide.'); return }
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non authentifié')
      const { error: dbError } = await supabase.from('goals').insert({
        user_id: session.user.id,
        kind: form.kind,
        name: form.name,
        icon: form.icon,
        target,
        current,
        months,
        status: 'active',
      })
      if (dbError) throw dbError
      onCreated()
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div
        className="rounded-t-3xl px-5 pt-5 pb-10 flex flex-col gap-4 max-h-[88dvh] overflow-y-auto"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-1" style={{ background: 'rgba(255,255,255,0.15)' }} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ letterSpacing: '-0.01em' }}>Nouvel objectif</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', fontFamily: 'inherit' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Kind picker */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>Type</p>
          <div className="grid grid-cols-3 gap-2">
            {KIND_OPTIONS.map(k => (
              <button
                key={k.value}
                onClick={() => pickKind(k.value)}
                className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all active:scale-95"
                style={{
                  background: form.kind === k.value ? 'rgba(29,158,117,0.15)' : 'var(--bg-card-hi)',
                  border: form.kind === k.value ? '1px solid rgba(29,158,117,0.4)' : '1px solid var(--border)',
                  color: form.kind === k.value ? '#1D9E75' : 'var(--fg-2)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span className="text-xl">{k.icon}</span>
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <InputField label="Nom" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Ex : Voyage Japon" />

        {/* Target & Current */}
        <div className="flex gap-3">
          <div className="flex-1">
            <InputField label="Objectif (€)" value={form.target} onChange={v => setForm(f => ({ ...f, target: v }))} placeholder="5 000" type="number" />
          </div>
          <div className="flex-1">
            <InputField label="Déjà épargné (€)" value={form.current} onChange={v => setForm(f => ({ ...f, current: v }))} placeholder="0" type="number" />
          </div>
        </div>

        {/* Months */}
        <InputField label="Durée (mois)" value={form.months} onChange={v => setForm(f => ({ ...f, months: v }))} placeholder="12" type="number" />

        {error && (
          <p className="text-sm rounded-xl px-4 py-3" style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl py-4 text-sm font-semibold transition-all active:scale-95 mt-1"
          style={{
            background: '#1D9E75', color: '#062A1E', border: 'none',
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 0 24px rgba(29,158,117,0.3)',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Création…' : 'Créer l\'objectif'}
        </button>
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  const [focus, setFocus] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-3)' }}>{label}</span>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        className="rounded-xl px-4 py-3 text-sm bg-transparent outline-none"
        style={{
          background: 'var(--bg-card-hi)',
          border: `1px solid ${focus ? '#1D9E75' : 'var(--border)'}`,
          boxShadow: focus ? '0 0 0 3px rgba(29,158,117,0.15)' : 'none',
          color: 'var(--fg)',
          fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}
      />
    </div>
  )
}

function EditGoalSheet({ goal, onClose, onSaved, onDeleted }: {
  goal: Goal; onClose: () => void; onSaved: () => void; onDeleted: () => void
}) {
  const [current, setCurrent] = useState(String(goal.current))
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleUpdate() {
    setLoading(true)
    const val = parseFloat(current)
    if (isNaN(val)) { setLoading(false); return }
    await supabase.from('goals').update({ current: val, status: val >= goal.target ? 'done' : 'active' }).eq('id', goal.id)
    setLoading(false)
    onSaved()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('goals').delete().eq('id', goal.id)
    setDeleting(false)
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div
        className="rounded-t-3xl px-5 pt-5 pb-10 flex flex-col gap-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{goal.icon}</span>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: '-0.01em' }}>{goal.name}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', fontFamily: 'inherit' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <InputField label="Montant épargné (€)" value={current} onChange={setCurrent} placeholder="0" type="number" />

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="w-full rounded-xl py-4 text-sm font-semibold transition-all active:scale-95"
          style={{ background: '#1D9E75', color: '#062A1E', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(29,158,117,0.3)' }}
        >
          {loading ? 'Sauvegarde…' : 'Mettre à jour'}
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full rounded-xl py-3 text-sm font-medium transition-all"
          style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {deleting ? 'Suppression…' : 'Supprimer l\'objectif'}
        </button>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      loadGoals()
    })
  }, [router])

  async function loadGoals() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setGoals((data as Goal[]) || [])
    setLoading(false)
  }

  const active = goals.filter(g => g.status !== 'done')
  const done = goals.filter(g => g.status === 'done')

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#1D9E75' }}>
            Épargne
          </p>
          <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
            Objectifs
          </h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all active:scale-95"
          style={{ background: '#1D9E75', color: '#062A1E', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 16px rgba(29,158,117,0.3)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nouveau
        </button>
      </div>

      <div className="px-5 max-w-sm mx-auto w-full mt-4">

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map(i => (
              <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div
            className="rounded-2xl px-5 py-10 flex flex-col items-center text-center mt-8"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <span className="text-4xl mb-4">🎯</span>
            <p className="text-sm font-medium mb-2">Aucun objectif</p>
            <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--fg-3)' }}>
              Fixe un cap — voyage, épargne de sécurité, projet immo. La barre avance à chaque mise de côté.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-xl px-5 py-3 text-sm font-medium transition-all active:scale-95"
              style={{ background: '#1D9E75', color: '#062A1E', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Créer mon premier objectif
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="flex flex-col gap-3">
                {active.map(g => (
                  <GoalCard key={g.id} goal={g} onTap={() => setEditing(g)} />
                ))}
              </div>
            )}

            {done.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-3)' }}>
                  Complétés
                </p>
                <div className="flex flex-col gap-3">
                  {done.map(g => (
                    <GoalCard key={g.id} goal={g} onTap={() => setEditing(g)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="h-8" />
      </div>

      {showCreate && (
        <CreateGoalSheet
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadGoals() }}
        />
      )}

      {editing && (
        <EditGoalSheet
          goal={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadGoals() }}
          onDeleted={() => { setEditing(null); loadGoals() }}
        />
      )}
    </div>
  )
}
