export function SenzioMark({ size = 44 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: '#1D9E75',
        boxShadow: '0 0 40px rgba(29,158,117,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 32 32" fill="none">
        <rect x="3"  y="17" width="5" height="10" rx="1" fill="white" opacity="0.9"/>
        <rect x="12" y="10" width="5" height="17" rx="1" fill="white"/>
        <rect x="21" y="4"  width="5" height="23" rx="1" fill="white" opacity="0.7"/>
      </svg>
    </div>
  )
}
