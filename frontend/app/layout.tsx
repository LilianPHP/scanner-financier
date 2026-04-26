import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Senzio — Connecte ta banque, comprends ton argent',
  description: 'Synchronise tes transactions bancaires via Powens (agréé ACPR), catégorise tes dépenses et suis tes objectifs financiers. Lecture seule. Aucun accès à tes identifiants.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'Senzio — Connecte ta banque, comprends ton argent',
    description: 'Synchronisation bancaire sécurisée via Powens. Catégorisation automatique, dashboard, budgets et objectifs.',
    url: 'https://senzio.app',
    siteName: 'Senzio',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Senzio',
    description: 'Connecte ta banque. Comprends ton argent. Atteins tes objectifs.',
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
