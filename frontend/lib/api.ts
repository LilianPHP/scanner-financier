import { supabase } from './supabase'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Non authentifié')
  return { Authorization: `Bearer ${token}` }
}

export type Transaction = {
  id: string
  file_id: string
  date: string
  label_raw: string
  label_clean: string
  amount: number
  direction: 'debit' | 'credit'
  category: string
}

export type AnalysisSummary = {
  income_total: number
  expense_total: number
  cashflow: number
  savings_rate: number
  transaction_count: number
}

export type CategoryData = {
  category: string
  total: number
}

export type MonthlyData = {
  month: string
  income: number
  expense: number
  cashflow: number
}

export type UploadResult = {
  file_id: string
  filename: string
  transactions: Transaction[]
  summary: AnalysisSummary
  by_category: CategoryData[]
  timeline: MonthlyData[]
}

// Upload d'un fichier
export async function uploadFile(file: File): Promise<UploadResult> {
  const headers = await getAuthHeader()
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${BACKEND_URL}/files/upload`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Erreur lors de l\'upload')
  }

  return response.json()
}

// Récupérer les transactions d'un fichier
export async function getTransactions(fileId: string): Promise<Transaction[]> {
  const headers = await getAuthHeader()

  const response = await fetch(`${BACKEND_URL}/transactions/${fileId}`, {
    headers,
  })

  if (!response.ok) throw new Error('Erreur lors de la récupération des transactions')

  const data = await response.json()
  return data.transactions
}

// Mettre à jour la catégorie d'une transaction
export async function updateCategory(
  txId: string,
  category: string,
  propagate = false
): Promise<{ total_updated: number }> {
  const headers = await getAuthHeader()

  const response = await fetch(`${BACKEND_URL}/transactions/${txId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, propagate }),
  })

  if (!response.ok) throw new Error('Erreur lors de la mise à jour')

  return response.json()
}

// Récupérer l'analytics d'un fichier
export async function getAnalytics(fileId: string) {
  const headers = await getAuthHeader()

  const [summary, categories, timeline] = await Promise.all([
    fetch(`${BACKEND_URL}/analytics/${fileId}/summary`, { headers }).then(r => r.json()),
    fetch(`${BACKEND_URL}/analytics/${fileId}/categories`, { headers }).then(r => r.json()),
    fetch(`${BACKEND_URL}/analytics/${fileId}/timeline`, { headers }).then(r => r.json()),
  ])

  return { summary, categories, timeline }
}

// Formater un montant en euros
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Labels français des catégories
export const CATEGORY_LABELS: Record<string, string> = {
  alimentation: 'Alimentation',
  logement: 'Logement',
  transport: 'Transport',
  loisirs: 'Loisirs',
  abonnements: 'Abonnements',
  salaire: 'Salaire / Revenus',
  'frais bancaires': 'Frais bancaires',
  sante: 'Santé',
  investissement: 'Investissement',
  epargne: 'Épargne',
  impots: 'Impôts / Taxes',
  autres: 'Autres',
}

export const CATEGORY_COLORS: Record<string, string> = {
  alimentation: '#4CAF50',
  logement: '#2196F3',
  transport: '#FF9800',
  loisirs: '#9C27B0',
  abonnements: '#00BCD4',
  salaire: '#1D9E75',
  'frais bancaires': '#607D8B',
  sante: '#F44336',
  investissement: '#3F51B5',
  epargne: '#009688',
  impots: '#795548',
  autres: '#9E9E9E',
}
