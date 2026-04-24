import { BottomNav } from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-page)', color: 'var(--fg)' }}>
      {/* Outer container — matches HTML prototype maxWidth: 1024 */}
      <div style={{ maxWidth: 1024, margin: '0 auto', position: 'relative', minHeight: '100dvh' }}>
        <div className="pb-24">
          {children}
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
