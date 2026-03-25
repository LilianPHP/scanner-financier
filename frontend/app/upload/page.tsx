'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadFile, type UploadResult } from '@/lib/api'

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0) // 0=idle, 1=upload, 2=analyse, 3=dashboard
  const [slowWarning, setSlowWarning] = useState(false)

  // Vérifier l'auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login')
    })
  }, [router])

  async function handleFile(file: File) {
    setError('')
    setLoading(true)
    setSlowWarning(false)
    setStep(1)

    // Si ça prend plus de 5s, afficher un message rassurant (cold start Railway)
    const slowTimer = setTimeout(() => setSlowWarning(true), 5000)

    try {
      setStep(2)
      const result: UploadResult = await uploadFile(file)
      clearTimeout(slowTimer)
      setStep(3)
      // Stocker le résultat dans sessionStorage pour le dashboard
      sessionStorage.setItem('analysis', JSON.stringify(result))
      router.push('/dashboard')
    } catch (err: any) {
      clearTimeout(slowTimer)
      setError(err.message || 'Une erreur est survenue')
      setLoading(false)
      setStep(0)
      setSlowWarning(false)
    }
  }

  const STEPS = [
    'Lecture du fichier',
    'Lecture de tes transactions',
    'Tri par catégorie',
    'Préparation de ton résumé',
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f5f2] flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm">
          <h2 className="text-lg font-medium text-center mb-2">Analyse en cours…</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            {slowWarning ? '⏳ Le serveur se réveille, encore quelques secondes…' : 'Quelques secondes'}
          </p>
          <div className="space-y-3">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    i < step || step >= STEPS.length - 1
                      ? 'bg-[#1D9E75]'
                      : i === step - 1
                      ? 'bg-[#378ADD]'
                      : 'bg-gray-100 border border-gray-300'
                  }`}
                >
                  {(i < step || step >= STEPS.length - 1) && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <span className={i < step ? 'text-gray-800' : 'text-gray-400'}>{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#378ADD] rounded-full transition-all duration-500"
              style={{ width: `${step >= STEPS.length - 1 ? 100 : (step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[480px]">
        <div className="flex items-center justify-between mb-10">
          <span className="text-xs font-medium tracking-widest text-gray-400 uppercase">
            Scanner Financier
          </span>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600">
            Déconnexion
          </button>
        </div>

        <h1 className="text-2xl font-medium text-center mb-2">
          Dépose ton relevé et découvre où part ton argent
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          Analyse instantanée · 100% privé · Aucune connexion bancaire
        </p>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        >
          <svg className="w-10 h-10 mx-auto mb-3 stroke-gray-400" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4" />
          </svg>
          <p className="font-medium text-gray-700 mb-1">Glisse ton relevé ici</p>
          <p className="text-sm text-gray-400 mb-4">ou clique pour sélectionner un fichier</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {['CSV', 'XLS', 'XLSX', 'PDF'].map(f => (
              <span key={f} className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500">
                {f}
              </span>
            ))}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx,.pdf,.txt"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          Ton fichier est analysé puis supprimé. On ne garde rien, on ne partage rien.
        </p>
      </div>
    </main>
  )
}
