'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getBankConnectUrl, getBankConnections, syncBankConnection, type BankConnection } from '@/lib/api'
import { SenzioLogo } from '@/components/SenzioLogo'
import { ThemeToggle } from '@/components/ThemeToggle'

const PERIOD_OPTIONS = [
  { value: 1,  label: '1 mois' },
  { value: 3,  label: '3 mois' },
  { value: 6,  label: '6 mois' },
  { value: 12, label: '12 mois' },
  { value: 24, label: '24 mois' },
]

export default function AccountsPage() {
  const router = useRouter()
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState(6)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      loadConnections()
    })
  }, [router])

  async function loadConnections() {
    setLoading(true)
    try {
      const conns = await getBankConnections()
      setConnections(conns)
    } catch { /* silencieux */ }
    setLoading(false)
  }

  async function handleConnect() {
    setConnecting(true)
    setError('')
    try {
      const { webview_url } = await getBankConnectUrl(period)
      window.location.href = webview_url
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la connexion')
      setConnecting(false)
    }
  }

  async function handleSync(connId: string) {
    setSyncing(connId)
    setError('')
    try {
      const result = await syncBankConnection(connId, period)
      sessionStorage.setItem('analysis', JSON.stringify(result))
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la synchronisation')
      setSyncing(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <SenzioLogo height={32} />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => router.push('/upload')} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ← Upload
            </button>
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              Déconnexion
            </button>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#1D9E75] mb-2">Open Banking</p>
          <h1 className="text-3xl font-bold tracking-tight dark:text-white mb-2">Mes comptes</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Connecte ta banque directement — plus besoin d'exporter un CSV.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Connexions existantes */}
        {!loading && connections.length > 0 && (
          <div className="bg-white dark:bg-[#1c1c1a] rounded-2xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-sm dark:text-white">Banques connectées</h2>
            </div>
            {connections.map(conn => (
              <div key={conn.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                {conn.institution_logo ? (
                  <img src={conn.institution_logo} alt={conn.institution_name} className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm">🏦</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm dark:text-white">{conn.institution_name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Sync {new Date(conn.last_synced_at).toLocaleDateString('fr-FR')}
                    {' · '}
                    <span className={conn.status === 'active' ? 'text-[#1D9E75]' : 'text-red-500'}>
                      {conn.status === 'active' ? 'Active' : 'Erreur'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleSync(conn.id)}
                  disabled={syncing === conn.id}
                  className="text-xs bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75]/20 rounded-lg px-3 py-1.5 font-medium transition-colors disabled:opacity-50"
                >
                  {syncing === conn.id ? 'Sync…' : '↻ Sync'}
                </button>
                {conn.file_id && (
                  <button
                    onClick={() => {
                      sessionStorage.setItem('reload_file_id', conn.file_id!)
                      router.push('/dashboard')
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2"
                  >
                    Voir →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sélecteur de période */}
        <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700 rounded-2xl px-6 py-4 mb-4">
          <p className="text-sm font-medium dark:text-white mb-3">Historique à récupérer</p>
          <div className="flex gap-2 flex-wrap">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  period === opt.value
                    ? 'bg-[#1D9E75] text-white'
                    : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            PSD2 garantit au minimum 3 mois · La plupart des banques offrent jusqu'à 13 mois
          </p>
        </div>

        {/* Bouton connexion */}
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full bg-[#1D9E75] text-white rounded-2xl py-5 font-semibold text-base hover:bg-[#178a65] transition-colors disabled:opacity-60 flex items-center justify-center gap-3"
        >
          {connecting ? (
            <span className="animate-pulse">Connexion en cours…</span>
          ) : (
            <>
              <span className="text-xl">🏦</span>
              <span>Connecter ma banque — {PERIOD_OPTIONS.find(o => o.value === period)?.label}</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          2300+ banques européennes · Lecture seule · Conforme PSD2
        </p>

        {loading && (
          <div className="text-center py-12 text-gray-400 text-sm">Chargement…</div>
        )}

      </div>
    </main>
  )
}
