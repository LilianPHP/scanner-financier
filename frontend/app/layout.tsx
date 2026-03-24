import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scanner Financier — Analyse tes dépenses en un clic',
  description: 'Dépose ton relevé bancaire et découvre instantanément où part ton argent. Analyse automatique, dashboard clair, 100% privé.',
  openGraph: {
    title: 'Scanner Financier — Dépose ton relevé, découvre où part ton argent',
    description: 'Analyse instantanée de ton relevé bancaire. Catégories, graphiques, abonnements détectés. Gratuit et 100% privé.',
    url: 'https://scanner-financier-app.vercel.app',
    siteName: 'Scanner Financier',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Scanner Financier',
    description: 'Analyse ton relevé bancaire en 30 secondes. Gratuit, privé, sans connexion bancaire.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
