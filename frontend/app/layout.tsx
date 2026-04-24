import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Senzio — Analyse tes dépenses en un clic',
  description: 'Dépose ton relevé bancaire et découvre instantanément où part ton argent. Analyse automatique, dashboard clair, 100% privé.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'Senzio — Dépose ton relevé, découvre où part ton argent',
    description: 'Analyse instantanée de ton relevé bancaire. Catégories, graphiques, abonnements détectés. Gratuit et 100% privé.',
    url: 'https://senzio.app',
    siteName: 'Senzio',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Senzio',
    description: 'Analyse ton relevé bancaire en 30 secondes. Gratuit, privé, sans connexion bancaire.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* No-flash script : lit localStorage avant hydration */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light')}})()` }} />
        {/* Plausible analytics — respecte la vie privée, pas de cookies */}
        <script defer data-domain="senzio.app" src="https://plausible.io/js/script.js" />
      </head>
      <body style={{ background: 'var(--bg-page)', color: 'var(--fg)', transition: 'background 200ms, color 200ms' }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
