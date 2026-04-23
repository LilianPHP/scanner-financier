'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SenzioLogo } from '@/components/SenzioLogo'

function getPasswordStrength(pwd: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++
  if (score === 0) return { score: 1, label: 'Faible', color: '#E24B4A' }
  if (score === 1) return { score: 2, label: 'Moyen', color: '#F59E0B' }
  return { score: 3, label: 'Fort', color: '#1D9E75' }
}

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const strength = getPasswordStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (data.session) {
        router.push('/upload')
      } else {
        setDone(true)
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-3xl mb-4">📧</div>
          <h2 className="font-medium text-lg mb-2 dark:text-white">Vérifie ta boîte mail</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Un email de confirmation a été envoyé à <strong>{email}</strong>. Clique sur le lien pour activer ton compte.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <SenzioLogo height={46} />
        </div>
        <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8">
          <h1 className="text-xl font-medium mb-6 dark:text-white">Créer un compte</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:border-[#1D9E75] dark:text-gray-100 dark:focus:border-[#1D9E75]"
                placeholder="ton@email.com"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-10 text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:border-[#1D9E75] dark:text-gray-100 dark:focus:border-[#1D9E75]"
                  placeholder="minimum 6 caractères"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: i <= strength.score ? strength.color : '#e5e7eb',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strength.color }}>
                    {strength.label}
                    {strength.score === 1 && ' — ajoute des chiffres et majuscules'}
                    {strength.score === 2 && ' — ajoute un caractère spécial pour renforcer'}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1D9E75] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#178a64] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-[#1D9E75] hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
