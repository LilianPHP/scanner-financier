'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  formatCurrency, updateCategory, saveRule,
  CATEGORY_LABELS, CATEGORY_COLORS,
  type UploadResult, type Transaction, type Subscription, type ScoreResult,
} from '@/lib/api'
import { exportXLSX } from '@/lib/exportXLSX'

const CATEGORY_ICONS: Record<string, string> = {
  alimentation: '🛒',
  logement: '🏠',
  transport: '🚗',
  loisirs: '🎬',
  abonnements: '📱',
  salaire: '💶',
  'frais bancaires': '🏦',
  sante: '❤️',
  investissement: '📈',
  epargne: '🏦',
  impots: '🏛️',
  autres: '📦',
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<UploadResult | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [showAllTx, setShowAllTx] = useState(false)
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [savingsConfirmed, setSavingsConfirmed] = useState(false)
  const [propagatePrompt, setPropagatePrompt] = useState<{
    label: string
    category: string
    ids: string[]
  } | null>(null)
  const [memorizePrompt, setMemorizePrompt] = useState<{
    label: string
    category: string
  } | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('analysis')
    if (!raw) { router.push('/upload'); return }
    const parsed: UploadResult = JSON.parse(raw)
    setData(parsed)
    setTransactions(parsed.transactions)
  }, [router])

  const SAVINGS_CATS = useMemo(() => new Set(['epargne', 'investissement']), [])

  function handleExport() {
    if (!data) return
    exportXLSX({
      filename: data.filename || 'export',
      transactions,
      liveStats,
      pieData,
      liveTimeline,
      liveSubscriptions,
      CATEGORY_LABELS,
    })
  }

  // Total épargne + investissement détectés (débits)
  const savingsTotal = useMemo(() =>
    transactions
      .filter(tx => tx.amount < 0 && SAVINGS_CATS.has(tx.category))
      .reduce((s, tx) => s + Math.abs(tx.amount), 0)
  , [transactions, SAVINGS_CATS])

  // Pie chart — exclut épargne/investissement si confirmé
  const pieData = useMemo(() => {
    const catTotals: Record<string, number> = {}
    transactions
      .filter(tx => tx.amount < 0 && (!savingsConfirmed || !SAVINGS_CATS.has(tx.category)))
      .forEach(tx => {
        catTotals[tx.category] = (catTotals[tx.category] || 0) + Math.abs(tx.amount)
      })
    return Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, value]) => ({
        name: CATEGORY_LABELS[category] || category,
        category,
        value,
        color: CATEGORY_COLORS[category] || '#9E9E9E',
      }))
  }, [transactions, savingsConfirmed, SAVINGS_CATS])

  // KPIs — exclut épargne/investissement si confirmé
  const liveStats = useMemo(() => {
    const income = transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
    const expense = transactions
      .filter(tx => tx.amount < 0 && (!savingsConfirmed || !SAVINGS_CATS.has(tx.category)))
      .reduce((s, tx) => s + Math.abs(tx.amount), 0)
    const cashflow = income - expense
    const savingsRate = income > 0 ? cashflow / income * 100 : 0
    return { income, expense, cashflow, savingsRate }
  }, [transactions, savingsConfirmed, SAVINGS_CATS])

  // Insights automatiques
  const insights = useMemo(() => {
    const totalDep = liveStats.expense
    const nbMonths = Math.max(1, new Set(transactions.map(tx => tx.date.slice(0, 7))).size)
    const aboTotal = transactions.filter(tx => tx.amount < 0 && tx.category === 'abonnements').reduce((s, tx) => s + Math.abs(tx.amount), 0)
    const loisirTotal = transactions.filter(tx => tx.amount < 0 && tx.category === 'loisirs').reduce((s, tx) => s + Math.abs(tx.amount), 0)
    const aliTotal = transactions.filter(tx => tx.amount < 0 && tx.category === 'alimentation').reduce((s, tx) => s + Math.abs(tx.amount), 0)
    // Exclut épargne/investissement du top dépense (même si non confirmé, car trompeur)
    const topCat = pieData.find(d => !SAVINGS_CATS.has(d.category)) || pieData[0]
    const result = []

    if (topCat) result.push({
      icon: CATEGORY_ICONS[topCat.category] || '📦',
      text: `Ta plus grosse dépense : <strong>${topCat.name}</strong>`,
      sub: `${formatCurrency(topCat.value)} — ${Math.round(topCat.value / totalDep * 100)}% des dépenses`,
    })
    if (aboTotal > 0) result.push({
      icon: '📱',
      text: `Abonnements : <strong>${formatCurrency(aboTotal / nbMonths)}/mois</strong>`,
      sub: `${formatCurrency(aboTotal)} sur la période · ${formatCurrency(aboTotal / nbMonths * 12)}/an`,
    })
    if (loisirTotal > 0 && totalDep > 0) result.push({
      icon: '🍽️',
      text: `Tu dépenses <strong>${Math.round(loisirTotal / totalDep * 100)}%</strong> de ton budget en loisirs`,
      sub: `${formatCurrency(loisirTotal)} au total`,
    })
    if (aliTotal > 0 && totalDep > 0) result.push({
      icon: '🛒',
      text: `Alimentation : <strong>${formatCurrency(aliTotal / nbMonths)}/mois</strong>`,
      sub: `${Math.round(aliTotal / totalDep * 100)}% de ton budget total`,
    })
    if (liveStats.cashflow >= 0) result.push({
      icon: '💰',
      text: `Tu as dépensé moins que tu n'as gagné : <strong>+${formatCurrency(liveStats.cashflow)}</strong>`,
      sub: `Soit ${Math.round(liveStats.savingsRate)}% de tes revenus mis de côté.`,
    })
    else result.push({
      icon: '⚠️',
      text: `Tu as dépensé <strong>${formatCurrency(Math.abs(liveStats.cashflow))}</strong> de plus que tu n'as gagné`,
      sub: 'Surveille tes prochaines dépenses.',
    })
    return result
  }, [transactions, pieData, liveStats])

  // Abonnements recalculés dynamiquement depuis l'état transactions
  const liveSubscriptions = useMemo(() => {
    const aboTx = transactions.filter(tx => tx.category === 'abonnements' && tx.amount < 0)
    const byLabel: Record<string, { total: number; count: number }> = {}
    aboTx.forEach(tx => {
      const key = tx.label_clean
      if (!byLabel[key]) byLabel[key] = { total: 0, count: 0 }
      byLabel[key].total += Math.abs(tx.amount)
      byLabel[key].count += 1
    })
    return Object.entries(byLabel)
      .map(([label, { total, count }]) => ({
        label,
        occurrences: count,
        monthly_cost: Math.round((total / count) * 100) / 100,
        annual_cost: Math.round((total / count) * 12 * 100) / 100,
      }))
      .sort((a, b) => b.monthly_cost - a.monthly_cost)
  }, [transactions])

  // Alertes budget — recalculées dynamiquement
  const liveAlerts = useMemo(() => {
    const alerts: { level: 'warning' | 'info'; icon: string; text: string }[] = []
    const { income, expense, cashflow, savingsRate } = liveStats

    if (income === 0) {
      alerts.push({ level: 'warning', icon: '⚠️', text: 'Aucun revenu détecté dans ce relevé.' })
      return alerts
    }

    // Cashflow négatif
    if (cashflow < 0) {
      alerts.push({
        level: 'warning', icon: '🔴',
        text: `Tu as dépensé <strong>${formatCurrency(Math.abs(cashflow))}</strong> de plus que tes revenus.`,
      })
    }

    // Taux d'épargne très faible
    if (savingsRate >= 0 && savingsRate < 5) {
      alerts.push({
        level: 'warning', icon: '⚠️',
        text: `Taux d'épargne très faible : <strong>${Math.round(savingsRate)}%</strong>. Objectif recommandé : 20%.`,
      })
    }

    // Catégorie dominante (> 40% des dépenses réelles, hors épargne/investissement)
    const realExp = transactions
      .filter(tx => tx.amount < 0 && !SAVINGS_CATS.has(tx.category))
      .reduce((s, tx) => s + Math.abs(tx.amount), 0)

    if (realExp > 0) {
      const byCat: Record<string, number> = {}
      transactions
        .filter(tx => tx.amount < 0 && !SAVINGS_CATS.has(tx.category))
        .forEach(tx => { byCat[tx.category] = (byCat[tx.category] || 0) + Math.abs(tx.amount) })
      const [topCat, topAmt] = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0] || []
      const pct = topAmt / realExp * 100
      if (topCat && pct > 40) {
        alerts.push({
          level: 'info', icon: '📊',
          text: `<strong>${CATEGORY_LABELS[topCat] || topCat}</strong> représente <strong>${Math.round(pct)}%</strong> de tes dépenses.`,
        })
      }
    }

    // Abonnements > 15% des revenus
    const aboTotal = transactions
      .filter(tx => tx.amount < 0 && tx.category === 'abonnements')
      .reduce((s, tx) => s + Math.abs(tx.amount), 0)
    if (income > 0 && aboTotal / income > 0.15) {
      alerts.push({
        level: 'warning', icon: '📱',
        text: `Tes abonnements représentent <strong>${Math.round(aboTotal / income * 100)}%</strong> de tes revenus (${formatCurrency(aboTotal)}).`,
      })
    }

    return alerts
  }, [transactions, liveStats, SAVINGS_CATS])

  // Bar chart — exclut épargne/investissement des dépenses si confirmé
  const liveTimeline = useMemo(() => {
    const monthly: Record<string, { month: string; income: number; expense: number }> = {}
    transactions.forEach(tx => {
      const month = tx.date.slice(0, 7)
      if (!monthly[month]) monthly[month] = { month, income: 0, expense: 0 }
      if (tx.amount > 0) monthly[month].income += tx.amount
      else if (!savingsConfirmed || !SAVINGS_CATS.has(tx.category))
        monthly[month].expense += Math.abs(tx.amount)
    })
    const sorted = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month))
    return sorted.map((m, i) => {
      const prev = sorted[i - 1]
      const expenseChange = prev && prev.expense > 0
        ? Math.round(((m.expense - prev.expense) / prev.expense) * 100)
        : null
      const incomeChange = prev && prev.income > 0
        ? Math.round(((m.income - prev.income) / prev.income) * 100)
        : null
      return { ...m, expenseChange, incomeChange }
    })
  }, [transactions, savingsConfirmed, SAVINGS_CATS])

  if (!data) return null

  // Filtre transactions
  const filtered = transactions.filter(tx => {
    if (txFilter === 'income' && tx.amount <= 0) return false
    if (txFilter === 'expense' && tx.amount >= 0) return false
    return (
      tx.label_clean.toLowerCase().includes(search.toLowerCase()) ||
      tx.label_raw.toLowerCase().includes(search.toLowerCase()) ||
      CATEGORY_LABELS[tx.category]?.toLowerCase().includes(search.toLowerCase())
    )
  })

  async function handleCategoryChange(tx: Transaction, newCategory: string) {
    // Optimistic update : uniquement cette transaction (par ID)
    setTransactions(prev =>
      prev.map(t => t.id === tx.id ? { ...t, category: newCategory } : t)
    )
    try {
      await updateCategory(tx.id, newCategory, false)

      // Chercher les transactions avec EXACTEMENT le même libellé et une catégorie différente
      const duplicates = transactions.filter(
        t => t.id !== tx.id &&
          t.label_clean.toLowerCase() === tx.label_clean.toLowerCase() &&
          t.category !== newCategory
      )

      if (duplicates.length > 0) {
        // Proposer à l'utilisateur de reclasser les doublons
        setPropagatePrompt({
          label: tx.label_clean,
          category: newCategory,
          ids: duplicates.map(t => t.id),
        })
      } else {
        setMemorizePrompt({ label: tx.label_clean, category: newCategory })
      }
    } catch (err: any) {
      // Rollback uniquement cette transaction
      setTransactions(prev =>
        prev.map(t => t.id === tx.id ? { ...t, category: tx.category } : t)
      )
      const msg = err?.message?.includes('401') ? 'Session expirée, reconnecte-toi' : 'Erreur réseau — réessaie'
      setToast(msg)
      setTimeout(() => setToast(''), 4000)
    }
  }

  async function handlePropagate() {
    if (!propagatePrompt) return
    const { ids, category } = propagatePrompt
    setPropagatePrompt(null)

    // Optimistic update de tous les doublons
    setTransactions(prev =>
      prev.map(t => ids.includes(t.id) ? { ...t, category } : t)
    )

    // Mise à jour en base pour chacun
    await Promise.all(ids.map(id => updateCategory(id, category, false).catch(() => {})))

    setMemorizePrompt({ label: propagatePrompt.label, category: category })
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] px-4 py-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-medium">Voilà où va ton argent</h1>
            {data?.filename && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[240px]">{data.filename}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-lg px-3 py-1.5 text-gray-500 dark:text-gray-400">
              {transactions.length} transactions
            </span>
            <button onClick={handleExport} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Exporter
            </button>
            <ThemeToggle />
            <button onClick={() => router.push('/regles')} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50">Mes règles</button>
            <button onClick={() => router.push('/history')} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50">Historique</button>
            <button onClick={() => router.push('/upload')} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50">Nouveau fichier</button>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 px-1.5 py-1.5">Déconnexion</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Revenus', value: formatCurrency(liveStats.income), cls: 'text-[#1D9E75]' },
            { label: 'Dépenses', value: formatCurrency(liveStats.expense), cls: 'text-[#E24B4A]' },
            {
              label: liveStats.cashflow >= 0 ? 'Ce qu\'il te reste' : 'Tu as dépensé en trop',
              value: formatCurrency(Math.abs(liveStats.cashflow)),
              cls: liveStats.cashflow >= 0 ? 'text-[#1D9E75]' : 'text-[#E24B4A]',
            },
            {
              label: 'Mis de côté',
              value: `${Math.max(0, Math.round(liveStats.savingsRate))}%`,
              cls: liveStats.savingsRate > 0 ? 'text-[#1D9E75]' : 'text-gray-400',
            },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{kpi.label}</p>
              <p className={`text-2xl font-medium ${kpi.cls}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Score financier */}
        {data?.score && (() => {
          const s = data.score
          const COLOR_MAP: Record<string, { bg: string; border: string; text: string; bar: string }> = {
            green:  { bg: 'bg-[#f0faf5] dark:bg-[#1a2e25]', border: 'border-[#1D9E75]/30', text: 'text-[#1D9E75]', bar: 'bg-[#1D9E75]' },
            lime:   { bg: 'bg-[#f4faf0] dark:bg-[#1e2d1a]', border: 'border-[#6abf54]/30', text: 'text-[#6abf54]', bar: 'bg-[#6abf54]' },
            orange: { bg: 'bg-[#fff8f0] dark:bg-[#2d2218]', border: 'border-orange-300/40', text: 'text-orange-500', bar: 'bg-orange-400' },
            red:    { bg: 'bg-[#fff5f5] dark:bg-[#2d1a1a]', border: 'border-[#E24B4A]/30', text: 'text-[#E24B4A]', bar: 'bg-[#E24B4A]' },
          }
          const c = COLOR_MAP[s.color] || COLOR_MAP.orange
          const bars = [
            { label: 'Cashflow', val: s.details.cashflow, max: 35 },
            { label: 'Épargne', val: s.details.savings_rate, max: 35 },
            { label: 'Investissement', val: s.details.investment, max: 20 },
            { label: 'Diversification', val: s.details.diversification, max: 10 },
          ]
          return (
            <div className={`${c.bg} border ${c.border} rounded-xl px-5 py-4 mb-5 flex items-center gap-5 flex-wrap`}>
              {/* Big score */}
              <div className="flex flex-col items-center min-w-[72px]">
                <span className={`text-5xl font-bold ${c.text} leading-none`}>{s.score}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">/100</span>
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className={`text-sm font-semibold ${c.text} mb-2.5`}>Score de santé financière · {s.label}</p>
                <div className="space-y-1.5">
                  {bars.map(b => (
                    <div key={b.label} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-28 shrink-0">{b.label}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${Math.round(b.val / b.max * 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-12 text-right">{b.val}/{b.max}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Alertes budget */}
        {liveAlerts.length > 0 && (
          <div className="flex flex-col gap-2 mb-5">
            {liveAlerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm border ${
                  alert.level === 'warning'
                    ? 'bg-[#fff8f0] dark:bg-[#2d2218] border-orange-300/40 text-orange-700 dark:text-orange-400'
                    : 'bg-[#f0f6ff] dark:bg-[#1a2035] border-blue-300/40 text-blue-700 dark:text-blue-400'
                }`}
              >
                <span className="text-base leading-tight mt-0.5 shrink-0">{alert.icon}</span>
                <span dangerouslySetInnerHTML={{ __html: alert.text }} />
              </div>
            ))}
          </div>
        )}

        {/* Bannière confirmation épargne */}
        {savingsTotal > 0 && !savingsConfirmed && (
          <div className="bg-[#f0faf5] dark:bg-[#1a2e25] border border-[#1D9E75]/30 dark:border-[#1D9E75]/20 rounded-xl px-4 py-3.5 mb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-[#1D9E75]">
                  💰 {formatCurrency(savingsTotal)} mis de côté détectés
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  On a classé ces virements comme épargne ou investissement. Si c'est bien le cas,
                  on les sort des dépenses pour un tableau de bord plus juste.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0 mt-0.5">
                <button
                  onClick={() => setSavingsConfirmed(true)}
                  className="text-sm bg-[#1D9E75] text-white px-3 py-1.5 rounded-lg hover:bg-[#178a64] transition-colors"
                >
                  Oui, c'est de l'épargne
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('transactions-section')
                    el?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="text-sm border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1c1c1a] px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  Revoir ↗
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Pie chart */}
          <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
            <p className="text-sm font-medium mb-4">Dépenses par catégorie</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart key={pieData.map(d => `${d.category}:${Math.round(d.value)}`).join(',')}>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
              {pieData.slice(0, 8).map(d => (
                <span key={d.name} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
            <p className="text-sm font-medium mb-4">Revenus et dépenses par mois</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={liveTimeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="income" name="Revenus" fill="#1D9E75" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Dépenses" fill="#E24B4A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {liveTimeline.length > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Variation mois / mois</p>
                <div className="flex gap-3 flex-wrap">
                  {liveTimeline.filter(m => m.expenseChange !== null || m.incomeChange !== null).map(m => {
                    const monthLabel = new Date(m.month + '-01').toLocaleDateString('fr-FR', { month: 'short' })
                    return (
                      <div key={m.month} className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center">{monthLabel}</span>
                        <div className="flex gap-1">
                          {m.incomeChange !== null && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${m.incomeChange >= 0 ? 'bg-[#f0faf5] dark:bg-[#1a2e25] text-[#1D9E75]' : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                              Rev. {m.incomeChange >= 0 ? '+' : ''}{m.incomeChange}%
                            </span>
                          )}
                          {m.expenseChange !== null && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${m.expenseChange <= 0 ? 'bg-[#f0faf5] dark:bg-[#1a2e25] text-[#1D9E75]' : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                              Dép. {m.expenseChange >= 0 ? '+' : ''}{m.expenseChange}%
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 mb-5">
          <p className="text-sm font-medium mb-4">Points clés</p>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-lg flex-shrink-0">
                  {ins.icon}
                </div>
                <div>
                  <p className="text-sm" dangerouslySetInnerHTML={{ __html: ins.text }} />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ins.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Abonnements */}
        {liveSubscriptions.length > 0 && (
          <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">Abonnements détectés</p>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatCurrency(liveSubscriptions.reduce((s, a) => s + a.monthly_cost, 0))}/mois
                · {formatCurrency(liveSubscriptions.reduce((s, a) => s + a.annual_cost, 0))}/an
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-xs text-gray-400 dark:text-gray-500 text-left">
                    <th className="pb-2 pr-4 font-medium">Service</th>
                    <th className="pb-2 pr-4 font-medium text-right">Mensuel</th>
                    <th className="pb-2 pr-4 font-medium text-right">Annuel</th>
                    <th className="pb-2 font-medium text-right">Fois détectées</th>
                  </tr>
                </thead>
                <tbody>
                  {liveSubscriptions.map((sub) => (
                    <tr key={sub.label} className="border-t border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 pr-4 font-medium">{sub.label}</td>
                      <td className="py-2 pr-4 text-right text-[#E24B4A]">{formatCurrency(sub.monthly_cost)}</td>
                      <td className="py-2 pr-4 text-right text-gray-500 dark:text-gray-400">{formatCurrency(sub.annual_cost)}</td>
                      <td className="py-2 text-right text-gray-400 dark:text-gray-500">{sub.occurrences}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions */}
        <div id="transactions-section" className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm font-medium">Transactions <span className="text-gray-400 dark:text-gray-500 font-normal">({filtered.length})</span></p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
                {([['all', 'Tous'], ['income', 'Revenus ↑'], ['expense', 'Dépenses ↓']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setTxFilter(val); setShowAllTx(false) }}
                    className={`px-3 py-1.5 transition-colors ${
                      txFilter === val
                        ? val === 'income'
                          ? 'bg-[#1D9E75] text-white'
                          : val === 'expense'
                          ? 'bg-[#E24B4A] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-[#1c1c1a] dark:text-gray-200 focus:outline-none w-48"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs text-gray-400 dark:text-gray-500 text-left">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Description</th>
                  <th className="pb-2 pr-4 font-medium">Catégorie</th>
                  <th className="pb-2 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {(showAllTx ? filtered : filtered.slice(0, 100)).map(tx => {
                  const color = CATEGORY_COLORS[tx.category] || '#9E9E9E'
                  return (
                    <tr key={tx.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-2 pr-4 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">{tx.date}</td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">
                        {tx.label_clean}
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={tx.category}
                          onChange={e => handleCategoryChange(tx, e.target.value)}
                          style={{
                            borderColor: color,
                            background: color + '22',
                            color: color,
                          }}
                          className="text-xs border rounded px-2 py-1 focus:outline-none cursor-pointer font-medium dark:bg-[#1c1c1a]"
                        >
                          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className={`py-2 text-right font-medium ${tx.amount >= 0 ? 'text-[#1D9E75]' : ''}`}>
                        {tx.currency && tx.currency !== 'EUR' && tx.amount_original != null ? (
                          <span className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                              {tx.currency} {Math.abs(tx.amount_original).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                            </span>
                            <span>{formatCurrency(tx.amount)}</span>
                          </span>
                        ) : formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length > 100 && !showAllTx && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowAllTx(true)}
                  className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50 rounded-lg px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  Voir les {filtered.length - 100} transactions suivantes
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Toast simple */}
      {toast && !propagatePrompt && !memorizePrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] dark:bg-gray-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Toast mémorisation */}
      {memorizePrompt && !propagatePrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] dark:bg-gray-800 text-white text-sm px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-4 max-w-sm w-full">
          <span className="flex-1">Catégorie mise à jour</span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setMemorizePrompt(null)}
              className="text-gray-400 hover:text-white text-xs"
            >
              Ignorer
            </button>
            <button
              onClick={async () => {
                try {
                  await saveRule(memorizePrompt.label, memorizePrompt.category)
                  setMemorizePrompt(null)
                  setToast('Règle mémorisée ✓')
                  setTimeout(() => setToast(''), 2500)
                } catch {
                  setMemorizePrompt(null)
                  setToast('Erreur — réessaie')
                  setTimeout(() => setToast(''), 2500)
                }
              }}
              className="bg-[#1D9E75] text-white font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-[#178a64]"
            >
              Mémoriser →
            </button>
          </div>
        </div>
      )}

      {/* Toast de propagation — proposer de reclasser les doublons exacts */}
      {propagatePrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] dark:bg-gray-800 text-white text-sm px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-4 max-w-sm">
          <span>
            <span className="font-medium">{propagatePrompt.ids.length}</span> transaction{propagatePrompt.ids.length > 1 ? 's' : ''} identique{propagatePrompt.ids.length > 1 ? 's' : ''} trouvée{propagatePrompt.ids.length > 1 ? 's' : ''}. Reclasser aussi ?
          </span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setPropagatePrompt(null)}
              className="text-gray-400 hover:text-white text-xs"
            >
              Non
            </button>
            <button
              onClick={handlePropagate}
              className="bg-white dark:bg-gray-700/50 text-[#1a1a1a] dark:text-gray-200 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              Oui
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
