'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// L'upload de fichier n'est plus disponible.
// Les données viennent exclusivement via la connexion bancaire (Powens).
export default function UploadRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/accounts') }, [router])
  return null
}
