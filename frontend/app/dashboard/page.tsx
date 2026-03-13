'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import {
  formatCurrency, updateCategory,
  CATEGORY_LABELS, CATEGORY_COLORS,
  type UploadResult, type Transaction,
} from '@/lib/api'

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

  if (!data) return null

  const { summary, by_category, timeline } = data

  // Filtrer les transactions
  const filtered = transactions.filter(tx =>
    tx.label_clean.toLowerCase().includes(search.toLowerCase()) ||
    tx.label_raw.toLowerCase().includes(search.toLowerCase()) ||
    CATEGORY_LABELS[tx.category]?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCategoryChange(tx: Transaction, newCategory: string) {
    try {
      const res = await updateCategory(tx.id, newCategory, true)
      setTransactions(prev =>
        prev.map(t => {
          const labelKey = tx.label_clean.toLowerCase().split(' ').find(w => w.length >= 4) || ''
          if (t.id === tx.id || (labelKey && t.label_clean.toLowerCase().includes(labelKey))) {
            return { ...t, category: newCategory }
          }
          return t
        })
      )
      setToast(`${res.total_updated} transaction(s) mise(s) à jour`)
      setTimeout(() => setToast(''), 3000)
    } catch {
      setToast('Erreur lors de la mise à jour')
      setTimeout(() => setToast(''), 3000)
    }
  }

  const pieData = by_category.map(c => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    value: c.total,
    color: CATEGORY_COLORS[c.category] || '#9E9E9E',
  }))

  return (
    <main className="min-h-screen bg-[#f5f5f2] px-4 py-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-xl font-medium">Ton analyse financière</h1>
          <div className="flex gap-2">
            <span className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500">
              {transactions.length} transactions
            </span>
            <button
              onClick={() => router.push('/upload')}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 hover:bg-gray-100"
            >
              Nouveau fichier
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Revenus', value: formatCurrency(summary.income_total), cls: 'text-[#1D9E75]', sub: '' },
            { label: 'Dépenses', value: formatCurrency(summary.expense_total), cls: 'text-[#E24B4A]', sub: '' },
            { label: 'Cashflow', value: formatCurrency(summary.cashflow), cls: summary.cashflow >= 0 ? 'text-[#1D9E75]' : 'text-[#E24B4A]', sub: '' },
            { label: "Taux d'épargne", value: `${summary.savings_rate}%`, cls: summary.savings_rate >= 0 ? 'text-[#1D9E75]' : 'text-[#E24B4A]', sub: '' },
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
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
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

        {/* Transactions table */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm font-medium">Transactions</p>
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
                {filtered.slice(0, 100).map(tx => (
                  <tr key={tx.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-400 text-xs whitespace-nowrap">{tx.date}</td>
                    <td className="py-2 pr-4 max-w-[200px] truncate">{tx.label_clean}</td>
                    <td className="py-2 pr-4">
                      <select
                        value={tx.category}
                        onChange={e => handleCategoryChange(tx, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50 focus:outline-none cursor-pointer"
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
                ))}
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
