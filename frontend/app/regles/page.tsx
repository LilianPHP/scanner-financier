'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getRules, deleteRule, CATEGORY_LABELS, CATEGORY_COLORS, type CategoryRule } from '@/lib/api'

export default function ReglesPage() {
  const router = useRouter()
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingLabel, setDeletingLabel] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      getRules().then(r => { setRules(r); setLoading(false) }).catch(() => setLoading(false))
    })
  }, [router])

  async function handleDelete(labelPattern: string) {
    setDeletingLabel(labelPattern)
    try {
      await deleteRule(labelPattern)
      setRules(prev => prev.filter(r => r.label_pattern !== labelPattern))
      setToast('Règle supprimée')
      setTimeout(() => setToast(''), 2500)
    } catch {
      setToast('Erreur — réessaie')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setDeletingLabel(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] px-4 py-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/upload" className="text-xs text-gray-400 hover:text-gray-600 transition-colors block mb-1">
              ← Retour
            </Link>
            <h1 className="text-xl font-medium">Mes règles mémorisées</h1>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Déconnexion
          </button>
        </div>

        {/* Explication */}
        <div className="bg-[#f0faf5] border border-[#1D9E75]/30 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-gray-600">
            Ces règles sont appliquées en priorité lors de tes prochains imports. Si un libellé correspond, la catégorie est attribuée automatiquement — avant les règles génériques et l'IA.
          </p>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-400">Chargement…</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4">🗂️</div>
            <p className="font-medium text-gray-700 mb-1">Aucune règle pour l'instant</p>
            <p className="text-sm text-gray-400 mb-6">
              Recatégorise une transaction sur le dashboard et clique "Mémoriser →" pour créer ta première règle.
            </p>
            <Link
              href="/upload"
              className="inline-block text-sm bg-[#1D9E75] text-white px-5 py-2.5 rounded-lg hover:bg-[#178a64] transition-colors"
            >
              Analyser un relevé
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase tracking-widest">
                {rules.length} règle{rules.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {rules.map(rule => {
                const catLabel = CATEGORY_LABELS[rule.category] ?? rule.category
                const catColor = CATEGORY_COLORS[rule.category] ?? '#9E9E9E'
                return (
                  <div key={rule.label_pattern} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{rule.label_pattern}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Ajoutée le {new Date(rule.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded flex-shrink-0"
                      style={{ color: catColor, background: catColor + '22', border: `1px solid ${catColor}55` }}
                    >
                      {catLabel}
                    </span>
                    <button
                      onClick={() => handleDelete(rule.label_pattern)}
                      disabled={deletingLabel === rule.label_pattern}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-40"
                      title="Supprimer cette règle"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-sm px-5 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </main>
  )
}
