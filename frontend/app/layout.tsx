import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scanner Financier — Analyse tes dépenses en un clic',
  description: 'Dépose ton relevé bancaire et découvre instantanément où part ton argent. Analyse IA, dashboard clair, 100% privé.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
