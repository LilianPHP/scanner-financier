import Link from 'next/link'

export default function MentionsLegales() {
  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>

        <h1 className="text-2xl font-medium mb-8">Mentions légales</h1>

        <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 space-y-8 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Éditeur du site</h2>
            <p>Scanner Financier est un service édité à titre personnel.</p>
            <p className="mt-2">Contact : <a href="mailto:contact@scanner-financier.app" className="text-blue-500 hover:underline">contact@scanner-financier.app</a></p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Hébergement</h2>
            <p>Le frontend est hébergé sur <strong>Vercel Inc.</strong> (440 N Barranca Ave #4133, Covina, CA 91723, États-Unis).</p>
            <p className="mt-2">Le backend est hébergé sur <strong>Railway Corp.</strong> (340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis).</p>
            <p className="mt-2">Les données utilisateurs sont stockées sur <strong>Supabase Inc.</strong> (970 Toa Payoh North, Singapour).</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Propriété intellectuelle</h2>
            <p>L'ensemble du contenu de ce site (textes, interfaces, code) est la propriété exclusive de l'éditeur. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Limitation de responsabilité</h2>
            <p>Scanner Financier est un outil d'analyse personnel. Les résultats fournis sont indicatifs et ne constituent en aucun cas un conseil financier, fiscal ou juridique. L'éditeur ne saurait être tenu responsable des décisions prises sur la base des analyses produites par le service.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Droit applicable</h2>
            <p>Le présent site est soumis au droit français. Tout litige relatif à son utilisation sera soumis à la compétence exclusive des tribunaux français.</p>
          </section>

        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">Dernière mise à jour : mars 2026</p>
      </div>
    </main>
  )
}
