'use client'
import { useRouter } from 'next/navigation'
import { Avatar } from './Avatar'

/**
 * Header for sub-pages (accounts, goals/[id], goals/new, etc.).
 * ← back / centered title / avatar.
 */
export function SubHeader({
  title,
  onBack,
  showAvatar = true,
}: {
  title: string
  onBack?: () => void
  showAvatar?: boolean
}) {
  const router = useRouter()
  const handleBack = onBack ?? (() => router.back())
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-4">
      <button
        onClick={handleBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        aria-label="Retour"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--fg-2)' }}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1 className="text-base font-semibold" style={{ letterSpacing: '-0.01em' }}>
        {title}
      </h1>
      {showAvatar ? <Avatar size={36} /> : <div style={{ width: 36, height: 36 }} />}
    </div>
  )
}
