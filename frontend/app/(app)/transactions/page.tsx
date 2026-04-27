'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TabHeader } from '@/components/TabHeader'
import { CATEGORY_LABELS, updateCategory } from '@/lib/api'
import { useCategoryColors } from '@/lib/theme'
import { track } from '@/lib/analytics'

type Transaction = {
  id?: string
  date: string
  // The Powens-side analysis stores the merchant in `label_clean` (preferred).
  // Legacy data may have `description`. Either is shown via getLabel().
  label_clean?: string
  label_raw?: string
  description?: string
  amount: number
  category: string
}

function getLabel(t: Transaction): string {
  return t.label_clean || t.description || t.label_raw || ''
}

const CAT_ICONS: Record<string, string> = {
  alimentation: '🛒', logement: '🏠', transport: '🚊', loisirs: '🍷',
  abonnements: '📱', salaire: '💰', 'frais bancaires': '🏦', sante: '❤️',
  investissement: '📈', epargne: '🏦', impots: '🏛️', education: '📚',
  voyage: '✈️', vetements: '🛍️', autres: '📦',
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
  const colors = useCategoryColors()
  const color = colors[cat] ?? '#6B7280'
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
  abonnements: 'Abos',
}

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tout')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [pickerTx, setPickerTx] = useState<Transaction | null>(null)
  const [propagate, setPropagate] = useState(true)
  const [toast, setToast] = useState('')
  const [updating, setUpdating] = useState(false)
  const categoryColors = useCategoryColors()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
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

  // Reset category filter when the selected month no longer contains it
  useEffect(() => {
    if (filter !== 'Tout' && !categories.includes(filter)) setFilter('Tout')
  }, [categories, filter])

  const filtered = useMemo(() => {
    let list = [...monthTransactions]
    if (filter !== 'Tout') list = list.filter(t => t.category === filter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => getLabel(t).toLowerCase().includes(q))
    }
    return list
  }, [monthTransactions, filter, search])

  // Month navigation
  const monthIdx = months.indexOf(selectedMonth)
  const prevMonth = monthIdx >= 0 && monthIdx < months.length - 1 ? months[monthIdx + 1] : null
  const nextMonth = monthIdx > 0 ? months[monthIdx - 1] : null

  async function handleCategoryChange(tx: Transaction, newCategory: string) {
    if (!tx.id || newCategory === tx.category) { setPickerTx(null); return }
    setUpdating(true)
    try {
      const res = await updateCategory(tx.id, newCategory, propagate)
      track('Transaction Reclassified', {
        from: tx.category,
        to: newCategory,
        propagated: propagate,
        affected: res.total_updated ?? 1,
      })
      // Mirror backend's strict equality on label_clean (api/transactions.py)
      setTransactions(prev => {
        const next = prev.map(t => {
          if (t.id === tx.id) return { ...t, category: newCategory }
          if (propagate && tx.label_clean && t.label_clean === tx.label_clean) {
            return { ...t, category: newCategory }
          }
          return t
        })
        try {
          const raw = sessionStorage.getItem('analysis')
          if (raw) {
            const parsed = JSON.parse(raw)
            parsed.transactions = next
            sessionStorage.setItem('analysis', JSON.stringify(parsed))
          }
        } catch {}
        return next
      })
      const n = res.total_updated ?? 1
      setToast(`${n} transaction${n > 1 ? 's' : ''} reclassée${n > 1 ? 's' : ''}`)
      setTimeout(() => setToast(''), 2500)
    } catch {
      setToast('Erreur — réessaie')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setUpdating(false)
      setPickerTx(null)
    }
  }

  return (
    <>
      <TabHeader eyebrow="Mouvement" title="Transactions" />

      {/* Month selector */}
      {months.length > 0 && (
        <div className="px-5 lg:px-8 mb-4">
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
      <div className="grid grid-cols-2 gap-3 px-5 lg:px-8 mb-4">
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
      <div className="px-5 lg:px-8 mb-3">
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
            <button onClick={() => setSearch('')} aria-label="Effacer la recherche" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Tx count for selected month */}
      {selectedMonth && monthTransactions.length > 0 && (
        <p className="px-5 lg:px-8 text-[11px] font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>
          {monthTransactions.length} transaction{monthTransactions.length > 1 ? 's' : ''} · {monthLabel(selectedMonth)}
        </p>
      )}

      {/* Chips */}
      <div className="px-5 lg:px-8 flex gap-2 overflow-x-auto pb-2 mb-1" style={{ scrollbarWidth: 'none' }}>
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
              {cat === 'Tout' ? 'Tout' : (CHIP_LABELS[cat] ?? CATEGORY_LABELS[cat] ?? cat)}
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
          className="mx-5 lg:mx-8 rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {filtered.map((tx, i) => (
            <button
              key={tx.id ?? `${tx.date}-${getLabel(tx)}-${tx.amount}-${i}`}
              onClick={() => tx.id && setPickerTx(tx)}
              disabled={!tx.id}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
              style={{
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                background: 'none',
                cursor: tx.id ? 'pointer' : 'default',
                fontFamily: 'inherit',
                color: 'var(--fg)',
              }}
            >
              <CatIcon cat={tx.category} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{getLabel(tx)}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{CATEGORY_LABELS[tx.category] ?? tx.category}</p>
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
            </button>
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

      {/* Toast */}
      {toast && (
        <div
          className="fixed left-1/2 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium pointer-events-none"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0) + 90px)',
            transform: 'translateX(-50%)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--fg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Category picker — bottom sheet (mobile) / centered modal (desktop) */}
      {pickerTx && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => !updating && setPickerTx(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full lg:max-w-lg lg:m-4 rounded-t-3xl lg:rounded-3xl p-5"
            style={{
              background: 'var(--bg-page)',
              border: '1px solid var(--border)',
              maxHeight: '85vh',
              overflowY: 'auto',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 20px)',
            }}
          >
            <div className="flex items-start justify-between mb-1 gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-3)' }}>Reclasser</p>
                <h3 className="text-base font-semibold mt-1 truncate" style={{ letterSpacing: '-0.01em' }}>
                  {getLabel(pickerTx)}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
                  Actuellement : {CATEGORY_LABELS[pickerTx.category] ?? pickerTx.category}
                </p>
              </div>
              <button
                onClick={() => setPickerTx(null)}
                disabled={updating}
                className="px-2 py-1 rounded-lg"
                style={{ color: 'var(--fg-3)', background: 'none', border: 'none', cursor: updating ? 'default' : 'pointer' }}
                aria-label="Fermer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const isCurrent = key === pickerTx.category
                const color = categoryColors[key] ?? '#6B7280'
                const icon = CAT_ICONS[key] ?? '📦'
                return (
                  <button
                    key={key}
                    onClick={() => handleCategoryChange(pickerTx, key)}
                    disabled={updating}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all active:scale-95"
                    style={{
                      background: isCurrent ? color + '20' : 'var(--bg-card)',
                      border: `1px solid ${isCurrent ? color + '60' : 'var(--border)'}`,
                      cursor: updating ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      color: 'var(--fg)',
                      opacity: updating ? 0.6 : 1,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span className="text-sm font-medium truncate flex-1">{label}</span>
                    {isCurrent && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>

            <label
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              <span className="text-sm" style={{ color: 'var(--fg-2)' }}>
                Appliquer aux libellés similaires
              </span>
              <input
                type="checkbox"
                checked={propagate}
                onChange={e => setPropagate(e.target.checked)}
                disabled={updating}
                style={{ width: 18, height: 18, accentColor: '#1D9E75', cursor: updating ? 'default' : 'pointer' }}
              />
            </label>
          </div>
        </div>
      )}
    </>
  )
}
