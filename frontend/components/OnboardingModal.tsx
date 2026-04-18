'use client'
import { useState } from 'react'
import { saveProfile, type UserProfile } from '@/lib/api'

type Props = {
  onDone: (profile: UserProfile) => void
}

const QUESTIONS = [
  { key: 'is_student', label: 'Tu es étudiant·e ou en formation ?', emoji: '🎓', sub: 'Activera la catégorie Éducation' },
  { key: 'travels_often', label: 'Tu voyages régulièrement ?', emoji: '✈️', sub: 'Activera la catégorie Voyage' },
  { key: 'has_children', label: 'Tu as des enfants ?', emoji: '👶', sub: 'Activera la catégorie Enfants (bientôt)' },
  { key: 'has_pet', label: 'Tu as un animal de compagnie ?', emoji: '🐾', sub: 'Activera la catégorie Animaux (bientôt)' },
] as const

export function OnboardingModal({ onDone }: Props) {
  const [answers, setAnswers] = useState({ is_student: false, travels_often: false, has_children: false, has_pet: false })
  const [saving, setSaving] = useState(false)

  function toggle(key: keyof typeof answers) {
    setAnswers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit() {
    setSaving(true)
    await saveProfile(answers)
    onDone({ ...answers, onboarding_done: true })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1c1c1a] rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-xs font-semibold tracking-widest uppercase text-[#1D9E75] mb-3">Personnalisation</div>
        <h2 className="text-2xl font-bold tracking-tight mb-1 dark:text-white">Parle-nous de toi</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
          Pour adapter les catégories à ton mode de vie. Tu pourras modifier ça plus tard.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {QUESTIONS.map(({ key, label, emoji, sub }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all ${
                answers[key]
                  ? 'border-[#1D9E75] bg-[#1D9E75]/8 dark:bg-[#1D9E75]/12'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="flex-1">
                <span className="block text-sm font-medium dark:text-white">{label}</span>
                <span className="block text-xs text-gray-400 dark:text-gray-500">{sub}</span>
              </span>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                answers[key] ? 'bg-[#1D9E75] border-[#1D9E75]' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {answers[key] && <span className="text-white text-xs">✓</span>}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-[#1D9E75] text-white rounded-xl py-3 font-semibold text-sm hover:bg-[#178a65] transition-colors disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Continuer →'}
        </button>
      </div>
    </div>
  )
}
