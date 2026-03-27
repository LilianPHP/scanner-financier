interface SenzioLogoProps {
  className?: string
  height?: number
}

export function SenzioLogo({ className = '', height = 28 }: SenzioLogoProps) {
  return (
    <img
      src="/logo-glass.svg"
      alt="Senzio"
      height={height}
      className={className}
      style={{ height, width: 'auto' }}
    />
  )
}
