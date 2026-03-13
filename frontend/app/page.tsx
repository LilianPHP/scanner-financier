'use client'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f2]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="text-sm font-medium tracking-widest text-gray-500 uppercase">
          Scanner Financier
        </span>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5">
            Connexion
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-[#1a1a1a] text-white px-4 py-1.5 rounded-lg hover:bg-gray-800"
          >
            Commencer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 pt-20 pb-24 max-w-2xl mx-auto">
        <h1 className="text-4xl font-medium leading-tight mb-4">
          Dépose ton relevé bancaire.<br />
          Découvre où part ton argent.
        </h1>
        <p className="text-gray-500 text-lg mb-8 max-w-md">
          Analyse IA instantanée · Dashboard clair · Aucune connexion bancaire
        </p>
        <Link
          href="/signup"
          className="bg-[#378ADD] text-white px-8 py-3 rounded-xl text-base font-medium hover:bg-blue-600 transition-colors"
        >
          Analyser mon relevé gratuitement
        </Link>
        <p className="text-xs text-gray-400 mt-3">Gratuit · CSV, XLS, XLSX, PDF supportés</p>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 pb-24">
        <h2 className="text-center text-2xl font-medium mb-10">Comment ça marche ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Dépose ton relevé', desc: 'Glisse-dépose ton fichier CSV, XLS ou PDF. Aucune saisie manuelle.' },
            { step: '2', title: 'Analyse automatique', desc: 'L\'IA catégorise toutes tes transactions en quelques secondes.' },
            { step: '3', title: 'Dashboard clair', desc: 'Visualise tes dépenses par catégorie, ton cashflow et tes habitudes.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="w-8 h-8 bg-[#378ADD] text-white rounded-lg flex items-center justify-center text-sm font-medium mb-3">
                {step}
              </div>
              <h3 className="font-medium mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="text-center pb-16 px-4">
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          Tes données sont analysées de manière éphémère. Aucun fichier n'est partagé avec des tiers.
        </p>
      </section>
    </main>
  )
}
