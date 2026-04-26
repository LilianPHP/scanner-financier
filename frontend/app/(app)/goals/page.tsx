'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TabHeader } from '@/components/TabHeader'

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

const KIND_LABELS: Record<string, string> = {
  urgence: 'Épargne de sécurité',
  voyage: 'Voyage',
  achat: 'Achat',
  investissement: 'Investissement',
  autre: 'Autre',
}

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1)
}

function fmt(n: number) {
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
              {kindLabel(goal.kind)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular" style={{ color: 'var(--fg)' }}>
            {fmt(goal.current)} €
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
            / {fmt(goal.target)} €
          </p>
        </div>
      </div>

      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--track)' }}>
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
            ~{fmt(monthlyNeed)} €/mois · {goal.months} mois restants
          </span>
        )}
        {pct >= 100 && (
          <span className="text-xs font-medium" style={{ color: '#1D9E75' }}>Objectif atteint 🎉</span>
        )}
      </div>
    </button>
  )
}

export default function GoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

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
    <>
      <TabHeader
        eyebrow="Épargne"
        title="Objectifs"
        action={
          <button
            onClick={() => router.push('/goals/new')}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all active:scale-95"
            style={{ background: '#1D9E75', color: '#062A1E', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 16px rgba(29,158,117,0.3)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nouveau
          </button>
        }
      />

      <div className="px-5 lg:px-8 mt-2">

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
              onClick={() => router.push('/goals/new')}
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
                  <GoalCard key={g.id} goal={g} onTap={() => router.push(`/goals/${g.id}`)} />
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
                    <GoalCard key={g.id} goal={g} onTap={() => router.push(`/goals/${g.id}`)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="h-8" />
      </div>
    </>
  )
}
