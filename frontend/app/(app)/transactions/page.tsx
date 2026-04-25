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

// Returns YYYY-MM
function monthKey(d: string): string {
  return (d || '').slice(0, 7)
}

// Returns "Avr 2026"
function monthLabel(key: string): string {
  if (!key || key.length < 7) return key
  const [y, m] = key.split('-')
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  return `${months[parseInt(m) - 1] ?? m} ${y}`
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
  const [selectedMonth, setSelectedMonth] = useState<string>('')
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

  // Available months (most recent first)
  const months = useMemo(() => {
    const set = new Set(transactions.map(t => monthKey(t.date)).filter(Boolean))
    return Array.from(set).sort().reverse()
  }, [transactions])

  // Default to most recent month
  useEffect(() => {
    if (!selectedMonth && months.length > 0) setSelectedMonth(months[0])
  }, [months, selectedMonth])

  // Transactions for the selected month
  const monthTransactions = useMemo(() => {
    if (!selectedMonth) return transactions
    return transactions.filter(t => monthKey(t.date) === selectedMonth)
  }, [transactions, selectedMonth])

  const entrees = monthTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const sorties = monthTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  const categories = useMemo(() => {
    const set = new Set(monthTransactions.map(t => t.category).filter(Boolean))
    return ['Tout', ...Array.from(set)]
  }, [monthTransactions])

  const filtered = useMemo(() => {
    let list = [...monthTransactions]
    if (filter !== 'Tout') list = list.filter(t => t.category === filter)
    if (search) list = list.filter(t => t.description.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [monthTransactions, filter, search])

  // Month navigation
  const monthIdx = months.indexOf(selectedMonth)
  const prevMonth = monthIdx >= 0 && monthIdx < months.length - 1 ? months[monthIdx + 1] : null
  const nextMonth = monthIdx > 0 ? months[monthIdx - 1] : null

  return (
    <>
      <TabHeader eyebrow="Mouvement" title="Transactions" />

      {/* Month selector */}
      {months.length > 0 && (
        <div className="px-5 mb-4">
          <div
            className="flex items-center justify-between rounded-2xl px-2 py-2"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <button
              onClick={() => prevMonth && setSelectedMonth(prevMonth)}
              disabled={!prevMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{
                background: 'none',
                border: 'none',
                cursor: prevMonth ? 'pointer' : 'default',
                color: prevMonth ? 'var(--fg-2)' : 'var(--fg-4)',
                opacity: prevMonth ? 1 : 0.4,
              }}
              aria-label="Mois précédent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-3)' }}>
                Mois sélectionné
              </span>
              <span className="text-sm font-semibold mt-0.5" style={{ letterSpacing: '-0.01em' }}>
                {monthLabel(selectedMonth)}
              </span>
            </div>
            <button
              onClick={() => nextMonth && setSelectedMonth(nextMonth)}
              disabled={!nextMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{
                background: 'none',
                border: 'none',
                cursor: nextMonth ? 'pointer' : 'default',
                color: nextMonth ? 'var(--fg-2)' : 'var(--fg-4)',
                opacity: nextMonth ? 1 : 0.4,
              }}
              aria-label="Mois suivant"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
          {months.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pt-2.5 pb-1" style={{ scrollbarWidth: 'none' }}>
              {months.map(m => {
                const active = m === selectedMonth
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className="flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all"
                    style={{
                      background: active ? 'rgba(29,158,117,0.15)' : 'transparent',
                      color: active ? '#1D9E75' : 'var(--fg-3)',
                      border: active ? '1px solid rgba(29,158,117,0.3)' : '1px solid var(--border)',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {monthLabel(m)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Tx count for selected month */}
      {selectedMonth && monthTransactions.length > 0 && (
        <p className="px-5 text-[11px] font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>
          {monthTransactions.length} transaction{monthTransactions.length > 1 ? 's' : ''} · {monthLabel(selectedMonth)}
        </p>
      )}

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
              <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
                {search
                  ? `Aucun résultat pour "${search}"`
                  : `Aucune transaction pour ${monthLabel(selectedMonth)}`}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="h-8" />
    </>
  )
}
