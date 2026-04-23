'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { processBankCallback } from '@/lib/api'
import { SenzioLogo } from '@/components/SenzioLogo'

function BankCallbackContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [message, setMessage] = useState('Import de vos transactions en cours…')
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
        setMessage('Connexion à votre banque établie…')
        await new Promise(r => setTimeout(r, 800))
        setMessage('Récupération des transactions…')

        const result = await processBankCallback(connection_id!, state!)
        setMessage(`${result.transactions.length} transactions importées ✓`)

        await new Promise(r => setTimeout(r, 1000))
        sessionStorage.setItem('analysis', JSON.stringify(result))
        router.push('/dashboard')
      } catch (e: any) {
        setStatus('error')
        setError(e.message || 'Une erreur est survenue lors de l\'import.')
      }
    }

    processCallback()
  }, [params, router])

  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="mb-8">
          <SenzioLogo height={32} />
        </div>

        {status === 'loading' ? (
          <>
            <div className="w-12 h-12 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="font-semibold text-lg dark:text-white mb-2">Connexion échouée</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/accounts')}
              className="bg-[#1D9E75] text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-[#178a65] transition-colors"
            >
              Réessayer
            </button>
          </>
        )}
      </div>
    </main>
  )
}

export default function BankCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <BankCallbackContent />
    </Suspense>
  )
}
