import { BottomNav } from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-page)', color: 'var(--fg)', position: 'relative' }}>
      <div className="pb-24">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
