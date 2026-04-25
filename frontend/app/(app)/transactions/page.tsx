'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TabHeader } from '@/components/TabHeader'

type Transaction = {
  date: string
  description: string
  amount: number
  category: string
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

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.abs(n))
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  } catch { return d }
}

function CatIcon({ cat }: { cat: string }) {
  const color = CAT_COLORS[cat] ?? '#6B7280'
  const icon = CAT_ICONS[cat] ?? '📦'
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-xl text-base"
      style={{ width: 38, height: 38, background: color + '20', border: `1px solid ${color}30` }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
    </div>
  )
}

const CHIP_LABELS: Record<string, string> = {
  Abonnements: 'Abos',
}

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tout')
  const [userInit, setUserInit] = useState('J')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      setUserInit((data.session.user.email ?? 'J').charAt(0).toUpperCase())
    })
    try {
      const raw = sessionStorage.getItem('analysis')
      if (raw) {
        const parsed = JSON.parse(raw)
        setTransactions(parsed.transactions ?? [])
      }
    } catch {}
  }, [router])

  const entrees = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const sorties = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  const categories = useMemo(() => {
    const set = new Set(transactions.map(t => t.category).filter(Boolean))
    return ['Tout', ...Array.from(set)]
  }, [transactions])

  const filtered = useMemo(() => {
    let list = [...transactions]
    if (filter !== 'Tout') list = list.filter(t => t.category === filter)
    if (search) list = list.filter(t => t.description.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [transactions, filter, search])

  return (
    <>
      <TabHeader eyebrow="Mouvement" title="Transactions" />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 px-5 mb-4">
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>ENTRÉES</p>
          <p className="text-2xl font-semibold tabular" style={{ color: '#1D9E75', letterSpacing: '-0.02em' }}>
            +{fmt(entrees)} €
          </p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>SORTIES</p>
          <p className="text-2xl font-semibold tabular" style={{ color: '#F87171', letterSpacing: '-0.02em' }}>
            −{fmt(sorties)} €
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mb-3">
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg-3)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un marchand..."
            className="flex-1 bg-transparent border-0 outline-none text-sm"
            style={{ color: 'var(--fg)', fontFamily: 'inherit' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Chips */}
      <div className="px-5 flex gap-2 overflow-x-auto pb-2 mb-1" style={{ scrollbarWidth: 'none' }}>
        {categories.map(cat => {
          const active = filter === cat
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
              style={{
                background: active ? '#1D9E75' : 'var(--bg-card)',
                color: active ? '#062A1E' : 'var(--fg-2)',
                border: active ? 'none' : '1px solid var(--border)',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {CHIP_LABELS[cat] ?? cat}
            </button>
          )
        })}
      </div>

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <span className="text-4xl mb-4">📊</span>
          <p className="text-sm font-medium mb-2">Aucune transaction</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-3)' }}>
            Connecte ta banque depuis la page Comptes pour voir tes transactions ici.
          </p>
        </div>
      ) : (
        <div
          className="mx-5 rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {filtered.map((tx, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <CatIcon cat={tx.category} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{tx.description}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{tx.category}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className="text-sm font-semibold tabular"
                  style={{ color: tx.amount > 0 ? '#1D9E75' : 'var(--fg)' }}
                >
                  {tx.amount > 0 ? '+' : '−'}{fmt(tx.amount)} €
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{formatDate(tx.date)}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--fg-3)' }}>Aucun résultat pour "{search}"</p>
            </div>
          )}
        </div>
      )}

      <div className="h-8" />
    </>
  )
}
