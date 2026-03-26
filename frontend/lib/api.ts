import { supabase } from './supabase'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Non authentifié')
  return { Authorization: `Bearer ${token}` }
}

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options)
  } catch {
    throw new Error('Serveur inaccessible — vérifie que le backend est lancé sur le port 8000')
  }
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

export type Subscription = {
  label: string
  occurrences: number
  monthly_cost: number
  annual_cost: number
}

export type UploadResult = {
  file_id: string
  filename: string
  transactions: Transaction[]
  summary: AnalysisSummary
  by_category: CategoryData[]
  timeline: MonthlyData[]
  subscriptions?: Subscription[]
}

// Upload d'un fichier
export async function uploadFile(file: File): Promise<UploadResult> {
  const headers = await getAuthHeader()
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiFetch(`${BACKEND_URL}/files/upload`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `Erreur serveur (${response.status})`)
  }

  return response.json()
}

// Récupérer les transactions d'un fichier
export async function getTransactions(fileId: string): Promise<Transaction[]> {
  const headers = await getAuthHeader()

  const response = await apiFetch(`${BACKEND_URL}/transactions/${fileId}`, { headers })

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

  const response = await apiFetch(`${BACKEND_URL}/transactions/${txId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, propagate }),
  })

  if (!response.ok) {
    const status = response.status
    if (status === 401) throw new Error('401')
    if (status === 404) throw new Error('Transaction introuvable en base')
    throw new Error(`Erreur serveur (${status})`)
  }

  return response.json()
}

// Récupérer l'analytics d'un fichier
export async function getAnalytics(fileId: string) {
  const headers = await getAuthHeader()

  const [summary, categories, timeline] = await Promise.all([
    apiFetch(`${BACKEND_URL}/analytics/${fileId}/summary`, { headers }).then(r => r.json()),
    apiFetch(`${BACKEND_URL}/analytics/${fileId}/categories`, { headers }).then(r => r.json()),
    apiFetch(`${BACKEND_URL}/analytics/${fileId}/timeline`, { headers }).then(r => r.json()),
  ])

  return { summary, categories, timeline }
}

// Type pour l'historique des fichiers
export type UploadedFile = {
  id: string
  filename: string
  file_type: string
  transaction_count: number
  created_at: string
  // Jointure avec analysis_results (peut être null si pas encore calculé)
  income_total?: number
  expense_total?: number
  cashflow?: number
  savings_rate?: number
}

// Récupérer l'historique des fichiers de l'utilisateur
export async function getUploadHistory(): Promise<UploadedFile[]> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Non authentifié')
  const userId = session.session.user.id

  // Récupérer les fichiers
  const { data: files, error: filesError } = await supabase
    .from('uploaded_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (filesError) throw new Error(filesError.message)
  if (!files || files.length === 0) return []

  // Récupérer les analytics pour chaque fichier
  const fileIds = files.map(f => f.id)
  const { data: analytics } = await supabase
    .from('analysis_results')
    .select('*')
    .in('file_id', fileIds)

  // Fusionner — on prend uniquement les champs financiers pour éviter
  // que l'`id` de analysis_results écrase le file_id
  const analyticsMap = Object.fromEntries((analytics || []).map(a => [a.file_id, a]))

  return files.map(f => {
    const a = analyticsMap[f.id]
    return {
      ...f,
      income_total: a?.income_total,
      expense_total: a?.expense_total,
      cashflow: a?.cashflow,
      savings_rate: a?.savings_rate,
    }
  })
}

// Recharger une analyse passée depuis le backend → sessionStorage → dashboard
export async function loadAnalysis(fileId: string): Promise<UploadResult> {
  const headers = await getAuthHeader()

  const [txRes, summaryRes, categoriesRes, timelineRes] = await Promise.all([
    apiFetch(`${BACKEND_URL}/transactions/${fileId}`, { headers }),
    apiFetch(`${BACKEND_URL}/analytics/${fileId}/summary`, { headers }),
    apiFetch(`${BACKEND_URL}/analytics/${fileId}/categories`, { headers }),
    apiFetch(`${BACKEND_URL}/analytics/${fileId}/timeline`, { headers }),
  ])

  if (!txRes.ok || !summaryRes.ok || !categoriesRes.ok || !timelineRes.ok) {
    const failed = !txRes.ok ? txRes : !summaryRes.ok ? summaryRes : !categoriesRes.ok ? categoriesRes : timelineRes
    if (failed.status === 503 || failed.status === 0) {
      throw new Error('Le serveur se réveille — réessaie dans quelques secondes')
    }
    if (failed.status === 401) {
      throw new Error('Session expirée — reconnecte-toi')
    }
    if (failed.status === 404) {
      throw new Error('Analyse introuvable — ce fichier a peut-être été supprimé')
    }
    throw new Error(`Erreur serveur (${failed.status}) — réessaie`)
  }

  const [txData, summary, categoriesData, timelineData] = await Promise.all([
    txRes.json(),
    summaryRes.json(),
    categoriesRes.json(),
    timelineRes.json(),
  ])

  return {
    file_id: fileId,
    filename: '',
    transactions: txData.transactions,
    summary,
    by_category: categoriesData.by_category,
    subscriptions: categoriesData.subscriptions,
    timeline: timelineData.timeline,
  }
}

// Sauvegarder une règle de catégorisation personnalisée
export async function saveRule(labelClean: string, category: string): Promise<void> {
  const headers = await getAuthHeader()
  const response = await apiFetch(`${BACKEND_URL}/rules`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ label_pattern: labelClean.toLowerCase(), category }),
  })
  if (!response.ok) throw new Error('Erreur lors de la sauvegarde de la règle')
}

export type CategoryRule = {
  label_pattern: string
  category: string
  created_at: string
}

export async function getRules(): Promise<CategoryRule[]> {
  const headers = await getAuthHeader()
  const response = await apiFetch(`${BACKEND_URL}/rules`, { headers })
  if (!response.ok) throw new Error('Erreur lors de la récupération des règles')
  const data = await response.json()
  return data.rules
}

export async function deleteRule(labelPattern: string): Promise<void> {
  const headers = await getAuthHeader()
  const response = await apiFetch(`${BACKEND_URL}/rules/${encodeURIComponent(labelPattern)}`, {
    method: 'DELETE',
    headers,
  })
  if (!response.ok) throw new Error('Erreur lors de la suppression')
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
