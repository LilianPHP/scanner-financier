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
    throw new Error('Serveur inaccessible — réessaie dans quelques secondes')
  }
}

export type Transaction = {
  id: string
  file_id: string
  date: string
  label_raw: string
  label_clean: string
  amount: number          // toujours en EUR
  amount_original?: number // montant dans la devise d'origine
  currency?: string        // code ISO ex: "AUD", "USD", "EUR"
  direction: 'debit' | 'credit'
  category: string
  subcategory?: string
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

export type ScoreResult = {
  score: number
  label: string
  color: string
  details: {
    cashflow: number
    savings_rate: number
    investment: number
    diversification: number
  }
}

export type UploadResult = {
  file_id: string
  filename: string
  transactions: Transaction[]
  summary: AnalysisSummary
  by_category: CategoryData[]
  timeline: MonthlyData[]
  subscriptions?: Subscription[]
  score?: ScoreResult
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

  const result: UploadResult = await response.json()

  // Fetch score in parallel after upload (non-blocking on failure)
  try {
    const scoreRes = await apiFetch(`${BACKEND_URL}/analytics/${result.file_id}/score`, { headers })
    if (scoreRes.ok) result.score = await scoreRes.json()
  } catch { /* score is optional */ }

  return result
}

// Récupérer les transactions d'un fichier
export async function getTransactions(fileId: string): Promise<Transaction[]> {
  const headers = await getAuthHeader()

  const response = await apiFetch(`${BACKEND_URL}/transactions/${fileId}`, { headers })

  if (!response.ok) throw new Error('Erreur lors de la récupération des transactions')

  const data = await response.json()
  return data.transactions
}

// Mettre à jour la catégorie (et sous-catégorie) d'une transaction
export async function updateCategory(
  txId: string,
  category: string,
  propagate = false,
  subcategory?: string | null
): Promise<{ total_updated: number }> {
  const headers = await getAuthHeader()

  const response = await apiFetch(`${BACKEND_URL}/transactions/${txId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, propagate, subcategory: subcategory ?? null }),
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

// Profil utilisateur
export type UserProfile = {
  is_student: boolean
  travels_often: boolean
  has_children: boolean
  has_pet: boolean
  onboarding_done: boolean
}

export async function getProfile(): Promise<UserProfile | null> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return null
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', session.session.user.id)
    .single()
  return data as UserProfile | null
}

export async function saveProfile(profile: Omit<UserProfile, 'onboarding_done'> & { onboarding_done?: boolean }): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return
  await supabase.from('user_profiles').upsert({
    user_id: session.session.user.id,
    ...profile,
    onboarding_done: true,
  })
}

export function getActiveCategories(profile: UserProfile | null): Record<string, string> {
  const base: Record<string, string> = {
    alimentation: 'Alimentation', logement: 'Logement', transport: 'Transport',
    loisirs: 'Loisirs', abonnements: 'Abonnements', salaire: 'Salaire / Revenus',
    'frais bancaires': 'Frais bancaires', sante: 'Santé', investissement: 'Investissement',
    epargne: 'Épargne', impots: 'Impôts / Taxes', vetements: 'Vêtements', autres: 'Autres',
  }
  if (!profile || profile.is_student) base.education = 'Éducation'
  if (!profile || profile.travels_often) base.voyage = 'Voyage'
  return base
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

// ── Open Banking / Powens ─────────────────────────────────────────────────────

export type BankConnection = {
  id: string
  institution_name: string
  institution_logo: string
  status: 'active' | 'error' | 'pending'
  last_synced_at: string
  file_id: string | null
  created_at: string
}

export async function getBankConnectUrl(targetMonth?: string): Promise<{ webview_url: string; state: string }> {
  const headers = await getAuthHeader()
  // period_months=13 → max PSD2 access; user can pick any month later via target_month
  const params = new URLSearchParams({ period_months: '13' })
  if (targetMonth) params.set('target_month', targetMonth)
  const res = await apiFetch(`${BACKEND_URL}/banks/connect?${params}`, { headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Erreur ${res.status} — connexion bancaire impossible`)
  }
  return res.json()
}

// Résultat spécial : connexion réussie mais sync en cours (pas encore de transactions)
export class BankSyncingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BankSyncingError'
  }
}

export async function processBankCallback(
  connection_id: string,
  state: string
): Promise<UploadResult> {
  const headers = await getAuthHeader()
  const res = await apiFetch(`${BACKEND_URL}/banks/callback`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ connection_id, state }),
  })
  if (res.status === 202) {
    // Connexion OK mais sync en cours
    const body = await res.json().catch(() => ({}))
    throw new BankSyncingError(body.detail || 'Synchronisation en cours…')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erreur serveur (${res.status})`)
  }
  return res.json()
}

export async function getBankConnections(): Promise<BankConnection[]> {
  const headers = await getAuthHeader()
  const res = await apiFetch(`${BACKEND_URL}/banks/connections`, { headers })
  if (!res.ok) return []
  const data = await res.json()
  return data.connections
}

export async function deleteBankConnection(connId: string): Promise<void> {
  const headers = await getAuthHeader()
  const res = await apiFetch(`${BACKEND_URL}/banks/connections/${connId}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erreur suppression (${res.status})`)
  }
}

export async function syncBankConnection(connId: string, opts?: { targetMonth?: string; periodMonths?: number }): Promise<UploadResult> {
  const headers = await getAuthHeader()
  const params = new URLSearchParams()
  if (opts?.targetMonth) params.set('target_month', opts.targetMonth)
  if (opts?.periodMonths) params.set('period_months', String(opts.periodMonths))
  const qs = params.toString()
  const url = qs ? `${BACKEND_URL}/banks/sync/${connId}?${qs}` : `${BACKEND_URL}/banks/sync/${connId}`
  const res = await apiFetch(url, { method: 'POST', headers })
  if (res.status === 202) {
    const body = await res.json().catch(() => ({}))
    throw new BankSyncingError(body.detail || 'Synchronisation en cours…')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erreur sync (${res.status})`)
  }
  return res.json()
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
export async function loadAnalysis(fileId: string, filename = ''): Promise<UploadResult> {
  const headers = await getAuthHeader()

  const [txRes, summaryRes, categoriesRes, timelineRes, scoreRes] = await Promise.all([
    apiFetch(`${BACKEND_URL}/transactions/${fileId}`, { headers }),
    apiFetch(`${BACKEND_URL}/analytics/${fileId}/summary`, { headers }),
    apiFetch(`${BACKEND_URL}/analytics/${fileId}/categories`, { headers }),
    apiFetch(`${BACKEND_URL}/analytics/${fileId}/timeline`, { headers }),
    apiFetch(`${BACKEND_URL}/analytics/${fileId}/score`, { headers }),
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

  const score: ScoreResult | undefined = scoreRes.ok ? await scoreRes.json() : undefined

  return {
    file_id: fileId,
    filename,
    transactions: txData.transactions,
    summary,
    by_category: categoriesData.by_category,
    subscriptions: categoriesData.subscriptions,
    timeline: timelineData.timeline,
    score,
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

export const SUBCATEGORY_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  alimentation: [
    { value: 'courses', label: 'Courses' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'fast_food', label: 'Fast food' },
    { value: 'livraison', label: 'Livraison' },
    { value: 'boulangerie', label: 'Boulangerie' },
  ],
  transport: [
    { value: 'transports_commun', label: 'Transports en commun' },
    { value: 'train_avion', label: 'Train / Avion' },
    { value: 'taxi_vtc', label: 'Taxi / VTC' },
    { value: 'carburant', label: 'Carburant' },
    { value: 'parking_peage', label: 'Parking / Péage' },
    { value: 'velo_trottinette', label: 'Vélo / Trottinette' },
  ],
  logement: [
    { value: 'loyer', label: 'Loyer' },
    { value: 'energie', label: 'Énergie' },
    { value: 'eau', label: 'Eau' },
    { value: 'assurance_hab', label: 'Assurance hab.' },
    { value: 'electromenager', label: 'Équipement maison' },
  ],
  sante: [
    { value: 'pharmacie', label: 'Pharmacie' },
    { value: 'medecin', label: 'Médecin' },
    { value: 'dentiste_opticien', label: 'Dentiste / Opticien' },
    { value: 'mutuelle', label: 'Mutuelle' },
  ],
  loisirs: [
    { value: 'cinema_spectacle', label: 'Cinéma / Spectacle' },
    { value: 'sport_fitness', label: 'Sport / Fitness' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'jeux_video', label: 'Jeux vidéo' },
  ],
  voyage: [
    { value: 'hebergement', label: 'Hébergement' },
    { value: 'sejour_circuit', label: 'Séjour / Circuit' },
  ],
  education: [
    { value: 'scolarite', label: 'Scolarité' },
    { value: 'formation_en_ligne', label: 'Formation en ligne' },
    { value: 'langues_certif', label: 'Langues / Certif.' },
    { value: 'livres_papeterie', label: 'Livres / Papeterie' },
  ],
  vetements: [
    { value: 'vetements_mode', label: 'Mode' },
    { value: 'sport_chaussures', label: 'Sport / Chaussures' },
  ],
  abonnements: [
    { value: 'streaming', label: 'Streaming vidéo' },
    { value: 'streaming_musique', label: 'Streaming musique' },
    { value: 'telephone_internet', label: 'Téléphone / Internet' },
    { value: 'logiciel_cloud', label: 'Logiciels / Cloud' },
  ],
}

export const SUBCATEGORY_LABELS: Record<string, string> = {
  // Alimentation
  courses: 'Courses',
  restaurant: 'Restaurant',
  fast_food: 'Fast food',
  livraison: 'Livraison',
  boulangerie: 'Boulangerie',
  // Transport
  transports_commun: 'Transports en commun',
  train_avion: 'Train / Avion',
  taxi_vtc: 'Taxi / VTC',
  carburant: 'Carburant',
  parking_peage: 'Parking / Péage',
  velo_trottinette: 'Vélo / Trottinette',
  // Logement
  loyer: 'Loyer',
  energie: 'Énergie',
  eau: 'Eau',
  assurance_hab: 'Assurance hab.',
  electromenager: 'Équipement maison',
  // Santé
  pharmacie: 'Pharmacie',
  medecin: 'Médecin',
  dentiste_opticien: 'Dentiste / Opticien',
  mutuelle: 'Mutuelle',
  // Loisirs
  cinema_spectacle: 'Cinéma / Spectacle',
  sport_fitness: 'Sport / Fitness',
  voyage_hotel: 'Voyage / Hôtel',
  shopping: 'Shopping',
  jeux_video: 'Jeux vidéo',
  // Abonnements
  streaming: 'Streaming vidéo',
  streaming_musique: 'Streaming musique',
  telephone_internet: 'Téléphone / Internet',
  logiciel_cloud: 'Logiciels / Cloud',
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
  education: 'Éducation',
  voyage: 'Voyage',
  vetements: 'Vêtements',
  autres: 'Autres',
}

export const CATEGORY_COLORS: Record<string, string> = {
  // Clés anglaises (legacy upload)
  alimentation: '#1D9E75',
  logement: '#3B82F6',
  transport: '#F59E0B',
  loisirs: '#EC4899',
  abonnements: '#06B6D4',
  salaire: '#22C55E',
  'frais bancaires': '#6B7280',
  sante: '#F87171',
  investissement: '#6366F1',
  epargne: '#1D9E75',
  impots: '#78716C',
  education: '#0EA5E9',
  voyage: '#F97316',
  vetements: '#A855F7',
  autres: '#6B7280',
  // Clés françaises (bank API)
  Logement: '#3B82F6',
  Courses: '#1D9E75',
  Abonnements: '#06B6D4',
  Transport: '#F59E0B',
  Shopping: '#8B5CF6',
  Sorties: '#EC4899',
  Santé: '#F87171',
  Revenus: '#22C55E',
  Salaire: '#22C55E',
  Investissement: '#6366F1',
  Épargne: '#1D9E75',
  Impôts: '#78716C',
  Éducation: '#0EA5E9',
  Voyage: '#F97316',
  Autre: '#6B7280',
}
