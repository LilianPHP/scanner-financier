'use client'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SenzioLogo } from '@/components/SenzioLogo'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <SenzioLogo height={30} />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-3 py-1.5">
            Connexion
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] px-4 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200"
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
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 max-w-md">
          Analyse instantanée · Résultat clair en 30 secondes · Aucune connexion bancaire
        </p>
        <Link
          href="/signup"
          className="bg-[#1D9E75] text-white px-8 py-3 rounded-xl text-base font-medium hover:bg-[#178a64] transition-colors"
        >
          Analyser mon relevé gratuitement
        </Link>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Gratuit · CSV, XLS, XLSX, PDF supportés</p>
      </section>

      {/* Dashboard preview mockup */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">Aperçu du résultat</p>

        {/* Browser chrome */}
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1c1c1a]">
          {/* Browser bar */}
          <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/50 px-4 py-2.5 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white dark:bg-[#1c1c1a] rounded-md px-3 py-1 text-xs text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700/50 max-w-xs mx-auto text-center">
              senzio-app.vercel.app
            </div>
          </div>

          {/* Dashboard UI */}
          <div className="bg-[#f5f5f2] dark:bg-[#111110] p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">Voilà où va ton argent</p>
              <div className="flex gap-2">
                <span className="text-xs bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-lg px-2 py-1 text-gray-400 dark:text-gray-500">148 transactions</span>
                <span className="text-xs border border-gray-200 dark:border-gray-700/50 rounded-lg px-2 py-1 text-gray-400 dark:text-gray-500 bg-white dark:bg-[#1c1c1a]">Historique</span>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Revenus', value: '2 800 €', color: 'text-[#1D9E75]' },
                { label: 'Dépenses', value: '2 100 €', color: 'text-[#E24B4A]' },
                { label: "Ce qu'il te reste", value: '700 €', color: 'text-[#1D9E75]' },
                { label: 'Mis de côté', value: '25%', color: 'text-[#1D9E75]' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{kpi.label}</p>
                  <p className={`text-lg font-medium ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {/* Pie chart */}
              <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-4">
                <p className="text-xs font-medium mb-3">Dépenses par catégorie</p>
                <div className="flex items-center gap-4">
                  {/* CSS conic pie */}
                  <div className="relative flex-shrink-0">
                    <div className="w-24 h-24 rounded-full" style={{
                      background: 'conic-gradient(#4CAF50 0% 35%, #378ADD 35% 63%, #FF9800 63% 78%, #E4A853 78% 90%, #9E9E9E 90% 100%)'
                    }} />
                    <div className="absolute inset-0 m-auto w-12 h-12 bg-white dark:bg-[#1c1c1a] rounded-full" />
                  </div>
                  {/* Legend */}
                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 flex-1">
                    {[
                      { label: 'Alimentation', color: '#4CAF50', pct: '35%' },
                      { label: 'Logement', color: '#378ADD', pct: '28%' },
                      { label: 'Transport', color: '#FF9800', pct: '15%' },
                      { label: 'Loisirs', color: '#E4A853', pct: '12%' },
                      { label: 'Autres', color: '#9E9E9E', pct: '10%' },
                    ].map(d => (
                      <div key={d.label} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm inline-block flex-shrink-0" style={{ background: d.color }} />
                          {d.label}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">{d.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bar chart */}
              <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-4">
                <p className="text-xs font-medium mb-3">Revenus et dépenses par mois</p>
                <div className="flex items-end gap-4 h-20 px-2">
                  {[
                    { month: 'Jan', income: 90, expense: 72 },
                    { month: 'Fév', month2: '', income: 90, expense: 85 },
                    { month: 'Mar', income: 90, expense: 68 },
                  ].map(m => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end gap-1 w-full justify-center" style={{ height: '64px' }}>
                        <div className="w-4 rounded-t-sm bg-[#1D9E75]" style={{ height: `${m.income}%` }} />
                        <div className="w-4 rounded-t-sm bg-[#E24B4A]" style={{ height: `${m.expense}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{m.month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-2 justify-center">
                  <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-sm bg-[#1D9E75] inline-block" />Revenus</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-sm bg-[#E24B4A] inline-block" />Dépenses</span>
                </div>
              </div>
            </div>

            {/* Transactions preview */}
            <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-xl p-4">
              <p className="text-xs font-medium mb-3">Transactions <span className="text-gray-400 dark:text-gray-500 font-normal">(148)</span></p>
              <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-700/50">
                {[
                  { date: '02/03', label: 'Netflix', cat: 'Abonnements', color: '#00BCD4', amount: '-18 €' },
                  { date: '03/03', label: 'Carrefour City', cat: 'Alimentation', color: '#4CAF50', amount: '-85 €' },
                  { date: '05/03', label: 'SNCF Ouigo', cat: 'Transport', color: '#FF9800', amount: '-45 €' },
                  { date: '10/03', label: 'Virement salaire', cat: 'Salaire / Revenus', color: '#1D9E75', amount: '+2 800 €' },
                ].map(tx => (
                  <div key={tx.label} className="flex items-center gap-3 py-2 text-xs">
                    <span className="text-gray-400 dark:text-gray-500 w-10 flex-shrink-0">{tx.date}</span>
                    <span className="flex-1 text-gray-700 dark:text-gray-200">{tx.label}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0" style={{ color: tx.color, background: tx.color + '22', border: `1px solid ${tx.color}55` }}>{tx.cat}</span>
                    <span className={`font-medium flex-shrink-0 ${tx.amount.startsWith('+') ? 'text-[#1D9E75]' : ''}`}>{tx.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 pb-12 md:pb-24">
        <h2 className="text-center text-2xl font-medium mb-10">Comment ça marche ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Dépose ton relevé', desc: 'Glisse-dépose ton fichier CSV, XLS ou PDF. Aucune saisie manuelle.' },
            { step: '2', title: 'Analyse automatique', desc: 'Toutes tes transactions sont triées par catégorie en quelques secondes.' },
            { step: '3', title: 'Résumé clair', desc: 'Vois exactement où va ton argent, mois par mois.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="w-8 h-8 bg-[#1D9E75] text-white rounded-lg flex items-center justify-center text-sm font-medium mb-3">
                {step}
              </div>
              <h3 className="font-medium mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="text-center pb-10 md:pb-16 px-4">
        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
          Ton fichier est analysé puis supprimé. On ne garde rien, on ne partage rien.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700/50 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span>© {new Date().getFullYear()} Senzio</span>
          <div className="flex gap-5">
            <a href="/mentions-legales" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Mentions légales</a>
            <a href="/confidentialite" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Confidentialité</a>
            <a href="mailto:contact@senzio.app" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
