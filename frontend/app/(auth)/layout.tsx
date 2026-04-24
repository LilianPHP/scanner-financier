// Auth layout — no bottom nav, full screen, centered at 520px
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-page)', color: 'var(--fg)' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100dvh' }}>
        {children}
      </div>
    </div>
  )
}
