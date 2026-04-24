'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { processBankCallback, BankSyncingError } from '@/lib/api'
import { SenzioMark } from '@/components/SenzioMark'

function BankCallbackContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error' | 'syncing'>('loading')
  const [message, setMessage] = useState('Connexion à votre banque…')
  const [error, setError] = useState('')

  useEffect(() => {
    const connection_id = params.get('connection_id')
    const state = params.get('state')
    const errorParam = params.get('error')

    if (errorParam) {
      setStatus('error')
      setError(`Connexion annulée : ${params.get('error_description') || errorParam}`)
      return
    }

    if (!connection_id || !state) {
      setStatus('error')
      setError('Paramètres manquants dans le retour bancaire.')
      return
    }

    async function processCallback() {
      try {
        setMessage('Connexion établie…')
        await new Promise(r => setTimeout(r, 600))
        setMessage('Récupération des transactions…')

        const result = await processBankCallback(connection_id!, state!)
        setMessage(`${result.transactions.length} transactions importées ✓`)
        await new Promise(r => setTimeout(r, 800))
        sessionStorage.setItem('analysis', JSON.stringify(result))
        router.push('/dashboard')
      } catch (e: any) {
        if (e instanceof BankSyncingError) {
          setStatus('syncing')
          setError(e.message)
          setTimeout(() => router.push('/accounts'), 3000)
        } else {
          setStatus('error')
          setError(e.message || "Une erreur est survenue lors de l'import.")
        }
      }
    }

    processCallback()
  }, [params, router])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}>
      <div className="text-center max-w-xs w-full">

        <div className="flex justify-center mb-8">
          <SenzioMark size={40} />
        </div>

        {status === 'loading' && (
          <>
            <div
              className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-6"
              style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: 'var(--fg-2)' }}>{message}</p>
          </>
        )}

        {status === 'syncing' && (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
              style={{ background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.25)' }}
            >
              🏦
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ letterSpacing: '-0.01em' }}>Banque connectée !</h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--fg-2)' }}>{error}</p>
            <p className="text-xs mb-6" style={{ color: 'var(--fg-3)' }}>Redirection dans 3 secondes…</p>
            <button
              onClick={() => router.push('/accounts')}
              className="rounded-xl px-6 py-3 text-sm font-medium transition-all active:scale-95"
              style={{ background: '#1D9E75', color: '#062A1E', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Mes comptes →
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              ⚠️
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ letterSpacing: '-0.01em' }}>Connexion échouée</h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--fg-2)' }}>{error}</p>
            <button
              onClick={() => router.push('/accounts')}
              className="rounded-xl px-6 py-3 text-sm font-medium transition-all active:scale-95"
              style={{ background: '#1D9E75', color: '#062A1E', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Réessayer
            </button>
          </>
        )}

      </div>
    </div>
  )
}

export default function BankCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
      </div>
    }>
      <BankCallbackContent />
    </Suspense>
  )
}
