'use client'
import { useState } from 'react'
import { SenzioMark } from './SenzioMark'

interface Props {
  title: string
  subtitle: string
  onComplete: (pin: string) => void
  onBack?: () => void
}

export function PinScreen({ title, subtitle, onComplete, onBack }: Props) {
  const [value, setValue] = useState('')

  function tap(digit: string) {
    if (value.length >= 4) return
    const next = value + digit
    setValue(next)
    if (next.length === 4) setTimeout(() => onComplete(next), 220)
  }

  function erase() {
    setValue(v => v.slice(0, -1))
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-page)', color: 'var(--fg)' }}>
      <div className="px-5 pt-5">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Retour
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 max-w-sm mx-auto w-full">
        <SenzioMark size={40} />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>{title}</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--fg-2)' }}>{subtitle}</p>

        {/* Dots */}
        <div className="flex justify-center gap-4 mt-12">
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className="w-4 h-4 rounded-full transition-all duration-150"
              style={{
                background: value.length > i ? '#1D9E75' : 'transparent',
                border: `1.5px solid ${value.length > i ? '#1D9E75' : 'var(--fg-4)'}`,
                boxShadow: value.length === i + 1 ? '0 0 12px rgba(29,158,117,0.5)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 px-8 pb-10 max-w-xs mx-auto w-full">
        {keys.map((k, idx) => {
          if (k === '') return <div key={idx} />
          const isErase = k === '⌫'
          return (
            <button
              key={k}
              onClick={isErase ? erase : () => tap(k)}
              aria-label={isErase ? 'Effacer' : `Chiffre ${k}`}
              className="flex items-center justify-center text-xl font-medium rounded-2xl transition-all active:scale-95"
              style={{
                height: 64,
                background: 'var(--bg-card-hi)',
                border: '1px solid var(--border)',
                color: isErase ? 'var(--fg-3)' : 'var(--fg)',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {k}
            </button>
          )
        })}
      </div>
    </div>
  )
}
