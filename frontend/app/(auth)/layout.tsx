/**
 * Auth layout — fills the viewport without any width cap.
 * Each auth page is responsible for its own internal width / layout.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-page)', color: 'var(--fg)' }}>
      {children}
    </div>
  )
}
