'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#f5f5f2] flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-3xl mb-4">📧</div>
          <h2 className="font-medium text-lg mb-2">Vérifie ta boîte mail</h2>
          <p className="text-sm text-gray-500">
            Un email de confirmation a été envoyé à <strong>{email}</strong>. Clique sur le lien pour activer ton compte.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f5f2] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-center text-sm font-medium tracking-widest text-gray-400 uppercase mb-8">
          Scanner Financier
        </p>
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <h1 className="text-xl font-medium mb-6">Créer un compte</h1>
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
                minLength={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-blue-400"
                placeholder="minimum 6 caractères"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#378ADD] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>
          <p className="text-sm text-gray-500 text-center mt-4">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-blue-500 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
