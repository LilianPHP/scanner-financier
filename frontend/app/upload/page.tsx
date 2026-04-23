'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadFile, getProfile, type UploadResult, type UserProfile } from '@/lib/api'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SenzioLogo } from '@/components/SenzioLogo'
import { OnboardingModal } from '@/components/OnboardingModal'

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0) // 0=idle, 1=upload, 2=analyse, 3=dashboard
  const [slowWarning, setSlowWarning] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Vérifier l'auth + onboarding
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push('/login'); return }
      const profile = await getProfile()
      if (!profile || !profile.onboarding_done) setShowOnboarding(true)
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
      <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 w-full max-w-sm">
          <h2 className="text-lg font-medium text-center mb-2">Analyse en cours…</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
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
                      ? 'bg-[#1D9E75] opacity-60'
                      : 'bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {(i < step || step >= STEPS.length - 1) && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <span className={i < step ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 h-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1D9E75] rounded-full transition-all duration-500"
              style={{ width: `${step >= STEPS.length - 1 ? 100 : (step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] flex flex-col items-center justify-center px-4">
      {showOnboarding && (
        <OnboardingModal onDone={(profile: UserProfile) => {
          sessionStorage.setItem('user_profile', JSON.stringify(profile))
          setShowOnboarding(false)
        }} />
      )}
      <div className="w-full max-w-[480px]">
        <div className="flex items-center justify-between mb-10">
          <SenzioLogo height={36} />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={handleLogout} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
              Déconnexion
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-medium text-center mb-2">
          Dépose ton relevé et découvre où part ton argent
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
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
            dragOver
              ? 'border-[#1D9E75] bg-[#f0faf5] dark:bg-[#1a2e25] dark:border-[#1D9E75]/20'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1c1c1a] hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          <svg className="w-10 h-10 mx-auto mb-3 stroke-gray-400 dark:stroke-gray-500" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4" />
          </svg>
          <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Glisse ton relevé ici</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">ou clique pour sélectionner un fichier</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {['CSV', 'XLS', 'XLSX', 'PDF'].map(f => (
              <span key={f} className="text-xs border border-gray-200 dark:border-gray-700/50 rounded px-2 py-1 text-gray-500 dark:text-gray-400">
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
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Accordéon aide banques */}
        <div className="mt-5 border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden bg-white dark:bg-[#1c1c1a]">
          <button
            onClick={() => setHelpOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
              </svg>
              Comment obtenir mon relevé ?
            </span>
            <svg className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${helpOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {helpOpen && (
            <div className="border-t border-gray-100 dark:border-gray-700/50 divide-y divide-gray-100 dark:divide-gray-700/50">
              {[
                { bank: 'Crédit Agricole', steps: 'Espace client → Mes comptes → ⋮ → Télécharger les opérations → CSV' },
                { bank: 'BNP Paribas', steps: 'Mes comptes → Consulter les opérations → Exporter → CSV' },
                { bank: 'Société Générale', steps: 'Mes comptes → Relevés et documents → Télécharger → CSV' },
                { bank: 'LCL', steps: 'Mon compte → Mes opérations → Exporter → Format CSV' },
                { bank: 'Boursorama / Boursobank', steps: 'Compte → Opérations → Télécharger → CSV' },
                { bank: 'Fortuneo', steps: 'Mon compte → Mes opérations → Exporter en CSV' },
                { bank: 'Revolut', steps: 'Profil → Relevés → Sélectionner la période → Exporter CSV' },
                { bank: 'N26', steps: 'Compte → Relevés → Télécharger → CSV' },
              ].map(({ bank, steps }) => (
                <div key={bank} className="px-4 py-3">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-0.5">{bank}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{steps}</p>
                </div>
              ))}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-400 dark:text-gray-500">Tu ne trouves pas ta banque ? La plupart des banques proposent l'export CSV depuis la section "Mes opérations" ou "Relevés".</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-5 leading-relaxed">
          Ton fichier est analysé puis supprimé. On ne garde rien, on ne partage rien.
        </p>

        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Tu préfères connecter ta banque directement ?</p>
          <button
            onClick={() => router.push('/accounts')}
            className="inline-flex items-center gap-2 text-sm text-[#1D9E75] hover:text-[#178a65] font-medium transition-colors"
          >
            <span>🏦</span>
            Connexion bancaire directe →
          </button>
        </div>
      </div>
    </main>
  )
}
