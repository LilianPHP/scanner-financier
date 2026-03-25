'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getUploadHistory, loadAnalysis,
  formatCurrency,
  type UploadedFile,
} from '@/lib/api'

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

  async function handleOpen(fileId: string) {
    setLoadingId(fileId)
    try {
      const result = await loadAnalysis(fileId)
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
    <main className="min-h-screen bg-[#f5f5f2] px-4 py-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium">Mes analyses</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/upload')}
              className="text-sm bg-[#1a1a1a] text-white px-4 py-1.5 rounded-lg hover:bg-gray-800"
            >
              Analyser un nouveau relevé
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4 flex items-center justify-between gap-4">
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
          <div className="text-center text-sm text-gray-400 py-20">Chargement…</div>
        ) : files.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <p className="text-gray-500 mb-4">Ton premier relevé t'attend.</p>
            <button
              onClick={() => router.push('/upload')}
              className="text-sm bg-[#378ADD] text-white px-5 py-2 rounded-lg hover:bg-blue-600"
            >
              Analyser mon premier relevé
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map(f => (
              <div
                key={f.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{f.filename}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(f.created_at)} · {f.transaction_count} transactions · .{f.file_type.toUpperCase()}
                  </p>
                </div>

                {f.income_total != null && (
                  <div className="flex gap-4 text-sm">
                    <span>
                      <span className="text-xs text-gray-400 block">Revenus</span>
                      <span className="text-[#1D9E75] font-medium">{formatCurrency(f.income_total!)}</span>
                    </span>
                    <span>
                      <span className="text-xs text-gray-400 block">Dépenses</span>
                      <span className="text-[#E24B4A] font-medium">{formatCurrency(f.expense_total!)}</span>
                    </span>
                    <span>
                      <span className="text-xs text-gray-400 block">{(f.cashflow ?? 0) >= 0 ? 'Il te reste' : 'En dépassement'}</span>
                      <span className={`font-medium ${(f.cashflow ?? 0) >= 0 ? 'text-[#1D9E75]' : 'text-[#E24B4A]'}`}>
                        {formatCurrency(Math.abs(f.cashflow!))}
                      </span>
                    </span>
                  </div>
                )}

                <button
                  onClick={() => handleOpen(f.id)}
                  disabled={loadingId === f.id}
                  className="text-sm border border-gray-200 rounded-lg px-4 py-1.5 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
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
