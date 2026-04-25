import { PageShell } from '@/components/PageShell'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-page)', color: 'var(--fg)' }}>
      <PageShell>{children}</PageShell>
    </div>
  )
}
