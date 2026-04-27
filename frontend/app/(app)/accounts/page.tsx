'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SubHeader } from '@/components/SubHeader'
import { getBankConnectUrl, getBankConnections, syncBankConnection, deleteBankConnection, type BankConnection, BankSyncingError } from '@/lib/api'

// ── Month helpers ────────────────────────────────────────────────────────
const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  if (!key || key.length < 7) return key
  const [y, m] = key.split('-')
  return `${MONTH_LABELS[parseInt(m) - 1] ?? m} ${y}`
}

/** Returns the last 13 month keys (current first, oldest last) */
function recentMonths(count = 13): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

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

function BankCard({
  conn, onSync, onDelete, syncing, deleting, isLast,
}: {
  conn: BankConnection
  onSync: () => void
  onDelete: () => void
  syncing: boolean
  deleting: boolean
  isLast: boolean
}) {
  const syncDate = conn.last_synced_at
    ? new Date(conn.last_synced_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '—'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)', opacity: deleting ? 0.5 : 1 }}
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

      <div className="flex items-center gap-2">
        <StatusDot status={conn.status} />
        <button
          onClick={onSync}
          disabled={syncing || deleting}
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
        <button
          onClick={onDelete}
          disabled={syncing || deleting}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95"
          style={{
            background: 'transparent',
            color: 'var(--fg-3)',
            border: '1px solid var(--border)',
            cursor: deleting ? 'default' : 'pointer',
          }}
          aria-label="Déconnecter"
          title="Déconnecter cette banque"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
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
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [targetMonth, setTargetMonth] = useState(currentMonthKey())

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
      const { webview_url, state } = await getBankConnectUrl(targetMonth)
      sessionStorage.setItem('bank_connect_state', state)
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
      const result = await syncBankConnection(connId, { targetMonth })
      sessionStorage.setItem('analysis', JSON.stringify(result))
      showToast(`${result.transactions.length} transactions · ${monthLabel(targetMonth)} ✓`)
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

  function handleDelete(connId: string, name: string) {
    setPendingDelete({ id: connId, name })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const { id, name } = pendingDelete
    setDeleting(id)
    setError('')
    try {
      await deleteBankConnection(id)
      setConnections(prev => prev.filter(c => c.id !== id))
      showToast(`${name} — accès révoqué ✓`)
      setPendingDelete(null)
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la révocation')
    } finally {
      setDeleting(null)
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
                onDelete={() => handleDelete(conn.id, conn.institution_name)}
                syncing={syncing === conn.id}
                deleting={deleting === conn.id}
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

        {/* Month picker — sync target */}
        <div className="mt-5 rounded-2xl px-4 py-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>
            Mois à analyser
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--fg-2)' }}>
            La sync ne récupère que ce mois — plus rapide, moins de bruit.
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {recentMonths(13).map(m => {
              const active = m === targetMonth
              return (
                <button
                  key={m}
                  onClick={() => setTargetMonth(m)}
                  className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95"
                  style={{
                    background: active ? '#1D9E75' : 'var(--bg-card-hi)',
                    color: active ? '#062A1E' : 'var(--fg-2)',
                    border: active ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: active ? '0 0 12px rgba(29,158,117,0.25)' : 'none',
                  }}
                >
                  {monthLabel(m)}
                </button>
              )
            })}
          </div>
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
              {connections.length > 0 ? `Ajouter une autre banque · ${monthLabel(targetMonth)}` : `Connecter ma banque · ${monthLabel(targetMonth)}`}
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

      {/* Revocation modal — bottom sheet (mobile) / centered (desktop) */}
      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-title"
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => deleting !== pendingDelete.id && setPendingDelete(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full lg:max-w-md lg:m-4 rounded-t-3xl lg:rounded-3xl p-5"
            style={{
              background: 'var(--bg-page)',
              border: '1px solid var(--border)',
              maxHeight: '85vh',
              overflowY: 'auto',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 20px)',
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-2xl"
                style={{ width: 44, height: 44, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--fg-3)' }}>Action irréversible</p>
                <h3 id="revoke-title" className="text-base font-semibold truncate" style={{ letterSpacing: '-0.01em' }}>
                  Révoquer {pendingDelete.name} ?
                </h3>
              </div>
            </div>

            <ul className="flex flex-col gap-2.5 mb-5 text-sm" style={{ color: 'var(--fg-2)' }}>
              <li className="flex items-start gap-2">
                <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>L'accès bancaire sera <strong style={{ color: 'var(--fg)' }}>révoqué chez Powens</strong> immédiatement.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Tes <strong style={{ color: 'var(--fg)' }}>analyses déjà générées restent</strong> dans ton historique Senzio.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0zM12 8v4M12 16h.01"/>
                </svg>
                <span style={{ color: 'var(--fg-3)' }}>Pour revenir, il faudra reconnecter la banque depuis cette page.</span>
              </li>
            </ul>

            {error && (
              <p className="text-sm rounded-xl px-4 py-3 mb-3" style={{ color: '#F87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={confirmDelete}
                disabled={deleting === pendingDelete.id}
                className="rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: '#F87171',
                  color: '#3A0E0E',
                  border: 'none',
                  cursor: deleting === pendingDelete.id ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: deleting === pendingDelete.id ? 0.7 : 1,
                  boxShadow: '0 0 24px rgba(248,113,113,0.25)',
                }}
              >
                {deleting === pendingDelete.id ? 'Révocation…' : 'Révoquer l\'accès'}
              </button>
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleting === pendingDelete.id}
                className="rounded-xl py-3 text-sm font-medium transition-all"
                style={{
                  background: 'transparent',
                  color: 'var(--fg-2)',
                  border: '1px solid var(--border)',
                  cursor: deleting === pendingDelete.id ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
