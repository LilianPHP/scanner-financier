import Link from 'next/link'

export default function Confidentialite() {
  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>

        <h1 className="text-2xl font-medium mb-8">Politique de confidentialité</h1>

        <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 space-y-8 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Ce qu'on collecte</h2>
            <p>Pour utiliser Scanner Financier, nous collectons uniquement :</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-500 dark:text-gray-400">
              <li>Ton adresse email (pour la connexion)</li>
              <li>Les transactions extraites de ton relevé bancaire (date, libellé, montant, catégorie)</li>
              <li>Tes règles de catégorisation personnalisées si tu choisis de les mémoriser</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Ce qu'on ne collecte pas</h2>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-500 dark:text-gray-400">
              <li>Ton fichier bancaire original — il est analysé puis immédiatement supprimé</li>
              <li>Ton numéro de compte, IBAN ou données bancaires sensibles</li>
              <li>Données de navigation, cookies publicitaires</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Comment tes données sont utilisées</h2>
            <p>Les transactions extraites sont utilisées uniquement pour produire ton analyse financière personnelle. Elles ne sont ni vendues, ni partagées avec des tiers, ni utilisées à des fins publicitaires.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Stockage et sécurité</h2>
            <p>Tes données sont stockées sur <strong>Supabase</strong> avec chiffrement au repos. Chaque utilisateur n'a accès qu'à ses propres données grâce aux politiques de sécurité au niveau ligne (Row Level Security).</p>
            <p className="mt-2">L'authentification est gérée par Supabase Auth. Aucun mot de passe n'est stocké en clair.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Intelligence artificielle</h2>
            <p>Pour catégoriser certaines transactions, nous utilisons l'API Claude d'Anthropic. Seuls les libellés des transactions (sans montants ni informations personnelles) sont transmis pour classification. Anthropic ne conserve pas ces données au-delà du traitement.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Tes droits</h2>
            <p>Conformément au RGPD, tu disposes d'un droit d'accès, de rectification et de suppression de tes données. Pour exercer ces droits ou supprimer ton compte, contacte-nous à <a href="mailto:contact@scanner-financier.app" className="text-blue-500 hover:underline">contact@scanner-financier.app</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-200 mb-3">Cookies</h2>
            <p>Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement de l'authentification. Aucun cookie publicitaire ou de tracking n'est utilisé.</p>
          </section>

        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">Dernière mise à jour : mars 2026</p>
      </div>
    </main>
  )
}
