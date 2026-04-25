import { BottomNav } from '@/components/BottomNav'
import { PageShell } from '@/components/PageShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-page)', color: 'var(--fg)', position: 'relative' }}>
      <PageShell>
        <div className="pb-24">{children}</div>
      </PageShell>
      <BottomNav />
    </div>
  )
}
