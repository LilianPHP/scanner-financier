interface SenzioLogoProps {
  className?: string
  height?: number
}

export function SenzioLogo({ className = '', height = 24 }: SenzioLogoProps) {
  const width = Math.round(height * (520 / 160))

  return (
    <>
      {/* Light mode: solid version */}
      <img
        src="/logo-solid.svg"
        alt="Senzio"
        width={width}
        height={height}
        className={`block dark:hidden ${className}`}
        style={{ height, width: 'auto' }}
      />
      {/* Dark mode: glass version */}
      <img
        src="/logo-glass.svg"
        alt="Senzio"
        width={width}
        height={height}
        className={`hidden dark:block ${className}`}
        style={{ height, width: 'auto' }}
      />
    </>
  )
}
