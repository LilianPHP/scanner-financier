'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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
    <main className="min-h-screen bg-[#f5f5f2] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-center text-sm font-medium tracking-widest text-gray-400 uppercase mb-8">
          Scanner Financier
        </p>
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <h1 className="text-xl font-medium mb-6">Connexion</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-blue-400"
                placeholder="ton@email.com"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-blue-400"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {resetSent && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
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
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Mot de passe oublié ?
            </button>
            <p className="text-sm text-gray-500">
              <Link href="/signup" className="text-blue-500 hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
