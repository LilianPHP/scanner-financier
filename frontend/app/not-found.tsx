import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-6xl font-medium text-gray-200 dark:text-gray-700 mb-4">404</p>
        <h1 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">Page introuvable</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#1D9E75] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#178a64] transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </main>
  )
}
