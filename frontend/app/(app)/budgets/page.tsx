'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TabHeader } from '@/components/TabHeader'

type CategoryBudget = {
  category: string
  spent: number
  budget: number
}

const CAT_COLORS: Record<string, string> = {
  Logement: '#3B82F6',
  Courses: '#1D9E75',
  Abonnements: '#06B6D4',
  Transport: '#F59E0B',
  Shopping: '#8B5CF6',
  Sorties: '#EC4899',
  Santé: '#F87171',
  Revenus: '#22C55E',
  Salaire: '#22C55E',
  Autre: '#6B7280',
}

const CAT_ICONS: Record<string, string> = {
  Logement: '🏠',
  Courses: '🛒',
  Abonnements: '📱',
  Transport: '🚊',
  Shopping: '🛍️',
  Sorties: '🍷',
  Santé: '❤️',
  Revenus: '💰',
  Salaire: '💰',
  Autre: '📦',
}

// Suggested multipliers per category (budget = spent * multiplier)
const CAT_BUDGET_FACTOR: Record<string, number> = {
  Logement: 1.0,
  Courses: 1.1,
  Abonnements: 1.1,
  Transport: 1.0,
  Shopping: 0.9,
  Sorties: 0.95,
  Santé: 4.0,
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

function getMonthLabel() {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
}

export default function BudgetsPage() {
  const router = useRouter()
  const [budgets, setBudgets] = useState<CategoryBudget[]>([])
  const [userInit, setUserInit] = useState('J')
  const [totalSpent, setTotalSpent] = useState(0)
  const [totalBudget, setTotalBudget] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      setUserInit((data.session.user.email ?? 'J').charAt(0).toUpperCase())
    })
    try {
      const raw = sessionStorage.getItem('analysis')
      if (raw) {
        const parsed = JSON.parse(raw)
        const byCategory: Array<{ category: string; total: number }> = parsed.by_category ?? []
        const expenses = byCategory.filter((c) => {
          const cat = c.category
          return cat !== 'Revenus' && cat !== 'Salaire' && c.total > 0
        })
        const items: CategoryBudget[] = expenses.map(c => {
          const factor = CAT_BUDGET_FACTOR[c.category] ?? 1.15
          return {
            category: c.category,
            spent: Math.round(c.total),
            budget: Math.round(c.total * factor),
          }
        })
        // Sort: over budget first, then by spent amount
        items.sort((a, b) => {
          const aOver = a.spent > a.budget
          const bOver = b.spent > b.budget
          if (aOver && !bOver) return -1
          if (!aOver && bOver) return 1
          return b.spent - a.spent
        })
        setBudgets(items)
        setTotalSpent(items.reduce((s, c) => s + c.spent, 0))
        setTotalBudget(items.reduce((s, c) => s + c.budget, 0))
      }
    } catch {}
  }, [router])

  const pctTotal = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0
  const remaining = totalBudget - totalSpent

  return (
    <>
      <TabHeader eyebrow="Ce mois-ci" title="Budgets" />

      <div className="px-5 lg:px-8">
        {budgets.length === 0 ? (
          /* Empty state */
          <div
            className="rounded-2xl px-5 py-12 flex flex-col items-center text-center mt-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <span className="text-4xl mb-4">📊</span>
            <p className="text-sm font-medium mb-2">Aucune donnée</p>
            <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--fg-3)' }}>
              Connecte ta banque depuis la page Comptes pour voir tes enveloppes budget.
            </p>
          </div>
        ) : (
          <>
            {/* Monthly hero card */}
            <div
              className="rounded-2xl p-5 mb-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-3)' }}>
                {getMonthLabel()} · {pctTotal}% UTILISÉ
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-semibold tabular" style={{ letterSpacing: '-0.03em' }}>
                  {fmt(totalSpent)}
                </span>
                <span className="text-lg" style={{ color: 'var(--fg-3)' }}>/ {fmt(totalBudget)} €</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--track)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pctTotal}%`,
                    background: pctTotal > 100 ? '#F87171' : pctTotal > 85 ? '#F59E0B' : '#1D9E75',
                    boxShadow: `0 0 12px ${pctTotal > 100 ? 'rgba(248,113,113,0.4)' : 'rgba(29,158,117,0.4)'}`,
                  }}
                />
              </div>
              {remaining >= 0 ? (
                <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
                  Reste{' '}
                  <span style={{ color: '#1D9E75', fontWeight: 600 }}>{fmt(remaining)} €</span>
                  {' '}pour finir le mois.
                </p>
              ) : (
                <p className="text-sm" style={{ color: '#F87171' }}>
                  Dépassement de <span style={{ fontWeight: 600 }}>{fmt(-remaining)} €</span> ce mois-ci.
                </p>
              )}
            </div>

            {/* Categories */}
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-3)' }}>
              PAR CATÉGORIE
            </p>

            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              {budgets.map((item, i) => {
                const pct = Math.min(110, Math.round((item.spent / item.budget) * 100))
                const over = item.spent > item.budget
                const excess = item.spent - item.budget
                const color = over ? '#F87171' : (CAT_COLORS[item.category] ?? '#1D9E75')
                const icon = CAT_ICONS[item.category] ?? '📦'

                return (
                  <div
                    key={item.category}
                    className="px-4 py-4"
                    style={{ borderBottom: i < budgets.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-xl text-base"
                        style={{ width: 36, height: 36, background: color + '20', border: `1px solid ${color}30` }}
                      >
                        <span style={{ fontSize: 16 }}>{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{item.category}</p>
                          <p className="text-sm font-semibold tabular flex-shrink-0" style={{ color: 'var(--fg)' }}>
                            {fmt(item.spent)} €
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs" style={{ color: over ? '#F87171' : 'var(--fg-3)' }}>
                            {pct}% utilisé
                            {over && (
                              <span style={{ color: '#F87171' }}> · +{fmt(excess)} €</span>
                            )}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--fg-3)' }}>/ {fmt(item.budget)} €</p>
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--track)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background: color,
                          boxShadow: `0 0 8px ${color}66`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* CTA */}
            <button
              className="w-full rounded-2xl py-4 text-sm font-medium mt-4 transition-all active:scale-[0.98]"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--fg-2)',
                border: '1px solid var(--border)',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              + Créer une enveloppe
            </button>
          </>
        )}
      </div>

      <div className="h-8" />
    </>
  )
}
