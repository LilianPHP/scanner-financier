'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SubHeader } from '@/components/SubHeader'
import { getBankConnectUrl, getBankConnections, syncBankConnection, type BankConnection, BankSyncingError } from '@/lib/api'

const PERIOD_OPTIONS = [
  { value: 1,  label: '1 m' },
  { value: 3,  label: '3 m' },
  { value: 6,  label: '6 m' },
  { value: 12, label: '12 m' },
  { value: 24, label: '24 m' },
]

function StatusDot({ status }: { status: string }) {
  const color = status === 'active' ? '#1D9E75' : status === 'syncing' ? '#F59E0B' : '#F87171'
  const label = status === 'active' ? 'Active' : status === 'syncing' ? 'Sync…' : 'Erreur'
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {label}
    </span>
  )
}

function BankCard({ conn, onSync, syncing, isLast }: { conn: BankConnection; onSync: () => void; syncing: boolean; isLast: boolean }) {
  const syncDate = conn.last_synced_at
    ? new Date(conn.last_synced_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '—'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}
    >
      {conn.institution_logo ? (
        <img
          src={conn.institution_logo}
          alt={conn.institution_name}
          className="w-10 h-10 rounded-xl object-contain flex-shrink-0"
          style={{ background: 'var(--track)' }}
        />
      ) : (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: 'var(--track)' }}
        >
          🏦
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
          {conn.institution_name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
          Sync {syncDate}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <StatusDot status={conn.status} />
        <button
          onClick={onSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95"
          style={{
            background: syncing ? 'rgba(29,158,117,0.06)' : 'rgba(29,158,117,0.12)',
            color: '#1D9E75',
            border: 'none',
            cursor: syncing ? 'default' : 'pointer',
            fontFamily: 'inherit',
            opacity: syncing ? 0.6 : 1,
          }}
          aria-label="Synchroniser"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={syncing ? 'animate-spin' : ''}>
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          <span className="hidden sm:inline">{syncing ? 'Sync…' : 'Synchroniser'}</span>
        </button>
      </div>
    </div>
  )
}

export default function AccountsPage() {
  const router = useRouter()
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
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

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
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
      showToast(`${result.transactions.length} transactions importées ✓`)
      router.push('/dashboard')
    } catch (e: any) {
      if (e instanceof BankSyncingError) {
        showToast('Synchronisation en cours — réessaie dans quelques minutes')
      } else {
        setError(e.message || 'Erreur lors de la synchronisation')
      }
      setSyncing(null)
    }
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-lg transition-all"
          style={{ background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.3)', backdropFilter: 'blur(12px)' }}
        >
          {toast}
        </div>
      )}

      <SubHeader title="Mes comptes" />

      <div className="px-5 lg:px-8">

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
            {error}
          </div>
        )}

        {/* Connected banks */}
        {loading ? (
          <div className="mt-8 rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background: 'var(--bg-card-hi)' }} />
                <div className="flex-1">
                  <div className="h-3 rounded w-28 animate-pulse mb-2" style={{ background: 'var(--bg-card-hi)' }} />
                  <div className="h-2.5 rounded w-20 animate-pulse" style={{ background: 'var(--bg-card-hi)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : connections.length > 0 ? (
          <div className="mt-6 rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-3)' }}>
                Banques connectées
              </span>
            </div>
            {connections.map((conn, i) => (
              <BankCard
                key={conn.id}
                conn={conn}
                onSync={() => handleSync(conn.id)}
                syncing={syncing === conn.id}
                isLast={i === connections.length - 1}
              />
            ))}
          </div>
        ) : (
          <div
            className="mt-6 rounded-2xl px-5 py-8 flex flex-col items-center text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
              style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)' }}
            >
              🏦
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>Aucune banque connectée</p>
            <p className="text-xs leading-relaxed max-w-sm" style={{ color: 'var(--fg-3)' }}>
              Connecte ta banque via Powens pour synchroniser tes transactions automatiquement. Lecture seule, aucun accès à tes identifiants.
            </p>
          </div>
        )}

        {/* Period selector */}
        <div className="mt-5 rounded-2xl px-4 py-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-3)' }}>
            Historique à importer
          </p>
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: period === opt.value ? '#1D9E75' : 'var(--bg-card-hi)',
                  color: period === opt.value ? '#062A1E' : 'var(--fg-3)',
                  border: period === opt.value ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: period === opt.value ? '0 0 16px rgba(29,158,117,0.3)' : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-2.5" style={{ color: 'var(--fg-4)' }}>
            PSD2 garantit 3 mois min · La plupart des banques offrent jusqu'à 13 mois
          </p>
        </div>

        {/* Connect CTA */}
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full mt-4 rounded-2xl py-4 text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2.5"
          style={{
            background: '#1D9E75',
            color: '#062A1E',
            border: 'none',
            cursor: connecting ? 'default' : 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 0 32px rgba(29,158,117,0.35)',
            opacity: connecting ? 0.7 : 1,
          }}
        >
          {connecting ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              Connexion…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Connecter ma banque — {PERIOD_OPTIONS.find(o => o.value === period)?.label.replace(' m', ' mois')}
            </>
          )}
        </button>

        {/* Trust badge */}
        <div className="mt-4 mb-8 flex items-center justify-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg-3)' }}>
            <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/>
          </svg>
          <span className="text-[11px]" style={{ color: 'var(--fg-3)' }}>
            Powens · Agréé ACPR · Lecture seule · 250+ banques
          </span>
        </div>

      </div>
    </>
  )
}
