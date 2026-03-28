'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  getUploadHistory, loadAnalysis,
  formatCurrency,
  type UploadedFile,
} from '@/lib/api'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function HistoryPage() {
  const router = useRouter()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      getUploadHistory()
        .then(setFiles)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    })
  }, [router])

  async function handleOpen(fileId: string, filename: string) {
    setLoadingId(fileId)
    try {
      const result = await loadAnalysis(fileId, filename)
      sessionStorage.setItem('analysis', JSON.stringify(result))
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message)
      setLoadingId(null)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] px-4 py-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors block mb-1">
              ← Retour au dashboard
            </Link>
            <h1 className="text-xl font-medium">Mes analyses</h1>
          </div>
          <div className="flex gap-2 items-center">
            <ThemeToggle />
            <button
              onClick={() => router.push('/upload')}
              className="text-sm bg-[#1a1a1a] text-white px-4 py-1.5 rounded-lg hover:bg-gray-800"
            >
              Analyser un nouveau relevé
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 px-2 py-1.5"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 mb-4 flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 text-xs underline whitespace-nowrap"
            >
              Fermer
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-20">Chargement…</div>
        ) : files.length === 0 ? (
          <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4">📂</div>
            <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Aucune analyse pour l'instant</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Dépose ton premier relevé bancaire pour découvrir où part ton argent.</p>
            <button
              onClick={() => router.push('/upload')}
              className="text-sm bg-[#1D9E75] text-white px-5 py-2 rounded-lg hover:bg-[#178a64] transition-colors"
            >
              Analyser mon premier relevé
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map(f => (
              <div
                key={f.id}
                className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{f.filename}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatDate(f.created_at)} · {f.transaction_count} transactions · .{f.file_type.toUpperCase()}
                  </p>
                </div>

                {f.income_total != null && (
                  <div className="flex gap-4 text-sm">
                    <span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 block">Revenus</span>
                      <span className="text-[#1D9E75] font-medium">{formatCurrency(f.income_total!)}</span>
                    </span>
                    <span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 block">Dépenses</span>
                      <span className="text-[#E24B4A] font-medium">{formatCurrency(f.expense_total!)}</span>
                    </span>
                    <span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 block">{(f.cashflow ?? 0) >= 0 ? 'Il te reste' : 'En dépassement'}</span>
                      <span className={`font-medium ${(f.cashflow ?? 0) >= 0 ? 'text-[#1D9E75]' : 'text-[#E24B4A]'}`}>
                        {formatCurrency(Math.abs(f.cashflow!))}
                      </span>
                    </span>
                  </div>
                )}

                <button
                  onClick={() => handleOpen(f.id, f.filename)}
                  disabled={loadingId === f.id}
                  className="text-sm border border-gray-200 dark:border-gray-700/50 rounded-lg px-4 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50 whitespace-nowrap"
                >
                  {loadingId === f.id ? 'Chargement…' : 'Revoir cette analyse →'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
