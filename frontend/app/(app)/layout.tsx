import { BottomNav } from '@/components/BottomNav'
import { DesktopSidebar } from '@/components/DesktopSidebar'
import { PageShell } from '@/components/PageShell'

/**
 * App layout (post-auth):
 *
 * - Mobile/tablet (<1024px): single column, BottomNav fixed at bottom,
 *   content centered at 520px (native app feel)
 * - Desktop (>=1024px): fixed left Sidebar (240px), no BottomNav,
 *   content offset by sidebar width and expanded to 1080px (cockpit)
 *
 * Each page is wrapped in <PageShell> for consistent widths.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-page)', color: 'var(--fg)' }}>
      <DesktopSidebar />

      <main className="lg:pl-[240px]">
        <PageShell>
          <div className="pb-24 lg:pb-10">{children}</div>
        </PageShell>
      </main>

      <BottomNav />
    </div>
  )
}
