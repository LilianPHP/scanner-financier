'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SenzioLogo } from '@/components/SenzioLogo'

function translateAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (msg.includes('Email not confirmed')) return 'Confirme ton email avant de te connecter.'
  if (msg.includes('Too many requests')) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  if (msg.includes('User not found')) return 'Aucun compte trouvé avec cet email.'
  return 'Erreur de connexion. Réessaie.'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/upload')
    } catch (err: any) {
      setError(translateAuthError(err.message || ''))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError('Entre ton email pour réinitialiser ton mot de passe.'); return }
    setError('')
    await supabase.auth.resetPasswordForEmail(email)
    setResetSent(true)
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] dark:bg-[#111110] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Link href="/" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors">← Accueil</Link>
          <span className="text-gray-300">|</span>
          <SenzioLogo height={26} />
        </div>
        <div className="bg-white dark:bg-[#1c1c1a] border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8">
          <h1 className="text-xl font-medium mb-6">Connexion</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-[#1D9E75] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:focus:border-[#1D9E75]"
                placeholder="ton@email.com"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-[#1D9E75] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:focus:border-[#1D9E75]"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {resetSent && (
              <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg px-3 py-2">
                Email envoyé ! Vérifie ta boîte mail.
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a1a] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleForgotPassword}
              className="text-sm text-[#1D9E75] hover:underline"
            >
              Mot de passe oublié ?
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Link href="/signup" className="text-[#1D9E75] hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
