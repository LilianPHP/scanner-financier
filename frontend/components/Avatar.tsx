'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Small green circular avatar with the user's first letter.
 * Auto-fetches the email from Supabase auth.
 */
export function Avatar({ size = 36 }: { size?: number }) {
  const [initial, setInitial] = useState('J')
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const em = data.session?.user?.email ?? ''
      if (em) setInitial(em.charAt(0).toUpperCase())
    })
  }, [])
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #1D9E75, #28c48f)',
        color: '#062A1E',
        fontSize: size < 40 ? 13 : 14,
      }}
    >
      {initial}
    </div>
  )
}
