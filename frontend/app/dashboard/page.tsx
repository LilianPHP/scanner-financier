'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  formatCurrency, updateCategory,
  CATEGORY_LABELS, CATEGORY_COLORS,
  type UploadResult, type Transaction, type Subscription,
} from '@/lib/api'

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

  useEffect(() => {
    const raw = sessionStorage.getItem('analysis')
    if (!raw) { router.push('/upload'); return }
    const parsed: UploadResult = JSON.parse(raw)
    setData(parsed)
    setTransactions(parsed.transactions)
  }, [router])

  // Pie chart recalculé dynamiquement depuis l'état transactions
  const pieData = useMemo(() => {
    const catTotals: Record<string, number> = {}
    transactions.filter(tx => tx.amount < 0).forEach(tx => {
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
  }, [transactions])

  // KPIs recalculés dynamiquement
  const liveStats = useMemo(() => {
    const income = transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
    const expense = transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
    const cashflow = income - expense
    const savingsRate = income > 0 ? cashflow / income * 100 : 0
    return { income, expense, cashflow, savingsRate }
  }, [transactions])

  // Insights automatiques
  const insights = useMemo(() => {
    const totalDep = liveStats.expense
    const nbMonths = Math.max(1, new Set(transactions.map(tx => tx.date.slice(0, 7))).size)
    const aboTotal = transactions.filter(tx => tx.amount < 0 && tx.category === 'abonnements').reduce((s, tx) => s + Math.abs(tx.amount), 0)
    const loisirTotal = transactions.filter(tx => tx.amount < 0 && tx.category === 'loisirs').reduce((s, tx) => s + Math.abs(tx.amount), 0)
    const aliTotal = transactions.filter(tx => tx.amount < 0 && tx.category === 'alimentation').reduce((s, tx) => s + Math.abs(tx.amount), 0)
    const topCat = pieData[0]
    const result = []

    if (topCat) result.push({
      icon: CATEGORY_ICONS[topCat.category] || '📦',
      text: `Poste principal : <strong>${topCat.name}</strong>`,
      sub: `${formatCurrency(topCat.value)} — ${Math.round(topCat.value / totalDep * 100)}% des dépenses`,
    })
    if (aboTotal > 0) result.push({
      icon: '📱',
      text: `Abonnements : <strong>${formatCurrency(aboTotal / nbMonths)}/mois</strong>`,
      sub: `${formatCurrency(aboTotal)} sur la période · ${formatCurrency(aboTotal / nbMonths * 12)}/an`,
    })
    if (loisirTotal > 0 && totalDep > 0) result.push({
      icon: '🍽️',
      text: `<strong>${Math.round(loisirTotal / totalDep * 100)}%</strong> du budget en loisirs`,
      sub: `${formatCurrency(loisirTotal)} au total`,
    })
    if (aliTotal > 0 && totalDep > 0) result.push({
      icon: '🛒',
      text: `Alimentation : <strong>${formatCurrency(aliTotal / nbMonths)}/mois</strong>`,
      sub: `${Math.round(aliTotal / totalDep * 100)}% du budget total`,
    })
    if (liveStats.cashflow >= 0) result.push({
      icon: '💰',
      text: `Cashflow positif de <strong>${formatCurrency(liveStats.cashflow)}</strong>`,
      sub: 'Bonne gestion sur la période',
    })
    else result.push({
      icon: '⚠️',
      text: `Dépenses supérieures aux revenus de <strong>${formatCurrency(Math.abs(liveStats.cashflow))}</strong>`,
      sub: 'Attention à ton solde',
    })
    return result
  }, [transactions, pieData, liveStats])

  if (!data) return null

  const { timeline } = data

  // Filtre transactions
  const filtered = transactions.filter(tx =>
    tx.label_clean.toLowerCase().includes(search.toLowerCase()) ||
    tx.label_raw.toLowerCase().includes(search.toLowerCase()) ||
    CATEGORY_LABELS[tx.category]?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCategoryChange(tx: Transaction, newCategory: string) {
    // Mise à jour optimiste immédiate
    setTransactions(prev =>
      prev.map(t => {
        const labelKey = tx.label_clean.toLowerCase().split(' ').find(w => w.length >= 4) || ''
        if (t.id === tx.id || (labelKey && t.label_clean.toLowerCase().includes(labelKey))) {
          return { ...t, category: newCategory }
        }
        return t
      })
    )
    try {
      const res = await updateCategory(tx.id, newCategory, true)
      setToast(`${res.total_updated} transaction(s) mise(s) à jour`)
      setTimeout(() => setToast(''), 3000)
    } catch (err: any) {
      // Rollback en cas d'erreur
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, category: tx.category } : t))
      const msg = err?.message?.includes('401') ? 'Session expirée, reconnecte-toi' : 'Erreur réseau — réessaie'
      setToast(msg)
      setTimeout(() => setToast(''), 4000)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] px-4 py-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-xl font-medium">Ton analyse financière</h1>
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500">
              {transactions.length} transactions
            </span>
            <button onClick={() => router.push('/history')} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 hover:bg-gray-100">Historique</button>
            <button onClick={() => router.push('/upload')} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 hover:bg-gray-100">Nouveau fichier</button>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="text-sm text-gray-400 hover:text-gray-600 px-1.5 py-1.5">Déconnexion</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Revenus', value: formatCurrency(liveStats.income), cls: 'text-[#1D9E75]' },
            { label: 'Dépenses', value: formatCurrency(liveStats.expense), cls: 'text-[#E24B4A]' },
            { label: 'Cashflow', value: formatCurrency(liveStats.cashflow), cls: liveStats.cashflow >= 0 ? 'text-[#1D9E75]' : 'text-[#E24B4A]' },
            { label: "Taux d'épargne", value: `${Math.max(0, Math.round(liveStats.savingsRate))}%`, cls: liveStats.savingsRate >= 0 ? 'text-[#1D9E75]' : 'text-[#E24B4A]' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">{kpi.label}</p>
              <p className={`text-2xl font-medium ${kpi.cls}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Pie chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm font-medium mb-4">Dépenses par catégorie</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
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
                <span key={d.name} className="flex items-center gap-1 text-xs text-gray-600">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm font-medium mb-4">Revenus vs Dépenses</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={timeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="income" name="Revenus" fill="#1D9E75" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Dépenses" fill="#E24B4A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <p className="text-sm font-medium mb-4">Insights automatiques</p>
          <div className="divide-y divide-gray-100">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                  {ins.icon}
                </div>
                <div>
                  <p className="text-sm" dangerouslySetInnerHTML={{ __html: ins.text }} />
                  <p className="text-xs text-gray-400 mt-0.5">{ins.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Abonnements */}
        {data.subscriptions && data.subscriptions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">Abonnements détectés</p>
              <span className="text-xs text-gray-400">
                {formatCurrency(data.subscriptions.reduce((s, a) => s + a.monthly_cost, 0))}/mois
                · {formatCurrency(data.subscriptions.reduce((s, a) => s + a.annual_cost, 0))}/an
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-xs text-gray-400 text-left">
                    <th className="pb-2 pr-4 font-medium">Service</th>
                    <th className="pb-2 pr-4 font-medium text-right">Mensuel</th>
                    <th className="pb-2 pr-4 font-medium text-right">Annuel</th>
                    <th className="pb-2 font-medium text-right">Occurrences</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscriptions.map((sub: Subscription) => (
                    <tr key={sub.label} className="border-t border-gray-100">
                      <td className="py-2 pr-4 font-medium">{sub.label}</td>
                      <td className="py-2 pr-4 text-right text-[#E24B4A]">{formatCurrency(sub.monthly_cost)}</td>
                      <td className="py-2 pr-4 text-right text-gray-500">{formatCurrency(sub.annual_cost)}</td>
                      <td className="py-2 text-right text-gray-400">{sub.occurrences}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm font-medium">Transactions <span className="text-gray-400 font-normal">({filtered.length})</span></p>
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-gray-50 focus:outline-none w-48"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs text-gray-400 text-left">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Libellé</th>
                  <th className="pb-2 pr-4 font-medium">Catégorie</th>
                  <th className="pb-2 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map(tx => {
                  const color = CATEGORY_COLORS[tx.category] || '#9E9E9E'
                  return (
                    <tr key={tx.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-400 text-xs whitespace-nowrap">{tx.date}</td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">{tx.label_clean}</td>
                      <td className="py-2 pr-4">
                        <select
                          value={tx.category}
                          onChange={e => handleCategoryChange(tx, e.target.value)}
                          style={{
                            borderColor: color,
                            background: color + '22',
                            color: color,
                          }}
                          className="text-xs border rounded px-2 py-1 focus:outline-none cursor-pointer font-medium"
                        >
                          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className={`py-2 text-right font-medium ${tx.amount >= 0 ? 'text-[#1D9E75]' : ''}`}>
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="text-xs text-gray-400 text-center mt-3">
                Affichage des 100 premières transactions sur {filtered.length}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-sm px-5 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </main>
  )
}
